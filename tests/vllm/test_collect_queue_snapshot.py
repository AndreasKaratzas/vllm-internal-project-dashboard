"""Unit tests for scripts/vllm/collect_queue_snapshot.py.

Covers the parts that live in the collector itself (URL rewriting, wait-time
summary) plus a mocked-Buildkite integration test that verifies the snapshot
schema: tracked queues are zero-filled, workload split is correct, stale
jobs are excluded from percentiles but counted in the stale bucket.
"""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from vllm import collect_queue_snapshot as cqs


class TestWaitSummary:
    def test_empty_returns_zero_block(self):
        assert cqs._wait_summary([]) == {
            "p50_wait": 0, "p75_wait": 0, "p90_wait": 0, "p99_wait": 0,
            "max_wait": 0, "avg_wait": 0,
        }

    def test_values_rounded_to_one_decimal(self):
        out = cqs._wait_summary([1.0, 2.0, 3.0, 4.0, 5.0])
        assert out["max_wait"] == 5.0
        assert out["avg_wait"] == 3.0
        assert out["p50_wait"] == 3.0
        assert out["p90_wait"] == 5.0


class TestRewriteJobUrl:
    def test_hash_style_converted_to_step_canvas(self):
        url = "https://buildkite.com/vllm/amd-ci/builds/12345#deadbeef-1234-5678-90ab-cdef01234567"
        expected = (
            "https://buildkite.com/vllm/amd-ci/builds/12345/steps/canvas"
            "?jid=deadbeef-1234-5678-90ab-cdef01234567&tab=output"
        )
        assert cqs._rewrite_job_url(url) == expected

    def test_canonical_url_passthrough(self):
        url = "https://buildkite.com/vllm/amd-ci/builds/12345/jobs/abc"
        assert cqs._rewrite_job_url(url) == url

    def test_empty_returns_empty(self):
        assert cqs._rewrite_job_url("") == ""


class _FakeBk:
    """Injects canned Buildkite responses keyed by ``state``.

    ``running_builds`` and ``scheduled_builds`` are returned as-is on the
    first page; subsequent pages are empty to short-circuit pagination.
    """

    def __init__(self, running_builds=None, scheduled_builds=None):
        self._pages = {"running": [running_builds or []], "scheduled": [scheduled_builds or []]}
        self.calls = []

    def __call__(self, path, token, params=None):
        params = params or {}
        self.calls.append((path, params.get("state"), params.get("page")))
        state = params.get("state", "")
        page = params.get("page", 1)
        pages = self._pages.get(state, [])
        if 1 <= page <= len(pages):
            return pages[page - 1]
        return []


def _build(state_pipeline="amd-ci", branch="main", jobs=None, number=100, commit="abc123def456"):
    return {
        "number": number,
        "branch": branch,
        "commit": commit,
        "source": "ui",
        "pipeline": {"slug": state_pipeline},
        "pull_request": {},
        "jobs": jobs or [],
    }


def _job(queue, state, runnable_at=None, started_at=None, name="mi250_1: foo", web_url=""):
    return {
        "type": "script",
        "state": state,
        "name": name,
        "web_url": web_url,
        "agent_query_rules": [f"queue={queue}"] if queue else [],
        "runnable_at": runnable_at,
        "started_at": started_at,
    }


class TestCollectSnapshot:
    def test_tracked_queue_zero_filled_when_empty(self, monkeypatch, tmp_path):
        fake = _FakeBk()
        monkeypatch.setattr(cqs, "bk_get", fake)
        # Redirect side-effect writes away from the repo — OUTPUT.parent is
        # used for queue_jobs.json too, so tmp_path must be the parent.
        monkeypatch.setattr(cqs, "OUTPUT", tmp_path / "queue_timeseries.jsonl", raising=False)

        snap = cqs.collect_snapshot("fake-token")
        # Every tracked queue should appear even though no builds referenced it.
        for q in cqs.TRACKED_QUEUES:
            assert q in snap["queues"]
            row = snap["queues"][q]
            assert row["waiting"] == 0
            assert row["running"] == 0
            assert row["p90_wait"] == 0

    def test_waiting_and_running_counted(self, monkeypatch, tmp_path):
        monkeypatch.setattr(cqs, "OUTPUT", tmp_path / "out.jsonl", raising=False)
        now = "2026-04-18T12:00:00Z"
        # Three jobs on amd_mi250_1: one waiting (5m), one running (waited 2m), one stale (2d)
        running_build = _build(jobs=[
            _job("amd_mi250_1", "scheduled", runnable_at="2026-04-18T11:55:00Z"),
            _job("amd_mi250_1", "running",
                 runnable_at="2026-04-18T11:58:00Z",
                 started_at="2026-04-18T12:00:00Z"),
            _job("amd_mi250_1", "scheduled", runnable_at="2026-04-16T12:00:00Z"),  # stale
        ])
        fake = _FakeBk(running_builds=[running_build])
        monkeypatch.setattr(cqs, "bk_get", fake)

        with patch("vllm.collect_queue_snapshot.datetime") as dt_mock:
            from datetime import datetime, timezone
            dt_mock.now.return_value = datetime(2026, 4, 18, 12, 0, 0, tzinfo=timezone.utc)
            dt_mock.fromisoformat = datetime.fromisoformat
            snap = cqs.collect_snapshot("fake-token")

        row = snap["queues"]["amd_mi250_1"]
        assert row["waiting"] == 2  # 1 fresh + 1 stale (stale still counts in waiting total)
        assert row["running"] == 1
        assert row["stale"] == 1    # the 2-day-old job
        # Stale job excluded from wait-time percentiles
        assert row["max_wait"] < 1440

    def test_workload_split_from_omni_queue(self, monkeypatch, tmp_path):
        monkeypatch.setattr(cqs, "OUTPUT", tmp_path / "out.jsonl", raising=False)
        build = _build(branch="main", jobs=[
            _job("intel-gpu-omni", "scheduled", runnable_at="2026-04-18T11:59:00Z"),
        ])
        fake = _FakeBk(running_builds=[build])
        monkeypatch.setattr(cqs, "bk_get", fake)

        snap = cqs.collect_snapshot("fake-token")
        row = snap["queues"]["intel-gpu-omni"]
        assert row["waiting_by_workload"] == {"vllm": 0, "omni": 1}

    def test_workload_split_from_omni_branch(self, monkeypatch, tmp_path):
        monkeypatch.setattr(cqs, "OUTPUT", tmp_path / "out.jsonl", raising=False)
        build = _build(branch="user/omni-feature", jobs=[
            _job("amd_mi250_1", "running",
                 runnable_at="2026-04-18T11:58:00Z",
                 started_at="2026-04-18T12:00:00Z"),
        ])
        fake = _FakeBk(running_builds=[build])
        monkeypatch.setattr(cqs, "bk_get", fake)

        snap = cqs.collect_snapshot("fake-token")
        row = snap["queues"]["amd_mi250_1"]
        assert row["running_by_workload"] == {"vllm": 0, "omni": 1}

    def test_jobs_without_queue_rule_skipped(self, monkeypatch, tmp_path):
        monkeypatch.setattr(cqs, "OUTPUT", tmp_path / "out.jsonl", raising=False)
        build = _build(jobs=[_job("", "running", name="no-queue job")])
        fake = _FakeBk(running_builds=[build])
        monkeypatch.setattr(cqs, "bk_get", fake)

        snap = cqs.collect_snapshot("fake-token")
        # Totals should not reflect the un-queued job
        assert snap["total_running"] == 0

    def test_output_schema_has_required_top_level_keys(self, monkeypatch, tmp_path):
        monkeypatch.setattr(cqs, "OUTPUT", tmp_path / "out.jsonl", raising=False)
        fake = _FakeBk()
        monkeypatch.setattr(cqs, "bk_get", fake)

        snap = cqs.collect_snapshot("fake-token")
        for key in ("ts", "queues", "total_waiting", "total_running"):
            assert key in snap
        # ts must be a UTC ISO string
        assert snap["ts"].endswith("Z")
        # Every queue row must be JSON-serialisable
        json.dumps(snap)


class TestJobsJsonSideEffect:
    """``collect_snapshot`` writes ``queue_jobs.json`` as a side effect.

    The dashboard relies on that file for the pending/running job lists —
    make sure it gets written in the right schema.
    """

    def test_jobs_file_written_with_expected_schema(self, monkeypatch, tmp_path):
        out_path = tmp_path / "queue_timeseries.jsonl"
        monkeypatch.setattr(cqs, "OUTPUT", out_path, raising=False)
        build = _build(jobs=[
            _job("amd_mi250_1", "scheduled", runnable_at="2026-04-18T11:55:00Z"),
        ])
        fake = _FakeBk(running_builds=[build])
        monkeypatch.setattr(cqs, "bk_get", fake)

        cqs.collect_snapshot("fake-token")
        jobs_file = out_path.parent / "queue_jobs.json"
        assert jobs_file.exists()
        data = json.loads(jobs_file.read_text())
        assert "ts" in data and "pending" in data and "running" in data
        assert len(data["pending"]) == 1
        pending = data["pending"][0]
        for field in ("name", "queue", "wait_min", "url", "workload", "branch", "commit"):
            assert field in pending

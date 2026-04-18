"""Unit tests for scripts/vllm/collect_hotness.py.

Verifies:
- ``_normalize_group`` collapses shard/hardware/parenthetical noise consistently
- ``_stats`` returns the hotness row schema (``count``, ``avg_min``, ``p50_min``,
  ``p90_min``, ``max_min``) with the right rounding
- ``collect_hotness`` with a mocked Buildkite response produces well-formed
  ``test_groups`` / ``branches`` / ``queues`` rows, filters non-AMD queues,
  and honours the stuck-job ceiling (> 24h)
"""

from __future__ import annotations

import json

import pytest

from vllm import collect_hotness as ch


class TestNormalizeGroup:
    @pytest.mark.parametrize("job,expected", [
        ("mi325_4: V1 e2e (4 GPUs) 1/3", "V1 e2e"),
        ("mi250_1: V1 e2e", "V1 e2e"),
        ("mi355B_8: distributed tests 2/5", "distributed tests"),
        ("plain-name", "plain-name"),
    ])
    def test_collapses_hardware_shard_and_parenthetical(self, job, expected):
        assert ch._normalize_group(job) == expected

    def test_empty_falls_through_to_unknown(self):
        assert ch._normalize_group("") == "unknown"


class TestStats:
    def test_empty_returns_zero_block(self):
        assert ch._stats([]) == {"count": 0, "avg_min": 0.0, "p50_min": 0.0, "p90_min": 0.0, "max_min": 0.0}

    def test_percentile_rounding(self):
        out = ch._stats([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0])
        assert out["count"] == 10
        assert out["avg_min"] == 5.5
        assert out["p50_min"] == 6.0     # idx = int(10 * 50/100) = 5 → values[5]
        assert out["p90_min"] == 10.0    # idx = int(10 * 90/100) = 9 → values[9]
        assert out["max_min"] == 10.0


def _job(name, queue, state="passed", started=None, finished=None):
    return {
        "type": "script",
        "name": name,
        "state": state,
        "started_at": started,
        "finished_at": finished,
        "agent_query_rules": [f"queue={queue}"] if queue else [],
    }


def _build(branch="main", commit="abc" * 4, jobs=None, number=1, slug="amd-ci"):
    return {
        "number": number,
        "branch": branch,
        "commit": commit,
        "source": "api",
        "created_at": "2026-04-17T00:00:00Z",
        "pipeline": {"slug": slug},
        "pull_request": {},
        "jobs": jobs or [],
    }


class TestCollectHotness:
    def _install_fake(self, monkeypatch, builds):
        """Replace ``_paginate`` so we bypass HTTP and return ``builds`` once."""
        def fake_paginate(path, token, params=None, max_pages=20):
            return builds
        monkeypatch.setattr(ch, "_paginate", fake_paginate)

    def test_amd_queue_only_jobs_counted(self, monkeypatch):
        build = _build(jobs=[
            _job("mi250_1: foo", "amd_mi250_1",
                 started="2026-04-18T10:00:00Z", finished="2026-04-18T10:30:00Z"),
            _job("foo", "cpu_queue_postmerge",
                 started="2026-04-18T10:00:00Z", finished="2026-04-18T10:30:00Z"),
        ])
        self._install_fake(monkeypatch, [build])
        data = ch.collect_hotness("fake-token")
        # Only the amd_ job should appear in queue rows
        queue_names = [q["queue"] for q in data["queues"]]
        assert "amd_mi250_1" in queue_names
        assert "cpu_queue_postmerge" not in queue_names

    def test_stuck_job_filtered(self, monkeypatch):
        build = _build(jobs=[
            _job("mi250_1: stuck", "amd_mi250_1",
                 started="2026-04-15T00:00:00Z", finished="2026-04-18T00:00:00Z"),  # 72h
        ])
        self._install_fake(monkeypatch, [build])
        data = ch.collect_hotness("fake-token")
        assert data["queues"] == []  # stuck job dropped

    def test_fail_rate_computed(self, monkeypatch):
        build = _build(jobs=[
            _job("mi250_1: flaky", "amd_mi250_1", state="passed",
                 started="2026-04-18T10:00:00Z", finished="2026-04-18T10:30:00Z"),
            _job("mi250_1: flaky", "amd_mi250_1", state="failed",
                 started="2026-04-18T11:00:00Z", finished="2026-04-18T11:30:00Z"),
        ])
        self._install_fake(monkeypatch, [build])
        data = ch.collect_hotness("fake-token")
        flaky_rows = [g for g in data["test_groups"] if g["group"] == "flaky"]
        assert len(flaky_rows) == 1
        row = flaky_rows[0]
        assert row["count"] == 2
        assert row["failures"] == 1
        assert row["fail_rate"] == 0.5

    def test_branch_row_includes_commit_and_fork_url(self, monkeypatch):
        build = {
            "number": 2,
            "branch": "user/feature",
            "commit": "deadbeefdeadbeef",
            "source": "api",
            "created_at": "2026-04-17T00:00:00Z",
            "pipeline": {"slug": "amd-ci"},
            "pull_request": {"repository": "https://github.com/forkuser/vllm"},
            "jobs": [
                _job("mi250_1: foo", "amd_mi250_1",
                     started="2026-04-18T10:00:00Z", finished="2026-04-18T10:30:00Z"),
            ],
        }
        self._install_fake(monkeypatch, [build])
        data = ch.collect_hotness("fake-token")
        branch_rows = [b for b in data["branches"] if b["branch"] == "user/feature"]
        assert len(branch_rows) == 1
        assert branch_rows[0]["commit"] == "deadbeefdead"
        assert branch_rows[0]["fork_url"] == "https://github.com/forkuser/vllm"

    def test_output_schema_stable(self, monkeypatch):
        build = _build(jobs=[
            _job("mi250_1: foo", "amd_mi250_1",
                 started="2026-04-18T10:00:00Z", finished="2026-04-18T10:30:00Z"),
        ])
        self._install_fake(monkeypatch, [build])
        data = ch.collect_hotness("fake-token")
        for key in ("generated_at", "window_hours", "builds_examined",
                    "test_groups", "branches", "queues"):
            assert key in data
        json.dumps(data)  # must be JSON-serialisable

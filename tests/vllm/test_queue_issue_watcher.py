"""Unit tests for scripts/vllm/queue_issue_watcher.py.

The watcher opens / closes GitHub issues when queue p90 wait crosses the
hysteresis thresholds. These tests stub out the GitHub HTTP layer so we can
validate the decision logic — which queue flips to hot, which flips to
healthy, and what the persisted state file looks like — without hitting the
real API.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from vllm import queue_issue_watcher as qiw


@pytest.fixture
def isolated_state(tmp_path, monkeypatch):
    """Point the watcher at a tmp snapshot file + tmp state file."""
    snaps = tmp_path / "queue_timeseries.jsonl"
    state = tmp_path / "open_queue_issues.json"
    monkeypatch.setattr(qiw, "SNAPSHOTS", snaps, raising=False)
    monkeypatch.setattr(qiw, "STATE", state, raising=False)
    return snaps, state


def _write_snapshot(snaps: Path, queues: dict, ts: str = "2026-04-18T12:00:00Z"):
    snaps.write_text(json.dumps({"ts": ts, "queues": queues}) + "\n")


class _ApiRecorder:
    """Capture every GitHub API call the watcher would have made.

    Patched onto ``qiw._open_issue`` / ``_close_issue`` / ``_comment_issue``
    so we can assert on the decision pattern without running ``requests``.
    """

    def __init__(self):
        self.opened = []
        self.closed = []
        self.commented = []
        self._next_issue_num = 1000

    def open_issue(self, token, repo, queue, stats, run_url):
        num = self._next_issue_num
        self._next_issue_num += 1
        self.opened.append((queue, num, stats))
        return num

    def close_issue(self, token, repo, number):
        self.closed.append(number)

    def comment(self, token, repo, number, body):
        self.commented.append((number, body))


@pytest.fixture
def api(monkeypatch):
    rec = _ApiRecorder()
    monkeypatch.setattr(qiw, "_open_issue", rec.open_issue)
    monkeypatch.setattr(qiw, "_close_issue", rec.close_issue)
    monkeypatch.setattr(qiw, "_comment_issue", rec.comment)
    monkeypatch.setenv("GITHUB_TOKEN", "fake-token")
    return rec


class TestReadLastSnapshot:
    def test_returns_last_valid_line(self, tmp_path, monkeypatch):
        snaps = tmp_path / "queue_timeseries.jsonl"
        snaps.write_text(
            json.dumps({"ts": "T1", "queues": {}}) + "\n"
            + json.dumps({"ts": "T2", "queues": {"a": 1}}) + "\n"
        )
        monkeypatch.setattr(qiw, "SNAPSHOTS", snaps, raising=False)
        last = qiw._read_last_snapshot()
        assert last["ts"] == "T2"

    def test_skips_junk_lines(self, tmp_path, monkeypatch):
        snaps = tmp_path / "queue_timeseries.jsonl"
        snaps.write_text(
            "not-json-just-garbage\n"
            + json.dumps({"ts": "T2", "queues": {}}) + "\n"
            + "{}incomplete\n"
        )
        monkeypatch.setattr(qiw, "SNAPSHOTS", snaps, raising=False)
        assert qiw._read_last_snapshot()["ts"] == "T2"

    def test_missing_file_returns_none(self, tmp_path, monkeypatch):
        monkeypatch.setattr(qiw, "SNAPSHOTS", tmp_path / "nope.jsonl", raising=False)
        assert qiw._read_last_snapshot() is None


class TestStateIo:
    def test_writes_and_reads_round_trip(self, tmp_path, monkeypatch):
        state = tmp_path / "state.json"
        monkeypatch.setattr(qiw, "STATE", state, raising=False)
        qiw._write_state({"open": {"amd_mi250_1": 42}, "last_run": "T"})
        out = qiw._read_state()
        assert out == {"open": {"amd_mi250_1": 42}, "last_run": "T"}

    def test_missing_file_returns_empty(self, tmp_path, monkeypatch):
        monkeypatch.setattr(qiw, "STATE", tmp_path / "nope.json", raising=False)
        assert qiw._read_state() == {"open": {}}

    def test_junk_file_returns_empty(self, tmp_path, monkeypatch):
        state = tmp_path / "junk.json"
        state.write_text("not json")
        monkeypatch.setattr(qiw, "STATE", state, raising=False)
        assert qiw._read_state() == {"open": {}}


class TestRun:
    def test_opens_issue_when_queue_hot(self, isolated_state, api):
        snaps, state = isolated_state
        _write_snapshot(snaps, {
            "amd_mi250_1": {"p90_wait": 45.0, "waiting": 10, "running": 5},
        })
        rc = qiw.run()
        assert rc == 0
        assert len(api.opened) == 1
        assert api.opened[0][0] == "amd_mi250_1"
        persisted = json.loads(state.read_text())
        assert persisted["open"]["amd_mi250_1"] == api.opened[0][1]

    def test_hysteresis_no_flap_when_between_thresholds(self, isolated_state, api):
        snaps, state = isolated_state
        _write_snapshot(snaps, {
            "amd_mi250_1": {"p90_wait": 20.0, "waiting": 10, "running": 5},
        })
        rc = qiw.run()
        assert rc == 0
        # 20m is above healthy (15) but below trigger (30) — no action
        assert api.opened == []
        assert api.closed == []

    def test_single_hot_job_below_min_waiting_skipped(self, isolated_state, api):
        snaps, state = isolated_state
        _write_snapshot(snaps, {
            "amd_mi250_1": {"p90_wait": 60.0, "waiting": 1, "running": 0},
        })
        rc = qiw.run()
        assert rc == 0
        # waiting=1 < MIN_WAITING_SAMPLES=3 → don't alert on noise
        assert api.opened == []

    def test_already_tracked_hot_queue_is_not_reopened(self, isolated_state, api):
        snaps, state = isolated_state
        # Seed state with an already-open issue for amd_mi250_1.
        state.write_text(json.dumps({"open": {"amd_mi250_1": 777}, "last_run": ""}))
        _write_snapshot(snaps, {
            "amd_mi250_1": {"p90_wait": 60.0, "waiting": 10, "running": 0},
        })
        rc = qiw.run()
        assert rc == 0
        assert api.opened == []  # dedup — already tracked

    def test_closes_issue_when_queue_healthy(self, isolated_state, api):
        snaps, state = isolated_state
        state.write_text(json.dumps({"open": {"amd_mi250_1": 777}, "last_run": ""}))
        _write_snapshot(snaps, {
            "amd_mi250_1": {"p90_wait": 10.0, "waiting": 2, "running": 3},
        })
        rc = qiw.run()
        assert rc == 0
        assert 777 in api.closed
        assert api.commented and api.commented[0][0] == 777
        persisted = json.loads(state.read_text())
        assert "amd_mi250_1" not in persisted["open"]

    def test_no_token_skips_mutations_but_persists_state(self, isolated_state, api, monkeypatch):
        snaps, state = isolated_state
        monkeypatch.delenv("GITHUB_TOKEN", raising=False)
        _write_snapshot(snaps, {
            "amd_mi250_1": {"p90_wait": 60.0, "waiting": 10, "running": 0},
        })
        rc = qiw.run()
        assert rc == 0
        assert api.opened == []  # no token → no API call
        # state file should still exist
        assert state.exists()

    def test_missing_snapshot_returns_gracefully(self, tmp_path, monkeypatch):
        monkeypatch.setattr(qiw, "SNAPSHOTS", tmp_path / "nope.jsonl", raising=False)
        monkeypatch.setattr(qiw, "STATE", tmp_path / "state.json", raising=False)
        monkeypatch.setenv("GITHUB_TOKEN", "fake")
        assert qiw.run() == 0

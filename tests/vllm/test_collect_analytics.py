"""Unit tests for ``scripts/vllm/collect_analytics.py`` window handling."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from vllm import collect_analytics as ca


NOW = datetime(2026, 4, 20, 12, 0, 0, tzinfo=timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _job(name: str, dur: float, wait: float = 0.2, state: str = "passed", queue: str = "amd_mi300_1"):
    row = {"name": name, "state": state, "dur": dur}
    if wait is not None:
        row["wait"] = wait
    if queue:
        row["q"] = queue
    return row


def _build(number: int, days_ago: float, jobs: list[dict], state: str = "passed"):
    created = NOW - timedelta(days=days_ago)
    return {
        "number": number,
        "state": state,
        "created_at": _iso(created),
        "date": ca.nightly_date(_iso(created)),
        "message": "nightly",
        "author": "",
        "wall_mins": 60.0,
        "passed": sum(1 for j in jobs if j.get("state") == "passed"),
        "failed": sum(1 for j in jobs if j.get("state") in ("failed", "timed_out", "broken")),
        "soft_failed": sum(1 for j in jobs if j.get("state") == "soft_fail"),
        "total_jobs": len(jobs),
        "jobs": jobs,
        "web_url": "",
    }


class TestWindowedAnalytics:
    def test_emits_precomputed_windows(self):
        builds = [
            _build(1, 0.5, [_job("Recent", 40)]),
            _build(2, 2.0, [_job("Mid", 50)]),
            _build(3, 6.0, [_job("Week", 60)]),
            _build(4, 10.0, [_job("Old", 70)]),
        ]

        windows = ca.compute_window_blocks(builds, 14, now=NOW)

        assert set(windows) == {"1d", "3d", "7d", "14d"}
        assert windows["1d"]["build_count"] == 1
        assert windows["3d"]["build_count"] == 2
        assert windows["7d"]["build_count"] == 3
        assert windows["14d"]["build_count"] == 4

    def test_shorter_windows_forget_older_jobs(self):
        builds = [
            _build(1, 10.0, [_job("Legacy MI325 bottleneck", 600, queue="amd_mi325_1")]),
            _build(2, 1.0, [_job("Current MI300 bottleneck", 45, queue="amd_mi300_1")]),
        ]

        windows = ca.compute_window_blocks(builds, 14, now=NOW)
        names_14d = [row["name"] for row in windows["14d"]["duration_ranking"]]
        names_3d = [row["name"] for row in windows["3d"]["duration_ranking"]]

        assert "Legacy MI325 bottleneck" in names_14d
        assert "Legacy MI325 bottleneck" not in names_3d
        assert names_3d == ["Current MI300 bottleneck"]

    def test_window_block_recomputes_summary_and_failures(self):
        builds = [
            _build(1, 8.0, [_job("Flaky", 30, state="failed")], state="failed"),
            _build(2, 0.5, [_job("Flaky", 32, state="passed"), _job("Stable", 20)], state="passed"),
        ]

        windows = ca.compute_window_blocks(builds, 14, now=NOW)

        assert windows["14d"]["summary"]["total_builds"] == 2
        assert windows["14d"]["summary"]["jobs_with_failures"] == 1
        assert windows["7d"]["summary"]["total_builds"] == 1
        assert windows["7d"]["summary"]["jobs_with_failures"] == 0

    def test_top_level_rankings_can_still_cover_full_span(self):
        builds = [
            _build(1, 10.0, [_job("Legacy MI325 bottleneck", 600, queue="amd_mi325_1")]),
            _build(2, 0.5, [_job("Current MI300 bottleneck", 45, queue="amd_mi300_1")]),
        ]

        rankings = ca.compute_job_rankings(builds)
        queues = {row["name"]: row["queues"] for row in rankings}

        assert sorted(queues["Legacy MI325 bottleneck"]) == ["amd_mi325_1"]
        assert sorted(queues["Current MI300 bottleneck"]) == ["amd_mi300_1"]

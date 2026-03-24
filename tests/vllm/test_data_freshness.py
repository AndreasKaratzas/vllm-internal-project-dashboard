"""
Data freshness tests for nightly CI.

Verifies that data collection workflows have run successfully and
produced fresh data files. Designed to run at 9:30 AM CT, after the
7 AM CT ci-collect and hourly-update workflows complete.
"""
import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "data"

# Maximum allowed age for data files (hours)
MAX_AGE_HOURS = int(os.environ.get("MAX_DATA_AGE_HOURS", "36"))


def _parse_ts(ts_str: str) -> datetime:
    """Parse ISO timestamp, handling Z and +00:00 suffixes."""
    ts_str = ts_str.replace("Z", "+00:00")
    return datetime.fromisoformat(ts_str)


def _age_hours(ts_str: str) -> float:
    """Return how many hours old a timestamp is."""
    ts = _parse_ts(ts_str)
    return (datetime.now(timezone.utc) - ts).total_seconds() / 3600


def _skip_if_local():
    """Skip freshness tests when running locally (not in CI)."""
    if not os.environ.get("CI"):
        pytest.skip("Freshness tests only run in CI (set CI=1 to force)")


# ═══════════════════════════════════════════════════════════════════════════════
# vLLM CI data freshness
# ═══════════════════════════════════════════════════════════════════════════════

class TestCIDataFreshness:
    """Verify that Buildkite CI data was collected recently."""

    def test_ci_health_exists(self):
        assert (DATA / "vllm" / "ci" / "ci_health.json").exists(), \
            "ci_health.json does not exist"

    def test_parity_report_exists(self):
        assert (DATA / "vllm" / "ci" / "parity_report.json").exists(), \
            "parity_report.json does not exist"

    def test_analytics_exists(self):
        assert (DATA / "vllm" / "ci" / "analytics.json").exists(), \
            "analytics.json does not exist"

    def test_ci_health_fresh(self):
        _skip_if_local()
        d = json.loads((DATA / "vllm" / "ci" / "ci_health.json").read_text())
        ts = d.get("generated_at", "")
        assert ts, "ci_health.json has no generated_at"
        age = _age_hours(ts)
        assert age < MAX_AGE_HOURS, \
            f"ci_health.json is {age:.1f}h old (generated_at={ts}, max={MAX_AGE_HOURS}h)"

    def test_parity_report_fresh(self):
        _skip_if_local()
        d = json.loads((DATA / "vllm" / "ci" / "parity_report.json").read_text())
        ts = d.get("generated_at", "")
        assert ts, "parity_report.json has no generated_at"
        age = _age_hours(ts)
        assert age < MAX_AGE_HOURS, \
            f"parity_report.json is {age:.1f}h old (generated_at={ts}, max={MAX_AGE_HOURS}h)"

    def test_ci_health_has_amd_build(self):
        d = json.loads((DATA / "vllm" / "ci" / "ci_health.json").read_text())
        lb = d.get("amd", {}).get("latest_build", {})
        assert lb.get("total_tests", 0) > 0, "AMD latest_build has 0 tests"

    def test_ci_health_has_upstream_build(self):
        d = json.loads((DATA / "vllm" / "ci" / "ci_health.json").read_text())
        lb = d.get("upstream", {}).get("latest_build", {})
        assert lb.get("total_tests", 0) > 0, "Upstream latest_build has 0 tests"

    def test_parity_report_has_job_links(self):
        """Verify parity report has job links (the bug we fixed)."""
        d = json.loads((DATA / "vllm" / "ci" / "parity_report.json").read_text())
        groups = d.get("job_groups", [])
        assert len(groups) > 0, "No job groups"

        groups_with_amd = [g for g in groups if g.get("amd")]
        groups_with_amd_links = [
            g for g in groups_with_amd
            if any(l.get("side") == "amd" for l in g.get("job_links", []))
        ]
        pct = len(groups_with_amd_links) / max(len(groups_with_amd), 1) * 100
        assert pct > 90, \
            f"Only {pct:.0f}% of AMD groups have job links ({len(groups_with_amd_links)}/{len(groups_with_amd)})"


# ═══════════════════════════════════════════════════════════════════════════════
# Queue monitor freshness
# ═══════════════════════════════════════════════════════════════════════════════

class TestQueueDataFreshness:
    """Verify queue monitor is collecting data."""

    def test_queue_timeseries_exists(self):
        assert (DATA / "vllm" / "ci" / "queue_timeseries.jsonl").exists()

    def test_queue_data_not_empty(self):
        _skip_if_local()
        path = DATA / "vllm" / "ci" / "queue_timeseries.jsonl"
        lines = [l for l in path.read_text().strip().split("\n") if l.strip()]
        assert len(lines) > 0, "queue_timeseries.jsonl is empty"

    def test_latest_snapshot_fresh(self):
        _skip_if_local()
        path = DATA / "vllm" / "ci" / "queue_timeseries.jsonl"
        lines = [l for l in path.read_text().strip().split("\n") if l.strip()]
        if not lines:
            pytest.skip("No queue data yet")
        last = json.loads(lines[-1])
        ts = last.get("ts", "")
        if not ts:
            pytest.skip("Last entry has no timestamp")
        age = _age_hours(ts)
        assert age < MAX_AGE_HOURS, \
            f"Latest queue snapshot is {age:.1f}h old (ts={ts}, max={MAX_AGE_HOURS}h)"

    def test_latest_snapshot_valid(self):
        _skip_if_local()
        path = DATA / "vllm" / "ci" / "queue_timeseries.jsonl"
        lines = [l for l in path.read_text().strip().split("\n") if l.strip()]
        if not lines:
            pytest.skip("No queue data yet")
        last = json.loads(lines[-1])
        assert "queues" in last, f"Latest snapshot missing 'queues': {list(last.keys())}"
        assert isinstance(last["queues"], dict), "queues is not a dict"


# ═══════════════════════════════════════════════════════════════════════════════
# Project data freshness (GitHub data)
# ═══════════════════════════════════════════════════════════════════════════════

class TestProjectDataFreshness:
    """Verify per-project GitHub data is present and non-empty."""

    CORE_PROJECTS = ["vllm", "pytorch", "triton"]

    @pytest.mark.parametrize("project", CORE_PROJECTS)
    def test_prs_json_exists(self, project):
        assert (DATA / project / "prs.json").exists(), \
            f"{project}/prs.json missing"

    @pytest.mark.parametrize("project", CORE_PROJECTS)
    def test_prs_json_not_empty(self, project):
        d = json.loads((DATA / project / "prs.json").read_text())
        assert len(d) > 0, f"{project}/prs.json is empty"

    @pytest.mark.parametrize("project", CORE_PROJECTS)
    def test_issues_json_exists(self, project):
        assert (DATA / project / "issues.json").exists(), \
            f"{project}/issues.json missing"

    @pytest.mark.parametrize("project", CORE_PROJECTS)
    def test_activity_json_exists(self, project):
        assert (DATA / project / "activity.json").exists(), \
            f"{project}/activity.json missing"


# ═══════════════════════════════════════════════════════════════════════════════
# Dashboard site files
# ═══════════════════════════════════════════════════════════════════════════════

class TestDashboardSiteFiles:
    """Verify dashboard site is deployable."""

    def test_projects_config_exists(self):
        assert (ROOT / "docs" / "_data" / "projects.json").exists()

    def test_projects_config_valid(self):
        d = json.loads((ROOT / "docs" / "_data" / "projects.json").read_text())
        assert "projects" in d
        assert len(d["projects"]) > 0

    def test_history_index_exists(self):
        assert (DATA / "history" / "index.json").exists()

    def test_history_has_recent_weeks(self):
        d = json.loads((DATA / "history" / "index.json").read_text())
        weeks = d if isinstance(d, list) else d.get("weeks", [])
        assert len(weeks) > 0, "No history weeks"

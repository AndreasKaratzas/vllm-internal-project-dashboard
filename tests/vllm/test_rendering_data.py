"""Tests that validate all data files required by dashboard rendering exist
and have the correct structure. If these tests fail, the dashboard tabs will
be empty or show errors.

These catch the class of bugs where:
- A data file is missing or malformed
- A field the JS renderer expects is null/missing
- Data files are out of sync with each other
"""

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"
PROJECTS_JSON = DOCS / "_data" / "projects.json"


@pytest.fixture
def projects():
    return json.loads(PROJECTS_JSON.read_text())["projects"]


class TestProjectsTab:
    """Tests for the Projects tab (renderCards)."""

    def test_projects_json_exists(self):
        assert PROJECTS_JSON.exists()

    def test_projects_json_has_projects(self, projects):
        assert len(projects) >= 10, f"Expected 10+ projects, got {len(projects)}"

    def test_all_projects_have_repo(self, projects):
        for name, cfg in projects.items():
            assert "repo" in cfg, f"{name} missing 'repo'"

    def test_all_projects_have_data_dir(self, projects):
        for name in projects:
            assert (DATA / name).is_dir(), f"Missing data/{name}/ directory"

    @pytest.mark.parametrize("required_file", ["prs.json", "issues.json", "activity.json"])
    def test_core_data_files_exist(self, projects, required_file):
        """These files are loaded by dashboard.js for every project."""
        missing = []
        for name in projects:
            if not (DATA / name / required_file).exists():
                missing.append(name)
        assert not missing, f"{required_file} missing for: {missing}"

    def test_prs_json_has_prs_array(self, projects):
        for name in projects:
            path = DATA / name / "prs.json"
            if not path.exists():
                continue
            d = json.loads(path.read_text())
            assert "prs" in d or "items" in d, f"{name}/prs.json missing 'prs' key"

    def test_activity_json_has_pr_velocity(self, projects):
        for name in projects:
            path = DATA / name / "activity.json"
            if not path.exists():
                continue
            d = json.loads(path.read_text())
            assert "pr_velocity" in d, f"{name}/activity.json missing 'pr_velocity'"


class TestTestParityTab:
    """Tests for the Test Parity tab (renderParityView)."""

    def test_at_least_one_project_has_test_results(self, projects):
        has_data = False
        for name in projects:
            for f in ["test_results.json", "parity_report.json"]:
                if (DATA / name / f).exists():
                    has_data = True
                    break
        assert has_data, "No project has test_results.json or parity_report.json"

    def test_test_results_have_platform_data(self):
        """test_results.json must have rocm and/or cuda sections."""
        for path in DATA.glob("*/test_results.json"):
            d = json.loads(path.read_text())
            has_platform = d.get("rocm") or d.get("cuda")
            # Allow empty/stub files
            if d.get("collected_at"):
                assert has_platform, f"{path} has collected_at but no rocm/cuda data"


class TestActivityTab:
    """Tests for the Activity tab (renderActivityView)."""

    def test_activity_json_structure(self, projects):
        for name in projects:
            path = DATA / name / "activity.json"
            if not path.exists():
                continue
            d = json.loads(path.read_text())
            assert isinstance(d, dict), f"{name}/activity.json is not a dict"
            # pr_velocity is required by the renderer
            pv = d.get("pr_velocity", {})
            assert isinstance(pv, dict), f"{name}/activity.json pr_velocity is not dict"


class TestTrendsTab:
    """Tests for the Trends tab (renderTrendsView)."""

    def test_history_index_exists(self):
        path = DATA / "history" / "index.json"
        assert path.exists(), "data/history/index.json missing"

    def test_history_has_weeks(self):
        path = DATA / "history" / "index.json"
        d = json.loads(path.read_text())
        assert "weeks" in d, "index.json missing 'weeks'"
        assert len(d["weeks"]) >= 1, "No weekly snapshots"

    def test_weekly_snapshots_loadable(self):
        idx = json.loads((DATA / "history" / "index.json").read_text())
        for w in idx.get("weeks", [])[-3:]:
            path = DATA / "history" / f"{w}.json"
            assert path.exists(), f"Missing snapshot {w}.json"
            d = json.loads(path.read_text())
            assert "projects" in d, f"{w}.json missing 'projects'"


class TestVLLMCIData:
    """Tests that vLLM CI data is complete and consistent."""

    def test_ci_health_has_amd_build(self):
        path = DATA / "vllm" / "ci" / "ci_health.json"
        if not path.exists():
            pytest.skip("no ci_health data")
        d = json.loads(path.read_text())
        assert d.get("amd", {}).get("latest_build"), "ci_health missing amd.latest_build"

    def test_ci_health_build_has_required_fields(self):
        path = DATA / "vllm" / "ci" / "ci_health.json"
        if not path.exists():
            pytest.skip("no ci_health data")
        d = json.loads(path.read_text())
        lb = d["amd"]["latest_build"]
        for field in ["build_number", "passed", "failed", "pass_rate", "by_hardware"]:
            assert field in lb, f"latest_build missing '{field}'"

    def test_parity_report_synced_to_project_root(self):
        """collect_ci.py should sync parity_report.json to data/vllm/."""
        ci = DATA / "vllm" / "ci" / "parity_report.json"
        proj = DATA / "vllm" / "parity_report.json"
        if not ci.exists():
            pytest.skip("no CI parity data")
        assert proj.exists(), "parity_report.json not synced to data/vllm/"

    def test_test_results_synced_to_project_root(self):
        """collect_ci.py should generate data/vllm/test_results.json."""
        path = DATA / "vllm" / "test_results.json"
        assert path.exists(), "test_results.json not generated"
        d = json.loads(path.read_text())
        assert d.get("rocm"), "test_results.json missing rocm data"

    def test_shard_bases_exists(self):
        path = DATA / "vllm" / "ci" / "shard_bases.json"
        assert path.exists(), "shard_bases.json missing (YAML shard detection not run)"
        bases = json.loads(path.read_text())
        assert isinstance(bases, list), "shard_bases.json should be a list"
        assert len(bases) >= 3, f"Expected at least 3 shard bases, got {len(bases)}"


class TestNoJobStateMismatch:
    """Tests that passed jobs are not reported as failed."""

    def test_no_failures_from_passed_jobs(self):
        """If a Buildkite job passed (state=passed), it must not appear
        as failed in test results. This catches the bug where the log parser
        extracted pytest failures from embedded subprocess output."""
        ci_health = DATA / "vllm" / "ci" / "ci_health.json"
        parity = DATA / "vllm" / "ci" / "parity_report.json"
        if not ci_health.exists() or not parity.exists():
            pytest.skip("no CI data")

        # Load ci_health to get job states
        health = json.loads(ci_health.read_text())
        lb = health.get("amd", {}).get("latest_build", {})
        # Can't check individual jobs from ci_health alone,
        # but we can check that total failures <= jobs_failed
        total_test_failures = lb.get("failed", 0)
        jobs_failed = lb.get("jobs_failed", 0)
        # Soft-failed jobs count as failures
        jobs_soft_failed = lb.get("jobs_soft_failed", 0)
        # Test failures should not massively exceed job failures
        # (some jobs have multiple test failures, so test_failures > jobs_failed is OK,
        # but test_failures shouldn't exist for jobs that passed)
        if jobs_failed == 0 and jobs_soft_failed == 0:
            assert total_test_failures == 0, (
                f"ci_health shows {total_test_failures} test failures but "
                f"0 jobs failed — log parser may be reporting false failures"
            )

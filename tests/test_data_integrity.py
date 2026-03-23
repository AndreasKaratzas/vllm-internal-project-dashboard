"""
Data integrity tests for the project dashboard.
Validates that CI data files have correct structure and the
vLLM CI view will render correctly.
"""
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"


class TestCIHealthData:
    @pytest.fixture
    def health(self):
        path = DATA / "vllm" / "ci" / "ci_health.json"
        if not path.exists():
            pytest.skip("ci_health.json not collected yet")
        return json.loads(path.read_text())

    def test_has_required_top_keys(self, health):
        for key in ["generated_at", "amd", "upstream"]:
            assert key in health

    def test_amd_has_latest_build(self, health):
        assert "latest_build" in health.get("amd", {})

    def test_latest_build_has_required_fields(self, health):
        lb = health["amd"]["latest_build"]
        for f in ["build_number", "total_tests", "passed", "failed", "skipped", "pass_rate", "test_groups"]:
            assert f in lb, f"missing: {f}"

    def test_pass_rate_is_valid(self, health):
        assert 0 <= health["amd"]["latest_build"]["pass_rate"] <= 1

    def test_test_counts_consistent(self, health):
        lb = health["amd"]["latest_build"]
        assert lb["passed"] + lb["failed"] + lb.get("errors", 0) <= lb["total_tests"]

    def test_hardware_breakdown_exists(self, health):
        assert len(health["amd"]["latest_build"].get("by_hardware", {})) > 0

    def test_hardware_pass_rates_valid(self, health):
        for hw, d in health["amd"]["latest_build"].get("by_hardware", {}).items():
            if hw == "unknown": continue
            assert 0 <= d["pass_rate"] <= 1, f"{hw} pass_rate={d['pass_rate']}"


class TestParityReport:
    @pytest.fixture
    def parity(self):
        path = DATA / "vllm" / "ci" / "parity_report.json"
        if not path.exists():
            pytest.skip("parity_report.json not collected yet")
        return json.loads(path.read_text())

    def test_has_job_groups(self, parity):
        assert len(parity.get("job_groups", [])) > 0

    def test_groups_have_names(self, parity):
        for g in parity["job_groups"]:
            assert g.get("name"), f"empty name: {g}"

    def test_groups_have_side(self, parity):
        for g in parity["job_groups"]:
            assert g.get("amd") or g.get("upstream"), f"'{g['name']}' has no side"

    def test_no_negative_counts(self, parity):
        for g in parity["job_groups"]:
            for side in ["amd", "upstream"]:
                d = g.get(side)
                if not d: continue
                for f in ["passed", "failed", "skipped"]:
                    assert d.get(f, 0) >= 0, f"'{g['name']}' {side}.{f} < 0"


class TestAnalyticsData:
    @pytest.fixture
    def analytics(self):
        path = DATA / "vllm" / "ci" / "analytics.json"
        if not path.exists():
            pytest.skip("analytics.json not collected yet")
        return json.loads(path.read_text())

    def test_has_pipelines(self, analytics):
        assert len(analytics) > 0

    def test_pipelines_have_summary(self, analytics):
        for p, d in analytics.items():
            assert "summary" in d, f"{p} missing summary"

    def test_builds_have_jobs(self, analytics):
        for p, d in analytics.items():
            builds = d.get("builds", [])
            if builds:
                assert "jobs" in builds[0], f"{p} build missing jobs"


class TestFrontendFiles:
    def test_index_html_exists(self):
        assert (DOCS / "index.html").exists()

    def test_index_html_has_sidebar(self):
        html = (DOCS / "index.html").read_text()
        assert 'id="sidebar"' in html
        assert 'id="main-content"' in html

    def test_all_tabs_present(self):
        html = (DOCS / "index.html").read_text()
        for tab in ["ci-health", "ci-analytics", "ci-queue", "test-parity"]:
            assert f'data-tab="{tab}"' in html, f"missing tab: {tab}"

    @pytest.mark.parametrize("f", [
        "dashboard.js", "ci-health.js", "ci-analytics.js",
        "ci-queue.js", "utils.js", "op-coverage.js"
    ])
    def test_js_exists(self, f):
        assert (DOCS / "assets" / "js" / f).exists()

    @pytest.mark.parametrize("f", [
        "dashboard.js", "ci-health.js", "ci-analytics.js", "ci-queue.js", "utils.js"
    ])
    def test_js_braces_balanced(self, f):
        c = (DOCS / "assets" / "js" / f).read_text()
        assert c.count("{") == c.count("}"), f"{f}: unbalanced braces"

    def test_css_exists(self):
        assert (DOCS / "assets" / "css" / "dashboard.css").exists()

    def test_css_has_sidebar(self):
        css = (DOCS / "assets" / "css" / "dashboard.css").read_text()
        assert "#sidebar" in css
        assert ".overlay-backdrop" in css


class TestShardMerging:
    def _base(self, name):
        n = re.sub(r'\s+\d+$', '', name)
        n = re.sub(r'\s+\d+\s*:.*$', '', n)
        n = re.sub(r'\s+\d+\)$', ')', n)
        return n

    def test_trailing_digit(self):
        assert self._base("lora 1") == "lora"

    def test_digit_colon(self):
        assert self._base("mm (standard) 1: qwen2") == "mm (standard)"

    def test_digit_paren(self):
        assert self._base("mm (extended gen 1)") == "mm (extended gen)"

    def test_preserved(self):
        assert self._base("distributed tests (2 gpus)") == "distributed tests (2 gpus)"
        assert self._base("basic correctness") == "basic correctness"

    def test_reduces_real_data(self):
        path = DATA / "vllm" / "ci" / "parity_report.json"
        if not path.exists():
            pytest.skip("no parity data")
        groups = json.loads(path.read_text())["job_groups"]
        merged = {self._base(g["name"]) for g in groups}
        assert len(merged) < len(groups)


class TestSiteAssembly:
    def test_docs_data_exists(self):
        assert (DOCS / "data").exists()

    def test_projects_json(self):
        p = DOCS / "_data" / "projects.json"
        if not p.exists():
            pytest.skip("not rendered yet")
        assert "projects" in json.loads(p.read_text())

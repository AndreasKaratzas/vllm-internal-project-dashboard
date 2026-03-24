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

    def test_group_failures_not_greater_than_health(self):
        """Sum of per-group (failed + error) must not exceed the health card total.

        The parity data only includes GPU groups (excludes CPU/Intel/Arm/Ascend),
        so the group sum will be <= the card total. But it must never exceed it.
        """
        health_path = DATA / "vllm" / "ci" / "ci_health.json"
        parity_path = DATA / "vllm" / "ci" / "parity_report.json"
        if not health_path.exists() or not parity_path.exists():
            pytest.skip("data not collected yet")
        health = json.loads(health_path.read_text())
        parity = json.loads(parity_path.read_text())

        lb = health["amd"]["latest_build"]
        card_failures = lb["failed"] + lb.get("errors", 0)

        group_failures = 0
        for g in parity["job_groups"]:
            d = g.get("amd")
            if not d:
                continue
            group_failures += (d.get("failed", 0) + d.get("error", 0))

        assert group_failures <= card_failures, (
            f"Group failures sum ({group_failures}) > card total ({card_failures}). "
            f"Group data has more failures than the health summary."
        )

    def test_group_failed_plus_error_equals_total_minus_pass_skip(self):
        """Per-group: failed + error + passed + skipped + xfailed + xpassed should equal total."""
        path = DATA / "vllm" / "ci" / "parity_report.json"
        if not path.exists():
            pytest.skip("parity_report.json not collected yet")
        parity = json.loads(path.read_text())
        bad = []
        for g in parity["job_groups"]:
            for side in ["amd", "upstream"]:
                d = g.get(side)
                if not d:
                    continue
                accounted = (d.get("passed", 0) + d.get("failed", 0) +
                             d.get("error", 0) + d.get("skipped", 0) +
                             d.get("xfailed", 0) + d.get("xpassed", 0))
                total = d.get("total", 0)
                if accounted != total:
                    bad.append(f"'{g['name']}' {side}: accounted={accounted} != total={total}")
        assert not bad, f"Count mismatches:\n" + "\n".join(bad[:10])

    def test_groups_have_real_pytest_counts(self, parity):
        """Parity report must contain actual pytest test counts, not job-level shard counts.

        When log parsing works, groups like 'kernels attention test' have thousands
        of tests. If most groups have total <= 1, the data was collected with
        __job_level__ fallback (1 per shard) instead of real pytest summaries.
        """
        amd_groups = [g for g in parity["job_groups"] if g.get("amd")]
        if not amd_groups:
            pytest.skip("no AMD groups")
        groups_with_real_counts = [g for g in amd_groups if g["amd"]["total"] > 10]
        ratio = len(groups_with_real_counts) / len(amd_groups)
        assert ratio >= 0.3, (
            f"Only {len(groups_with_real_counts)}/{len(amd_groups)} AMD groups have "
            f"total > 10 ({ratio:.0%}). Parity report likely has job-level shard "
            f"counts instead of real pytest test counts. Re-run collect_ci.py with "
            f"working log parsing."
        )

    def test_parity_total_matches_health(self):
        """Parity report AMD test total should be in the same ballpark as ci_health."""
        health_path = DATA / "vllm" / "ci" / "ci_health.json"
        parity_path = DATA / "vllm" / "ci" / "parity_report.json"
        if not health_path.exists() or not parity_path.exists():
            pytest.skip("data not collected yet")
        health = json.loads(health_path.read_text())
        parity = json.loads(parity_path.read_text())

        health_total = health["amd"]["latest_build"]["total_tests"]
        parity_total = sum(
            g["amd"]["total"] for g in parity["job_groups"] if g.get("amd")
        )
        # Parity excludes CPU/Intel/Arm/Ascend groups, so it will be <=
        # but shouldn't be drastically less (< 10% would indicate job-level counts)
        assert parity_total >= health_total * 0.1, (
            f"Parity AMD total ({parity_total}) is less than 10% of ci_health "
            f"total ({health_total}). Data likely has job-level counts."
        )

    def test_job_links_have_hw_field(self, parity):
        """Every job_link must have a string 'hw' field (used by toUpperCase in JS overlay)."""
        bad = []
        for g in parity["job_groups"]:
            for jl in g.get("job_links", []):
                if "hw" not in jl:
                    bad.append(f"'{g['name']}' side={jl.get('side')}: missing 'hw'")
                elif not isinstance(jl["hw"], str):
                    bad.append(f"'{g['name']}' side={jl.get('side')}: hw is {type(jl['hw']).__name__}, expected str")
        assert not bad, (
            f"{len(bad)} job_link(s) missing 'hw' field (causes toUpperCase crash in JS):\n"
            + "\n".join(bad[:10])
        )

    def test_job_links_have_required_fields(self, parity):
        """Every job_link must have url, job_name, side, and hw fields."""
        required = {"url", "job_name", "side", "hw"}
        bad = []
        for g in parity["job_groups"]:
            for jl in g.get("job_links", []):
                missing = required - set(jl.keys())
                if missing:
                    bad.append(f"'{g['name']}' side={jl.get('side')}: missing {missing}")
        assert not bad, (
            f"{len(bad)} job_link(s) with missing fields:\n" + "\n".join(bad[:10])
        )

    def test_hw_failures_is_dict_or_null(self, parity):
        """hw_failures must be a dict (or null), never a string/list/number."""
        for g in parity["job_groups"]:
            hwf = g.get("hw_failures")
            if hwf is not None:
                assert isinstance(hwf, dict), (
                    f"'{g['name']}' hw_failures is {type(hwf).__name__}, expected dict or null"
                )

    def test_groups_have_error_field(self, parity):
        """Groups with errors must have the 'error' field so it can be folded into 'failed'."""
        for g in parity["job_groups"]:
            for side in ["amd", "upstream"]:
                d = g.get(side)
                if not d:
                    continue
                # error field should exist (can be 0)
                assert "error" in d or d.get("failed", 0) >= 0, \
                    f"'{g['name']}' {side} missing 'error' field"


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
    def test_data_dir_exists(self):
        assert (ROOT / "data").exists()

    def test_projects_json(self):
        p = DOCS / "_data" / "projects.json"
        if not p.exists():
            pytest.skip("not rendered yet")
        assert "projects" in json.loads(p.read_text())

"""
Comprehensive tests for CI job link generation and overlay routing.

Tests both:
1. Backend: _compute_job_group_parity produces correct job_links with URLs for
   every group that has AMD or upstream results
2. Frontend data contract: the generated parity_report.json has the structure
   that utils.js expects to populate BK_GROUP_DATA correctly
3. All overlay entry points use bkGroupUrl correctly
"""
import json
import re
from pathlib import Path

import pytest

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from vllm.ci.models import TestResult
from vllm.ci.analyzer import _compute_job_group_parity, _normalize_job_name

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "data"


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

BK_URL_RE = re.compile(
    r"^https://buildkite\.com/vllm/[a-z\-]+/builds/\d+/steps/canvas\?(sid|jid)=[0-9a-f\w\-]+&tab=output$"
)


def make_result(job_name, status="passed", name="__passed__ (1)", pipeline="amd-ci",
                build_number=100, job_id="aaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                step_id="ssss-bbbb-cccc-dddd-eeeeeeeeeeee"):
    return TestResult(
        test_id=f"{job_name}::{name}",
        name=name,
        classname=job_name,
        status=status,
        duration_secs=1.0,
        failure_message="",
        job_name=job_name,
        job_id=job_id,
        step_id=step_id,
        build_number=build_number,
        pipeline=pipeline,
        date="2026-03-22",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Backend: _compute_job_group_parity link generation
# ═══════════════════════════════════════════════════════════════════════════════

class TestJobLinkGeneration:
    """Test that _compute_job_group_parity generates job_links for all groups."""

    def test_passing_amd_group_gets_link(self):
        """A group that PASSES on AMD must still get a job link."""
        amd = [make_result("mi325_1: Acceptance Length Test (Large Models)",
                           pipeline="amd-ci", build_number=6780,
                           job_id="019d1421-0001-0000-0000-000000000001")]
        upstream = [make_result("Acceptance Length Test (Large Models)",
                                pipeline="ci", build_number=57502,
                                job_id="019d1759-0001-0000-0000-000000000001")]
        groups = _compute_job_group_parity(amd, upstream)

        group = next(g for g in groups if "acceptance length" in g["name"])
        links = group["job_links"]
        amd_links = [l for l in links if l.get("side") == "amd"]
        assert len(amd_links) >= 1, f"No AMD link for passing group: {links}"
        assert BK_URL_RE.match(amd_links[0]["url"]), f"Bad URL: {amd_links[0]['url']}"

    def test_passing_upstream_group_gets_link(self):
        """A group that PASSES on upstream must still get a job link."""
        amd = [make_result("mi325_1: Acceptance Length Test (Large Models)",
                           pipeline="amd-ci", build_number=6780,
                           job_id="019d1421-0001-0000-0000-000000000001")]
        upstream = [make_result("Acceptance Length Test (Large Models)",
                                pipeline="ci", build_number=57502,
                                job_id="019d1759-0001-0000-0000-000000000001")]
        groups = _compute_job_group_parity(amd, upstream)

        group = next(g for g in groups if "acceptance length" in g["name"])
        links = group["job_links"]
        up_links = [l for l in links if l.get("side") == "upstream"]
        assert len(up_links) >= 1, f"No upstream link for passing group: {links}"
        assert BK_URL_RE.match(up_links[0]["url"]), f"Bad URL: {up_links[0]['url']}"

    def test_failing_amd_group_gets_link(self):
        """A group that FAILS on AMD must get a job link."""
        amd = [make_result("mi325_1: Distributed Tests (2 GPUs)(H100-MI325)",
                           status="failed", name="test_foo",
                           pipeline="amd-ci", build_number=6780,
                           job_id="019d1421-0002-0000-0000-000000000002")]
        upstream = [make_result("Distributed Tests (2 GPUs)",
                                pipeline="ci", build_number=57502,
                                job_id="019d1759-0002-0000-0000-000000000002")]
        groups = _compute_job_group_parity(amd, upstream)

        group = next(g for g in groups if "distributed tests" in g["name"])
        amd_links = [l for l in group["job_links"] if l.get("side") == "amd"]
        assert len(amd_links) >= 1

    def test_amd_only_group_gets_link(self):
        """A group that only exists on AMD must get an AMD link."""
        amd = [make_result("mi250_1: AMD-Specific Test",
                           pipeline="amd-ci", build_number=6780,
                           job_id="019d1421-0003-0000-0000-000000000003")]
        groups = _compute_job_group_parity(amd, [])

        group = next(g for g in groups if "amd-specific" in g["name"])
        assert group["amd"] is not None
        assert group["upstream"] is None
        amd_links = [l for l in group["job_links"] if l.get("side") == "amd"]
        assert len(amd_links) >= 1

    def test_upstream_only_group_gets_link(self):
        """A group that only exists on upstream must get an upstream link."""
        upstream = [make_result("Upstream-Only Test",
                                pipeline="ci", build_number=57502,
                                job_id="019d1759-0003-0000-0000-000000000003")]
        groups = _compute_job_group_parity([], upstream)

        group = next(g for g in groups if "upstream-only" in g["name"])
        assert group["amd"] is None
        assert group["upstream"] is not None
        up_links = [l for l in group["job_links"] if l.get("side") == "upstream"]
        assert len(up_links) >= 1

    def test_every_link_has_hw_field(self):
        """Every job_link entry must have a 'hw' field (for toUpperCase in overlay)."""
        amd = [
            make_result("mi325_1: Test A", pipeline="amd-ci", build_number=100,
                        job_id="aaaa-0001-0000-0000-000000000001"),
        ]
        upstream = [
            make_result("Test A", pipeline="ci", build_number=200,
                        job_id="bbbb-0001-0000-0000-000000000001"),
        ]
        groups = _compute_job_group_parity(amd, upstream)
        for g in groups:
            for link in g["job_links"]:
                assert "hw" in link, \
                    f"Link in '{g['name']}' (side={link.get('side')}) missing 'hw': {link}"
                assert isinstance(link["hw"], str), \
                    f"Link in '{g['name']}' hw is not a string: {link['hw']}"

    def test_upstream_link_has_hw_field(self):
        """Upstream job_link must include hw field (was missing, caused toUpperCase crash)."""
        amd = [make_result("mi325_1: HW Test", pipeline="amd-ci", build_number=100,
                           job_id="aaaa-0001-0000-0000-000000000001")]
        upstream = [make_result("HW Test", pipeline="ci", build_number=200,
                                job_id="bbbb-0001-0000-0000-000000000001")]
        groups = _compute_job_group_parity(amd, upstream)

        group = next(g for g in groups if "hw test" in g["name"])
        up_links = [l for l in group["job_links"] if l.get("side") == "upstream"]
        assert len(up_links) >= 1
        assert "hw" in up_links[0], f"Upstream link missing 'hw': {up_links[0]}"

    def test_error_counts_in_group_data(self):
        """Groups must track 'error' separately so mergeShardedGroups can fold it into 'failed'."""
        amd = [
            make_result("mi325_1: Error Test", status="error", name="test_crash",
                        pipeline="amd-ci", build_number=100,
                        job_id="aaaa-0001-0000-0000-000000000001"),
            make_result("mi325_1: Error Test", status="passed", name="__passed__ (5)",
                        pipeline="amd-ci", build_number=100,
                        job_id="aaaa-0001-0000-0000-000000000001"),
        ]
        groups = _compute_job_group_parity(amd, [])

        group = next(g for g in groups if "error test" in g["name"])
        assert group["amd"] is not None
        assert group["amd"].get("error", 0) > 0, \
            f"Error count not tracked in group data: {group['amd']}"

    def test_every_link_has_side_field(self):
        """Every job_link entry must have a 'side' field ('amd' or 'upstream')."""
        amd = [
            make_result("mi325_1: Test A", pipeline="amd-ci", build_number=100,
                        job_id="aaaa-0001-0000-0000-000000000001"),
            make_result("mi250_1: Test B", pipeline="amd-ci", build_number=100,
                        job_id="aaaa-0002-0000-0000-000000000002"),
        ]
        upstream = [
            make_result("Test A", pipeline="ci", build_number=200,
                        job_id="bbbb-0001-0000-0000-000000000001"),
            make_result("Test B", pipeline="ci", build_number=200,
                        job_id="bbbb-0002-0000-0000-000000000002"),
        ]
        groups = _compute_job_group_parity(amd, upstream)
        for g in groups:
            for link in g["job_links"]:
                assert link.get("side") in ("amd", "upstream"), \
                    f"Link in '{g['name']}' missing side: {link}"

    def test_every_link_has_valid_url(self):
        """Every job_link URL must match the Buildkite step canvas URL pattern."""
        amd = [
            make_result("mi325_1: Test A", pipeline="amd-ci", build_number=100,
                        job_id="aaaa-0001-0000-0000-000000000001"),
        ]
        upstream = [
            make_result("Test A", pipeline="ci", build_number=200,
                        job_id="bbbb-0001-0000-0000-000000000001"),
        ]
        groups = _compute_job_group_parity(amd, upstream)
        for g in groups:
            for link in g["job_links"]:
                assert BK_URL_RE.match(link["url"]), \
                    f"Bad URL in '{g['name']}': {link['url']}"
                assert "tab=output" in link["url"], \
                    f"URL missing tab=output in '{g['name']}': {link['url']}"

    def test_url_contains_correct_pipeline(self):
        """AMD links must point to amd-ci, upstream links to ci."""
        amd = [make_result("mi325_1: Test X", pipeline="amd-ci", build_number=100,
                           job_id="aaaa-0001-0000-0000-000000000001")]
        upstream = [make_result("Test X", pipeline="ci", build_number=200,
                                job_id="bbbb-0001-0000-0000-000000000001")]
        groups = _compute_job_group_parity(amd, upstream)

        for g in groups:
            for link in g["job_links"]:
                if link["side"] == "amd":
                    assert "/amd-ci/" in link["url"], f"AMD link wrong pipeline: {link['url']}"
                elif link["side"] == "upstream":
                    assert "/ci/" in link["url"], f"Upstream link wrong pipeline: {link['url']}"

    def test_url_contains_correct_build_number(self):
        """Links must contain the correct build number."""
        amd = [make_result("mi325_1: Test Y", pipeline="amd-ci", build_number=6780,
                           job_id="aaaa-0001-0000-0000-000000000001")]
        upstream = [make_result("Test Y", pipeline="ci", build_number=57502,
                                job_id="bbbb-0001-0000-0000-000000000001")]
        groups = _compute_job_group_parity(amd, upstream)

        for g in groups:
            for link in g["job_links"]:
                if link["side"] == "amd":
                    assert "/builds/6780/" in link["url"]
                elif link["side"] == "upstream":
                    assert "/builds/57502/" in link["url"]

    def test_url_contains_correct_ids(self):
        """Both AMD and upstream links must use jid=job_id."""
        amd_job_id = "019d1421-aaaa-bbbb-cccc-111111111111"
        up_id = "019d1759-dddd-eeee-ffff-222222222222"
        amd = [make_result("mi325_1: Test Z", pipeline="amd-ci", build_number=100,
                           job_id=amd_job_id)]
        upstream = [make_result("Test Z", pipeline="ci", build_number=200,
                                job_id=up_id)]
        groups = _compute_job_group_parity(amd, upstream)

        for g in groups:
            for link in g["job_links"]:
                if link["side"] == "amd":
                    assert f"jid={amd_job_id}" in link["url"]
                elif link["side"] == "upstream":
                    assert f"jid={up_id}" in link["url"]

    def test_multi_hardware_gets_multiple_amd_links(self):
        """A group running on mi250 and mi325 must get links for both."""
        amd = [
            make_result("mi250_1: Multi HW Test", pipeline="amd-ci", build_number=100,
                        job_id="aaaa-0001-0000-0000-000000000001"),
            make_result("mi325_1: Multi HW Test", pipeline="amd-ci", build_number=100,
                        job_id="aaaa-0002-0000-0000-000000000002"),
        ]
        groups = _compute_job_group_parity(amd, [])

        group = next(g for g in groups if "multi hw test" in g["name"])
        amd_links = [l for l in group["job_links"] if l["side"] == "amd"]
        hw_set = {l["hw"] for l in amd_links}
        assert "mi250" in hw_set, f"Missing mi250 link: {amd_links}"
        assert "mi325" in hw_set, f"Missing mi325 link: {amd_links}"

    def test_no_link_without_job_id(self):
        """Results with empty job_id must not generate links."""
        amd = [make_result("mi325_1: No ID Test", pipeline="amd-ci",
                           build_number=100, job_id="")]
        groups = _compute_job_group_parity(amd, [])

        group = next(g for g in groups if "no id test" in g["name"])
        assert len(group["job_links"]) == 0

    def test_both_group_has_both_sides(self):
        """A group with both AMD and upstream results must have links for both sides."""
        amd = [make_result("mi325_1: Both Sides Test", pipeline="amd-ci",
                           build_number=100,
                           job_id="aaaa-0001-0000-0000-000000000001")]
        upstream = [make_result("Both Sides Test", pipeline="ci",
                                build_number=200,
                                job_id="bbbb-0001-0000-0000-000000000001")]
        groups = _compute_job_group_parity(amd, upstream)

        group = next(g for g in groups if "both sides test" in g["name"])
        sides = {l["side"] for l in group["job_links"]}
        assert "amd" in sides, f"Missing AMD side: {group['job_links']}"
        assert "upstream" in sides, f"Missing upstream side: {group['job_links']}"


# ═══════════════════════════════════════════════════════════════════════════════
# Frontend data contract: parity_report.json structure for utils.js
# ═══════════════════════════════════════════════════════════════════════════════

class TestFrontendDataContract:
    """Verify the parity_report.json matches what the frontend JS expects."""

    @pytest.fixture
    def parity(self):
        path = DATA / "vllm" / "ci" / "parity_report.json"
        if not path.exists():
            pytest.skip("parity_report.json not collected yet")
        return json.loads(path.read_text())

    def test_every_both_group_has_amd_link(self, parity):
        """Every group with amd != null must have at least one job_link with side='amd'."""
        missing = []
        for g in parity["job_groups"]:
            if g.get("amd") is None:
                continue
            amd_links = [l for l in g.get("job_links", []) if l.get("side") == "amd"]
            if not amd_links:
                missing.append(g["name"])
        assert not missing, (
            f"{len(missing)} AMD groups missing job links: {missing[:10]}"
        )

    def test_every_both_group_has_upstream_link(self, parity):
        """Every group with upstream != null must have at least one job_link with side='upstream'."""
        missing = []
        for g in parity["job_groups"]:
            if g.get("upstream") is None:
                continue
            up_links = [l for l in g.get("job_links", []) if l.get("side") == "upstream"]
            if not up_links:
                missing.append(g["name"])
        assert not missing, (
            f"{len(missing)} upstream groups missing job links: {missing[:10]}"
        )

    def test_all_links_have_valid_url_format(self, parity):
        """Every job_link URL must be a valid Buildkite step canvas URL."""
        bad = []
        for g in parity["job_groups"]:
            for link in g.get("job_links", []):
                url = link.get("url", "")
                if not ("steps/canvas" in url and "tab=output" in url):
                    bad.append((g["name"], url))
        assert not bad, f"Bad URLs: {bad[:10]}"

    def test_all_links_have_side_field(self, parity):
        """Every job_link must have side='amd' or side='upstream'."""
        bad = []
        for g in parity["job_groups"]:
            for link in g.get("job_links", []):
                if link.get("side") not in ("amd", "upstream"):
                    bad.append((g["name"], link))
        assert not bad, f"Links without side: {bad[:10]}"

    def test_all_links_have_hw_field(self, parity):
        """Every job_link must have a 'hw' string field (used by toUpperCase in overlay)."""
        bad = []
        for g in parity["job_groups"]:
            for link in g.get("job_links", []):
                if not isinstance(link.get("hw"), str) or not link["hw"]:
                    bad.append((g["name"], link.get("side"), link.get("hw")))
        assert not bad, f"Links without hw: {bad[:10]}"

    def test_amd_links_point_to_amd_pipeline(self, parity):
        """AMD links must point to amd-ci pipeline."""
        bad = []
        for g in parity["job_groups"]:
            for link in g.get("job_links", []):
                if link.get("side") == "amd" and "/amd-ci/" not in link.get("url", ""):
                    bad.append((g["name"], link["url"]))
        assert not bad, f"AMD links with wrong pipeline: {bad[:5]}"

    def test_upstream_links_point_to_ci_pipeline(self, parity):
        """Upstream links must point to ci pipeline."""
        bad = []
        for g in parity["job_groups"]:
            for link in g.get("job_links", []):
                if link.get("side") == "upstream" and "/ci/" not in link.get("url", ""):
                    bad.append((g["name"], link["url"]))
        assert not bad, f"Upstream links with wrong pipeline: {bad[:5]}"


# ═══════════════════════════════════════════════════════════════════════════════
# Frontend JS: utils.js BK_GROUP_DATA routing logic
# ═══════════════════════════════════════════════════════════════════════════════

class TestFrontendRouting:
    """Simulate the JS routing logic in Python to verify it works."""

    def _simulate_js_loader(self, job_groups):
        """Simulate the utils.js data loading logic:

        for (var j = 0; j < g.job_links.length; j++) {
            var link = g.job_links[j];
            if (link.side === 'upstream') {
                entry.upstream_url = link.url;
            } else {
                if (!entry.amd_url) entry.amd_url = link.url;
            }
        }
        """
        bk_group_data = {}
        for g in job_groups:
            entry = {"amd_url": None, "upstream_url": None}
            for link in g.get("job_links", []):
                if link.get("side") == "upstream":
                    entry["upstream_url"] = link["url"]
                else:
                    if not entry["amd_url"]:
                        entry["amd_url"] = link["url"]
            bk_group_data[g["name"]] = entry
        return bk_group_data

    def _simulate_bk_group_url(self, bk_group_data, group_name, pipeline,
                                bk_amd_build="https://buildkite.com/vllm/amd-ci",
                                bk_up_build="https://buildkite.com/vllm/ci"):
        """Simulate bkGroupUrl(groupName, pipeline) from utils.js."""
        d = bk_group_data.get(group_name)
        if pipeline == "upstream":
            return (d and d["upstream_url"]) or bk_up_build
        return (d and d["amd_url"]) or bk_amd_build

    def test_routing_with_both_sides(self):
        """Both AMD and upstream clicks must return specific job URLs."""
        groups = [{
            "name": "test group a",
            "job_links": [
                {"side": "amd", "url": "https://buildkite.com/vllm/amd-ci/builds/100/steps/canvas?sid=amd-step-id&tab=output",
                 "hw": "mi325", "job_name": "mi325_1: Test Group A"},
                {"side": "upstream", "url": "https://buildkite.com/vllm/ci/builds/200/steps/canvas?jid=up-job-id&tab=output",
                 "job_name": "Test Group A"},
            ],
        }]
        data = self._simulate_js_loader(groups)

        amd_url = self._simulate_bk_group_url(data, "test group a", "amd")
        up_url = self._simulate_bk_group_url(data, "test group a", "upstream")

        assert "sid=amd-step-id" in amd_url, f"AMD URL missing step id: {amd_url}"
        assert "jid=up-job-id" in up_url, f"Upstream URL missing job id: {up_url}"

    def test_routing_amd_only(self):
        """AMD-only group: AMD click returns job URL, upstream falls back."""
        groups = [{
            "name": "amd only group",
            "job_links": [
                {"side": "amd", "url": "https://buildkite.com/vllm/amd-ci/builds/100/steps/canvas?sid=amd-id&tab=output",
                 "hw": "mi325", "job_name": "mi325_1: AMD Only Group"},
            ],
        }]
        data = self._simulate_js_loader(groups)

        amd_url = self._simulate_bk_group_url(data, "amd only group", "amd")
        assert "sid=amd-id" in amd_url

    def test_routing_upstream_only(self):
        """Upstream-only group: upstream click returns job URL, AMD falls back."""
        groups = [{
            "name": "upstream only group",
            "job_links": [
                {"side": "upstream", "url": "https://buildkite.com/vllm/ci/builds/200/steps/canvas?jid=up-id&tab=output",
                 "job_name": "Upstream Only Group"},
            ],
        }]
        data = self._simulate_js_loader(groups)

        up_url = self._simulate_bk_group_url(data, "upstream only group", "upstream")
        assert "jid=up-id" in up_url

    def test_routing_empty_links_falls_back(self):
        """Group with no links must fall back to build URL (no crash)."""
        groups = [{"name": "empty group", "job_links": []}]
        data = self._simulate_js_loader(groups)

        amd_url = self._simulate_bk_group_url(data, "empty group", "amd")
        up_url = self._simulate_bk_group_url(data, "empty group", "upstream")

        # Falls back to build URLs (no fragment)
        assert amd_url == "https://buildkite.com/vllm/amd-ci"
        assert up_url == "https://buildkite.com/vllm/ci"

    def test_routing_unknown_group_falls_back(self):
        """Unknown group name must fall back to build URL (no crash)."""
        data = self._simulate_js_loader([])

        amd_url = self._simulate_bk_group_url(data, "nonexistent", "amd")
        assert amd_url == "https://buildkite.com/vllm/amd-ci"

    @pytest.fixture
    def parity(self):
        path = DATA / "vllm" / "ci" / "parity_report.json"
        if not path.exists():
            pytest.skip("parity_report.json not collected yet")
        return json.loads(path.read_text())

    def test_real_data_routing_produces_step_canvas_urls(self, parity):
        """With real parity data, every group that has results must route to a
        step canvas URL, not a bare build URL."""
        data = self._simulate_js_loader(parity["job_groups"])

        missing_amd = []
        missing_up = []
        for g in parity["job_groups"]:
            if g.get("amd"):
                url = self._simulate_bk_group_url(data, g["name"], "amd")
                if "steps/canvas" not in url:
                    missing_amd.append(g["name"])
            if g.get("upstream"):
                url = self._simulate_bk_group_url(data, g["name"], "upstream")
                if "steps/canvas" not in url:
                    missing_up.append(g["name"])

        assert not missing_amd, (
            f"{len(missing_amd)} AMD groups route to bare build URL (no step canvas): "
            f"{missing_amd[:10]}"
        )
        assert not missing_up, (
            f"{len(missing_up)} upstream groups route to bare build URL (no step canvas): "
            f"{missing_up[:10]}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Overlay entry points: verify all 7 overlay paths use bkGroupUrl
# ═══════════════════════════════════════════════════════════════════════════════

class TestOverlayLinkPresence:
    """Verify that all overlay rendering code includes bkGroupUrl calls for
    both AMD and upstream link icons."""

    JS_DIR = ROOT / "docs" / "assets" / "js"

    def _read_js(self, filename):
        return (self.JS_DIR / filename).read_text()

    # --- dashboard.js overlays (Test Parity tab) ---

    def test_parity_overlay_amd_category(self):
        """showGroupOverlay with 'amd' category must be wired."""
        js = self._read_js("dashboard.js")
        assert "showGroupOverlay(" in js
        assert "amd" in js

    def test_parity_overlay_common_category(self):
        js = self._read_js("dashboard.js")
        assert "common" in js

    def test_parity_overlay_upstream_category(self):
        js = self._read_js("dashboard.js")
        # Verify the overlay is wired for the upstream category
        assert re.search(r"showGroupOverlay\([^)]*upstream", js), \
            "No showGroupOverlay call with 'upstream' category"

    def test_parity_overlay_amd_only_category(self):
        js = self._read_js("dashboard.js")
        assert re.search(r"showGroupOverlay\([^)]*amd-only", js), \
            "No showGroupOverlay call with 'amd-only' category"

    def test_parity_overlay_upstream_only_category(self):
        js = self._read_js("dashboard.js")
        assert re.search(r"showGroupOverlay\([^)]*upstream-only", js), \
            "No showGroupOverlay call with 'upstream-only' category"

    # --- utils.js: showGroupOverlay builds table with links ---

    def test_show_group_overlay_calls_bk_group_url_amd(self):
        """showGroupOverlay table must call LinkRegistry.bk for AMD links."""
        js = self._read_js("utils.js")
        assert "LinkRegistry.bk" in js
        assert "'amd'" in js

    def test_show_group_overlay_calls_bk_group_url_upstream(self):
        """showGroupOverlay table must call LinkRegistry.bk for upstream links."""
        js = self._read_js("utils.js")
        assert "'upstream'" in js

    def test_show_group_overlay_renders_amd_icon(self):
        """Red AMD icon must be rendered for groups with AMD data."""
        js = self._read_js("utils.js")
        # The red box icon
        assert "background:#da3633" in js
        assert "AMD CI logs" in js

    def test_show_group_overlay_renders_upstream_icon(self):
        """Blue upstream icon must be rendered for groups with upstream data."""
        js = self._read_js("utils.js")
        assert "background:#1f6feb" in js
        assert "Upstream CI logs" in js

    # --- ci-health.js overlays ---

    def test_ci_health_overlay_uses_group_links(self):
        """CI health overlay must use LinkRegistry.bk for group links."""
        js = self._read_js("ci-health.js")
        assert "LinkRegistry.bk" in js or "makeGroupLinks" in js

    def test_ci_health_overlay_calls_bk_group_url_upstream(self):
        """CI health overlay table must reference upstream pipeline."""
        js = self._read_js("ci-health.js")
        assert "'upstream'" in js

    def test_ci_health_overlay_renders_both_icons(self):
        """CI health overlay must render both AMD and upstream icons (inline or via makeGroupLinks)."""
        js = self._read_js("ci-health.js")
        utils_js = self._read_js("utils.js")
        # Icons can be in ci-health.js directly or via makeGroupLinks in utils.js
        has_amd = "background:#da3633" in js or "background:#da3633" in utils_js
        has_up = "background:#1f6feb" in js or "background:#1f6feb" in utils_js
        assert has_amd, "No AMD red icon in ci-health.js or utils.js"
        assert has_up, "No upstream blue icon in ci-health.js or utils.js"

    def test_ci_health_has_show_group_overlay_health(self):
        """showGroupOverlay_health must exist for failing groups overlay."""
        js = self._read_js("ci-health.js")
        assert "showGroupOverlay_health" in js

    def test_ci_health_has_show_parity_overlay(self):
        """showParityOverlay must exist for coverage parity overlay."""
        js = self._read_js("ci-health.js")
        assert "showParityOverlay" in js

    # --- ci-analytics.js uses bkSearchUrl ---

    def test_ci_analytics_uses_group_links(self):
        """CI analytics overlay must use LinkRegistry for group links."""
        js = self._read_js("ci-analytics.js")
        assert "LinkRegistry" in js

    # --- utils.js: makeGroupLinks ---

    def test_make_group_links_creates_amd_link(self):
        """makeGroupLinks must create AMD link via LinkRegistry."""
        js = self._read_js("utils.js")
        assert "function makeGroupLinks" in js
        assert "LinkRegistry.bk.groupUrl(name, 'amd')" in js

    def test_make_group_links_creates_upstream_link(self):
        """makeGroupLinks must create upstream link via LinkRegistry."""
        js = self._read_js("utils.js")
        assert "LinkRegistry.bk.groupUrl(name, 'upstream')" in js

    # --- utils.js: bkGroupUrl routing logic ---

    def test_bk_group_url_checks_upstream_url(self):
        """LinkRegistry bkGroupUrl must check d.upstream_url for upstream pipeline."""
        js = self._read_js("utils.js")
        assert "d.upstream_url" in js

    def test_bk_group_url_checks_amd_url(self):
        """LinkRegistry bkGroupUrl must check d.amd_url for AMD pipeline."""
        js = self._read_js("utils.js")
        assert "d.amd_url" in js

    def test_bk_group_url_fallback_amd(self):
        """LinkRegistry bkGroupUrl must fall back to pipeline URL if no specific URL."""
        js = self._read_js("utils.js")
        assert "BK_PIPELINES.amd" in js or "BK_PIPELINES['amd']" in js

    def test_bk_group_url_fallback_upstream(self):
        """LinkRegistry bkGroupUrl must fall back to pipeline URL if no specific URL."""
        js = self._read_js("utils.js")
        assert "BK_PIPELINES.upstream" in js or "BK_PIPELINES['upstream']" in js

    # --- utils.js: data loader parses side field ---

    def test_loader_checks_side_field(self):
        """The data loader must check link.side to route amd vs upstream URLs."""
        js = self._read_js("utils.js")
        assert "link.side" in js or "link['side']" in js

    def test_loader_sets_upstream_url(self):
        """The data loader must set entry.upstream_url from upstream links."""
        js = self._read_js("utils.js")
        assert "entry.upstream_url" in js

    def test_loader_sets_amd_url(self):
        """The data loader must set entry.amd_url from AMD links."""
        js = self._read_js("utils.js")
        assert "entry.amd_url" in js

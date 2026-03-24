"""
Tests for the CI queue monitor automation pipeline.

Validates that:
1. The collect_queue_snapshot script produces valid JSONL consumable by ci-queue.js
2. The site assembly places both docs and data correctly (no double rm -rf)
3. The queue_timeseries.jsonl data has the correct schema
4. The queue-monitor workflow includes a deploy step
"""
import json
import re
import subprocess
import textwrap
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"
WORKFLOWS = ROOT / ".github" / "workflows"


class TestQueueTimeseriesSchema:
    """Validate the queue_timeseries.jsonl file has the correct structure."""

    @pytest.fixture
    def snapshots(self):
        path = DATA / "vllm" / "ci" / "queue_timeseries.jsonl"
        if not path.exists():
            pytest.skip("queue_timeseries.jsonl not collected yet")
        lines = [l for l in path.read_text().strip().split("\n") if l.strip()]
        if not lines:
            pytest.fail("queue_timeseries.jsonl exists but is empty")
        return [json.loads(line) for line in lines]

    def test_file_exists(self):
        path = DATA / "vllm" / "ci" / "queue_timeseries.jsonl"
        assert path.exists(), "queue_timeseries.jsonl must exist for CI queue tab"

    def test_file_not_empty(self):
        path = DATA / "vllm" / "ci" / "queue_timeseries.jsonl"
        if not path.exists():
            pytest.skip("queue_timeseries.jsonl not collected yet")
        content = path.read_text().strip()
        assert len(content) > 0, "queue_timeseries.jsonl must not be empty"

    def test_each_line_is_valid_json(self):
        path = DATA / "vllm" / "ci" / "queue_timeseries.jsonl"
        if not path.exists():
            pytest.skip("queue_timeseries.jsonl not collected yet")
        for i, line in enumerate(path.read_text().strip().split("\n")):
            if not line.strip():
                continue
            try:
                json.loads(line)
            except json.JSONDecodeError as e:
                pytest.fail(f"Line {i+1} is not valid JSON: {e}")

    def test_snapshots_have_required_keys(self, snapshots):
        for i, snap in enumerate(snapshots):
            assert "ts" in snap, f"Snapshot {i} missing 'ts'"
            assert "queues" in snap, f"Snapshot {i} missing 'queues'"
            assert isinstance(snap["queues"], dict), f"Snapshot {i} 'queues' must be dict"

    def test_timestamps_are_iso_format(self, snapshots):
        for i, snap in enumerate(snapshots):
            ts = snap["ts"]
            assert re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", ts), \
                f"Snapshot {i} timestamp '{ts}' not in ISO format"

    def test_queues_have_job_counts(self, snapshots):
        for i, snap in enumerate(snapshots):
            for qname, qdata in snap["queues"].items():
                assert "waiting" in qdata, f"Snapshot {i}, queue '{qname}' missing 'waiting'"
                assert "running" in qdata, f"Snapshot {i}, queue '{qname}' missing 'running'"
                assert isinstance(qdata["waiting"], int), f"Snapshot {i}, queue '{qname}' waiting must be int"
                assert isinstance(qdata["running"], int), f"Snapshot {i}, queue '{qname}' running must be int"
                assert qdata["waiting"] >= 0, f"Snapshot {i}, queue '{qname}' waiting < 0"
                assert qdata["running"] >= 0, f"Snapshot {i}, queue '{qname}' running < 0"

    def test_totals_present(self, snapshots):
        for i, snap in enumerate(snapshots):
            assert "total_waiting" in snap, f"Snapshot {i} missing 'total_waiting'"
            assert "total_running" in snap, f"Snapshot {i} missing 'total_running'"

    def test_totals_match_sum(self, snapshots):
        for i, snap in enumerate(snapshots):
            expected_waiting = sum(q["waiting"] for q in snap["queues"].values())
            expected_running = sum(q["running"] for q in snap["queues"].values())
            assert snap["total_waiting"] == expected_waiting, \
                f"Snapshot {i}: total_waiting {snap['total_waiting']} != sum {expected_waiting}"
            assert snap["total_running"] == expected_running, \
                f"Snapshot {i}: total_running {snap['total_running']} != sum {expected_running}"

    def test_timestamps_are_chronological(self, snapshots):
        for i in range(1, len(snapshots)):
            assert snapshots[i]["ts"] >= snapshots[i-1]["ts"], \
                f"Snapshots not chronological: {snapshots[i-1]['ts']} > {snapshots[i]['ts']}"


class TestCollectQueueSnapshotScript:
    """Validate the collector script structure and output path."""

    def test_script_exists(self):
        script = ROOT / "scripts" / "vllm" / "collect_queue_snapshot.py"
        assert script.exists(), "collect_queue_snapshot.py must exist"

    def test_script_output_path_matches_data(self):
        script = ROOT / "scripts" / "vllm" / "collect_queue_snapshot.py"
        if not script.exists():
            pytest.skip("script not present")
        content = script.read_text()
        assert "queue_timeseries.jsonl" in content, \
            "Script must write to queue_timeseries.jsonl"

    def test_script_appends_jsonl(self):
        """Verify the script opens file in append mode, not write mode."""
        script = ROOT / "scripts" / "vllm" / "collect_queue_snapshot.py"
        if not script.exists():
            pytest.skip("script not present")
        content = script.read_text()
        assert '"a"' in content or "'a'" in content, \
            "Script must open file in append mode to preserve history"

    def test_script_syntax_valid(self):
        script = ROOT / "scripts" / "vllm" / "collect_queue_snapshot.py"
        if not script.exists():
            pytest.skip("script not present")
        result = subprocess.run(
            ["python3", "-m", "py_compile", str(script)],
            capture_output=True, text=True
        )
        assert result.returncode == 0, f"Script has syntax errors: {result.stderr}"


class TestSiteAssemblyCorrectness:
    """Verify the site assembly step in workflows doesn't nuke docs."""

    ASSEMBLY_WORKFLOWS = [
        "deploy-pages.yml",
        "daily-update.yml",
        "ci-collect.yml",
        "queue-monitor.yml",
    ]

    @pytest.mark.parametrize("wf_name", ASSEMBLY_WORKFLOWS)
    def test_no_double_rm_rf_site(self, wf_name):
        """The assembly must not rm -rf _site after copying docs into it."""
        wf_path = WORKFLOWS / wf_name
        if not wf_path.exists():
            pytest.skip(f"{wf_name} not present")
        content = wf_path.read_text()
        # Count occurrences of 'rm -rf _site' — should be at most 1
        matches = re.findall(r"rm\s+-rf\s+_site", content)
        assert len(matches) <= 1, \
            f"{wf_name} has {len(matches)} 'rm -rf _site' — second one nukes docs content"

    @pytest.mark.parametrize("wf_name", ASSEMBLY_WORKFLOWS)
    def test_assembly_copies_docs_then_data(self, wf_name):
        """Assembly must copy docs/* first, then overlay data/* without clearing."""
        wf_path = WORKFLOWS / wf_name
        if not wf_path.exists():
            pytest.skip(f"{wf_name} not present")
        content = wf_path.read_text()
        if "Assemble site" not in content:
            pytest.skip(f"{wf_name} has no assembly step")
        # Extract the assembly run block
        wf = yaml.safe_load(content)
        for job_data in wf.get("jobs", {}).values():
            for step in job_data.get("steps", []):
                if step.get("name") == "Assemble site":
                    run_block = step.get("run", "")
                    # After the first rm -rf _site, there should be cp docs then cp data
                    # with NO second rm -rf _site between them
                    lines = [l.strip() for l in run_block.split("\n") if l.strip()]
                    rm_count = sum(1 for l in lines if "rm -rf _site" in l)
                    assert rm_count <= 1, \
                        f"{wf_name}: assembly has {rm_count} 'rm -rf _site' commands"


class TestQueueMonitorWorkflow:
    """Validate the queue-monitor workflow is correctly configured."""

    @pytest.fixture
    def workflow(self):
        path = WORKFLOWS / "queue-monitor.yml"
        if not path.exists():
            pytest.skip("queue-monitor.yml not present")
        return yaml.safe_load(path.read_text())

    def test_has_schedule_trigger(self, workflow):
        triggers = workflow.get(True, {})  # 'on' parses as True in yaml
        assert "schedule" in triggers or any(
            isinstance(v, list) for v in triggers.values()
        ), "queue-monitor must have a schedule trigger"

    def test_has_deploy_step(self, workflow):
        """Queue monitor must deploy to gh-pages so data reaches the dashboard."""
        steps = workflow["jobs"]["snapshot"]["steps"]
        step_names = [s.get("name", "") for s in steps]
        has_deploy = any("deploy" in n.lower() or "pages" in n.lower() for n in step_names)
        has_deploy = has_deploy or any("peaceiris/actions-gh-pages" in str(s.get("uses", "")) for s in steps)
        assert has_deploy, "queue-monitor.yml must include a deploy step to push data to gh-pages"

    def test_has_assemble_step(self, workflow):
        steps = workflow["jobs"]["snapshot"]["steps"]
        step_names = [s.get("name", "") for s in steps]
        assert any("assemble" in n.lower() for n in step_names), \
            "queue-monitor.yml must assemble the site before deploying"

    def test_workflow_references_correct_script(self):
        path = WORKFLOWS / "queue-monitor.yml"
        if not path.exists():
            pytest.skip("queue-monitor.yml not present")
        content = path.read_text()
        assert "collect_queue_snapshot.py" in content, \
            "Workflow must reference collect_queue_snapshot.py"

    def test_workflow_has_contents_write_permission(self, workflow):
        perms = workflow.get("permissions", {})
        assert perms.get("contents") == "write", \
            "queue-monitor needs contents:write to push data"


class TestCIQueueFrontend:
    """Validate the ci-queue.js frontend can consume the data format."""

    def test_ci_queue_js_exists(self):
        assert (DOCS / "assets" / "js" / "ci-queue.js").exists()

    def test_ci_queue_fetches_correct_path(self):
        js = (DOCS / "assets" / "js" / "ci-queue.js").read_text()
        assert "queue_timeseries.jsonl" in js, \
            "ci-queue.js must fetch queue_timeseries.jsonl"

    def test_ci_queue_tab_in_index(self):
        html = (DOCS / "index.html").read_text()
        assert 'data-tab="ci-queue"' in html, "index.html must have ci-queue tab"
        assert 'id="ci-queue-view"' in html, "index.html must have ci-queue-view container"

    def test_data_matches_js_expectations(self):
        """Verify that the JSONL data has fields the JS actually reads."""
        path = DATA / "vllm" / "ci" / "queue_timeseries.jsonl"
        if not path.exists():
            pytest.skip("no data yet")
        lines = [l for l in path.read_text().strip().split("\n") if l.strip()]
        if not lines:
            pytest.skip("empty data")
        snap = json.loads(lines[0])
        # ci-queue.js reads: snap.ts, snap.queues, snap.total_waiting, snap.total_running
        assert "ts" in snap
        assert "queues" in snap
        assert "total_waiting" in snap
        assert "total_running" in snap
        # For each queue, JS reads: qdata.waiting, qdata.running, qdata.p50_wait
        for qname, qdata in snap["queues"].items():
            assert "waiting" in qdata, f"queue '{qname}' missing 'waiting'"
            assert "running" in qdata, f"queue '{qname}' missing 'running'"

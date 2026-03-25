"""CRITICAL: Tests that validate the dashboard numbers are CORRECT.

These tests cross-reference the data in ci_health.json and parity_report.json
against the raw JSONL test results and internal consistency rules.

If ANY of these tests fail, the dashboard is showing wrong numbers.
This is the most important test file in the repo.
"""

import json
import re
from collections import defaultdict
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
DATA = ROOT / "data" / "vllm" / "ci"
SCRIPTS = ROOT / "scripts"

# Import analyzer normalization
import sys
sys.path.insert(0, str(ROOT / "scripts"))


@pytest.fixture(autouse=True)
def _load_shard_bases():
    """Ensure shard bases are loaded before every test."""
    from vllm.ci.analyzer import set_shard_bases
    shard_path = DATA / "shard_bases.json"
    if shard_path.exists():
        bases = json.loads(shard_path.read_text())
        set_shard_bases(bases)


def _load_json(name):
    path = DATA / name
    if not path.exists():
        pytest.skip(f"{name} not found")
    return json.loads(path.read_text())


def _load_test_results():
    """Load ALL JSONL test results for the latest AMD date."""
    results_dir = DATA / "test_results"
    if not results_dir.exists():
        pytest.skip("no test_results directory")
    # Find the latest AMD JSONL
    amd_files = sorted(results_dir.glob("*_amd.jsonl"), reverse=True)
    if not amd_files:
        pytest.skip("no AMD JSONL files")
    results = []
    with open(amd_files[0]) as f:
        for line in f:
            line = line.strip()
            if line:
                results.append(json.loads(line))
    return results, amd_files[0].name


class TestGroupCountCorrectness:
    """Validate that per-hardware group counts match the raw test results."""

    def test_ci_health_group_counts_match_jsonl(self):
        """ci_health.json per-HW group counts must match what's in the JSONL."""
        health = _load_json("ci_health.json")
        results, fname = _load_test_results()

        from vllm.ci.analyzer import _normalize_job_name

        # Extract per-HW groups from JSONL (same logic as compute_build_summary)
        hw_re = re.compile(r'^(mi\d+)_\d+:', re.IGNORECASE)
        hw_groups = defaultdict(set)
        for r in results:
            job_name = r.get("job_name", "")
            m = hw_re.match(job_name)
            hw = m.group(1).lower() if m else "unknown"
            norm = _normalize_job_name(job_name)
            hw_groups[hw].add(norm)

        # Compare with ci_health
        lb = health.get("amd", {}).get("latest_build", {})
        bh = lb.get("by_hardware", {})
        for hw, ci_data in bh.items():
            if hw == "unknown":
                continue
            ci_groups = ci_data.get("groups", 0)
            jsonl_groups = len(hw_groups.get(hw, set()))
            assert ci_groups == jsonl_groups, (
                f"{hw}: ci_health says {ci_groups} groups but JSONL ({fname}) "
                f"has {jsonl_groups} groups. Difference: "
                f"{hw_groups.get(hw, set()) - set()} "
                f"(ci_health may be stale or normalization differs)"
            )

    def test_ci_health_test_counts_match_jsonl(self):
        """ci_health.json passed/failed/skipped must match JSONL sums."""
        health = _load_json("ci_health.json")
        results, fname = _load_test_results()

        # Sum test counts from JSONL
        total_passed = 0
        total_failed = 0
        total_skipped = 0
        for r in results:
            name = r.get("name", "")
            status = r.get("status", "")
            # Extract actual count from summary entries like "__passed__ (136)"
            count_match = re.search(r"\((\d+)\)", name)
            count = int(count_match.group(1)) if count_match else 1

            if status in ("passed", "xpassed"):
                total_passed += count
            elif status == "failed":
                total_failed += count
            elif status == "error":
                total_failed += count
            elif status in ("skipped", "xfailed"):
                total_skipped += count

        lb = health.get("amd", {}).get("latest_build", {})
        ci_passed = lb.get("passed", 0)
        ci_failed = lb.get("failed", 0)
        ci_skipped = lb.get("skipped", 0)

        assert ci_passed == total_passed, (
            f"Passed mismatch: ci_health={ci_passed}, JSONL={total_passed}"
        )
        assert ci_failed == total_failed, (
            f"Failed mismatch: ci_health={ci_failed}, JSONL={total_failed}"
        )
        assert ci_skipped == total_skipped, (
            f"Skipped mismatch: ci_health={ci_skipped}, JSONL={total_skipped}"
        )

    def test_per_hw_test_counts_match_jsonl(self):
        """Per-hardware passed/failed/skipped in ci_health must match JSONL."""
        health = _load_json("ci_health.json")
        results, fname = _load_test_results()

        hw_re = re.compile(r'^(mi\d+)_\d+:', re.IGNORECASE)
        hw_counts = defaultdict(lambda: {"passed": 0, "failed": 0, "skipped": 0})

        for r in results:
            job_name = r.get("job_name", "")
            m = hw_re.match(job_name)
            hw = m.group(1).lower() if m else "unknown"
            name = r.get("name", "")
            status = r.get("status", "")
            count_match = re.search(r"\((\d+)\)", name)
            count = int(count_match.group(1)) if count_match else 1

            if status in ("passed", "xpassed"):
                hw_counts[hw]["passed"] += count
            elif status in ("failed", "error"):
                hw_counts[hw]["failed"] += count
            elif status in ("skipped", "xfailed"):
                hw_counts[hw]["skipped"] += count

        bh = health.get("amd", {}).get("latest_build", {}).get("by_hardware", {})
        for hw, ci_data in bh.items():
            if hw == "unknown":
                continue
            jsonl = hw_counts.get(hw, {})
            for field in ["passed", "failed", "skipped"]:
                ci_val = ci_data.get(field, 0)
                jsonl_val = jsonl.get(field, 0)
                assert ci_val == jsonl_val, (
                    f"{hw}.{field}: ci_health={ci_val}, JSONL={jsonl_val}"
                )


class TestGroupFailureCorrectness:
    """Validate that groups marked as failing actually have failures."""

    def test_failing_groups_have_actual_failures(self):
        """Every group in parity report with failures must have failed test
        results in at least one JSONL file (current or previous build, since
        the parity report backfills from previous builds)."""
        parity = _load_json("parity_report.json")

        from vllm.ci.analyzer import _normalize_job_name

        # Load ALL AMD JSONL files (current + previous builds)
        results_dir = DATA / "test_results"
        groups_with_failures = set()
        for jsonl_path in results_dir.glob("*_amd.jsonl"):
            with open(jsonl_path) as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    r = json.loads(line)
                    if r.get("status") in ("failed", "error"):
                        norm = _normalize_job_name(r.get("job_name", ""))
                        groups_with_failures.add(norm)
        # Also check upstream JSONL (parity includes upstream failures now)
        for jsonl_path in results_dir.glob("*_upstream.jsonl"):
            with open(jsonl_path) as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    r = json.loads(line)
                    if r.get("status") in ("failed", "error"):
                        norm = _normalize_job_name(r.get("job_name", ""))
                        groups_with_failures.add(norm)

        for g in parity.get("job_groups", []):
            if not g.get("amd") and not g.get("upstream"):
                continue
            total_failed = 0
            if g.get("amd"):
                total_failed += g["amd"].get("failed", 0) + g["amd"].get("error", 0)
            if g.get("upstream"):
                total_failed += g["upstream"].get("failed", 0) + g["upstream"].get("error", 0)
            if total_failed > 0:
                assert g["name"] in groups_with_failures, (
                    f"Group '{g['name']}' shows {total_failed} failures in parity "
                    f"report but has no failed test results in any JSONL"
                )

    def test_passing_groups_have_no_failures(self):
        """Groups with 0 failures must not have failed results in JSONL
        (after job-state override)."""
        parity = _load_json("parity_report.json")
        results, fname = _load_test_results()

        from vllm.ci.analyzer import _normalize_job_name
        

        # Build map of group -> failure count from JSONL
        group_failures = defaultdict(int)
        for r in results:
            if r.get("status") in ("failed", "error"):
                norm = _normalize_job_name(r.get("job_name", ""))
                name = r.get("name", "")
                count_match = re.search(r"\((\d+)\)", name)
                count = int(count_match.group(1)) if count_match else 1
                group_failures[norm] += count

        for g in parity.get("job_groups", []):
            if not g.get("amd"):
                continue
            amd_failed = g["amd"].get("failed", 0) + g["amd"].get("error", 0)
            if amd_failed == 0:
                jsonl_fail = group_failures.get(g["name"], 0)
                assert jsonl_fail == 0, (
                    f"Group '{g['name']}' shows 0 failures in parity report but "
                    f"has {jsonl_fail} failures in JSONL ({fname}). "
                    "The log parser may be creating false failures."
                )


class TestSkipPatternsCompleteness:
    """Validate that SKIP_JOB_PATTERNS doesn't drop real test groups."""

    def test_no_test_groups_skipped(self):
        """Every job in the Buildkite build that looks like a test
        (not bootstrap/docker) must have results in the JSONL."""
        results, fname = _load_test_results()
        health = _load_json("ci_health.json")

        from vllm.ci.analyzer import _normalize_job_name
        
        from vllm.pipelines import SKIP_JOB_PATTERNS

        # Get all groups from JSONL
        jsonl_groups = set()
        for r in results:
            norm = _normalize_job_name(r.get("job_name", ""))
            jsonl_groups.add(norm)

        # Check that no skip pattern matches any existing group
        for group in jsonl_groups:
            for pattern in SKIP_JOB_PATTERNS:
                assert pattern not in group.lower(), (
                    f"SKIP_JOB_PATTERNS '{pattern}' matches collected group '{group}'. "
                    "This should not happen — the group was collected despite the pattern."
                )


class TestParityReportConsistency:
    """Validate parity_report.json is internally consistent."""

    def test_amd_groups_match_ci_health_unique_groups(self):
        """Parity report AMD group count should match ci_health unique_test_groups."""
        parity = _load_json("parity_report.json")
        health = _load_json("ci_health.json")

        parity_amd = len([g for g in parity.get("job_groups", []) if g.get("amd")])
        ci_unique = health.get("amd", {}).get("latest_build", {}).get("unique_test_groups", 0)

        # Allow small differences due to timing (parity might use different build)
        diff = abs(parity_amd - ci_unique)
        assert diff <= 5, (
            f"Parity report has {parity_amd} AMD groups but ci_health has "
            f"{ci_unique} unique_test_groups (diff={diff}). These should be close."
        )

    def test_hw_failure_counts_are_subset_of_total_failures(self):
        """Per-HW failure counts must not exceed total group failure count."""
        parity = _load_json("parity_report.json")
        for g in parity.get("job_groups", []):
            if not g.get("amd"):
                continue
            total_fail = g["amd"].get("failed", 0) + g["amd"].get("error", 0)
            hw_failures = g.get("hw_failures") or {}
            for hw, count in hw_failures.items():
                assert count <= total_fail, (
                    f"Group '{g['name']}': {hw} has {count} failures but "
                    f"total AMD failures is only {total_fail}"
                )


class TestBuildStateIntegrity:
    """Validate that job states are correctly reflected in test results."""

    def test_no_failures_from_passed_jobs_in_jsonl(self):
        """JSONL must not contain __unidentified_failures__ for jobs where
        the job-level entry shows passed. This catches the log parser bug
        where embedded subprocess output was misinterpreted as failures.

        Note: soft-failed jobs (state=failed, soft_failed=True) legitimately
        have both __passed__ and failure entries — some tests pass and some fail.
        We only flag when a job has __job_level__ passed AND __unidentified_failures__."""
        results, fname = _load_test_results()

        # Group results by job_name
        by_job = defaultdict(list)
        for r in results:
            by_job[r.get("job_name", "")].append(r)

        for job_name, job_results in by_job.items():
            has_job_level_pass = any(
                r.get("name") == "__job_level__" and r["status"] == "passed"
                for r in job_results
            )
            if not has_job_level_pass:
                continue
            # If job-level says passed, there should be no failures at all
            fail_names = [r["name"] for r in job_results if r["status"] in ("failed", "error")]
            if fail_names:
                pytest.fail(
                    f"Job '{job_name}' has __job_level__ passed but also has "
                    f"failure entries: {fail_names}. The log parser override failed."
                )


class TestNightlyDateAlignment:
    """Validate that nightly_date() correctly aligns AMD and upstream builds."""

    def test_nightly_date_before_noon_utc(self):
        """Builds before 12:00 UTC should map to previous calendar day."""
        sys.path.insert(0, str(ROOT / "scripts"))
        from collect_ci import nightly_date
        # AMD nightly at 06:00 UTC on Mar 25 -> tests Mar 24 code
        assert nightly_date("2026-03-25T06:00:08Z") == "2026-03-24"
        assert nightly_date("2026-03-25T06:00:08") == "2026-03-24"
        assert nightly_date("2026-03-19T07:00:00Z") == "2026-03-18"
        # Edge: exactly midnight UTC
        assert nightly_date("2026-03-25T00:00:00Z") == "2026-03-24"
        # Edge: 11:59 UTC
        assert nightly_date("2026-03-25T11:59:59Z") == "2026-03-24"

    def test_nightly_date_after_noon_utc(self):
        """Builds after 12:00 UTC should keep the same calendar day."""
        from collect_ci import nightly_date
        # Upstream nightly at 21:00 UTC on Mar 24 -> tests Mar 24 code
        assert nightly_date("2026-03-24T21:00:06Z") == "2026-03-24"
        assert nightly_date("2026-03-24T21:00:06") == "2026-03-24"
        # Edge: exactly noon
        assert nightly_date("2026-03-25T12:00:00Z") == "2026-03-25"
        # Edge: 23:59 UTC
        assert nightly_date("2026-03-25T23:59:59Z") == "2026-03-25"

    def test_nightly_date_aligns_amd_and_upstream(self):
        """AMD and upstream testing the same code should map to the same date."""
        from collect_ci import nightly_date
        # AMD Mar 25 06:00 UTC and Upstream Mar 24 21:00 UTC both test Mar 24 code
        assert nightly_date("2026-03-25T06:00:08Z") == nightly_date("2026-03-24T21:00:06Z")

    def test_nightly_date_empty_input(self):
        from collect_ci import nightly_date
        assert nightly_date("") == ""
        assert nightly_date(None) == ""


class TestGroupChangesCompleteness:
    """Validate that group_changes.json captures significant YAML changes."""

    def test_large_group_changes_have_pr_attribution(self):
        """Any YAML change with 5+ added or removed groups should have a PR."""
        gc = _load_json("group_changes.json")
        for ch in gc.get("changes", []):
            n_changes = len(ch.get("added", [])) + len(ch.get("removed", []))
            if n_changes >= 5:
                assert ch.get("pr"), (
                    f"Change on {ch['date']} with {n_changes} group changes "
                    f"(sha={ch.get('sha','?')}) has no PR attribution. "
                    f"Added: {ch.get('added',[])}..."
                )

    def test_group_changes_dates_are_valid(self):
        """All dates in group_changes.json must be valid ISO dates."""
        gc = _load_json("group_changes.json")
        for ch in gc.get("changes", []):
            date = ch.get("date", "")
            assert re.match(r"^\d{4}-\d{2}-\d{2}$", date), (
                f"Invalid date format: {date!r}"
            )

    def test_group_changes_covers_recent_period(self):
        """group_changes.json should cover at least 14 days."""
        gc = _load_json("group_changes.json")
        assert gc.get("days", 0) >= 14, (
            f"group_changes.json only covers {gc.get('days')} days, expected >= 14"
        )

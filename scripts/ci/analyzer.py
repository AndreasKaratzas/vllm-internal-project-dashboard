"""Test health analysis: labeling, parity comparison, trend detection.

Core analysis engine for the CI dashboard backend.
"""

import logging
from collections import defaultdict
from datetime import datetime
from typing import Optional

import yaml

from . import config as cfg
from .models import BuildSummary, ParityEntry, TestHealth, TestResult

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Test health labeling
# ---------------------------------------------------------------------------

def _extract_module(test_id: str) -> str:
    """Extract module/area from a test_id like 'tests.models.test_llama::test_foo'."""
    parts = test_id.split("::")
    classname = parts[0] if parts else test_id
    # Use first two dotted segments as module
    segments = classname.split(".")
    if len(segments) >= 2:
        return ".".join(segments[:2])
    return segments[0] if segments else "unknown"


def label_test_health(
    test_id: str,
    history: list[str],
    dates: list[str],
    durations: list[float],
) -> TestHealth:
    """Assign a health label to a test based on its recent history.

    Args:
        test_id: Canonical test identifier
        history: List of statuses (oldest first), e.g. ["passed", "passed", "failed"]
        dates: Corresponding dates for each status
        durations: Corresponding durations for each status

    Returns:
        TestHealth object with computed label and metrics
    """
    appearances = len(history)

    # Use the most recent FLAKY_WINDOW entries for analysis
    window = history[-cfg.FLAKY_WINDOW:]
    window_dates = dates[-cfg.FLAKY_WINDOW:]

    # Count statuses in window
    pass_count = sum(1 for s in window if s in ("passed", "xpassed"))
    fail_count = sum(1 for s in window if s in ("failed", "error"))
    skip_count = sum(1 for s in window if s in ("skipped", "xfailed"))
    active_count = pass_count + fail_count  # exclude skips from rate calc

    # All skipped
    if active_count == 0 and skip_count > 0:
        label = "skipped"
        pass_rate = 0.0
    elif active_count == 0:
        label = "skipped"
        pass_rate = 0.0
    else:
        pass_rate = pass_count / active_count

        if appearances <= 2:
            label = "new_test"
        elif pass_rate >= cfg.FLAKY_MAX_RATE:
            # Check if it was recently fixed (failing before, passing now)
            prior = history[:-cfg.NEW_FAILURE_WINDOW] if len(history) > cfg.NEW_FAILURE_WINDOW else []
            recent = history[-cfg.NEW_FAILURE_WINDOW:]
            prior_had_failures = any(s in ("failed", "error") for s in prior[-cfg.FLAKY_WINDOW:])
            recent_all_pass = all(s in ("passed", "xpassed", "skipped", "xfailed") for s in recent)
            if prior_had_failures and recent_all_pass:
                label = "fixed"
            else:
                label = "passing"
        elif pass_rate <= cfg.FLAKY_MIN_RATE:
            # Check if this is a new failure (was passing before)
            # Look at history BEFORE the current window
            prior = history[:-cfg.FLAKY_WINDOW] if len(history) > cfg.FLAKY_WINDOW else []
            if prior:
                prior_pass = sum(1 for s in prior if s in ("passed", "xpassed"))
                prior_active = sum(1 for s in prior if s in ("passed", "xpassed", "failed", "error"))
                prior_rate = prior_pass / prior_active if prior_active > 0 else 0
                if prior_rate >= cfg.FLAKY_MAX_RATE:
                    label = "new_failure"
                else:
                    label = "failing"
            else:
                label = "failing"
        else:
            label = "flaky"

    # Compute failure streak (consecutive failures from most recent)
    failure_streak = 0
    for s in reversed(history):
        if s in ("failed", "error"):
            failure_streak += 1
        else:
            break

    # First failure date in current streak
    first_failure = None
    if failure_streak > 0:
        idx = len(history) - failure_streak
        if idx < len(dates):
            first_failure = dates[idx]

    # Mean duration (excluding zero/skip)
    valid_durations = [d for d in durations if d > 0]
    mean_dur = sum(valid_durations) / len(valid_durations) if valid_durations else 0.0

    # Compact history for display (last FLAKY_WINDOW entries)
    compact_history = []
    for s in window:
        if s in ("passed", "xpassed"):
            compact_history.append("P")
        elif s in ("failed", "error"):
            compact_history.append("F")
        elif s == "skipped":
            compact_history.append("S")
        elif s == "xfailed":
            compact_history.append("X")
        else:
            compact_history.append("?")

    return TestHealth(
        test_id=test_id,
        label=label,
        pass_rate=pass_rate,
        appearances=appearances,
        last_seen=dates[-1] if dates else "",
        first_failure=first_failure,
        failure_streak=failure_streak,
        history=compact_history,
        module=_extract_module(test_id),
        mean_duration=mean_dur,
    )


# ---------------------------------------------------------------------------
# Build health across all tests
# ---------------------------------------------------------------------------

def compute_all_test_health(
    results_by_build: list[tuple[int, str, list[TestResult]]],
) -> list[TestHealth]:
    """Compute health labels for all tests across multiple builds.

    Args:
        results_by_build: List of (build_number, date, results) tuples,
                          sorted oldest-first.

    Returns:
        List of TestHealth objects.
    """
    # Collect per-test history
    test_history: dict[str, list[str]] = defaultdict(list)
    test_dates: dict[str, list[str]] = defaultdict(list)
    test_durations: dict[str, list[float]] = defaultdict(list)

    for build_num, date, results in results_by_build:
        # Get the status per test for this build (use worst status if duplicates)
        build_tests: dict[str, tuple[str, float]] = {}
        for r in results:
            existing = build_tests.get(r.test_id)
            if existing is None:
                build_tests[r.test_id] = (r.status, r.duration_secs)
            else:
                # Keep the worst status (failed > error > skipped > passed)
                priority = {"failed": 0, "error": 1, "xfailed": 2, "skipped": 3, "xpassed": 4, "passed": 5}
                if priority.get(r.status, 5) < priority.get(existing[0], 5):
                    build_tests[r.test_id] = (r.status, r.duration_secs)

        for test_id, (status, duration) in build_tests.items():
            test_history[test_id].append(status)
            test_dates[test_id].append(date)
            test_durations[test_id].append(duration)

    # Label each test
    health_list = []
    for test_id in sorted(test_history.keys()):
        health = label_test_health(
            test_id,
            test_history[test_id],
            test_dates[test_id],
            test_durations[test_id],
        )
        health_list.append(health)

    return health_list


# ---------------------------------------------------------------------------
# Parity computation
# ---------------------------------------------------------------------------

def compute_parity(
    amd_results: list[TestResult],
    upstream_results: list[TestResult],
) -> dict:
    """Compare AMD vs upstream test results for parity analysis.

    Args:
        amd_results: Test results from the latest AMD nightly
        upstream_results: Test results from the latest upstream nightly

    Returns:
        Parity report dict with summary, per-module breakdown, and details.
    """
    # Build test_id -> best status maps
    def best_status(results: list[TestResult]) -> dict[str, str]:
        status_map = {}
        priority = {"passed": 0, "xpassed": 1, "failed": 2, "error": 3, "skipped": 4, "xfailed": 5}
        for r in results:
            existing = status_map.get(r.test_id)
            if existing is None or priority.get(r.status, 5) < priority.get(existing, 5):
                status_map[r.test_id] = r.status
        return status_map

    amd_map = best_status(amd_results)
    upstream_map = best_status(upstream_results)

    all_tests = set(amd_map.keys()) | set(upstream_map.keys())

    entries = []
    summary = defaultdict(int)
    module_stats = defaultdict(lambda: defaultdict(int))

    for test_id in sorted(all_tests):
        amd_s = amd_map.get(test_id, "missing")
        up_s = upstream_map.get(test_id, "missing")

        if amd_s == "missing":
            category = "upstream_only"
        elif up_s == "missing":
            category = "amd_only"
        elif amd_s in ("passed", "xpassed") and up_s in ("passed", "xpassed"):
            category = "both_pass"
        elif amd_s in ("failed", "error") and up_s in ("failed", "error"):
            category = "both_fail"
        elif amd_s in ("failed", "error") and up_s in ("passed", "xpassed"):
            category = "amd_regression"
        elif amd_s in ("passed", "xpassed") and up_s in ("failed", "error"):
            category = "amd_advantage"
        elif amd_s in ("skipped", "xfailed") and up_s in ("skipped", "xfailed"):
            category = "both_skip"
        else:
            category = "mixed"

        entries.append(ParityEntry(
            test_id=test_id,
            amd_status=amd_s,
            upstream_status=up_s,
            category=category,
        ))

        summary[category] += 1
        module = _extract_module(test_id)
        module_stats[module][category] += 1

    # Parity % = tests passing on both / tests passing on upstream
    upstream_passing = summary.get("both_pass", 0) + summary.get("amd_regression", 0)
    parity_pct = (
        round(summary.get("both_pass", 0) / upstream_passing * 100, 1)
        if upstream_passing > 0 else 0.0
    )

    # Per-module parity
    by_module = {}
    for module, cats in sorted(module_stats.items()):
        mod_up_passing = cats.get("both_pass", 0) + cats.get("amd_regression", 0)
        mod_parity = (
            round(cats.get("both_pass", 0) / mod_up_passing * 100, 1)
            if mod_up_passing > 0 else 100.0
        )
        by_module[module] = {
            "parity_pct": mod_parity,
            **{k: v for k, v in sorted(cats.items())},
        }

    # Job-group-level parity: compare per-job counts between AMD and upstream
    job_group_parity = _compute_job_group_parity(amd_results, upstream_results)

    return {
        "parity_pct": parity_pct,
        "total_tests": len(all_tests),
        "summary": dict(summary),
        "by_module": by_module,
        "job_groups": job_group_parity,
        "details": [e.to_dict() for e in entries],
    }


def _compute_job_group_parity(
    amd_results: list[TestResult],
    upstream_results: list[TestResult],
) -> list[dict]:
    """Compare test counts per job group between AMD and upstream.

    Groups results by job_name (test group) and compares:
    - Total tests, passed, failed, skipped, xfailed, xpassed, errors
    - Duration (total pytest time)
    """
    def _group_counts(results: list[TestResult]) -> dict[str, dict]:
        groups: dict[str, dict] = {}
        for r in results:
            g = groups.setdefault(r.job_name, {
                "total": 0, "passed": 0, "failed": 0, "skipped": 0,
                "xfailed": 0, "xpassed": 0, "error": 0, "duration": 0.0,
            })
            # For summary entries, extract the count from the name
            if r.name.startswith("__passed__"):
                count = _extract_count(r.name)
                g["passed"] += count
                g["total"] += count
                g["duration"] += r.duration_secs
            elif r.name.startswith("__skipped__"):
                count = _extract_count(r.name)
                g["skipped"] += count
                g["total"] += count
            elif r.name.startswith("__xfailed__"):
                count = _extract_count(r.name)
                g["xfailed"] += count
                g["total"] += count
            elif r.name.startswith("__unidentified_failures__"):
                count = _extract_count(r.name)
                g["failed"] += count
                g["total"] += count
            elif r.name.startswith("__unidentified_errors__"):
                count = _extract_count(r.name)
                g["error"] += count
                g["total"] += count
            elif r.name == "__job_level__":
                # Job-level fallback (no pytest output)
                if r.status == "passed":
                    g["passed"] += 1
                elif r.status == "failed":
                    g["failed"] += 1
                elif r.status == "error":
                    g["error"] += 1
                g["total"] += 1
            else:
                # Individual test (failures/errors identified by name)
                g[r.status] = g.get(r.status, 0) + 1
                g["total"] += 1
        return groups

    amd_groups = _group_counts(amd_results)
    upstream_groups = _group_counts(upstream_results)

    # Normalize job names for matching (strip hardware prefixes like "mi250_1: " or "gpu_1: ")
    import re
    def _normalize_job(name: str) -> str:
        return re.sub(r"^(mi\d+_\d+|gpu_\d+|amd_\w+):\s*", "", name, flags=re.IGNORECASE).strip()

    # Build normalized -> original maps
    amd_norm = {_normalize_job(k): k for k in amd_groups}
    up_norm = {_normalize_job(k): k for k in upstream_groups}

    all_norms = sorted(set(amd_norm.keys()) | set(up_norm.keys()))

    job_parity = []
    for norm_name in all_norms:
        amd_orig = amd_norm.get(norm_name)
        up_orig = up_norm.get(norm_name)
        amd_g = amd_groups.get(amd_orig, {}) if amd_orig else {}
        up_g = upstream_groups.get(up_orig, {}) if up_orig else {}

        entry = {
            "name": norm_name,
            "amd_job_name": amd_orig,
            "upstream_job_name": up_orig,
            "amd": amd_g if amd_g else None,
            "upstream": up_g if up_g else None,
        }

        # Compute delta
        if amd_g and up_g:
            entry["delta"] = {
                "total": amd_g.get("total", 0) - up_g.get("total", 0),
                "passed": amd_g.get("passed", 0) - up_g.get("passed", 0),
                "failed": amd_g.get("failed", 0) - up_g.get("failed", 0),
                "skipped": amd_g.get("skipped", 0) - up_g.get("skipped", 0),
            }
            entry["status"] = "amd_only" if not up_orig else (
                "upstream_only" if not amd_orig else "both"
            )
        elif amd_g:
            entry["status"] = "amd_only"
        else:
            entry["status"] = "upstream_only"

        job_parity.append(entry)

    return job_parity


def _extract_count(name: str) -> int:
    """Extract count from names like '__passed__ (136)'."""
    import re
    m = re.search(r"\((\d+)\)", name)
    return int(m.group(1)) if m else 1


# ---------------------------------------------------------------------------
# Trend analysis
# ---------------------------------------------------------------------------

def compute_trends(
    build_summaries: list[BuildSummary],
    health_data: list[TestHealth],
) -> dict:
    """Compute failure trends, top offenders, and module health.

    Args:
        build_summaries: Build summaries sorted oldest-first
        health_data: Current health labels for all tests

    Returns:
        Trends dict with top_offenders, new_failures, recently_fixed,
        degrading_modules, and mttf.
    """
    # Top offenders: tests with most failures
    failing_tests = [
        h for h in health_data
        if h.label in ("failing", "new_failure", "flaky")
    ]
    top_offenders = sorted(
        failing_tests,
        key=lambda h: h.failure_streak + (1 - h.pass_rate) * 100,
        reverse=True,
    )[:20]

    # New failures
    new_failures = [h for h in health_data if h.label == "new_failure"]

    # Recently fixed
    recently_fixed = [h for h in health_data if h.label == "fixed"]

    # Degrading modules: aggregate pass rate per module across builds
    module_health = defaultdict(list)
    for h in health_data:
        module_health[h.module].append(h)

    degrading_modules = []
    for module, tests in sorted(module_health.items()):
        pass_rates = [t.pass_rate for t in tests if t.appearances >= 3]
        if not pass_rates:
            continue
        avg_rate = sum(pass_rates) / len(pass_rates)
        failing_count = sum(1 for t in tests if t.label in ("failing", "new_failure"))
        flaky_count = sum(1 for t in tests if t.label == "flaky")
        if failing_count > 0 or flaky_count > 0:
            degrading_modules.append({
                "module": module,
                "avg_pass_rate": round(avg_rate, 4),
                "total_tests": len(tests),
                "failing": failing_count,
                "flaky": flaky_count,
                "passing": sum(1 for t in tests if t.label == "passing"),
            })

    degrading_modules.sort(key=lambda m: m["avg_pass_rate"])

    # MTTF: for fixed tests, estimate days from first_failure to last_seen
    mttf_values = []
    for h in recently_fixed:
        if h.first_failure and h.last_seen:
            try:
                d1 = datetime.fromisoformat(h.first_failure)
                d2 = datetime.fromisoformat(h.last_seen)
                days = (d2 - d1).days
                if days >= 0:
                    mttf_values.append(days)
            except ValueError:
                pass

    mttf = {
        "avg_days": round(sum(mttf_values) / len(mttf_values), 1) if mttf_values else None,
        "median_days": sorted(mttf_values)[len(mttf_values) // 2] if mttf_values else None,
        "count": len(mttf_values),
    }

    # Build pass rate trend
    pass_rate_trend = []
    for bs in build_summaries:
        pass_rate_trend.append({
            "build_number": bs.build_number,
            "date": bs.created_at[:10] if bs.created_at else "",
            "pass_rate": bs.pass_rate,
            "total": bs.total_tests,
            "failed": bs.failed,
        })

    return {
        "top_offenders": [h.to_dict() for h in top_offenders],
        "new_failures": [h.to_dict() for h in new_failures],
        "recently_fixed": [h.to_dict() for h in recently_fixed],
        "degrading_modules": degrading_modules,
        "mttf": mttf,
        "pass_rate_trend": pass_rate_trend,
    }


# ---------------------------------------------------------------------------
# Quarantine
# ---------------------------------------------------------------------------

def load_quarantine(quarantine_path: str) -> dict:
    """Load quarantine/allowlist config from YAML.

    Format:
        quarantine:
          - test_id: "module::test_name"
            reason: "Known issue"
            issue: "https://github.com/..."
            added: "2026-03-01"
            expires: "2026-04-01"
        allowlist:
          - test_id: "module::test_other"
            reason: "Expected AMD failure"
            permanent: true

    Returns:
        Dict with 'quarantine' and 'allowlist' lists.
    """
    try:
        with open(quarantine_path) as f:
            data = yaml.safe_load(f) or {}
    except FileNotFoundError:
        return {"quarantine": [], "allowlist": []}

    return {
        "quarantine": data.get("quarantine", []),
        "allowlist": data.get("allowlist", []),
    }


def apply_quarantine(
    health_data: list[TestHealth],
    quarantine_config: dict,
    today: Optional[str] = None,
) -> tuple[list[TestHealth], dict]:
    """Apply quarantine/allowlist labels to health data.

    Quarantined tests are relabeled so they don't count as failures in metrics.

    Args:
        health_data: List of TestHealth objects
        quarantine_config: Output of load_quarantine()
        today: ISO date string for expiry check (default: now)

    Returns:
        Tuple of (updated health_data, quarantine_report)
    """
    if today is None:
        today = datetime.utcnow().strftime("%Y-%m-%d")

    quarantine_ids = set()
    allowlist_ids = set()
    quarantine_details = []
    allowlist_details = []

    for entry in quarantine_config.get("quarantine", []):
        tid = entry.get("test_id", "")
        expires = entry.get("expires")
        if expires and expires < today:
            continue  # expired
        quarantine_ids.add(tid)
        quarantine_details.append(entry)

    for entry in quarantine_config.get("allowlist", []):
        tid = entry.get("test_id", "")
        allowlist_ids.add(tid)
        allowlist_details.append(entry)

    excluded_from_failures = 0
    for h in health_data:
        if h.test_id in quarantine_ids:
            h.label = "quarantined"
            excluded_from_failures += 1
        elif h.test_id in allowlist_ids:
            h.label = "allowlisted"
            excluded_from_failures += 1

    report = {
        "quarantined_count": len([h for h in health_data if h.label == "quarantined"]),
        "allowlisted_count": len([h for h in health_data if h.label == "allowlisted"]),
        "excluded_from_failures": excluded_from_failures,
        "quarantine_entries": quarantine_details,
        "allowlist_entries": allowlist_details,
    }

    return health_data, report


# ---------------------------------------------------------------------------
# Build summary computation
# ---------------------------------------------------------------------------

def compute_build_summary(
    build: dict,
    test_results: list[TestResult],
    pipeline_key: str,
    previous: Optional[BuildSummary] = None,
) -> BuildSummary:
    """Compute a BuildSummary from a build dict and its test results.

    Args:
        build: Raw Buildkite build dict
        test_results: Parsed test results for this build
        pipeline_key: "amd" or "upstream"
        previous: Previous build summary for computing deltas
    """
    passed = sum(1 for r in test_results if r.status in ("passed", "xpassed"))
    failed = sum(1 for r in test_results if r.status in ("failed", "error"))
    skipped = sum(1 for r in test_results if r.status in ("skipped", "xfailed"))
    errors = sum(1 for r in test_results if r.status == "error")
    total = len(test_results)
    ran = passed + failed
    pass_rate = round(passed / ran, 4) if ran > 0 else 0.0

    duration = sum(r.duration_secs for r in test_results)

    # Wall clock from build timestamps
    created = build.get("created_at", "")
    finished = build.get("finished_at", "")
    wall_clock = 0.0
    if created and finished:
        try:
            t1 = datetime.fromisoformat(created.replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(finished.replace("Z", "+00:00"))
            wall_clock = (t2 - t1).total_seconds()
        except ValueError:
            pass

    # Job-level stats
    jobs = build.get("jobs", [])
    script_jobs = [j for j in jobs if j.get("type") == "script"]
    jobs_passed = sum(1 for j in script_jobs if j.get("state") == "passed")
    jobs_failed = sum(1 for j in script_jobs if j.get("state") in cfg.FAILURE_STATES)

    # Delta vs previous
    delta = {}
    if previous:
        delta = {
            "total": total - previous.total_tests,
            "passed": passed - previous.passed,
            "failed": failed - previous.failed,
            "pass_rate": round(pass_rate - previous.pass_rate, 4),
        }

    slug = cfg.PIPELINES[pipeline_key]["slug"]

    return BuildSummary(
        pipeline=pipeline_key,
        build_number=build.get("number", 0),
        build_url=build.get("web_url", ""),
        branch=build.get("branch", ""),
        commit=build.get("commit", "")[:12],
        created_at=created,
        state=build.get("state", ""),
        total_tests=total,
        passed=passed,
        failed=failed,
        skipped=skipped,
        errors=errors,
        pass_rate=pass_rate,
        duration_secs=round(duration, 1),
        wall_clock_secs=round(wall_clock, 1),
        job_count=len(script_jobs),
        jobs_passed=jobs_passed,
        jobs_failed=jobs_failed,
        delta_vs_previous=delta,
    )

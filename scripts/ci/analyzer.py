"""Test health analysis: labeling, parity comparison, trend detection.

Core analysis engine for the CI dashboard backend.
"""

import logging
import re
from collections import defaultdict
from datetime import datetime
from difflib import SequenceMatcher
from typing import Optional

import yaml

from . import config as cfg
from .models import BuildSummary, ParityEntry, TestHealth, TestResult

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Label normalization (adapted from vllm_ci_parity.py)
# ---------------------------------------------------------------------------

# Known GPU/hardware patterns in parentheses — matches (H100), (mi325), (2xA100), etc.
# Keeps parentheticals like (Standard), (CPU), (8 GPUs) intact.
_HW_TOKEN = (
    r'(?:\d+\s*[xX]\s*)?'                       # optional multiplier: 2x, 4x
    r'(?:H\d+\w*|A\d+\w*|B\d+\w*|L\d+\w*'       # NVIDIA: H100, A100, B200, L40
    r'|MI?\d+\w*|mi\d+\w*'                       # AMD: MI300X, mi325, mi355
    r'|GB\d+\w*|GH\d+\w*'                        # NVIDIA arch: GB200, GH200
    r')'
)
_HW_PATTERN = re.compile(
    r'\s*\(\s*'
    + _HW_TOKEN +
    r'(?:\s*[-]\s*' + _HW_TOKEN + r')*'          # optional dash-separated additional HW
    r'\s*\)',
    re.IGNORECASE,
)

# Hardware prefixes in Buildkite job names: "mi250_1: ", "mi325_8: ", "gpu_1: "
_JOB_PREFIX_RE = re.compile(
    r'^(mi\d+_\d+|mi\d+|gpu_\d+|amd_\w+):\s*',
    re.IGNORECASE,
)


def _normalize_job_name(name: str) -> str:
    """Normalize a Buildkite job name for cross-pipeline matching.

    Strips:
    - Hardware prefixes like 'mi250_1: ', 'gpu_1: '
    - Hardware tags in parens like (H100), (mi325), (A100)
    - Trailing '# comment'
    - '%N' parallelism marker
    - Extra whitespace

    Adapted from vllm_ci_parity.py normalize_label().
    """
    s = _JOB_PREFIX_RE.sub('', name)
    s = re.sub(r'#.*$', '', s).strip()
    s = re.sub(r'\s*%N\s*$', '', s).strip()
    s = _HW_PATTERN.sub('', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s.lower()


def commands_similarity(cmds_a: list[str], cmds_b: list[str]) -> float:
    """Compare two command lists, ignoring env-specific differences.

    Adapted from vllm_ci_parity.py commands_similarity().
    """
    def clean(cmd: str) -> str:
        cmd = re.sub(r'export\s+\w+=\S+', '', cmd).strip()
        cmd = re.sub(r'(CUDA_VISIBLE_DEVICES|HIP_VISIBLE_DEVICES)=\S+\s*', '', cmd)
        cmd = re.sub(r'--shard-id=\$\$\w+', '--shard-id=N', cmd)
        cmd = re.sub(r'--num-shards=\$\$\w+', '--num-shards=N', cmd)
        return cmd.strip()

    filtered_a = [clean(c) for c in cmds_a if clean(c)]
    filtered_b = [clean(c) for c in cmds_b if clean(c)]

    if not filtered_a and not filtered_b:
        return 1.0
    if not filtered_a or not filtered_b:
        return 0.0

    return SequenceMatcher(None, '\n'.join(filtered_a), '\n'.join(filtered_b)).ratio()


def similarity_color(score: float) -> str:
    """Return a color name for a similarity score (for display/reporting)."""
    if score >= 0.9:
        return "green"
    elif score >= 0.7:
        return "yellow"
    elif score >= 0.5:
        return "orange"
    return "red"


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

    # Build normalized -> original maps using full normalize_job_name
    amd_norm = {_normalize_job_name(k): k for k in amd_groups}
    up_norm = {_normalize_job_name(k): k for k in upstream_groups}

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

_HW_FAMILY_RE = re.compile(r'^(mi\d+)_\d+:', re.IGNORECASE)


def _extract_hardware(job_name: str) -> str:
    """Extract hardware family from job name like 'mi250_1: ...' -> 'mi250'."""
    m = _HW_FAMILY_RE.match(job_name)
    return m.group(1).lower() if m else "unknown"


def _actual_count(r: TestResult) -> int:
    """Get the actual test count from a TestResult entry.

    Summary entries like '__passed__ (136)' wrap 136 actual tests.
    Individual named tests count as 1.
    """
    if r.name.startswith("__") and "(" in r.name:
        return _extract_count(r.name)
    return 1


def compute_build_summary(
    build: dict,
    test_results: list[TestResult],
    pipeline_key: str,
    previous: Optional[BuildSummary] = None,
) -> BuildSummary:
    """Compute a BuildSummary from a build dict and its test results.

    Uses actual test counts extracted from summary entries (e.g.,
    '__passed__ (136)' counts as 136, not 1).
    """
    # Count actual tests, not entries
    passed = 0
    failed = 0
    skipped = 0
    errors = 0
    test_groups = len(test_results)  # entry count (old total_tests)

    # Per-hardware breakdown
    hw_counts: dict[str, dict] = {}
    hw_seen_groups: dict[str, set] = defaultdict(set)
    hw_failed_groups: dict[str, set] = defaultdict(set)

    for r in test_results:
        count = _actual_count(r)
        hw = _extract_hardware(r.job_name)

        if hw not in hw_counts:
            hw_counts[hw] = {"passed": 0, "failed": 0, "skipped": 0, "errors": 0, "total": 0, "groups": 0, "groups_failed": 0}

        if r.status in ("passed", "xpassed"):
            passed += count
            hw_counts[hw]["passed"] += count
        elif r.status == "failed":
            failed += count
            hw_counts[hw]["failed"] += count
        elif r.status == "error":
            errors += count
            failed += count
            hw_counts[hw]["errors"] += count
            hw_counts[hw]["failed"] += count
        elif r.status in ("skipped", "xfailed"):
            skipped += count
            hw_counts[hw]["skipped"] += count

        hw_counts[hw]["total"] += count

        # Track groups per HW
        norm = _normalize_job_name(r.job_name).strip()
        hw_seen_groups[hw].add(norm)
        if r.status in ("failed", "error") and ("__unidentified" in r.name or "__job_level__" in r.name):
            hw_failed_groups[hw].add(norm)

    # Add group counts to hw_counts
    for hw in hw_counts:
        hw_counts[hw]["groups"] = len(hw_seen_groups.get(hw, set()))
        hw_counts[hw]["groups_failed"] = len(hw_failed_groups.get(hw, set()))

    total = passed + failed + skipped
    ran = passed + failed
    pass_rate = round(passed / ran, 4) if ran > 0 else 0.0

    # Per-hardware pass rates
    for hw, counts in hw_counts.items():
        hw_ran = counts["passed"] + counts["failed"]
        counts["pass_rate"] = round(counts["passed"] / hw_ran, 4) if hw_ran > 0 else 0.0

    # OR-logic test group pass rate
    # Group by normalized name (strip HW prefix), track per-HW pass/fail
    group_hw_status: dict[str, dict[str, bool]] = defaultdict(dict)
    for r in test_results:
        norm = _normalize_job_name(r.job_name).strip()
        hw = _extract_hardware(r.job_name)
        if r.status in ("passed", "xpassed") and ("__passed__" in r.name or r.name == "__job_level__"):
            group_hw_status[norm][hw] = True
        elif r.status in ("failed", "error") and ("__unidentified" in r.name or "__job_level__" in r.name):
            group_hw_status[norm].setdefault(hw, False)

    unique_test_groups = len(group_hw_status)
    groups_passing_or = 0   # passes on ANY hardware
    groups_passing_all = 0  # passes on ALL hardware
    groups_partial = 0      # passes on some, fails on others
    for name, hw_map in group_hw_status.items():
        any_pass = any(hw_map.values())
        all_pass = all(hw_map.values())
        if any_pass:
            groups_passing_or += 1
        if all_pass:
            groups_passing_all += 1
        if any_pass and not all_pass:
            groups_partial += 1

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
        test_groups=test_groups,
        unique_test_groups=unique_test_groups,
        test_groups_passing_or=groups_passing_or,
        test_groups_passing_all=groups_passing_all,
        test_groups_partial=groups_partial,
        by_hardware=hw_counts,
        delta_vs_previous=delta,
    )

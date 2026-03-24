#!/usr/bin/env python3
"""Collect CI test data from Buildkite and generate dashboard JSON files.

Usage:
    export BUILDKITE_TOKEN="bkua_..."
    python scripts/collect_ci.py --days 7 --output data/vllm/ci/
    python scripts/collect_ci.py --days 1                    # daily incremental
    python scripts/collect_ci.py --dry-run                   # preview what would be fetched
    python scripts/collect_ci.py --pipeline amd --days 3     # single pipeline
"""

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add scripts/ to path so ci/ package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ci import config as cfg
from vllm.ci.buildkite_client import (
    fetch_build_detail,
    fetch_build_jobs,
    fetch_nightly_builds,
)
from vllm.ci.log_parser import parse_job_results
from vllm.ci.analyzer import (
    apply_quarantine,
    compute_all_test_health,
    compute_build_summary,
    compute_parity,
    compute_trends,
    load_quarantine,
)
from vllm.ci.reporter import (
    prune_old_results,
    write_ci_health,
    write_failure_trends,
    write_flaky_tests,
    write_parity_report,
    write_quarantine_report,
    write_test_results,
)
from vllm.ci.models import TestResult
from vllm.pipelines import PIPELINES as VLLM_PIPELINES, BK_ORG as VLLM_ORG, SKIP_JOB_PATTERNS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = ROOT / "data" / "vllm" / "ci"
QUARANTINE_PATH = ROOT / "config" / "quarantine.yaml"

# Configure CI framework with vLLM-specific settings
cfg.configure(VLLM_ORG, VLLM_PIPELINES)


def load_existing_results(results_dir: Path) -> list[tuple[int, str, list[TestResult]]]:
    """Load existing JSONL test results from disk.

    Returns:
        List of (build_number, date, results) tuples sorted oldest-first.
    """
    entries = []
    if not results_dir.exists():
        return entries

    for jsonl_file in sorted(results_dir.glob("*.jsonl")):
        results = []
        # Parse filename: YYYY-MM-DD_pipeline.jsonl
        stem = jsonl_file.stem
        parts = stem.rsplit("_", 1)
        if len(parts) != 2:
            continue
        date = parts[0]

        with open(jsonl_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                d = json.loads(line)
                results.append(TestResult(**d))

        if results:
            build_num = results[0].build_number
            entries.append((build_num, date, results))

    entries.sort(key=lambda x: x[1])  # sort by date
    return entries


def collect_pipeline(
    pipeline_key: str,
    days: int,
    output_dir: Path,
    dry_run: bool = False,
) -> tuple[list[dict], dict[int, list[TestResult]]]:
    """Collect test data for a single pipeline.

    Returns:
        Tuple of (nightly_builds, results_by_build_number)
    """
    log.info("=== Collecting %s pipeline ===", pipeline_key)

    cache_dir = output_dir / ".cache"
    builds = fetch_nightly_builds(pipeline_key, days=days, cache_dir=cache_dir)

    if not builds:
        log.warning("No nightly builds found for %s in the last %d days", pipeline_key, days)
        return [], {}

    log.info("Found %d nightly builds for %s", len(builds), pipeline_key)

    if dry_run:
        for b in builds:
            log.info(
                "  Build #%d: %s — %s (%s)",
                b.get("number", 0),
                b.get("message", "")[:60],
                b.get("state", ""),
                b.get("created_at", "")[:10],
            )
        return builds, {}

    # Check which builds we already have results for
    results_dir = output_dir / "test_results"
    existing_dates = set()
    for f in results_dir.glob("*.jsonl"):
        if f.stem.endswith(f"_{pipeline_key}"):
            existing_dates.add(f.stem.rsplit("_", 1)[0])

    results_by_build: dict[int, list[TestResult]] = {}
    slug = cfg.PIPELINES[pipeline_key]["slug"]

    for build in builds:
        build_num = build.get("number", 0)
        created = build.get("created_at", "")
        date = created[:10] if created else ""
        state = build.get("state", "")

        # Skip if we already have results for this date+pipeline and build is terminal
        if date in existing_dates and state in cfg.TERMINAL_STATES:
            log.info("  Build #%d (%s): cached, skipping", build_num, date)
            # Load existing results
            jsonl_path = results_dir / f"{date}_{pipeline_key}.jsonl"
            if jsonl_path.exists():
                loaded = []
                with open(jsonl_path) as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            loaded.append(TestResult(**json.loads(line)))
                results_by_build[build_num] = loaded
            continue

        # Skip non-terminal builds
        if state not in cfg.TERMINAL_STATES:
            log.info("  Build #%d (%s): state=%s, skipping", build_num, date, state)
            continue

        log.info("  Build #%d (%s): fetching test results...", build_num, date)

        # Fetch full build detail if jobs not included
        if "jobs" not in build or not build["jobs"]:
            build = fetch_build_detail(pipeline_key, build_num)

        jobs = fetch_build_jobs(build)
        # Filter to test jobs (skip bootstrap, docker build, etc.)
        test_jobs = [
            j for j in jobs
            if not any(skip in j.get("name", "").lower() for skip in SKIP_JOB_PATTERNS)
        ]
        log.info("    %d terminal jobs (%d test jobs)", len(jobs), len(test_jobs))

        build_results = []
        jobs_parsed = 0

        for i, job in enumerate(test_jobs):
            job_name = job.get("name", "unknown")

            results = parse_job_results(
                job, build_num, slug, date
            )
            build_results.extend(results)
            if results:
                jobs_parsed += 1

            # Progress every 50 jobs
            if (i + 1) % 50 == 0:
                log.info("    ... %d/%d jobs processed", i + 1, len(test_jobs))

        log.info(
            "    %d jobs parsed, %d test results",
            jobs_parsed, len(build_results),
        )

        if build_results:
            results_by_build[build_num] = build_results
            write_test_results(build_results, date, pipeline_key, results_dir)

    return builds, results_by_build


def main():
    parser = argparse.ArgumentParser(description="Collect vLLM CI test data from Buildkite")
    parser.add_argument("--days", type=int, default=7, help="Days of history to fetch (default: 7)")
    parser.add_argument("--output", type=str, default=str(DEFAULT_OUTPUT), help="Output directory")
    parser.add_argument("--pipeline", choices=["amd", "upstream", "both"], default="both",
                        help="Which pipeline(s) to collect")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be fetched")
    parser.add_argument("--skip-analysis", action="store_true",
                        help="Skip analysis, only collect raw data")
    parser.add_argument("--skip-config-parity", action="store_true",
                        help="Skip YAML config parity analysis")
    args = parser.parse_args()

    output_dir = Path(args.output)
    results_dir = output_dir / "test_results"

    pipelines = ["amd", "upstream"] if args.pipeline == "both" else [args.pipeline]

    # Phase 1: Collect data from Buildkite
    all_builds: dict[str, list[dict]] = {}
    all_results: dict[str, dict[int, list[TestResult]]] = {}

    for pk in pipelines:
        builds, results = collect_pipeline(pk, args.days, output_dir, args.dry_run)
        all_builds[pk] = builds
        all_results[pk] = results

    if args.dry_run:
        log.info("Dry run complete.")
        return

    if args.skip_analysis:
        log.info("Data collection complete (analysis skipped).")
        return

    # Phase 2: Load all results (existing + new) for analysis
    log.info("=== Running analysis ===")

    # For each pipeline, build results_by_build tuples sorted oldest-first
    for pk in pipelines:
        existing = load_existing_results(results_dir)
        # Filter to this pipeline
        pipeline_slug = cfg.PIPELINES[pk]["slug"]
        pipeline_results = [
            (bn, d, rs) for bn, d, rs in existing
            if rs and rs[0].pipeline == pipeline_slug
        ]

        # Merge with newly collected (avoid duplicates by build_number)
        existing_build_nums = {bn for bn, _, _ in pipeline_results}
        for bn, results in all_results.get(pk, {}).items():
            if bn not in existing_build_nums and results:
                date = results[0].date
                pipeline_results.append((bn, date, results))

        pipeline_results.sort(key=lambda x: x[1])

        if pk == "amd":
            amd_by_build = pipeline_results
        else:
            upstream_by_build = pipeline_results

    # Compute health for AMD tests (primary focus)
    amd_health = []
    amd_summaries = []
    if "amd" in pipelines and amd_by_build:
        amd_health = compute_all_test_health(amd_by_build)
        log.info("Computed health for %d AMD tests", len(amd_health))

        # Build summaries
        prev = None
        for bn, date, results in amd_by_build:
            # Find corresponding build dict
            build_dict = next(
                (b for b in all_builds.get("amd", []) if b.get("number") == bn),
                {"number": bn, "created_at": date, "state": "unknown", "jobs": []},
            )
            summary = compute_build_summary(build_dict, results, "amd", prev)
            amd_summaries.append(summary)
            prev = summary
        amd_summaries.reverse()  # newest first for reporting

    upstream_health = []
    upstream_summaries = []
    if "upstream" in pipelines and upstream_by_build:
        upstream_health = compute_all_test_health(upstream_by_build)
        log.info("Computed health for %d upstream tests", len(upstream_health))

        prev = None
        for bn, date, results in upstream_by_build:
            build_dict = next(
                (b for b in all_builds.get("upstream", []) if b.get("number") == bn),
                {"number": bn, "created_at": date, "state": "unknown", "jobs": []},
            )
            summary = compute_build_summary(build_dict, results, "upstream", prev)
            upstream_summaries.append(summary)
            prev = summary
        upstream_summaries.reverse()

    # Apply quarantine
    quarantine_config = load_quarantine(str(QUARANTINE_PATH))
    if amd_health:
        amd_health, quarantine_report = apply_quarantine(amd_health, quarantine_config)
        write_quarantine_report(quarantine_report, output_dir)

    # Phase 3: Generate reports
    log.info("=== Generating reports ===")

    # CI Health
    write_ci_health(amd_summaries, upstream_summaries, amd_health, output_dir)

    # Parity (if both pipelines collected)
    if "amd" in pipelines and "upstream" in pipelines:
        # Use latest build results from each
        latest_amd = amd_by_build[-1][2] if amd_by_build else []
        latest_upstream = upstream_by_build[-1][2] if upstream_by_build else []

        if latest_amd and latest_upstream:
            parity = compute_parity(latest_amd, latest_upstream)
            amd_date = amd_by_build[-1][1] if amd_by_build else ""
            up_date = upstream_by_build[-1][1] if upstream_by_build else ""
            write_parity_report(parity, amd_date, up_date, output_dir)

    # Flaky tests
    if amd_health:
        write_flaky_tests(amd_health, output_dir)

    # Failure trends
    if amd_health:
        trends = compute_trends(amd_summaries, amd_health)
        write_failure_trends(trends, output_dir)

    # YAML config parity (fetches from upstream GitHub)
    if not args.skip_config_parity:
        log.info("Running YAML config parity analysis (fetching from upstream)...")
        from vllm.config_parity import build_config_parity
        config_parity = build_config_parity()
        if "error" not in config_parity:
            config_parity_path = output_dir / "config_parity.json"
            config_parity_path.write_text(json.dumps(config_parity, indent=2))
            log.info(
                "Wrote config_parity.json (match rate: %.1f%%, avg similarity: %.1f%%)",
                config_parity.get("summary", {}).get("match_rate_pct", 0),
                config_parity.get("summary", {}).get("avg_command_similarity_pct", 0),
            )
        else:
            log.warning("Config parity failed: %s", config_parity["error"])

    # Prune old JSONL files
    prune_old_results(results_dir, max_days=cfg.HISTORY_DAYS)

    # Print summary
    _print_summary(amd_summaries, upstream_summaries, amd_health)

    log.info("=== Done ===")


def _print_summary(
    amd_summaries: list,
    upstream_summaries: list,
    health_data: list,
):
    """Print a human-readable summary to stdout."""
    print("\n" + "=" * 60)
    print("CI DASHBOARD SUMMARY")
    print("=" * 60)

    if amd_summaries:
        latest = amd_summaries[0]
        print(f"\nAMD Latest (Build #{latest.build_number}):")
        print(f"  Tests: {latest.total_tests} | Pass: {latest.passed} | Fail: {latest.failed} | Skip: {latest.skipped}")
        print(f"  Pass Rate: {latest.pass_rate:.1%}")
        print(f"  Jobs: {latest.job_count} ({latest.jobs_passed} passed, {latest.jobs_failed} failed)")
        if latest.delta_vs_previous:
            d = latest.delta_vs_previous
            print(f"  Delta: tests {d.get('total', 0):+d}, pass rate {d.get('pass_rate', 0):+.2%}")

    if upstream_summaries:
        latest = upstream_summaries[0]
        print(f"\nUpstream Latest (Build #{latest.build_number}):")
        print(f"  Tests: {latest.total_tests} | Pass: {latest.passed} | Fail: {latest.failed} | Skip: {latest.skipped}")
        print(f"  Pass Rate: {latest.pass_rate:.1%}")

    if health_data:
        labels = {}
        for h in health_data:
            labels[h.label] = labels.get(h.label, 0) + 1
        print(f"\nTest Health ({len(health_data)} unique tests):")
        for label in ["passing", "failing", "new_failure", "fixed", "flaky", "skipped", "new_test", "quarantined", "allowlisted"]:
            count = labels.get(label, 0)
            if count > 0:
                print(f"  {label}: {count}")

    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()

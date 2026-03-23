#!/usr/bin/env python3
"""Collect per-build, per-job analytics from Buildkite for the rich CI dashboard.

Produces:
- data/vllm/ci/builds_analytics.json — per-build summary with job matrix
- data/vllm/ci/jobs_analytics.json — per-job failure/duration rankings

Usage:
    export BUILDKITE_TOKEN="bkua_..."
    python scripts/vllm/collect_analytics.py --days 14
"""

import argparse
import json
import logging
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean, median

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

BK_API = "https://api.buildkite.com/v2"
BK_ORG = "vllm"
PIPELINES = {"amd-ci": "AMD CI", "ci": "Upstream CI"}

ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT = ROOT / "data" / "vllm" / "ci"


def bk_get(path, token, params=None):
    headers = {"Authorization": f"Bearer {token}"}
    results = []
    url = f"{BK_API}{path}"
    p = dict(params or {})
    while url:
        for attempt in range(3):
            try:
                resp = requests.get(url, headers=headers, params=p if not results else None, timeout=30)
                if resp.status_code == 429:
                    import time
                    wait = int(resp.headers.get("Retry-After", 5 * (attempt + 1)))
                    log.warning("Rate limited, waiting %ds", wait)
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                break
            except requests.exceptions.Timeout:
                if attempt < 2:
                    import time; time.sleep(3)
                    continue
                raise
        results.extend(resp.json() if isinstance(resp.json(), list) else [resp.json()])
        url = resp.links.get("next", {}).get("url")
    return results


def parse_ts(s):
    if not s: return None
    try: return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except: return None


def duration_mins(start, end):
    s, e = parse_ts(start), parse_ts(end)
    if s and e: return round((e - s).total_seconds() / 60, 1)
    return None


def queue_from_rules(rules):
    for r in (rules or []):
        if r.startswith("queue="):
            return r.split("=", 1)[1]
    return "unknown"


def normalize_job(name):
    """Strip hardware prefix for cross-build comparison."""
    name = re.sub(r'^(mi\d+_\d+|gpu_\d+|amd_\w+):\s*', '', name, flags=re.IGNORECASE)
    return name.strip()


def collect_pipeline(pipeline_slug, token, days, nightly_only=False, name_pattern=None):
    """Collect builds and extract per-job analytics."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    log.info("Fetching %s builds (last %d days)...", pipeline_slug, days)

    builds_raw = bk_get(
        f"/organizations/{BK_ORG}/pipelines/{pipeline_slug}/builds",
        token, {"branch": "main", "created_from": since, "per_page": 100, "include_retried_jobs": "true"}
    )
    log.info("  %d total builds fetched", len(builds_raw))

    # Filter to nightly if requested
    if nightly_only and name_pattern:
        pat = re.compile(name_pattern, re.IGNORECASE)
        builds_raw = [b for b in builds_raw if pat.search(b.get("message", "") or "")]
        log.info("  %d nightly builds after filter", len(builds_raw))

    builds = []
    job_stats = defaultdict(lambda: {"runs": 0, "passed": 0, "failed": 0, "soft_failed": 0,
                                      "durations": [], "wait_times": [], "queues": set()})

    for b in builds_raw:
        build_num = b.get("number", 0)
        build_state = b.get("state", "")
        created = b.get("created_at", "")
        finished = b.get("finished_at", "")
        wall_mins = duration_mins(created, finished)
        message = (b.get("message") or "")[:100]
        author = (b.get("creator") or {}).get("name", "") or (b.get("author") or {}).get("name", "")

        jobs = [j for j in b.get("jobs", []) if j.get("type") == "script"]

        job_summaries = []
        passed = failed = soft = 0

        for j in jobs:
            name = j.get("name", "unknown")
            norm = normalize_job(name)
            state = j.get("state", "")
            sf = j.get("soft_failed", False)
            queue = queue_from_rules(j.get("agent_query_rules"))

            dur = duration_mins(j.get("started_at"), j.get("finished_at"))
            wait = duration_mins(j.get("runnable_at"), j.get("started_at"))

            if state == "passed":
                passed += 1
                job_stats[norm]["passed"] += 1
            elif sf:
                soft += 1
                job_stats[norm]["soft_failed"] += 1
            elif state in ("failed", "timed_out", "broken"):
                failed += 1
                job_stats[norm]["failed"] += 1

            job_stats[norm]["runs"] += 1
            if dur is not None: job_stats[norm]["durations"].append(dur)
            if wait is not None: job_stats[norm]["wait_times"].append(wait)
            job_stats[norm]["queues"].add(queue)

            job_summaries.append({
                "name": norm,
                "state": "soft_fail" if sf else state,
                "dur": dur,
            })

        builds.append({
            "number": build_num,
            "state": build_state,
            "created_at": created,
            "date": created[:10] if created else "",
            "message": message,
            "author": author,
            "wall_mins": wall_mins,
            "passed": passed,
            "failed": failed,
            "soft_failed": soft,
            "total_jobs": len(jobs),
            "jobs": job_summaries,
            "web_url": b.get("web_url", ""),
        })

    # Sort builds newest first
    builds.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    # Compute job rankings
    job_rankings = []
    for name, s in sorted(job_stats.items()):
        total = s["runs"]
        if total == 0: continue
        fail_rate = round((s["failed"] + s["soft_failed"]) / total * 100, 1)
        durs = s["durations"]
        waits = s["wait_times"]
        job_rankings.append({
            "name": name,
            "runs": total,
            "passed": s["passed"],
            "failed": s["failed"],
            "soft_failed": s["soft_failed"],
            "fail_rate": fail_rate,
            "is_soft_fail": s["failed"] == 0 and s["soft_failed"] > 0,
            "median_dur": round(median(durs), 1) if durs else None,
            "p90_dur": round(sorted(durs)[int(len(durs) * 0.9)], 1) if len(durs) > 1 else (durs[0] if durs else None),
            "avg_dur": round(mean(durs), 1) if durs else None,
            "max_dur": round(max(durs), 1) if durs else None,
            "median_wait": round(median(waits), 1) if waits else None,
            "p90_wait": round(sorted(waits)[int(len(waits) * 0.9)], 1) if len(waits) > 1 else None,
            "avg_wait": round(mean(waits), 1) if waits else None,
            "max_wait": round(max(waits), 1) if waits else None,
            "queues": sorted(s["queues"]),
        })

    return builds, job_rankings


def compute_daily_stats(builds):
    """Aggregate pass/fail per day for stacked bar chart."""
    by_date = defaultdict(lambda: {"passed": 0, "failed": 0, "total": 0})
    for b in builds:
        d = b.get("date", "")
        if not d: continue
        if b["state"] in ("passed",):
            by_date[d]["passed"] += 1
        elif b["state"] in ("failed", "failing"):
            by_date[d]["failed"] += 1
        by_date[d]["total"] += 1
    return [{"date": k, **v} for k, v in sorted(by_date.items())]


def compute_queue_stats(job_rankings):
    """Aggregate wait times by queue."""
    by_queue = defaultdict(lambda: {"jobs": 0, "waits": []})
    for j in job_rankings:
        for q in j.get("queues", []):
            by_queue[q]["jobs"] += j["runs"]
            if j.get("median_wait") is not None:
                by_queue[q]["waits"].extend([j["median_wait"]] * j["runs"])

    queue_stats = []
    for q, d in sorted(by_queue.items()):
        waits = d["waits"]
        queue_stats.append({
            "queue": q,
            "jobs": d["jobs"],
            "median_wait": round(median(waits), 1) if waits else None,
            "p90_wait": round(sorted(waits)[int(len(waits) * 0.9)], 1) if len(waits) > 1 else None,
            "avg_wait": round(mean(waits), 1) if waits else None,
            "max_wait": round(max(waits), 1) if waits else None,
        })
    queue_stats.sort(key=lambda x: x.get("median_wait") or 0, reverse=True)
    return queue_stats


def main():
    parser = argparse.ArgumentParser(description="Collect CI analytics for rich dashboard")
    parser.add_argument("--days", type=int, default=14, help="Days of history (default: 14)")
    parser.add_argument("--pipeline", choices=["amd-ci", "ci", "both"], default="both")
    parser.add_argument("--output", type=str, default=str(OUTPUT))
    args = parser.parse_args()

    token = os.getenv("BUILDKITE_TOKEN")
    if not token:
        log.error("BUILDKITE_TOKEN not set")
        return

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    pipelines = ["amd-ci", "ci"] if args.pipeline == "both" else [args.pipeline]
    nightly_patterns = {"amd-ci": r"AMD Full CI Run.*nightly", "ci": r"Full CI run.*daily"}

    all_data = {}

    for slug in pipelines:
        log.info("=== %s ===", PIPELINES.get(slug, slug))

        # Collect ALL builds (not just nightly) for richer analytics
        builds, job_rankings = collect_pipeline(slug, token, args.days)

        # Also collect nightly-only
        nightly_builds, _ = collect_pipeline(
            slug, token, args.days, nightly_only=True, name_pattern=nightly_patterns.get(slug)
        )

        daily = compute_daily_stats(builds)
        queues = compute_queue_stats(job_rankings)

        # Sort rankings
        failure_ranking = sorted(job_rankings, key=lambda x: x["fail_rate"], reverse=True)
        duration_ranking = sorted(job_rankings, key=lambda x: x.get("median_dur") or 0, reverse=True)

        total_builds = len(builds)
        passed_builds = sum(1 for b in builds if b["state"] == "passed")
        failed_builds = sum(1 for b in builds if b["state"] in ("failed", "failing"))

        all_data[slug] = {
            "pipeline": slug,
            "display_name": PIPELINES.get(slug, slug),
            "days": args.days,
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "summary": {
                "total_builds": total_builds,
                "passed": passed_builds,
                "failed": failed_builds,
                "pass_rate": round(passed_builds / total_builds * 100, 1) if total_builds else 0,
                "total_jobs_tracked": len(job_rankings),
                "jobs_with_failures": sum(1 for j in job_rankings if j["failed"] > 0),
            },
            "daily_stats": daily,
            "builds": builds[:50],  # Last 50 builds for recent builds table
            "nightly_builds": nightly_builds[:14],  # Last 14 nightly builds
            "failure_ranking": [j for j in failure_ranking if j["failed"] > 0 or j["soft_failed"] > 0][:30],
            "duration_ranking": duration_ranking[:30],
            "queue_stats": queues,
        }

        log.info("  %d builds, %d jobs tracked, %d with failures",
                 total_builds, len(job_rankings),
                 sum(1 for j in job_rankings if j["failed"] > 0))

    # Write output
    out_path = output / "analytics.json"
    out_path.write_text(json.dumps(all_data, indent=2, default=str))
    log.info("Wrote %s", out_path)

    # Print summary
    for slug, d in all_data.items():
        s = d["summary"]
        print(f"\n{d['display_name']}: {s['total_builds']} builds, {s['pass_rate']}% pass rate, "
              f"{s['jobs_with_failures']} jobs with failures, {s['total_jobs_tracked']} jobs tracked")


if __name__ == "__main__":
    main()

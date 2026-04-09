#!/usr/bin/env python3
"""Hourly queue snapshot collector for Buildkite queue monitoring.

Appends one JSON line per snapshot to data/vllm/ci/queue_timeseries.jsonl.
Each line captures per-queue job counts (waiting, running, total) at that moment.

Usage:
    export BUILDKITE_TOKEN="bkua_..."
    python scripts/vllm/collect_queue_snapshot.py

Designed to run as a GitHub Actions hourly cron job.
"""

import json
import logging
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

BK_API = "https://api.buildkite.com/v2"
BK_ORG = "vllm"
OUTPUT = Path(__file__).resolve().parent.parent.parent / "data" / "vllm" / "ci" / "queue_timeseries.jsonl"

# Jobs waiting longer than this are stale/zombie — excluded from wait time
# percentiles but still counted in waiting totals.
STALE_THRESHOLD_MIN = 1440  # 24 hours

# Queues we care about (AMD + key NVIDIA for comparison)
TRACKED_QUEUES = {
    # AMD
    "amd_mi250_1", "amd_mi250_2", "amd_mi250_4", "amd_mi250_8",
    "amd_mi325_1", "amd_mi325_2", "amd_mi325_4", "amd_mi325_8",
    "amd_mi355_1", "amd_mi355_2", "amd_mi355_4", "amd_mi355_8",
    "amd_mi355B_1", "amd_mi355B_2", "amd_mi355B_4", "amd_mi355B_8",
    # NVIDIA
    "gpu_1_queue", "gpu_4_queue", "B200", "H200", "a100_queue",
    "mithril-h100-pool",
    # CPU
    "cpu_queue_postmerge", "cpu_queue_premerge",
    "cpu_queue_postmerge_us_east_1", "cpu_queue_premerge_us_east_1",
    # Other
    "intel-gpu", "intel-hpu", "intel-cpu", "arm-cpu", "ascend",
}


def bk_get(path, token, params=None):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BK_API}{path}", headers=headers, params=params, timeout=30)
    if resp.status_code == 429:
        log.warning("Rate limited")
        return []
    resp.raise_for_status()
    return resp.json()


def bk_get_paginated(path, token, params=None, max_pages=5):
    """Fetch all pages from a Buildkite API endpoint."""
    params = dict(params or {})
    params.setdefault("per_page", 100)
    all_items = []
    for page in range(1, max_pages + 1):
        params["page"] = page
        items = bk_get(path, token, params)
        if not isinstance(items, list) or not items:
            break
        all_items.extend(items)
        if len(items) < params["per_page"]:
            break  # Last page
    return all_items


def queue_from_rules(rules):
    for r in (rules or []):
        if r.startswith("queue="):
            return r.split("=", 1)[1]
    return None


def collect_snapshot(token):
    """Collect current queue state across all active builds."""
    now = datetime.now(timezone.utc)

    queue_stats = defaultdict(lambda: {"waiting": 0, "running": 0, "scheduled": 0, "total": 0,
                                       "wait_times": []})
    # Per-job lists for the latest snapshot (written to separate file)
    pending_jobs = []
    running_jobs = []

    # Fetch running and scheduled builds with pagination
    for state in ["running", "scheduled"]:
        builds = bk_get_paginated(f"/organizations/{BK_ORG}/builds",
                                  token, {"state": state})
        log.info("Fetched %d %s builds", len(builds), state)

        for build in builds:
            for job in build.get("jobs", []):
                if job.get("type") != "script":
                    continue
                queue = queue_from_rules(job.get("agent_query_rules"))
                if not queue:
                    continue

                jstate = job.get("state", "")
                job_name = job.get("name", "")
                # Normalize Buildkite URL: old hash-style → step canvas
                web_url = job.get("web_url", "")
                import re as _re
                _m = _re.match(r'^(https://buildkite\.com/vllm/[a-z\-]+/builds/\d+)#([0-9a-f\-]+)$', web_url)
                if _m:
                    web_url = f"{_m.group(1)}/steps/canvas?jid={_m.group(2)}&tab=output"

                pipeline_slug = build.get("pipeline", {}).get("slug", "")

                if jstate in ("scheduled", "waiting", "assigned", "limited"):
                    queue_stats[queue]["waiting"] += 1
                    # Wait time: now minus the earliest queue-entry timestamp
                    runnable = job.get("runnable_at") or job.get("scheduled_at") or job.get("created_at")
                    wait_mins = 0
                    if runnable:
                        try:
                            rt = datetime.fromisoformat(runnable.replace("Z", "+00:00"))
                            wait_mins = (now - rt).total_seconds() / 60
                            if 0 <= wait_mins < STALE_THRESHOLD_MIN:
                                queue_stats[queue]["wait_times"].append(round(wait_mins, 1))
                            elif wait_mins >= STALE_THRESHOLD_MIN:
                                queue_stats[queue].setdefault("stale", 0)
                                queue_stats[queue]["stale"] += 1
                        except Exception:
                            pass
                    pending_jobs.append({
                        "name": job_name, "queue": queue, "wait_min": round(wait_mins, 1),
                        "url": web_url, "pipeline": pipeline_slug,
                        "build": build.get("number", 0),
                    })
                elif jstate == "running":
                    queue_stats[queue]["running"] += 1
                    running_jobs.append({
                        "name": job_name, "queue": queue,
                        "url": web_url, "pipeline": pipeline_slug,
                        "build": build.get("number", 0),
                    })
                    # Wait time for running jobs: started_at minus queue-entry time
                    runnable = job.get("runnable_at") or job.get("scheduled_at") or job.get("created_at")
                    started = job.get("started_at")
                    if runnable and started:
                        try:
                            rt = datetime.fromisoformat(runnable.replace("Z", "+00:00"))
                            st = datetime.fromisoformat(started.replace("Z", "+00:00"))
                            wait_mins = (st - rt).total_seconds() / 60
                            if 0 <= wait_mins < STALE_THRESHOLD_MIN:
                                queue_stats[queue]["wait_times"].append(round(wait_mins, 1))
                        except Exception:
                            pass
                else:
                    continue
                queue_stats[queue]["total"] += 1

    # Build snapshot with wait time stats
    def percentile(sorted_times, pct):
        idx = int(len(sorted_times) * pct / 100)
        return sorted_times[min(idx, len(sorted_times) - 1)]

    def wait_summary(times):
        if not times:
            return {"p50_wait": 0, "p75_wait": 0, "p90_wait": 0, "p99_wait": 0,
                    "max_wait": 0, "avg_wait": 0}
        times.sort()
        return {"p50_wait": round(percentile(times, 50), 1),
                "p75_wait": round(percentile(times, 75), 1),
                "p90_wait": round(percentile(times, 90), 1),
                "p99_wait": round(percentile(times, 99), 1),
                "max_wait": round(max(times), 1),
                "avg_wait": round(sum(times) / len(times), 1)}

    snapshot = {
        "ts": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "queues": {
            q: {**{k: v for k, v in s.items() if k != "wait_times"},
                **wait_summary(s["wait_times"])}
            for q, s in sorted(queue_stats.items())
            if q in TRACKED_QUEUES or s["waiting"] > 0 or s["running"] > 0
        },
        "total_waiting": sum(s["waiting"] for s in queue_stats.values()),
        "total_running": sum(s["running"] for s in queue_stats.values()),
    }

    # GitHub Actions run ID (if available) for direct linking from snapshots
    run_id = os.getenv("GITHUB_RUN_ID", "")
    if run_id:
        snapshot["run_id"] = run_id

    # Write per-job data to a separate file (latest only, not appended)
    jobs_data = {
        "ts": snapshot["ts"],
        "pending": sorted(pending_jobs, key=lambda j: j.get("wait_min", 0), reverse=True),
        "running": running_jobs,
    }
    jobs_path = OUTPUT.parent / "queue_jobs.json"
    jobs_path.write_text(json.dumps(jobs_data, indent=2))
    log.info("Wrote %d pending + %d running jobs to %s",
             len(pending_jobs), len(running_jobs), jobs_path)

    return snapshot


def main():
    token = os.getenv("BUILDKITE_TOKEN")
    if not token:
        log.error("BUILDKITE_TOKEN not set")
        sys.exit(1)

    log.info("Collecting queue snapshot...")
    snapshot = collect_snapshot(token)

    # Append to JSONL
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "a") as f:
        f.write(json.dumps(snapshot, separators=(",", ":")) + "\n")

    log.info("Snapshot: %d queues, %d waiting, %d running -> %s",
             len(snapshot["queues"]), snapshot["total_waiting"],
             snapshot["total_running"], OUTPUT)

    # Print summary
    for q, s in sorted(snapshot["queues"].items(), key=lambda x: x[1]["waiting"], reverse=True):
        if s["waiting"] > 0 or s["running"] > 0:
            print(f"  {q:30s} waiting={s['waiting']:3d} running={s['running']:3d}")


if __name__ == "__main__":
    main()

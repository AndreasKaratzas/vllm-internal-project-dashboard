#!/usr/bin/env python3
"""Hourly queue snapshot collector for Buildkite queue monitoring.

Appends one JSON line per snapshot to data/vllm/ci/queue_timeseries.jsonl.
Each line captures per-queue job counts (waiting, running, total) at that moment.

Usage:
    export BUILDKITE_TOKEN="bkua_..."
    python scripts/vllm/collect_queue_snapshot.py

Designed to run as a GitHub Actions hourly cron job.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests

# Add scripts/ to sys.path so the ``vllm`` package resolves when this file is
# executed as ``python scripts/vllm/collect_queue_snapshot.py``.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vllm.constants import (  # noqa: E402
    BK_API_BASE,
    BK_ORG,
    OMNI_QUEUE_SUFFIX,
    STALE_THRESHOLD_MIN,
    TRACKED_QUEUES,
)
from vllm.ci.utils import (  # noqa: E402
    classify_workload,
    parse_iso,
    percentile,
    queue_from_rules,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

OUTPUT = Path(__file__).resolve().parent.parent.parent / "data" / "vllm" / "ci" / "queue_timeseries.jsonl"

# Buildkite URL rewrite: the jobs endpoint returns hash-anchored URLs that
# 404 in the step canvas; re-point them so dashboard links land on the output tab.
_JOB_URL_REWRITE = re.compile(r"^(https://buildkite\.com/vllm/[a-z\-]+/builds/\d+)#([0-9a-f\-]+)$")


def bk_get(path: str, token: str, params: dict | None = None):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BK_API_BASE}{path}", headers=headers, params=params, timeout=30)
    if resp.status_code == 429:
        log.warning("Rate limited")
        return []
    resp.raise_for_status()
    return resp.json()


def bk_get_paginated(path: str, token: str, params: dict | None = None, max_pages: int = 5):
    """Fetch all pages from a Buildkite API endpoint."""
    params = dict(params or {})
    params.setdefault("per_page", 100)
    all_items: list = []
    for page in range(1, max_pages + 1):
        params["page"] = page
        items = bk_get(path, token, params)
        if not isinstance(items, list) or not items:
            break
        all_items.extend(items)
        if len(items) < params["per_page"]:
            break
    return all_items


def _rewrite_job_url(web_url: str) -> str:
    m = _JOB_URL_REWRITE.match(web_url or "")
    if m:
        return f"{m.group(1)}/steps/canvas?jid={m.group(2)}&tab=output"
    return web_url


def _wait_summary(times: list[float]) -> dict:
    """Return the percentile summary the snapshot schema expects.

    Kept inline (not in ci/utils) because the ``_wait`` suffix in the keys
    is specific to this snapshot's schema — hotness uses ``_min`` suffixes
    on the same primitive.
    """
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


def collect_snapshot(token: str) -> dict:
    """Collect current queue state across all active builds."""
    now = datetime.now(timezone.utc)

    queue_stats: dict = defaultdict(
        lambda: {"waiting": 0, "running": 0, "scheduled": 0, "total": 0, "wait_times": []}
    )
    # Pre-populate every tracked queue with zero so it always shows up in the
    # snapshot — this keeps the timeseries chart continuous (a genuinely-idle
    # queue reads as 0 instead of a gap / missing point).
    for q in TRACKED_QUEUES:
        queue_stats[q]
    pending_jobs: list[dict] = []
    running_jobs: list[dict] = []

    for state in ("running", "scheduled"):
        builds = bk_get_paginated(
            f"/organizations/{BK_ORG}/builds", token, {"state": state}
        )
        log.info("Fetched %d %s builds", len(builds), state)

        for build in builds:
            build_branch = build.get("branch", "") or ""
            build_commit = (build.get("commit", "") or "")[:12]
            build_source = build.get("source", "")
            _pr = build.get("pull_request") or {}
            fork_url = _pr.get("repository") or ""
            pipeline_slug = (build.get("pipeline") or {}).get("slug", "")

            for job in build.get("jobs", []):
                if job.get("type") != "script":
                    continue
                queue = queue_from_rules(job.get("agent_query_rules"))
                if not queue:
                    continue

                jstate = job.get("state", "")
                job_name = job.get("name", "")
                web_url = _rewrite_job_url(job.get("web_url", ""))
                workload = classify_workload(pipeline_slug, build_branch, queue)

                if jstate in ("scheduled", "waiting", "assigned", "limited"):
                    queue_stats[queue]["waiting"] += 1
                    queue_stats[queue].setdefault("waiting_by_workload", {"vllm": 0, "omni": 0})
                    queue_stats[queue]["waiting_by_workload"][workload] += 1

                    runnable = job.get("runnable_at") or job.get("scheduled_at") or job.get("created_at")
                    wait_mins = 0.0
                    rt = parse_iso(runnable)
                    if rt is not None:
                        wait_mins = (now - rt).total_seconds() / 60
                        if 0 <= wait_mins < STALE_THRESHOLD_MIN:
                            queue_stats[queue]["wait_times"].append(round(wait_mins, 1))
                        elif wait_mins >= STALE_THRESHOLD_MIN:
                            queue_stats[queue].setdefault("stale", 0)
                            queue_stats[queue]["stale"] += 1
                    pending_jobs.append({
                        "name": job_name, "queue": queue, "wait_min": round(wait_mins, 1),
                        "url": web_url, "pipeline": pipeline_slug,
                        "build": build.get("number", 0),
                        "branch": build_branch, "commit": build_commit,
                        "workload": workload, "fork_url": fork_url,
                        "source": build_source,
                    })
                elif jstate == "running":
                    queue_stats[queue]["running"] += 1
                    queue_stats[queue].setdefault("running_by_workload", {"vllm": 0, "omni": 0})
                    queue_stats[queue]["running_by_workload"][workload] += 1
                    running_jobs.append({
                        "name": job_name, "queue": queue,
                        "url": web_url, "pipeline": pipeline_slug,
                        "build": build.get("number", 0),
                        "branch": build_branch, "commit": build_commit,
                        "workload": workload, "fork_url": fork_url,
                        "source": build_source,
                    })
                    runnable = job.get("runnable_at") or job.get("scheduled_at") or job.get("created_at")
                    rt = parse_iso(runnable)
                    st = parse_iso(job.get("started_at"))
                    if rt is not None and st is not None:
                        wait_mins = (st - rt).total_seconds() / 60
                        if 0 <= wait_mins < STALE_THRESHOLD_MIN:
                            queue_stats[queue]["wait_times"].append(round(wait_mins, 1))
                else:
                    continue
                queue_stats[queue]["total"] += 1

    snapshot = {
        "ts": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "queues": {
            q: {**{k: v for k, v in s.items() if k != "wait_times"},
                **_wait_summary(s["wait_times"])}
            for q, s in sorted(queue_stats.items())
            if q in TRACKED_QUEUES or s["waiting"] > 0 or s["running"] > 0
        },
        "total_waiting": sum(s["waiting"] for s in queue_stats.values()),
        "total_running": sum(s["running"] for s in queue_stats.values()),
    }

    run_id = os.getenv("GITHUB_RUN_ID", "")
    if run_id:
        snapshot["run_id"] = run_id

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

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "a") as f:
        f.write(json.dumps(snapshot, separators=(",", ":")) + "\n")

    log.info("Snapshot: %d queues, %d waiting, %d running -> %s",
             len(snapshot["queues"]), snapshot["total_waiting"],
             snapshot["total_running"], OUTPUT)

    for q, s in sorted(snapshot["queues"].items(), key=lambda x: x[1]["waiting"], reverse=True):
        if s["waiting"] > 0 or s["running"] > 0:
            print(f"  {q:30s} waiting={s['waiting']:3d} running={s['running']:3d}")


if __name__ == "__main__":
    main()

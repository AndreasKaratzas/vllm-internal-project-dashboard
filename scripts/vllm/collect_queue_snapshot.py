#!/usr/bin/env python3
"""Buildkite queue snapshot collector for dashboard queue monitoring.

Appends one JSON line per snapshot to ``data/vllm/ci/queue_timeseries.jsonl``.

The collector prefers Buildkite's queue-native cluster metrics for queue
counts, and uses active scheduled jobs to compute "current wait" percentiles.
If GraphQL queue access is unavailable, it falls back to the legacy active
build scan so the dashboard still stays live.
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
    BK_CLUSTER_UUID,
    BK_GRAPHQL_URL,
    BK_ORG,
    STALE_THRESHOLD_MIN,
    TRACKED_QUEUES,
)
from vllm.ci.utils import classify_workload, parse_iso, percentile, queue_from_rules  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

OUTPUT = Path(__file__).resolve().parent.parent.parent / "data" / "vllm" / "ci" / "queue_timeseries.jsonl"

# Buildkite URL rewrite: the jobs endpoint returns hash-anchored URLs that
# 404 in the step canvas; re-point them so dashboard links land on the output tab.
_JOB_URL_REWRITE = re.compile(r"^(https://buildkite\.com/vllm/[a-z\-]+/builds/\d+)#([0-9a-f\-]+)$")

GRAPHQL_QUEUE_METRICS_Q = """
query QueueMetrics($org: ID!, $cluster: ID!, $first: Int!, $after: String) {
  organization(slug: $org) {
    cluster(id: $cluster) {
      queues(first: $first, after: $after) {
        edges {
          node {
            key
            uuid
            dispatchPaused
            metrics {
              timestamp
              connectedAgentsCount
              waitingJobsCount
              runningJobsCount
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
"""

GRAPHQL_ACTIVE_JOBS_Q = """
query ActiveJobs($org: ID!, $cluster: ID!, $states: [JobStates!], $first: Int!, $after: String) {
  organization(slug: $org) {
    jobs(
      first: $first,
      after: $after,
      cluster: $cluster,
      clustered: true,
      type: [COMMAND],
      state: $states
    ) {
      edges {
        node {
          ... on JobTypeCommand {
            uuid
            state
            label
            runnableAt
            scheduledAt
            createdAt
            startedAt
            agentQueryRules
            clusterQueue {
              key
            }
            build {
              number
              branch
              commit
              url
            }
            pipeline {
              slug
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
"""

GRAPHQL_PAGE_SIZE = 100
GRAPHQL_WAITING_STATES = frozenset({"SCHEDULED"})
GRAPHQL_RUNNING_STATES = frozenset({"ASSIGNED", "ACCEPTED", "RUNNING", "CANCELING", "TIMING_OUT"})
GRAPHQL_ACTIVE_STATES = tuple(sorted(GRAPHQL_WAITING_STATES | GRAPHQL_RUNNING_STATES))

# Legacy REST build scan states. These are intentionally aligned with
# Buildkite's queue metrics docs rather than the older dashboard behavior:
# only ``scheduled`` jobs are "waiting", while assigned/accepted jobs count
# as already dispatched / running. Concurrency-limited jobs are excluded
# because they are not part of queue-page waiting-job metrics.
LEGACY_WAITING_STATES = frozenset({"scheduled"})
LEGACY_RUNNING_STATES = frozenset({"assigned", "accepted", "running", "canceling", "timing_out"})


def bk_get(path: str, token: str, params: dict | None = None):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BK_API_BASE}{path}", headers=headers, params=params, timeout=30)
    if resp.status_code == 429:
        log.warning("Rate limited on %s", path)
        return []
    resp.raise_for_status()
    return resp.json()


def bk_get_paginated(path: str, token: str, params: dict | None = None, max_pages: int = 5):
    """Fetch all pages from a Buildkite REST API endpoint."""
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


def bk_graphql(query: str, token: str, variables: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    resp = requests.post(
        BK_GRAPHQL_URL,
        headers=headers,
        json={"query": query, "variables": variables or {}},
        timeout=30,
    )
    if resp.status_code == 429:
        raise RuntimeError("Buildkite GraphQL rate limited")
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("errors"):
        raise RuntimeError(f"Buildkite GraphQL error: {payload['errors'][0].get('message', 'unknown')}")
    return payload.get("data") or {}


def _rewrite_job_url(web_url: str) -> str:
    m = _JOB_URL_REWRITE.match(web_url or "")
    if m:
        return f"{m.group(1)}/steps/canvas?jid={m.group(2)}&tab=output"
    return web_url


def _queue_web_url(queue_uuid: str | None) -> str:
    if not queue_uuid:
        return ""
    return f"https://buildkite.com/organizations/{BK_ORG}/clusters/{BK_CLUSTER_UUID}/queues/{queue_uuid}"


def _queue_row() -> dict:
    return {
        "waiting": 0,
        "running": 0,
        "scheduled": 0,
        "total": 0,
        "connected_agents": 0,
        "wait_times": [],
    }


def _wait_summary(times: list[float]) -> dict:
    """Return the percentile summary the snapshot schema expects."""
    if not times:
        return {
            "p50_wait": 0,
            "p75_wait": 0,
            "p90_wait": 0,
            "p95_wait": 0,
            "p99_wait": 0,
            "max_wait": 0,
            "avg_wait": 0,
        }
    ordered = sorted(times)
    return {
        "p50_wait": round(percentile(ordered, 50), 1),
        "p75_wait": round(percentile(ordered, 75), 1),
        "p90_wait": round(percentile(ordered, 90), 1),
        "p95_wait": round(percentile(ordered, 95), 1),
        "p99_wait": round(percentile(ordered, 99), 1),
        "max_wait": round(max(ordered), 1),
        "avg_wait": round(sum(ordered) / len(ordered), 1),
    }


def _make_canvas_job_url(build_url: str, job_uuid: str, fallback_url: str = "") -> str:
    if build_url and job_uuid:
        return f"{build_url}/steps/canvas?jid={job_uuid}&tab=output"
    return _rewrite_job_url(fallback_url)


def _wait_minutes(now: datetime, runnable_at: str | None, scheduled_at: str | None, created_at: str | None) -> float:
    anchor = parse_iso(runnable_at) or parse_iso(scheduled_at) or parse_iso(created_at)
    if anchor is None:
        return 0.0
    return (now - anchor).total_seconds() / 60


def _started_wait_minutes(runnable_at: str | None, scheduled_at: str | None, created_at: str | None, started_at: str | None) -> float | None:
    anchor = parse_iso(runnable_at) or parse_iso(scheduled_at) or parse_iso(created_at)
    started = parse_iso(started_at)
    if anchor is None or started is None:
        return None
    return round((started - anchor).total_seconds() / 60, 1)


def _run_minutes(now: datetime, started_at: str | None) -> float | None:
    started = parse_iso(started_at)
    if started is None:
        return None
    return round((now - started).total_seconds() / 60, 1)


def fetch_cluster_queue_metrics(token: str) -> dict[str, dict]:
    """Fetch queue-native counts from Buildkite cluster metrics."""
    metrics: dict[str, dict] = {}
    after = None
    while True:
        data = bk_graphql(
            GRAPHQL_QUEUE_METRICS_Q,
            token,
            {"org": BK_ORG, "cluster": BK_CLUSTER_UUID, "first": GRAPHQL_PAGE_SIZE, "after": after},
        )
        cluster = ((data.get("organization") or {}).get("cluster") or {})
        queues = cluster.get("queues") or {}
        for edge in queues.get("edges") or []:
            node = edge.get("node") or {}
            key = node.get("key") or ""
            if not key:
                continue
            latest = node.get("metrics") or {}
            metrics[key] = {
                "waiting": int(latest.get("waitingJobsCount") or 0),
                "running": int(latest.get("runningJobsCount") or 0),
                "connected_agents": int(latest.get("connectedAgentsCount") or 0),
                "metrics_ts": latest.get("timestamp") or "",
                "queue_url": _queue_web_url(node.get("uuid")),
                "dispatch_paused": bool(node.get("dispatchPaused")),
            }
        page = queues.get("pageInfo") or {}
        if not page.get("hasNextPage"):
            return metrics
        after = page.get("endCursor")


def fetch_active_cluster_jobs(token: str) -> list[dict]:
    """Fetch all active command jobs in the Buildkite cluster via GraphQL."""
    jobs: list[dict] = []
    after = None
    while True:
        data = bk_graphql(
            GRAPHQL_ACTIVE_JOBS_Q,
            token,
            {
                "org": BK_ORG,
                "cluster": BK_CLUSTER_UUID,
                "states": list(GRAPHQL_ACTIVE_STATES),
                "first": GRAPHQL_PAGE_SIZE,
                "after": after,
            },
        )
        conn = (data.get("organization") or {}).get("jobs") or {}
        for edge in conn.get("edges") or []:
            node = edge.get("node") or {}
            state = node.get("state") or ""
            queue = ((node.get("clusterQueue") or {}).get("key")) or queue_from_rules(node.get("agentQueryRules"))
            if not queue:
                continue
            build = node.get("build") or {}
            pipeline = node.get("pipeline") or {}
            jobs.append({
                "queue": queue,
                "state": state,
                "name": node.get("label") or "",
                "job_uuid": node.get("uuid") or "",
                "build_url": build.get("url") or "",
                "pipeline": pipeline.get("slug") or "",
                "build": build.get("number") or 0,
                "branch": build.get("branch") or "",
                "commit": (build.get("commit") or "")[:12],
                "workload": classify_workload(pipeline.get("slug") or "", build.get("branch") or "", queue),
                "fork_url": "",
                "source": "",
                "runnable_at": node.get("runnableAt"),
                "scheduled_at": node.get("scheduledAt"),
                "created_at": node.get("createdAt"),
                "started_at": node.get("startedAt"),
            })
        page = conn.get("pageInfo") or {}
        if not page.get("hasNextPage"):
            return jobs
        after = page.get("endCursor")


def _collect_legacy_active_jobs(token: str) -> list[dict]:
    """Legacy fallback that scans active builds from the REST API."""
    records: list[dict] = []
    for state in ("running", "scheduled"):
        builds = bk_get_paginated(f"/organizations/{BK_ORG}/builds", token, {"state": state})
        log.info("Fetched %d %s builds", len(builds), state)

        for build in builds:
            build_branch = build.get("branch", "") or ""
            build_commit = (build.get("commit", "") or "")[:12]
            build_source = build.get("source", "") or ""
            pr = build.get("pull_request") or {}
            fork_url = pr.get("repository") or ""
            pipeline_slug = (build.get("pipeline") or {}).get("slug", "")
            build_url = build.get("web_url", "") or ""

            for job in build.get("jobs", []):
                if job.get("type") != "script":
                    continue
                queue = queue_from_rules(job.get("agent_query_rules"))
                if not queue:
                    continue

                job_state = (job.get("state", "") or "").lower()
                if job_state not in LEGACY_WAITING_STATES and job_state not in LEGACY_RUNNING_STATES:
                    continue

                records.append({
                    "queue": queue,
                    "state": job_state.upper(),
                    "name": job.get("name", "") or "",
                    "job_uuid": job.get("id", "") or "",
                    "build_url": build_url,
                    "pipeline": pipeline_slug,
                    "build": build.get("number", 0),
                    "branch": build_branch,
                    "commit": build_commit,
                    "workload": classify_workload(pipeline_slug, build_branch, queue),
                    "fork_url": fork_url,
                    "source": build_source,
                    "runnable_at": job.get("runnable_at"),
                    "scheduled_at": job.get("scheduled_at"),
                    "created_at": job.get("created_at"),
                    "started_at": job.get("started_at"),
                    "fallback_url": job.get("web_url", "") or "",
                })
    return records


def _seed_queue_metrics(queue_stats: dict, metrics_by_queue: dict[str, dict]) -> None:
    for queue, meta in metrics_by_queue.items():
        stats = queue_stats[queue]
        stats["waiting"] = int(meta.get("waiting") or 0)
        stats["running"] = int(meta.get("running") or 0)
        stats["scheduled"] = int(meta.get("waiting") or 0)
        stats["total"] = stats["waiting"] + stats["running"]
        stats["connected_agents"] = int(meta.get("connected_agents") or 0)
        if meta.get("queue_url"):
            stats["queue_url"] = meta["queue_url"]
        if meta.get("metrics_ts"):
            stats["metrics_ts"] = meta["metrics_ts"]
        if meta.get("dispatch_paused"):
            stats["dispatch_paused"] = True


def _apply_active_jobs(
    now: datetime,
    queue_stats: dict,
    active_jobs: list[dict],
    trusted_count_queues: set[str],
) -> tuple[list[dict], list[dict]]:
    pending_jobs: list[dict] = []
    running_jobs: list[dict] = []

    for job in active_jobs:
        queue = job.get("queue") or ""
        if not queue:
            continue

        stats = queue_stats[queue]
        trust_counts = queue in trusted_count_queues
        state = job.get("state") or ""
        is_waiting = state in GRAPHQL_WAITING_STATES
        is_running = state in GRAPHQL_RUNNING_STATES or state.lower() in LEGACY_RUNNING_STATES
        if not is_waiting and not is_running:
            continue

        workload = job.get("workload") or "vllm"
        build_url = job.get("build_url") or ""
        web_url = _make_canvas_job_url(build_url, job.get("job_uuid") or "", job.get("fallback_url", ""))
        queue_wait_before_start = _started_wait_minutes(
            job.get("runnable_at"),
            job.get("scheduled_at"),
            job.get("created_at"),
            job.get("started_at"),
        )

        if is_waiting:
            if not trust_counts:
                stats["waiting"] += 1
                stats["scheduled"] += 1
                stats["total"] += 1
            stats.setdefault("waiting_by_workload", {"vllm": 0, "omni": 0})
            stats["waiting_by_workload"][workload] += 1

            wait_mins = round(
                _wait_minutes(now, job.get("runnable_at"), job.get("scheduled_at"), job.get("created_at")),
                1,
            )
            if 0 <= wait_mins < STALE_THRESHOLD_MIN:
                stats["wait_times"].append(wait_mins)
            elif wait_mins >= STALE_THRESHOLD_MIN:
                stats["stale"] = int(stats.get("stale") or 0) + 1

            pending_jobs.append({
                "name": job.get("name") or "",
                "queue": queue,
                "state": "scheduled",
                "wait_min": wait_mins,
                "url": web_url,
                "pipeline": job.get("pipeline") or "",
                "build": job.get("build") or 0,
                "branch": job.get("branch") or "",
                "commit": job.get("commit") or "",
                "workload": workload,
                "fork_url": job.get("fork_url") or "",
                "source": job.get("source") or "",
                "queue_url": stats.get("queue_url") or "",
            })
            continue

        if not trust_counts:
            stats["running"] += 1
            stats["total"] += 1
        stats.setdefault("running_by_workload", {"vllm": 0, "omni": 0})
        stats["running_by_workload"][workload] += 1
        run_mins = _run_minutes(now, job.get("started_at"))
        running_jobs.append({
            "name": job.get("name") or "",
            "queue": queue,
            "state": "running",
            "url": web_url,
            "pipeline": job.get("pipeline") or "",
            "build": job.get("build") or 0,
            "branch": job.get("branch") or "",
            "commit": job.get("commit") or "",
            "workload": workload,
            "fork_url": job.get("fork_url") or "",
            "source": job.get("source") or "",
            "queue_wait_before_start_min": queue_wait_before_start,
            "run_min": run_mins,
            "queue_url": stats.get("queue_url") or "",
        })

    return pending_jobs, running_jobs


def collect_snapshot(token: str) -> dict:
    """Collect the latest queue state using queue-native metrics when possible."""
    now = datetime.now(timezone.utc)
    queue_stats: dict = defaultdict(_queue_row)
    for queue in TRACKED_QUEUES:
        queue_stats[queue]

    metrics_by_queue: dict[str, dict] = {}
    counts_source = "active_job_scan"
    active_jobs_source = "legacy_build_scan"

    try:
        metrics_by_queue = fetch_cluster_queue_metrics(token)
        _seed_queue_metrics(queue_stats, metrics_by_queue)
        counts_source = "cluster_metrics"
    except Exception as exc:
        log.warning("Buildkite cluster metrics unavailable, falling back to active job counts: %s", exc)

    try:
        active_jobs = fetch_active_cluster_jobs(token)
        active_jobs_source = "cluster_jobs_graphql"
    except Exception as exc:
        log.warning("Buildkite GraphQL active jobs unavailable, falling back to build scan: %s", exc)
        active_jobs = _collect_legacy_active_jobs(token)

    pending_jobs, running_jobs = _apply_active_jobs(now, queue_stats, active_jobs, set(metrics_by_queue))

    queues = {}
    for queue, stats in sorted(queue_stats.items()):
        if queue not in TRACKED_QUEUES and not stats["waiting"] and not stats["running"]:
            continue
        row = {k: v for k, v in stats.items() if k != "wait_times"}
        row["wait_sample_count"] = len(stats["wait_times"])
        row.update(_wait_summary(stats["wait_times"]))
        queues[queue] = row

    snapshot = {
        "ts": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "queues": queues,
        "total_waiting": sum(int(s.get("waiting") or 0) for s in queues.values()),
        "total_running": sum(int(s.get("running") or 0) for s in queues.values()),
        "sources": {
            "counts": counts_source,
            "waits": "scheduled_jobs",
            "active_jobs": active_jobs_source,
        },
    }

    run_id = os.getenv("GITHUB_RUN_ID", "")
    if run_id:
        snapshot["run_id"] = run_id

    jobs_data = {
        "ts": snapshot["ts"],
        "pending": sorted(pending_jobs, key=lambda job: job.get("wait_min", 0), reverse=True),
        "running": running_jobs,
    }
    jobs_path = OUTPUT.parent / "queue_jobs.json"
    jobs_path.write_text(json.dumps(jobs_data, indent=2))
    log.info(
        "Wrote %d pending + %d running jobs to %s",
        len(pending_jobs),
        len(running_jobs),
        jobs_path,
    )

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

    log.info(
        "Snapshot: %d queues, %d waiting, %d running -> %s",
        len(snapshot["queues"]),
        snapshot["total_waiting"],
        snapshot["total_running"],
        OUTPUT,
    )

    for queue, stats in sorted(snapshot["queues"].items(), key=lambda item: item[1]["waiting"], reverse=True):
        if stats["waiting"] > 0 or stats["running"] > 0:
            print(f"  {queue:30s} waiting={stats['waiting']:3d} running={stats['running']:3d}")


if __name__ == "__main__":
    main()

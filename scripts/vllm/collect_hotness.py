#!/usr/bin/env python3
"""3-day hotness aggregator for vLLM AMD CI workload.

Unlike analyzer.py which only examines the latest nightly build, this walks
EVERY build that finished in the last 3 days across the AMD pipelines, so we
capture on-demand runs, PR rebuilds, fork contributions, etc.

Outputs ``data/vllm/ci/hotness.json`` with:
  - ``generated_at``: ISO8601 UTC
  - ``window_hours``: window size in hours
  - ``builds_examined``: number of builds walked
  - ``test_groups``: [{group, hw, count, avg_min, p90_min, fail_rate, last_seen}]
  - ``branches``: [{branch, commit, fork_url, count, avg_min, p90_min,
                    last_seen, builds}]
  - ``queues``: [{queue, count, avg_min, p90_min}]

Designed to run as a GitHub Actions hourly cron; cheap enough to re-run
frequently since a 3-day window caps the Buildkite API cost.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vllm.constants import (  # noqa: E402
    AMD_PIPELINES,
    AMD_QUEUE_PREFIX,
    BK_API_BASE,
    BK_ORG,
    HOTNESS_WINDOW_HOURS,
)
from vllm.ci.utils import (  # noqa: E402
    classify_workload,
    hardware_from_job_name,
    parse_iso,
    percentile,
    queue_from_rules,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

OUTPUT = Path(__file__).resolve().parent.parent.parent / "data" / "vllm" / "ci" / "hotness.json"

# Strip parentheses / trailing counts from job names to derive a stable group.
_STRIP_TAIL = re.compile(r"\s*\([^)]*\)\s*$")
_STRIP_SHARD = re.compile(r"\s+(\d+)/(\d+)\s*$")
_STRIP_HW_PREFIX = re.compile(r"^mi\d+[a-zA-Z]?_\d+\s*:\s*", re.IGNORECASE)


def _bk_get(path: str, token: str, params: dict | None = None):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BK_API_BASE}{path}", headers=headers, params=params, timeout=30)
    if resp.status_code == 429:
        log.warning("Rate limited")
        return []
    resp.raise_for_status()
    return resp.json()


def _paginate(path: str, token: str, params: dict | None = None, max_pages: int = 20):
    params = dict(params or {})
    params.setdefault("per_page", 100)
    out: list = []
    for page in range(1, max_pages + 1):
        params["page"] = page
        items = _bk_get(path, token, params)
        if not isinstance(items, list) or not items:
            break
        out.extend(items)
        if len(items) < params["per_page"]:
            break
    return out


def _stats(values: list[float]) -> dict:
    """Summary block for hotness rows (``_min`` suffix on percentile keys)."""
    if not values:
        return {"count": 0, "avg_min": 0.0, "p50_min": 0.0, "p90_min": 0.0, "max_min": 0.0}
    s = sorted(values)
    return {
        "count": len(s),
        "avg_min": round(sum(s) / len(s), 1),
        "p50_min": round(percentile(s, 50), 1),
        "p90_min": round(percentile(s, 90), 1),
        "max_min": round(max(s), 1),
    }


def _normalize_group(job_name: str) -> str:
    """Collapse shard / hardware / parenthetical noise in a job name.

    ``mi325_4: V1 e2e (4 GPUs) 1/3`` and ``mi250_1: V1 e2e`` both land on
    ``V1 e2e``. This is intentionally lossier than analyzer's grouping — the
    moving window view wants the smallest-cardinality key so trends aren't
    fragmented across shard/hw variants.
    """
    name = (job_name or "").strip()
    name = _STRIP_HW_PREFIX.sub("", name)
    name = _STRIP_SHARD.sub("", name)
    name = _STRIP_TAIL.sub("", name)
    return name.strip() or job_name or "unknown"


def collect_hotness(token: str) -> dict:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=HOTNESS_WINDOW_HOURS)

    group_durations: dict[tuple[str, str], list[float]] = defaultdict(list)
    group_failures: dict[tuple[str, str], int] = defaultdict(int)
    group_last_seen: dict[tuple[str, str], datetime] = {}
    group_workload: dict[tuple[str, str], str] = {}

    queue_durations: dict[str, list[float]] = defaultdict(list)

    branch_durations: dict[str, list[float]] = defaultdict(list)
    branch_meta: dict[str, dict] = {}
    branch_builds: dict[str, set] = defaultdict(set)

    builds_examined = 0

    for slug in AMD_PIPELINES:
        params = {"created_from": cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")}
        builds = _paginate(
            f"/organizations/{BK_ORG}/pipelines/{slug}/builds", token, params, max_pages=20
        )
        log.info("Pipeline %s: %d builds in window", slug, len(builds))

        for build in builds:
            builds_examined += 1
            branch = build.get("branch", "") or ""
            commit = (build.get("commit", "") or "")[:12]
            pr = build.get("pull_request") or {}
            fork_url = pr.get("repository") or ""
            source = build.get("source", "") or ""
            workload = classify_workload(slug, branch)
            build_key = f"{slug}#{build.get('number', 0)}"
            branch_builds[branch].add(build_key)

            if branch not in branch_meta:
                branch_meta[branch] = {
                    "branch": branch,
                    "commit": commit,
                    "fork_url": fork_url,
                    "workload": workload,
                    "source": source,
                    "last_seen": None,
                }
            else:
                created = parse_iso(build.get("created_at", ""))
                last = parse_iso(branch_meta[branch]["last_seen"] or "")
                if created and (not last or created > last):
                    branch_meta[branch]["commit"] = commit
                    branch_meta[branch]["fork_url"] = fork_url or branch_meta[branch]["fork_url"]
                    branch_meta[branch]["source"] = source or branch_meta[branch]["source"]

            for job in build.get("jobs") or []:
                if job.get("type") != "script":
                    continue
                queue = queue_from_rules(job.get("agent_query_rules"))
                if not queue or not queue.startswith(AMD_QUEUE_PREFIX):
                    continue
                started = parse_iso(job.get("started_at", ""))
                finished = parse_iso(job.get("finished_at", ""))
                if not started or not finished or finished <= started:
                    continue
                dur_min = (finished - started).total_seconds() / 60
                if dur_min <= 0 or dur_min > 24 * 60:
                    continue  # zombie / stuck job

                job_name = job.get("name", "") or ""
                group = _normalize_group(job_name)
                hw = hardware_from_job_name(job_name, queue)
                key = (group, hw)

                group_durations[key].append(dur_min)
                group_workload[key] = workload
                state = job.get("state", "") or ""
                if state in ("failed", "timed_out", "broken"):
                    group_failures[key] += 1
                seen = group_last_seen.get(key)
                if not seen or finished > seen:
                    group_last_seen[key] = finished

                queue_durations[queue].append(dur_min)
                branch_durations[branch].append(dur_min)
                last_seen_raw = branch_meta[branch]["last_seen"]
                last_seen_dt = parse_iso(last_seen_raw) if last_seen_raw else None
                if not last_seen_dt or finished > last_seen_dt:
                    branch_meta[branch]["last_seen"] = finished.strftime("%Y-%m-%dT%H:%M:%SZ")

    group_rows = []
    for (group, hw), durs in group_durations.items():
        stats = _stats(durs)
        fails = group_failures.get((group, hw), 0)
        stats.update({
            "group": group,
            "hw": hw,
            "workload": group_workload.get((group, hw), "vllm"),
            "fail_rate": round(fails / stats["count"], 3) if stats["count"] else 0.0,
            "failures": fails,
            "last_seen": group_last_seen[(group, hw)].strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
        group_rows.append(stats)
    group_rows.sort(key=lambda r: (-r["count"], -r["p90_min"]))

    branch_rows = []
    for branch, durs in branch_durations.items():
        stats = _stats(durs)
        meta = branch_meta.get(branch, {})
        stats.update({
            "branch": branch,
            "commit": meta.get("commit", ""),
            "fork_url": meta.get("fork_url", ""),
            "source": meta.get("source", ""),
            "workload": meta.get("workload", "vllm"),
            "last_seen": meta.get("last_seen", ""),
            "builds": len(branch_builds.get(branch, set())),
        })
        branch_rows.append(stats)
    branch_rows.sort(key=lambda r: (-r["builds"], -r["count"]))

    queue_rows = []
    for queue, durs in queue_durations.items():
        stats = _stats(durs)
        stats["queue"] = queue
        queue_rows.append(stats)
    queue_rows.sort(key=lambda r: -r["count"])

    return {
        "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window_hours": HOTNESS_WINDOW_HOURS,
        "builds_examined": builds_examined,
        "test_groups": group_rows,
        "branches": branch_rows,
        "queues": queue_rows,
    }


def main():
    token = os.getenv("BUILDKITE_TOKEN")
    if not token:
        log.error("BUILDKITE_TOKEN not set")
        sys.exit(1)

    log.info("Collecting hotness window=%dh pipelines=%s", HOTNESS_WINDOW_HOURS, AMD_PIPELINES)
    data = collect_hotness(token)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, indent=2))
    log.info("Wrote hotness: %d groups, %d branches, %d queues -> %s",
             len(data["test_groups"]), len(data["branches"]), len(data["queues"]), OUTPUT)


if __name__ == "__main__":
    main()

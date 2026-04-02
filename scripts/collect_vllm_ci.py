#!/usr/bin/env python3
"""Collect vLLM CI test data from Buildkite and produce test_results.json.

Fetches the latest nightly builds from both AMD and upstream Buildkite
pipelines, counts passed/failed/soft-failed jobs per hardware, and writes
``data/vllm/test_results.json`` in the same format as other projects.

Requires:
    BUILDKITE_TOKEN environment variable (read-only org token).

Usage:
    python scripts/collect_vllm_ci.py
"""

import json
import logging
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "vllm"

BK_API = "https://api.buildkite.com/v2"
BK_ORG = "vllm"
PIPELINES = {
    "amd": {"slug": "amd-ci", "label": "ROCm"},
    "upstream": {"slug": "ci", "label": "CUDA"},
}
# Job name patterns to skip (bootstrap, docker, etc.)
# Match whole words to avoid false positives (e.g., "block" matching "FP8-block")
SKIP_PATTERNS = re.compile(
    r"\b(?:docker|bootstrap|setup|notify)\b|^:?block\b",
    re.IGNORECASE,
)
# Terminal states for jobs
TERMINAL = frozenset({"passed", "failed", "timed_out", "canceled", "broken", "blocked"})
FAILURE = frozenset({"failed", "timed_out", "broken"})

# Hardware extraction
_HW_PREFIX = re.compile(r"^(mi\d+)_\d+:", re.IGNORECASE)
_HW_UPSTREAM = re.compile(
    r"\((\d*x?)?(H\d+|B\d+|A\d+|L\d+)\b", re.IGNORECASE,
)


def _headers():
    token = os.environ.get("BUILDKITE_TOKEN", "")
    if not token:
        log.error("BUILDKITE_TOKEN not set")
        sys.exit(1)
    return {"Authorization": f"Bearer {token}"}


def _get(url, params=None):
    import urllib.request
    import urllib.parse

    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def _extract_hw(name: str) -> str:
    m = _HW_PREFIX.match(name)
    if m:
        return m.group(1).lower()
    m = _HW_UPSTREAM.search(name)
    if m:
        return m.group(2).lower()
    return "unknown"


def _fetch_latest_nightly(slug: str) -> dict | None:
    """Fetch the most recent nightly build for a pipeline.

    Prefers the latest completed nightly (passed/failed/broken), but falls
    back to a running build if no completed one is available.  Canceled
    builds are skipped entirely.
    """
    builds = _get(
        f"{BK_API}/organizations/{BK_ORG}/pipelines/{slug}/builds",
        {"branch": "main", "per_page": 20},
    )
    nightly_re = re.compile(r"nightly|cron|schedule", re.IGNORECASE)
    nightlies = [b for b in builds if nightly_re.search(b.get("message") or "")]
    # Return the most recent non-canceled nightly.
    # Running builds have partial data — still useful (shows pending jobs).
    for b in nightlies:
        if b.get("state") != "canceled":
            return b
    # All canceled — return the most recent anyway
    return nightlies[0] if nightlies else (builds[0] if builds else None)


def _count_jobs(build: dict, default_hw: str = "unknown") -> dict:
    """Count jobs per hardware, deduplicating retries and collapsing shards.

    Args:
        default_hw: hardware label for jobs without a recognizable HW tag
                    (e.g., "h100" for the upstream CUDA pipeline).

    Returns dict with keys: total, passed, failed, by_hardware, build_url, etc.
    """
    jobs = [j for j in build.get("jobs", []) if j.get("type") == "script"]

    # Filter out retried (superseded) jobs
    latest = [j for j in jobs if not j.get("retried_in_job_id")]

    # Filter skip patterns
    latest = [
        j for j in latest
        if not SKIP_PATTERNS.search(j.get("name", ""))
    ]

    # Group shards into logical steps.
    # Buildkite %N parallel jobs have parallel_group_index/parallel_group_total
    # set but no step_key.  Their names look like "Test 1", "Test 2", etc.
    # Group by stripping the trailing shard index from the name.
    _SHARD_SUFFIX = re.compile(r"\s+\d+\s*$")

    def _step_key(j: dict) -> str:
        if j.get("step_key"):
            return j["step_key"]
        name = j.get("name") or j.get("id", "")
        if j.get("parallel_group_total") and j["parallel_group_total"] > 1:
            return _SHARD_SUFFIX.sub("", name)
        return name

    step_groups: dict[str, list[dict]] = defaultdict(list)
    for j in latest:
        step_groups[_step_key(j)].append(j)

    hw_counts: dict[str, dict] = defaultdict(lambda: {"total": 0, "passed": 0, "failed": 0, "pending": 0})
    total_passed = 0
    total_failed = 0
    total_pending = 0

    for step_key, group in step_groups.items():
        # Extract hardware from first job in group
        hw = _extract_hw(group[0].get("name", ""))
        if hw == "unknown":
            hw = default_hw
        states = [j.get("state") for j in group]
        soft = any(j.get("soft_failed") for j in group)

        # Determine step state
        is_fail = any(s in FAILURE for s in states)
        is_pass = "passed" in states and not is_fail
        is_pending = not is_fail and not is_pass

        hw_counts[hw]["total"] += 1
        if is_fail:
            hw_counts[hw]["failed"] += 1
            total_failed += 1
        elif is_pass:
            hw_counts[hw]["passed"] += 1
            total_passed += 1
        else:
            hw_counts[hw]["pending"] += 1
            total_pending += 1

    total = total_passed + total_failed + total_pending
    pass_rate = round(total_passed / (total_passed + total_failed) * 100, 1) if (total_passed + total_failed) > 0 else 0

    return {
        "total": total,
        "passed": total_passed,
        "failed": total_failed,
        "pending": total_pending,
        "pass_rate": pass_rate,
        "by_hardware": {
            hw: {
                "total": c["total"],
                "passed": c["passed"],
                "failed": c["failed"],
                "pending": c["pending"],
                "pass_rate": round(c["passed"] / (c["passed"] + c["failed"]) * 100, 1)
                if (c["passed"] + c["failed"]) > 0 else 0,
            }
            for hw, c in sorted(hw_counts.items())
            if hw not in ("unknown", "cpu")
        },
    }


def main():
    results = {
        "collected_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "buildkite",
    }

    for pipeline_key, pipeline_cfg in PIPELINES.items():
        slug = pipeline_cfg["slug"]
        label = pipeline_cfg["label"]
        platform = "rocm" if pipeline_key == "amd" else "cuda"

        log.info("Fetching latest nightly for %s (%s)...", label, slug)
        build = _fetch_latest_nightly(slug)
        if not build:
            log.warning("No builds found for %s", slug)
            continue

        build_num = build.get("number", 0)
        build_url = build.get("web_url", "")
        created = build.get("created_at", "")
        state = build.get("state", "")

        log.info("  Build #%d (%s) — %s", build_num, state, created[:10])

        # Upstream CUDA jobs default to H100 when no HW tag in name
        default_hw = "h100" if pipeline_key == "upstream" else "unknown"
        counts = _count_jobs(build, default_hw=default_hw)

        results[platform] = {
            "workflow_name": f"vLLM {label} Nightly (Buildkite)",
            "run_url": build_url,
            "run_date": created,
            "conclusion": "success" if counts["pass_rate"] >= 95 else "failure",
            "summary": {
                "total_jobs": counts["total"],
                "passed": counts["passed"],
                "failed": counts["failed"],
                "skipped": counts["pending"],
                "pass_rate": counts["pass_rate"],
            },
            "by_hardware": counts["by_hardware"],
        }

    # Write output
    DATA.mkdir(parents=True, exist_ok=True)
    out_path = DATA / "test_results.json"
    out_path.write_text(json.dumps(results, indent=2))
    log.info("Wrote %s", out_path)

    # Print summary
    for platform in ("rocm", "cuda"):
        p = results.get(platform)
        if not p:
            continue
        s = p["summary"]
        hw = p.get("by_hardware", {})
        hw_str = ", ".join(f"{k}: {v['pass_rate']}%" for k, v in hw.items())
        log.info(
            "  %s: %s (pass_rate=%.1f%%, %d/%d) — HW: %s",
            platform.upper(),
            p["conclusion"],
            s["pass_rate"],
            s["passed"],
            s["passed"] + s["failed"],
            hw_str,
        )


if __name__ == "__main__":
    main()

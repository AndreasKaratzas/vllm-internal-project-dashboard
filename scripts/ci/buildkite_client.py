"""Buildkite REST API client for fetching builds, jobs, and artifacts.

Adapted from patterns in bk_investigator.py and vllm_git_rocm_analytics.py.
"""

import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import requests

from . import config as cfg

log = logging.getLogger(__name__)


def _headers() -> dict:
    token = cfg.BK_TOKEN
    if not token:
        raise RuntimeError(
            "BUILDKITE_TOKEN not set. Export it: export BUILDKITE_TOKEN='bkua_...'"
        )
    return {"Authorization": f"Bearer {token}"}


def _request(url: str, params: Optional[dict] = None) -> requests.Response:
    """Make a GET request with retry on transient and rate-limit errors."""
    headers = _headers()
    for attempt in range(1, cfg.MAX_RETRIES + 1):
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=30)
            if resp.status_code == 429:
                # Rate limited — use Retry-After header or exponential backoff
                retry_after = int(resp.headers.get("Retry-After", cfg.RETRY_BACKOFF * attempt))
                if attempt < cfg.MAX_RETRIES:
                    log.warning(
                        "Rate limited (429), retry %d/%d in %ds",
                        attempt, cfg.MAX_RETRIES, retry_after,
                    )
                    time.sleep(retry_after)
                    continue
                resp.raise_for_status()
            if resp.status_code in cfg.RETRY_CODES and attempt < cfg.MAX_RETRIES:
                wait = cfg.RETRY_BACKOFF * attempt
                log.warning(
                    "HTTP %d on %s, retry %d/%d in %ds",
                    resp.status_code, url, attempt, cfg.MAX_RETRIES, wait,
                )
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp
        except requests.exceptions.Timeout:
            if attempt < cfg.MAX_RETRIES:
                log.warning("Timeout on %s, retry %d/%d", url, attempt, cfg.MAX_RETRIES)
                time.sleep(cfg.RETRY_BACKOFF * attempt)
                continue
            raise
    return resp  # should not reach here


def _paginate(url: str, params: Optional[dict] = None) -> list:
    """Fetch all pages from a paginated Buildkite endpoint."""
    results = []
    params = dict(params or {})
    page = 0
    while url:
        resp = _request(url, params=params if page == 0 else None)
        results.extend(resp.json())
        page += 1
        url = resp.links.get("next", {}).get("url")
    return results


# ---------------------------------------------------------------------------
# Build fetching
# ---------------------------------------------------------------------------

def fetch_nightly_builds(
    pipeline_key: str,
    days: int = 7,
    cache_dir: Optional[Path] = None,
) -> list[dict]:
    """Fetch nightly builds for a pipeline, filtering by name pattern.

    Args:
        pipeline_key: Key into config.PIPELINES ("amd" or "upstream")
        days: How many days back to look
        cache_dir: Optional directory for caching build data

    Returns:
        List of build dicts matching the nightly pattern, sorted newest-first.
    """
    pipeline = cfg.PIPELINES[pipeline_key]
    slug = pipeline["slug"]
    branch = pipeline["branch"]
    name_re = re.compile(pipeline["name_pattern"], re.IGNORECASE)

    created_from = datetime.now(timezone.utc) - timedelta(days=days)

    # Check cache for already-fetched builds
    cached_builds = {}
    if cache_dir:
        cache_file = cache_dir / f"builds_{pipeline_key}.json"
        if cache_file.exists():
            try:
                cached_builds = {
                    b["number"]: b
                    for b in json.loads(cache_file.read_text())
                }
            except (json.JSONDecodeError, KeyError):
                cached_builds = {}

    url = f"{cfg.BK_API_BASE}/organizations/{cfg.BK_ORG}/pipelines/{slug}/builds"
    params = {
        "branch": branch,
        "created_from": created_from.isoformat(),
        "per_page": 100,
        "include_retried_jobs": "true",
    }

    all_builds = _paginate(url, params)
    log.info("Fetched %d total builds from %s/%s", len(all_builds), cfg.BK_ORG, slug)

    # Filter to nightly builds by name pattern
    nightly_builds = []
    for build in all_builds:
        msg = build.get("message", "") or ""
        if name_re.search(msg):
            build_num = build["number"]
            # Use cached version if build is in terminal state and cached
            if (
                build_num in cached_builds
                and build.get("state") in cfg.TERMINAL_STATES
            ):
                nightly_builds.append(cached_builds[build_num])
            else:
                nightly_builds.append(build)

    # Sort newest first
    nightly_builds.sort(key=lambda b: b.get("created_at", ""), reverse=True)

    # Update cache
    if cache_dir:
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = cache_dir / f"builds_{pipeline_key}.json"
        cache_file.write_text(json.dumps(nightly_builds, indent=2))

    log.info("Found %d nightly builds for %s", len(nightly_builds), pipeline_key)
    return nightly_builds


def fetch_build_detail(pipeline_key: str, build_number: int) -> dict:
    """Fetch a single build with full job details."""
    slug = cfg.PIPELINES[pipeline_key]["slug"]
    url = (
        f"{cfg.BK_API_BASE}/organizations/{cfg.BK_ORG}"
        f"/pipelines/{slug}/builds/{build_number}"
    )
    resp = _request(url)
    return resp.json()


def fetch_build_jobs(build: dict) -> list[dict]:
    """Extract script-type jobs from a build dict.

    Filters to jobs that actually run test commands (type=script),
    excluding wait steps, trigger steps, etc.
    """
    jobs = build.get("jobs", [])
    return [
        j for j in jobs
        if j.get("type") == "script"
        and j.get("state") in cfg.TERMINAL_STATES
    ]


# ---------------------------------------------------------------------------
# Artifact fetching
# ---------------------------------------------------------------------------

def fetch_build_artifacts(
    pipeline_key: str,
    build_number: int,
) -> dict[str, list[dict]]:
    """List all artifacts for a build, grouped by job_id, filtered to XML.

    Uses the build-level artifacts endpoint (one paginated call) instead of
    per-job requests to avoid rate limiting on builds with 200+ jobs.

    Returns:
        Dict mapping job_id -> list of XML artifact dicts.
    """
    slug = cfg.PIPELINES[pipeline_key]["slug"]
    url = (
        f"{cfg.BK_API_BASE}/organizations/{cfg.BK_ORG}"
        f"/pipelines/{slug}/builds/{build_number}/artifacts"
    )
    all_artifacts = _paginate(url, {"per_page": 100})
    by_job: dict[str, list[dict]] = {}
    for a in all_artifacts:
        if a.get("filename", "").endswith(".xml"):
            job_id = a.get("job_id", "")
            by_job.setdefault(job_id, []).append(a)
    return by_job


def fetch_job_artifacts(
    pipeline_key: str,
    build_number: int,
    job_id: str,
) -> list[dict]:
    """List artifacts for a specific job, filtered to XML files."""
    slug = cfg.PIPELINES[pipeline_key]["slug"]
    url = (
        f"{cfg.BK_API_BASE}/organizations/{cfg.BK_ORG}"
        f"/pipelines/{slug}/builds/{build_number}"
        f"/jobs/{job_id}/artifacts"
    )
    artifacts = _paginate(url)
    return [
        a for a in artifacts
        if a.get("filename", "").endswith(".xml")
    ]


def download_artifact(artifact: dict) -> Optional[bytes]:
    """Download an artifact's content.

    The artifact dict should have a 'download_url' field from the artifacts API.
    """
    download_url = artifact.get("download_url")
    if not download_url:
        log.warning("No download_url for artifact %s", artifact.get("id"))
        return None

    try:
        resp = _request(download_url)
        return resp.content
    except Exception as e:
        log.warning("Failed to download artifact %s: %s", artifact.get("filename"), e)
        return None

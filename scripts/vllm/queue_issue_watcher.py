#!/usr/bin/env python3
"""Queue latency issue watcher.

Reads the latest snapshot in ``data/vllm/ci/queue_timeseries.jsonl`` and
opens a GitHub issue when a queue's p90 wait exceeds ``P90_THRESHOLD_MIN``.
Closes the tracked issue when the queue is healthy again (p90 below
``P90_HEALTHY_MIN``) to provide hysteresis — without that margin a queue
flapping around the threshold would churn issue open/close events.

State is stored in ``data/vllm/ci/open_queue_issues.json`` so we remember
which issue number covers which queue across runs. The tracking file is the
source of truth; we never rely on GitHub label queries alone.

Requires:
  - ``GITHUB_TOKEN`` with ``issues: write`` on the target repo
  - ``GITHUB_REPOSITORY`` ("owner/repo"), set automatically in GH Actions
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vllm.constants import (  # noqa: E402
    QUEUE_MIN_WAITING_SAMPLES,
    QUEUE_P90_HEALTHY_MIN,
    QUEUE_P90_TRIGGER_MIN,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent.parent
SNAPSHOTS = ROOT / "data" / "vllm" / "ci" / "queue_timeseries.jsonl"
STATE = ROOT / "data" / "vllm" / "ci" / "open_queue_issues.json"

# Back-compat local aliases — the rest of the module reads these names.
P90_THRESHOLD_MIN = QUEUE_P90_TRIGGER_MIN
P90_HEALTHY_MIN = QUEUE_P90_HEALTHY_MIN
MIN_WAITING_SAMPLES = QUEUE_MIN_WAITING_SAMPLES
LABEL = "queue-latency"

GH_API = "https://api.github.com"


def _gh_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _read_last_snapshot() -> dict | None:
    if not SNAPSHOTS.exists():
        return None
    last = None
    with SNAPSHOTS.open() as f:
        for line in f:
            line = line.strip()
            if not line or not line.startswith("{"):
                continue
            try:
                last = json.loads(line)
            except json.JSONDecodeError:
                continue
    return last


def _read_state() -> dict:
    if not STATE.exists():
        return {"open": {}}
    try:
        data = json.loads(STATE.read_text())
        data.setdefault("open", {})
        return data
    except (json.JSONDecodeError, OSError):
        return {"open": {}}


def _write_state(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2, sort_keys=True))


def _open_issue(token: str, repo: str, queue: str, stats: dict, run_url: str) -> int | None:
    title = f"Queue {queue}: p90 wait {stats.get('p90_wait', 0):.1f}m"
    body = (
        f"## Queue latency alert\n\n"
        f"Queue **`{queue}`** exceeded p90 wait of {P90_THRESHOLD_MIN:.0f}m in the latest snapshot.\n\n"
        f"| metric | value |\n|---|---|\n"
        f"| waiting jobs | {stats.get('waiting', 0)} |\n"
        f"| running jobs | {stats.get('running', 0)} |\n"
        f"| p50 wait | {stats.get('p50_wait', 0):.1f}m |\n"
        f"| p75 wait | {stats.get('p75_wait', 0):.1f}m |\n"
        f"| p90 wait | {stats.get('p90_wait', 0):.1f}m |\n"
        f"| p99 wait | {stats.get('p99_wait', 0):.1f}m |\n"
        f"| max wait | {stats.get('max_wait', 0):.1f}m |\n"
        f"| avg wait | {stats.get('avg_wait', 0):.1f}m |\n\n"
        f"This issue will auto-close once p90 drops below {P90_HEALTHY_MIN:.0f}m.\n\n"
        f"*Opened by `queue_issue_watcher.py` from {run_url}.*\n"
    )
    resp = requests.post(
        f"{GH_API}/repos/{repo}/issues",
        headers=_gh_headers(token),
        json={"title": title, "body": body, "labels": [LABEL, "automated"]},
        timeout=30,
    )
    if resp.status_code >= 300:
        log.error("Failed to open issue for %s: %d %s", queue, resp.status_code, resp.text[:200])
        return None
    return resp.json().get("number")


def _comment_issue(token: str, repo: str, number: int, body: str) -> None:
    resp = requests.post(
        f"{GH_API}/repos/{repo}/issues/{number}/comments",
        headers=_gh_headers(token),
        json={"body": body},
        timeout=30,
    )
    if resp.status_code >= 300:
        log.warning("Comment on #%d failed: %d", number, resp.status_code)


def _close_issue(token: str, repo: str, number: int) -> None:
    resp = requests.patch(
        f"{GH_API}/repos/{repo}/issues/{number}",
        headers=_gh_headers(token),
        json={"state": "closed", "state_reason": "completed"},
        timeout=30,
    )
    if resp.status_code >= 300:
        log.warning("Close #%d failed: %d", number, resp.status_code)


def run() -> int:
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPOSITORY") or "AndreasKaratzas/vllm-internal-project-dashboard"
    run_id = os.getenv("GITHUB_RUN_ID", "")
    run_url = f"https://github.com/{repo}/actions/runs/{run_id}" if run_id else f"https://github.com/{repo}"

    snapshot = _read_last_snapshot()
    if not snapshot:
        log.warning("No snapshot to evaluate; exiting")
        return 0

    state = _read_state()
    open_map: dict[str, int] = dict(state.get("open", {}))
    queues = snapshot.get("queues", {}) or {}

    hot = []
    for q, s in queues.items():
        p90 = float(s.get("p90_wait") or 0)
        waiting = int(s.get("waiting") or 0)
        if p90 >= P90_THRESHOLD_MIN and waiting >= MIN_WAITING_SAMPLES:
            hot.append((q, s, p90))

    healthy = []
    for q, number in open_map.items():
        s = queues.get(q) or {}
        p90 = float(s.get("p90_wait") or 0)
        if p90 <= P90_HEALTHY_MIN:
            healthy.append((q, number, p90, s))

    log.info("Evaluated %d queues: %d hot, %d healthy-with-open-issue", len(queues), len(hot), len(healthy))

    if not token:
        log.warning("GITHUB_TOKEN not set; skipping GitHub mutations")
        _write_state(state)
        return 0

    for q, s, p90 in hot:
        if q in open_map:
            # Already tracked — only add a comment if p90 degraded materially.
            log.info("%s already tracked in issue #%d (p90=%.1f)", q, open_map[q], p90)
            continue
        number = _open_issue(token, repo, q, s, run_url)
        if number is not None:
            open_map[q] = number
            log.info("Opened issue #%d for %s", number, q)

    for q, number, p90, s in healthy:
        _comment_issue(token, repo, number,
                       f"Queue healthy again: p90={p90:.1f}m (threshold {P90_HEALTHY_MIN:.0f}m). Closing.\n\n*{run_url}*")
        _close_issue(token, repo, number)
        open_map.pop(q, None)
        log.info("Closed issue #%d for %s", number, q)

    state["open"] = open_map
    state["last_run"] = snapshot.get("ts", "")
    _write_state(state)
    return 0


if __name__ == "__main__":
    sys.exit(run())

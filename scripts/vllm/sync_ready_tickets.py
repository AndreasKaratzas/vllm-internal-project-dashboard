#!/usr/bin/env python3
"""Sync nightly test failures with the vllm-project "Ready" project board.

For every AMD test group that is currently failing in the most recent nightly,
this script derives a stable issue title and reconciles it with GitHub Project
``vllm-project/projects/39``. The rules, per the team lead:

* Title match = same ticket. If a ticket with the canonical title already
  exists we update it (comment + move to "Ready" if needed), we do **not**
  duplicate.
* If the existing ticket is closed in the "Done" column, reopen it and move
  it back to "Ready".
* Otherwise create a new issue in ``vllm-project/vllm`` (the same repo the
  Projects V2 board is attached to) and add it to the board.

A 2-month Buildkite backfill is done from the on-disk nightly JSONLs in
``data/vllm/ci/test_results/*_amd.jsonl`` — so we can report first-failure,
last-successful, and break-frequency metrics on the dashboard without extra
API calls.

Defaults to **dry-run**. Dry-run writes a plan to
``data/vllm/ci/ready_tickets.json`` so the dashboard shows a preview and a
reviewer can eyeball it before flipping ``READY_TICKETS_LIVE=1`` in the
workflow. Live mode also writes the plan (with the resulting issue numbers
patched in) so the dashboard stays in sync.

Env:
  PROJECTS_TOKEN  classic PAT with ``project`` + ``repo`` scope on
                  ``vllm-project`` org (required for live mode — ``GITHUB_TOKEN``
                  can't access external Projects V2 boards).
  READY_TICKETS_LIVE  ``"1"`` → actually mutate; anything else → dry run.
  READY_TICKETS_ALLOW_UPSTREAM_WRITES  second explicit ack required for live
                  mutation. Without this the script refuses to touch upstream
                  issues even if ``READY_TICKETS_LIVE=1`` and a token exists.
  GITHUB_RUN_ID   link-back URL for issue bodies, set by Actions.
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
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent.parent
RESULTS_DIR = ROOT / "data" / "vllm" / "ci" / "test_results"
OUT = ROOT / "data" / "vllm" / "ci" / "ready_tickets.json"
STATE = ROOT / "data" / "vllm" / "ci" / "ready_tickets_state.json"
# Snapshot of every item on project #39 (issue_number → {status, title, url}).
# Written only in live mode — dashboard uses it to render the current column
# (Backlog / Ready / In Progress / In Review / Done) next to each tracked
# CI-failure issue. Dry-run cannot fetch Projects V2 board state.
PROJECT_ITEMS_OUT = ROOT / "data" / "vllm" / "ci" / "project_items.json"

# The Projects V2 board the team uses for triage.
PROJECT_ORG = "vllm-project"
PROJECT_NUMBER = 39
# Issues themselves are filed on the main vllm-project/vllm repo — the project
# board is just a view over those issues.
ISSUE_REPO = "vllm-project/vllm"
# 'ci-failure' is vllm-project's own auto-add label: any issue filed with it
# lands on project #39 automatically (into the Backlog column). Our mutation
# below then promotes it to the Ready column. Matching the upstream label
# keeps the triage workflow uniform across vllm-project engineers.
LABEL = "ci-failure"
READY_COLUMN = "Ready"
DONE_COLUMN = "Done"

# 2-month backfill window for break-frequency / first-failure metrics.
BACKFILL_DAYS = 60

GH_API = "https://api.github.com"
GH_GRAPHQL = "https://api.github.com/graphql"
TEST_AMD_YAML_URL = (
    "https://raw.githubusercontent.com/vllm-project/vllm/main/.buildkite/test-amd.yaml"
)
PAUSE_REASON = (
    "Ready Tickets / project #39 automation is paused. This repo must not "
    "create or update vllm-project/vllm issues until explicitly re-enabled."
)


# ---------------------------------------------------------------------------
# Shard template discovery (Buildkite %N parallelism)
# ---------------------------------------------------------------------------

def _fetch_shard_templates() -> list[str]:
    """Return ``%N``-bearing labels from upstream ``test-amd.yaml``.

    Buildkite expands ``parallelism: N`` by substituting ``%N`` in the step
    label with 1..N, producing per-shard job names like ``Kernels MoE Test 1``
    / ``...Test 2``. Those shards are the same test group as far as triage
    is concerned — one ticket per template, not one per shard.

    Returns the raw templates (e.g. ``["Kernels MoE Test %N", ...]``) so the
    caller can match incoming job names against each template's regex. We
    authoritatively consult the YAML rather than stripping trailing integers
    heuristically — legitimate group names end in numbers (e.g. ``LoRA 4``
    when it *isn't* parallelized), and we can't tell them apart without the
    source of truth.

    Fetch failures degrade gracefully: return ``[]`` so grouping falls back
    to raw job names rather than blocking the sync.
    """
    try:
        resp = requests.get(TEST_AMD_YAML_URL, timeout=15)
        resp.raise_for_status()
        data = yaml.safe_load(resp.text)
    except Exception as e:
        log.warning("Could not fetch test-amd.yaml for shard templates: %s", e)
        return []
    if not isinstance(data, dict):
        return []
    templates: list[str] = []
    for step in data.get("steps", []) or []:
        if not isinstance(step, dict):
            continue
        label = step.get("label") or ""
        par = step.get("parallelism")
        try:
            par_int = int(par) if par is not None else 0
        except (TypeError, ValueError):
            par_int = 0
        if par_int > 1 and "%N" in label:
            templates.append(label)
    return templates


def _compile_shard_patterns(templates: list[str]) -> list[tuple[re.Pattern[str], str]]:
    """Compile ``(regex, template)`` pairs so the %N slot matches any integer."""
    compiled: list[tuple[re.Pattern[str], str]] = []
    for tpl in templates:
        pattern = re.escape(tpl).replace(re.escape("%N"), r"\d+")
        compiled.append((re.compile(f"^{pattern}$"), tpl))
    return compiled


def _canonicalize_shard(test_name: str, patterns: list[tuple[re.Pattern[str], str]]) -> str:
    """Collapse a shard-specific name back to its ``%N`` template, if any."""
    for pat, tpl in patterns:
        if pat.match(test_name):
            return tpl
    return test_name


# ---------------------------------------------------------------------------
# Local nightly parsing
# ---------------------------------------------------------------------------

def _group_key(
    job_name: str,
    shard_patterns: list[tuple[re.Pattern[str], str]] | None = None,
) -> str:
    """Agent-qualified job name, e.g. ``mi325_1: Quantized MoE Test (B200-MI325)``.

    vllm-project's CI-failure convention on project #39 is one ticket per
    ``{agent}: {test_name}`` pair — a test can be green on mi250 but broken on
    mi325, and the reviewer needs to see that split. So we key groups by the
    full job name, not by the HW-stripped test name.

    When ``shard_patterns`` is supplied (from ``_fetch_shard_templates`` +
    ``_compile_shard_patterns``), the per-shard suffix that Buildkite derived
    from ``%N`` is folded back to the template. So
    ``mi325_1: Kernels MoE Test 1..4`` all collapse to
    ``mi325_1: Kernels MoE Test %N`` — one ticket per template, matching
    the step defined in ``test-amd.yaml``.
    """
    name = (job_name or "").strip()
    if not name or not shard_patterns:
        return name
    if ": " in name:
        agent, test = name.split(": ", 1)
        canonical = _canonicalize_shard(test, shard_patterns)
        return f"{agent}: {canonical}"
    return _canonicalize_shard(name, shard_patterns)


def _is_failing(status: str) -> bool:
    return (status or "").lower() in ("failed", "error", "broken", "timed_out")


def _load_nightly(date_file: Path) -> list[dict]:
    rows: list[dict] = []
    try:
        with date_file.open() as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except OSError:
        pass
    return rows


def _collect_group_history(days: int) -> dict:
    """Walk per-day nightly JSONLs, keyed by HW-stripped group name.

    Returns a dict keyed by group with per-date bucket status:
        { group: { "YYYY-MM-DD": {"pass": N, "fail": N, "hardware": {hw: status}} } }
    Only looks at AMD nightlies. Oldest first.

    Parallelized test steps (``parallelism: N`` with ``%N`` in the label) are
    collapsed to a single group so we don't file N tickets for what is
    fundamentally one test definition — the shard templates come from
    ``test-amd.yaml`` on upstream main, fetched once per run.
    """
    files = sorted(RESULTS_DIR.glob("*_amd.jsonl"))
    if not files:
        return {}
    today = datetime.now(timezone.utc).date()

    shard_patterns = _compile_shard_patterns(_fetch_shard_templates())

    per_group: dict[str, dict] = defaultdict(lambda: defaultdict(
        lambda: {"pass": 0, "fail": 0, "hardware": {}, "build_numbers": set(), "build_refs": set()}
    ))
    for f in files:
        # filenames are YYYY-MM-DD_amd.jsonl
        stem = f.stem.split("_")[0]
        try:
            d = datetime.strptime(stem, "%Y-%m-%d").date()
        except ValueError:
            continue
        if (today - d).days > days:
            continue
        for row in _load_nightly(f):
            group = _group_key(
                row.get("job_name") or row.get("classname") or "",
                shard_patterns,
            )
            if not group:
                continue
            status = (row.get("status") or "").lower()
            bucket = per_group[group][stem]
            if _is_failing(status):
                bucket["fail"] += 1
            elif status in ("passed", "xpassed"):
                bucket["pass"] += 1
            hw = (row.get("classname") or "").split(": ", 1)[0]
            if hw:
                prior = bucket["hardware"].get(hw)
                if prior != "fail":
                    bucket["hardware"][hw] = "fail" if _is_failing(status) else (prior or "pass")
            if row.get("build_number"):
                build_number = int(row["build_number"])
                bucket["build_numbers"].add(build_number)
                pipeline = (row.get("pipeline") or "amd-ci").strip()
                build_url = _buildkite_build_url(pipeline, build_number)
                bucket["build_refs"].add((pipeline, build_number, build_url or ""))

    # Convert sets → sorted lists so JSON-serializable.
    result: dict[str, dict] = {}
    for g, dates in per_group.items():
        result[g] = {}
        for d, stats in dates.items():
            result[g][d] = {
                "pass": stats["pass"],
                "fail": stats["fail"],
                "hardware": stats["hardware"],
                "build_numbers": sorted(stats["build_numbers"]),
                "build_refs": [
                    {
                        "pipeline": pipeline,
                        "build_number": build_number,
                        "url": url or _buildkite_build_url(pipeline, build_number) or "",
                    }
                    for pipeline, build_number, url in sorted(
                        stats["build_refs"], key=lambda ref: (ref[1], ref[0])
                    )
                ],
            }
    return result


def _summarize_group(group: str, history: dict[str, dict]) -> dict:
    """Derive first-failure / last-successful / break frequency from history."""
    dates_sorted = sorted(history.keys())
    first_failure: str | None = None
    last_success: str | None = None
    flips = 0
    prior_state: str | None = None  # "pass" | "fail"

    for d in dates_sorted:
        bucket = history[d]
        state: str | None = None
        if bucket["fail"]:
            state = "fail"
        elif bucket["pass"]:
            state = "pass"
        if state == "fail" and first_failure is None:
            first_failure = d
        if state == "pass":
            last_success = d
        if state and prior_state and state != prior_state:
            flips += 1
        if state:
            prior_state = state

    latest_date = dates_sorted[-1] if dates_sorted else None
    latest_failing = bool(latest_date and history[latest_date]["fail"])

    # If the group has since recovered, the "first_failure" of the current
    # streak is only meaningful if it extends to today. Walk backwards from
    # the latest date while the state is fail.
    current_streak_start: str | None = None
    if latest_failing:
        for d in reversed(dates_sorted):
            if history[d]["fail"]:
                current_streak_start = d
            elif history[d]["pass"]:
                break

    return {
        "group": group,
        "latest_date": latest_date,
        "currently_failing": latest_failing,
        "first_failure_in_window": first_failure,
        "current_streak_started": current_streak_start,
        "last_successful": last_success,
        "break_frequency": flips,
        "hardware_latest": history[latest_date]["hardware"] if latest_date else {},
        "builds_latest": history[latest_date]["build_numbers"] if latest_date else [],
        "build_refs_latest": history[latest_date].get("build_refs", []) if latest_date else [],
    }


# ---------------------------------------------------------------------------
# GitHub / Projects V2 helpers
# ---------------------------------------------------------------------------

def _rest_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _graphql(token: str, query: str, variables: dict) -> dict:
    resp = requests.post(
        GH_GRAPHQL,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        json={"query": query, "variables": variables},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL error: {data['errors']}")
    return data["data"]


PROJECT_META_Q = """
query($org: String!, $number: Int!) {
  organization(login: $org) {
    projectV2(number: $number) {
      id
      field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
    }
  }
}
"""


PROJECT_ITEMS_Q = """
query($projectId: ID!, $cursor: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
          content {
            __typename
            ... on Issue {
              number
              title
              state
              url
              repository { nameWithOwner }
            }
          }
        }
      }
    }
  }
}
"""


ADD_ITEM_MUT = """
mutation($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    item { id }
  }
}
"""


SET_STATUS_MUT = """
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
    value: { singleSelectOptionId: $optionId }
  }) { projectV2Item { id } }
}
"""


def _fetch_project_meta(token: str) -> tuple[str, str, dict[str, str]]:
    data = _graphql(token, PROJECT_META_Q, {"org": PROJECT_ORG, "number": PROJECT_NUMBER})
    proj = data["organization"]["projectV2"]
    status_field = proj["field"]
    options = {o["name"]: o["id"] for o in status_field["options"]}
    return proj["id"], status_field["id"], options


def _fetch_project_items_by_title(token: str, project_id: str) -> dict[str, dict]:
    """Map {issue_title: {itemId, issueNumber, status, issueState, url, repo}}."""
    out: dict[str, dict] = {}
    cursor = None
    while True:
        data = _graphql(token, PROJECT_ITEMS_Q, {"projectId": project_id, "cursor": cursor})
        page = data["node"]["items"]
        for it in page["nodes"]:
            content = it.get("content") or {}
            if content.get("__typename") != "Issue":
                continue
            status = (it.get("fieldValueByName") or {}).get("name") or ""
            out[content["title"]] = {
                "itemId": it["id"],
                "issueNumber": content["number"],
                "issueState": content["state"],
                "status": status,
                "url": content["url"],
                "repo": content["repository"]["nameWithOwner"],
            }
        if not page["pageInfo"]["hasNextPage"]:
            break
        cursor = page["pageInfo"]["endCursor"]
    return out


def _canonical_title(group: str) -> str:
    # Matches vllm-project's established CI-failure title scheme exactly, e.g.
    # ``[CI Failure]: mi325_1: Quantized MoE Test (B200-MI325)``. Title equality
    # is how we dedupe against the project board, so don't evolve this casually.
    return f"[CI Failure]: {group}"


_HW_PREFIX_RE = re.compile(r"^mi\d+_\d+:\s*", re.IGNORECASE)
_HW_PREFIX_CAPTURE_RE = re.compile(r"^(mi\d+_\d+):\s*", re.IGNORECASE)
_CI_PREFIX_RE = re.compile(r"^\[CI Failure\]:\s*", re.IGNORECASE)
_PULL_URL_RE = re.compile(r"https?://github\.com/([^/\s]+/[^/\s]+)/pull/(\d+)", re.IGNORECASE)
_PR_CONTEXT_REF_RE = re.compile(
    r"(?i)\b(?:pr|pull request|expected to be solved after|solved after)\b[^\n#]{0,120}#(\d+)"
)


def _hw_prefix(title: str) -> str | None:
    """Return the ``mi{N}_{M}`` GPU-pool prefix from a title, or ``None``.

    Same test group (e.g. ``Kernels MoE Test %N``) runs on several pools
    (``mi250_1``, ``mi325_1``, ``mi355_1``) and each pool needs its own
    ticket — they fail and recover independently. Callers use this to
    reject a normalized-title match when the existing ticket's prefix
    disagrees with the incoming group's prefix.
    """
    s = _CI_PREFIX_RE.sub("", title or "")
    m = _HW_PREFIX_CAPTURE_RE.match(s)
    return m.group(1).lower() if m else None


def _normalized_match_compatible(existing_title: str, incoming_title: str) -> bool:
    """Guard the normalized-title fallback against cross-pool collapse.

    Normalization strips the HW prefix so that a hand-filed
    ``[CI Failure]: Transformers Nightly Models Test`` (no prefix) can
    match our synthesized ``[CI Failure]: mi325_1: Transformers ...``.
    But the same stripping makes ``mi325_1: Kernels MoE Test %N`` collide
    with ``mi355_1: Kernels MoE Test %N``, merging two pools' tickets
    onto whichever was filed first.

    Accept the match only when the existing ticket is HW-agnostic (the
    upstream case normalization was designed for) OR its HW prefix
    matches the incoming group's. Reject cross-pool matches — they need
    separate tickets.
    """
    existing_hw = _hw_prefix(existing_title)
    incoming_hw = _hw_prefix(incoming_title)
    if existing_hw is None:
        return True
    return existing_hw == incoming_hw


def _build_norm_index(titles) -> dict[str, list[str]]:
    """Group existing titles by their normalized key.

    Multiple existing titles can collide under the same normalized key —
    e.g. ``[CI Failure]: mi325_1: Kernels MoE Test %N`` and
    ``[CI Failure]:  mi355_1: Kernels MoE Test %N`` (note the double
    space — a hand-filed quirk) both normalize to ``kernels moe test``.
    Storing one-per-key with ``setdefault`` silently drops the other,
    and the caller ends up matching the incoming ticket against the
    wrong pool's existing title. Return every candidate so
    ``_pick_normalized_candidate`` can pick the one whose HW prefix
    matches the incoming group.
    """
    out: dict[str, list[str]] = {}
    for t in titles:
        n = _normalize_title(t)
        if n:
            out.setdefault(n, []).append(t)
    return out


def _pick_normalized_candidate(
    candidates: list[str], incoming_title: str
) -> str | None:
    """From multiple normalized-key collisions, pick the one compatible
    with ``incoming_title``'s HW prefix.

    Preference order:
      1. Exact HW-prefix match (e.g. existing mi355_1, incoming mi355_1).
      2. HW-agnostic existing (no prefix — hand-filed upstream ticket).
      3. No match — do not adopt a differently-pooled existing ticket.
    """
    if not candidates:
        return None
    incoming_hw = _hw_prefix(incoming_title)
    # Same-pool wins.
    for c in candidates:
        if _hw_prefix(c) == incoming_hw and incoming_hw is not None:
            return c
    # HW-agnostic existing (the original design case).
    for c in candidates:
        if _hw_prefix(c) is None:
            return c
    # Only differently-pooled existing candidates are left — reject.
    return None


def _normalize_title(title: str) -> str:
    """Strip decoration so titles filed by-hand and by-this-script collide.

    Upstream has a habit of filing one ``[CI Failure]: Transformers Nightly
    Models Test`` with no HW prefix, while we'd synthesize
    ``[CI Failure]: mi325_1: Transformers Nightly Models Test``. Without
    a secondary normalized lookup we cheerfully duplicate their ticket.

    Normalization: drop ``[CI Failure]:`` prefix, drop ``mi{N}_{M}:``
    hardware prefix, drop trailing ``%N`` shard marker, collapse whitespace,
    lowercase. Deliberately conservative — only used as a *fallback* after
    exact-title match fails, so a false positive just means we reuse a
    ticket for a closely-named test instead of creating a twin.
    """
    s = _CI_PREFIX_RE.sub("", title or "")
    s = _HW_PREFIX_RE.sub("", s)
    s = re.sub(r"\s+%N\s*$", "", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def _buildkite_build_url(pipeline: str | None, build_number: int | str | None) -> str | None:
    pipeline_name = (pipeline or "").strip()
    if not pipeline_name or build_number in (None, ""):
        return None
    try:
        number = int(build_number)
    except (TypeError, ValueError):
        return None
    return f"https://buildkite.com/vllm/{pipeline_name}/builds/{number}"


def _format_build_refs(summary: dict, limit: int = 5) -> str:
    refs = summary.get("build_refs_latest") or []
    if refs:
        rendered: list[str] = []
        for ref in sorted(
            refs,
            key=lambda item: (int(item.get("build_number") or 0), item.get("pipeline") or ""),
            reverse=True,
        )[:limit]:
            build_number = ref.get("build_number")
            pipeline = (ref.get("pipeline") or "").strip()
            label = f"{pipeline or 'build'} #{build_number}"
            url = ref.get("url") or _buildkite_build_url(pipeline, build_number)
            rendered.append(f"[{label}]({url})" if url else label)
        if rendered:
            return ", ".join(rendered)
    builds = summary.get("builds_latest") or []
    return ", ".join(f"build #{n}" for n in builds[:limit]) or "—"


def _issue_body(summary: dict, run_url: str) -> str:
    hw_rows = "\n".join(
        f"| `{hw}` | {state} |" for hw, state in sorted(summary["hardware_latest"].items())
    ) or "| — | — |"
    builds = _format_build_refs(summary)
    return (
        f"## AMD nightly — failing test group\n\n"
        f"**Group:** `{summary['group']}`\n\n"
        f"**Current streak start:** {summary['current_streak_started'] or '—'}\n"
        f"**First failure in {BACKFILL_DAYS}d window:** {summary['first_failure_in_window'] or '—'}\n"
        f"**Last successful nightly:** {summary['last_successful'] or '—'}\n"
        f"**Break frequency ({BACKFILL_DAYS}d, pass↔fail flips):** {summary['break_frequency']}\n"
        f"**Latest nightly date:** {summary['latest_date'] or '—'}\n"
        f"**Latest build(s):** {builds}\n\n"
        f"### Hardware status in latest nightly\n\n"
        f"| hardware | status |\n|---|---|\n{hw_rows}\n\n"
        f"Auto-managed by `sync_ready_tickets.py`. Closed + moved to Done "
        f"when this group passes on all AMD hardware.\n\n"
        f"*Last sync: {run_url}*\n"
    )


def _sync_issue_body(
    token: str, repo: str, issue_number: int, body: str, *, reopen: bool = False
) -> None:
    payload: dict[str, str] = {"body": body}
    if reopen:
        payload["state"] = "open"
    r = requests.patch(
        f"{GH_API}/repos/{repo}/issues/{issue_number}",
        headers=_rest_headers(token),
        json=payload,
        timeout=30,
    )
    if r.status_code >= 300:
        action = "reopen+refresh" if reopen else "refresh"
        log.warning("Issue %s #%s failed: %s", action, issue_number, r.text[:200])


def _issue_details(token: str, repo_full_name: str, issue_number: int) -> dict:
    resp = requests.get(
        f"{GH_API}/repos/{repo_full_name}/issues/{issue_number}",
        headers=_rest_headers(token),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def _issue_comments(token: str, repo_full_name: str, issue_number: int) -> list[dict]:
    comments: list[dict] = []
    page = 1
    while True:
        resp = requests.get(
            f"{GH_API}/repos/{repo_full_name}/issues/{issue_number}/comments",
            headers=_rest_headers(token),
            params={"per_page": 100, "page": page},
            timeout=30,
        )
        resp.raise_for_status()
        batch = resp.json()
        comments.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return comments


def _extract_linked_prs_from_text(text: str, repo_full_name: str) -> list[dict]:
    refs: dict[int, dict] = {}
    body = text or ""
    repo_norm = (repo_full_name or "").lower()

    for match in _PULL_URL_RE.finditer(body):
        repo = match.group(1)
        if repo.lower() != repo_norm:
            continue
        number = int(match.group(2))
        refs[number] = {
            "number": number,
            "url": f"https://github.com/{repo_full_name}/pull/{number}",
        }

    for match in _PR_CONTEXT_REF_RE.finditer(body):
        number = int(match.group(1))
        refs.setdefault(number, {
            "number": number,
            "url": f"https://github.com/{repo_full_name}/pull/{number}",
        })

    return [refs[n] for n in sorted(refs)]


def _collect_issue_linked_prs(token: str, repo_full_name: str, issue_number: int) -> list[dict]:
    try:
        issue = _issue_details(token, repo_full_name, issue_number)
    except requests.RequestException as e:
        log.warning("Could not fetch issue #%s for PR-link extraction: %s", issue_number, e)
        return []

    refs: dict[int, dict] = {}
    for ref in _extract_linked_prs_from_text(issue.get("body") or "", repo_full_name):
        refs[ref["number"]] = ref

    comment_count = int(issue.get("comments") or 0)
    if comment_count <= 0:
        return [refs[n] for n in sorted(refs)]

    try:
        comments = _issue_comments(token, repo_full_name, issue_number)
    except requests.RequestException as e:
        log.warning("Could not fetch comments for issue #%s: %s", issue_number, e)
        return [refs[n] for n in sorted(refs)]

    for comment in comments:
        for ref in _extract_linked_prs_from_text(comment.get("body") or "", repo_full_name):
            refs[ref["number"]] = ref
    return [refs[n] for n in sorted(refs)]


def _should_move_to_ready(*, created: bool, issue_state: str, current_status: str) -> bool:
    status = (current_status or "").strip()
    state = (issue_state or "").strip().lower()
    if created:
        return True
    if state == "closed":
        return True
    return status in ("", "Backlog", DONE_COLUMN)


def _find_or_create_issue(
    token: str,
    title: str,
    body: str,
    project_items: dict[str, dict],
    project_items_by_norm: dict[str, list[str]] | None = None,
) -> tuple[int, str, bool, str | None]:
    """Return ``(issue_number, url, created, matched_existing_title)``.

    Lookup order:
      1. Exact title match in ``project_items``.
      2. ``_normalize_title(title)`` lookup in ``project_items_by_norm`` →
         resolves to an existing project item (filed by hand, differently
         capitalized, or with no HW prefix).
      3. Create a fresh issue on ``ISSUE_REPO``.

    ``matched_existing_title`` is the key in ``project_items`` that was
    adopted (exact or normalized) — ``None`` if we created a fresh issue.
    Callers use it for item-id lookup and for keying state so future runs
    dedup against the upstream title, not ours.
    """
    # 1. Exact match.
    if title in project_items:
        it = project_items[title]
        _sync_issue_body(
            token,
            it["repo"],
            it["issueNumber"],
            body,
            reopen=it["issueState"].lower() == "closed",
        )
        return it["issueNumber"], it["url"], False, title

    # 2. Normalized fallback — adopt a pre-existing ticket with a slightly
    # different title. Reject if the existing ticket is pinned to a
    # different GPU pool; those are different tickets by definition.
    if project_items_by_norm:
        norm = _normalize_title(title)
        candidates = project_items_by_norm.get(norm, []) if norm else []
        existing_title = _pick_normalized_candidate(candidates, title)
        if (existing_title and existing_title in project_items):
            it = project_items[existing_title]
            log.info(
                "Adopting existing ticket #%s %r for group %r (normalized match)",
                it["issueNumber"], existing_title, title,
            )
            _sync_issue_body(
                token,
                it["repo"],
                it["issueNumber"],
                body,
                reopen=it["issueState"].lower() == "closed",
            )
            return it["issueNumber"], it["url"], False, existing_title

    # 3. Create fresh.
    resp = requests.post(
        f"{GH_API}/repos/{ISSUE_REPO}/issues",
        headers=_rest_headers(token),
        json={"title": title, "body": body, "labels": [LABEL]},
        timeout=30,
    )
    if resp.status_code >= 400:
        # Surface GitHub's own error body — a bare raise_for_status() only
        # prints the URL and status, so 403 "Resource not accessible by
        # integration" reads identically to 403 "blank_issues_enabled is
        # false" without context. Truncated to keep logs readable.
        log.error(
            "POST /issues on %s returned %d: %s",
            ISSUE_REPO, resp.status_code, resp.text[:500],
        )
    resp.raise_for_status()
    data = resp.json()
    return data["number"], data["html_url"], True, None


def _comment_issue(token: str, repo: str, number: int, body: str) -> None:
    requests.post(
        f"{GH_API}/repos/{repo}/issues/{number}/comments",
        headers=_rest_headers(token), json={"body": body}, timeout=30,
    )


def _close_issue(token: str, repo: str, number: int) -> None:
    requests.patch(
        f"{GH_API}/repos/{repo}/issues/{number}",
        headers=_rest_headers(token),
        json={"state": "closed", "state_reason": "completed"},
        timeout=30,
    )


def _issue_node_id(token: str, repo: str, number: int) -> str:
    r = requests.get(
        f"{GH_API}/repos/{repo}/issues/{number}",
        headers=_rest_headers(token), timeout=30,
    )
    r.raise_for_status()
    return r.json()["node_id"]


# ---------------------------------------------------------------------------
# Dry-run preflight — read-only lookup of already-filed issues
# ---------------------------------------------------------------------------
#
# The live path learns about existing tickets via Projects V2 GraphQL (needs
# ``PROJECTS_TOKEN``). Dry-run runs hourly without that PAT, so it used to
# emit ``pending`` for every failing group even when an upstream engineer had
# already filed an issue. To keep the dashboard honest, we do a single
# REST search call here — it needs only the default ``GITHUB_TOKEN`` (public
# read) and returns every open ``label:ci-failure`` issue on the target repo.
# We then match by exact title, falling back to ``_normalize_title`` so a
# hand-filed ``[CI Failure]: Transformers Nightly Models Test`` adopts the
# syncer's ``mi325_1:``-prefixed twin.
#
# This is strictly read-only; no POST / PATCH / assignment happens in the
# dry-run path. If the search call fails (token missing, rate-limited,
# network), we silently fall through to ``pending`` — better a stale
# preview than a crashed workflow.


def _fetch_existing_ci_failure_issues(
    token: str, repo: str
) -> dict[str, dict]:
    """Return {title: {number, html_url, state}} for open CI-failure issues.

    Paginates ``/search/issues?q=repo:X+is:issue+is:open+label:ci-failure``.
    Returns ``{}`` on any error so callers can proceed with no enrichment.
    """
    out: dict[str, dict] = {}
    page = 1
    while page <= 10:  # 10 * 100 = 1000 issues — well beyond any realistic ci-failure backlog
        try:
            r = requests.get(
                f"{GH_API}/search/issues",
                headers=_rest_headers(token),
                params={
                    "q": f"repo:{repo} is:issue is:open label:{LABEL}",
                    "per_page": 100,
                    "page": page,
                },
                timeout=30,
            )
        except requests.RequestException as e:
            log.warning("dry-run preflight: search failed on page %d: %s", page, e)
            return out
        if r.status_code != 200:
            log.warning("dry-run preflight: search returned %s: %s",
                        r.status_code, r.text[:200])
            return out
        data = r.json()
        items = data.get("items") or []
        for it in items:
            out[it["title"]] = {
                "number": it["number"],
                "html_url": it["html_url"],
                "state": it["state"],
            }
        if len(items) < 100:
            break
        page += 1
    return out


def _enrich_dry_run_plan(plan: list[dict], existing: dict[str, dict]) -> None:
    """Populate ``issue_number``/``issue_url`` on plan entries that already
    have a live upstream issue. Uses the same exact + normalized-title
    lookup ``_find_or_create_issue`` uses in live mode, so the two agree.
    """
    if not existing:
        return
    by_norm = _build_norm_index(existing.keys())
    for p in plan:
        title = p["title"]
        matched = existing.get(title)
        if not matched:
            candidates = by_norm.get(_normalize_title(title), [])
            alt = _pick_normalized_candidate(candidates, title)
            if alt:
                matched = existing.get(alt)
        if matched:
            p["issue_number"] = matched["number"]
            p["issue_url"] = matched["html_url"]
            p["action"] = "would_update_existing"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run() -> int:
    live_requested = os.getenv("READY_TICKETS_LIVE", "").strip() == "1"
    allow_live = os.getenv("READY_TICKETS_ALLOW_UPSTREAM_WRITES", "").strip() == "1"
    live = live_requested and allow_live
    token = os.getenv("PROJECTS_TOKEN")
    run_id = os.getenv("GITHUB_RUN_ID", "")
    run_url = f"https://github.com/AndreasKaratzas/vllm-ci-dashboard/actions/runs/{run_id}" if run_id else ""

    history = _collect_group_history(BACKFILL_DAYS)
    summaries = [_summarize_group(g, h) for g, h in history.items()]
    summaries.sort(key=lambda s: s["group"])
    failing = [s for s in summaries if s["currently_failing"]]

    log.info("Groups: %d tracked, %d currently failing (window=%dd)",
             len(summaries), len(failing), BACKFILL_DAYS)

    # The body is included in every plan entry so the dashboard can build a
    # pre-filled ``issues/new?title=&body=&labels=`` URL for admins who want
    # to review/file a ticket by hand while the syncer is in dry-run. Using
    # the same ``_issue_body`` helper that live mode uses keeps the preview
    # byte-identical to what the syncer would POST.
    _dryrun_body_run_url = run_url or f"https://github.com/{ISSUE_REPO}"
    plan: list[dict] = []
    for s in failing:
        plan.append({
            "title": _canonical_title(s["group"]),
            "body": _issue_body(s, _dryrun_body_run_url),
            "labels": [LABEL],
            "summary": s,
            "action": "pending",          # will be overwritten below
            "issue_number": None,
            "issue_url": None,
            "project_status": None,
            "linked_prs": [],
            "assignee": None,
        })

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "window_days": BACKFILL_DAYS,
        "issue_repo": ISSUE_REPO,
        "project": f"{PROJECT_ORG}/projects/{PROJECT_NUMBER}",
        "mode": "live" if live else "dry_run",
        # NOTE: the engineer roster is intentionally NOT serialized here.
        # This file is served publicly on gh-pages; any PII (names, logins)
        # goes out to the internet. The admin-only assignee dropdown fetches
        # `data/vllm/ci/engineers.enc.json` (AES-GCM ciphertext, decrypted
        # client-side with the admin's vault key) instead.
        "failing_groups_total": len(failing),
        "groups_all": summaries,
        "tickets": plan,
    }

    if live_requested and token and not allow_live:
        log.warning(
            "READY_TICKETS_LIVE=1 but READY_TICKETS_ALLOW_UPSTREAM_WRITES!=1 — "
            "forcing paused mode with no upstream GitHub calls"
        )
        paused_output = dict(output)
        paused_output.update({
            "mode": "paused",
            "feature_paused": True,
            "pause_reason": PAUSE_REASON,
            "failing_groups_total": 0,
            "groups_all": [],
            "tickets": [],
        })
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(paused_output, indent=2, sort_keys=True))
        PROJECT_ITEMS_OUT.parent.mkdir(parents=True, exist_ok=True)
        PROJECT_ITEMS_OUT.write_text(json.dumps({
            "feature_paused": True,
            "generated_at": paused_output["generated_at"],
            "items_by_number": {},
            "project": f"{PROJECT_ORG}/projects/{PROJECT_NUMBER}",
            "project_url": f"https://github.com/orgs/{PROJECT_ORG}/projects/{PROJECT_NUMBER}",
        }, indent=2, sort_keys=True))
        log.info("Wrote paused Ready Tickets snapshot to %s", OUT)
        return 0

    if not live or not token:
        if live_requested and not token:
            log.warning("READY_TICKETS_LIVE=1 but PROJECTS_TOKEN not set — forcing dry-run")
            output["mode"] = "dry_run_forced"
        for p in plan:
            p["action"] = "would_create_or_update"
        # Read-only preflight: if any token is available (the default
        # ``GITHUB_TOKEN`` is enough — public read), annotate each plan
        # entry that already has an open issue on the target repo.
        preflight_token = os.getenv("GITHUB_TOKEN") or token
        if preflight_token and plan:
            existing = _fetch_existing_ci_failure_issues(preflight_token, ISSUE_REPO)
            _enrich_dry_run_plan(plan, existing)
            matched = sum(1 for p in plan if p["issue_number"])
            log.info("Dry-run preflight: %d of %d plan entries match existing %s issues",
                     matched, len(plan), ISSUE_REPO)
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(output, indent=2, sort_keys=True))
        log.info("Wrote dry-run plan (%d tickets) to %s", len(plan), OUT)
        return 0

    # Live mode from here on.
    project_id, status_field_id, status_options = _fetch_project_meta(token)
    ready_opt = status_options.get(READY_COLUMN)
    done_opt = status_options.get(DONE_COLUMN)
    if not ready_opt:
        log.error("Could not find Status option %r on project; aborting", READY_COLUMN)
        return 1

    existing = _fetch_project_items_by_title(token, project_id)
    # Normalized-title → list of existing titles. Lookup goes through
    # ``_pick_normalized_candidate`` so a ``mi355_1`` incoming ticket
    # adopts the mi355_1 existing one instead of the mi325_1 one that
    # also collides under the stripped-HW key.
    existing_by_norm = _build_norm_index(existing.keys())
    log.info("Project has %d existing tracked issues", len(existing))

    # Dump the current snapshot of every item on project #39 so the dashboard
    # can show which column (Backlog / Ready / In Progress / In Review / Done)
    # each tracked CI-failure issue currently sits in. Keyed by issue_number
    # because the dashboard joins on that. Written every live run — overwrites
    # any prior snapshot, which is fine: only the latest state matters.
    project_items_by_number: dict[str, dict] = {}
    for title, it in existing.items():
        num = it.get("issueNumber")
        if num is None:
            continue
        project_items_by_number[str(num)] = {
            "issue_number": num,
            "title": title,
            "status": it.get("status") or "",
            "issue_state": it.get("issueState") or "",
            "url": it.get("url") or "",
            "repo": it.get("repo") or "",
        }
    project_items_out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project": f"{PROJECT_ORG}/projects/{PROJECT_NUMBER}",
        "project_url": f"https://github.com/orgs/{PROJECT_ORG}/projects/{PROJECT_NUMBER}",
        "items_by_number": project_items_by_number,
    }
    PROJECT_ITEMS_OUT.parent.mkdir(parents=True, exist_ok=True)
    PROJECT_ITEMS_OUT.write_text(json.dumps(project_items_out, indent=2, sort_keys=True))
    log.info("Wrote project items snapshot (%d items) to %s",
             len(project_items_by_number), PROJECT_ITEMS_OUT)

    state = {}
    if STATE.exists():
        try:
            state = json.loads(STATE.read_text())
        except json.JSONDecodeError:
            state = {}
    state.setdefault("tickets", {})

    seen_titles: set[str] = set()
    for entry in plan:
        title = entry["title"]
        summary = entry["summary"]
        body = _issue_body(summary, run_url or f"https://github.com/{ISSUE_REPO}")

        issue_number, issue_url, created, matched_title = _find_or_create_issue(
            token, title, body, existing, existing_by_norm,
        )
        # Route state + project-item lookup through the effective title —
        # either the title we'd create (if fresh) or the upstream title we
        # adopted (exact or normalized match). This is what future runs will
        # find on the board, so state must key by it.
        effective_title = matched_title or title
        entry["issue_number"] = issue_number
        entry["issue_url"] = issue_url
        entry["action"] = "created" if created else "updated"
        entry["adopted_title"] = matched_title if matched_title and matched_title != title else None

        if effective_title in existing:
            item_id = existing[effective_title]["itemId"]
        else:
            # Add the freshly-created issue to the project.
            node_id = _issue_node_id(token, ISSUE_REPO, issue_number)
            add = _graphql(token, ADD_ITEM_MUT, {"projectId": project_id, "contentId": node_id})
            item_id = add["addProjectV2ItemById"]["item"]["id"]

        current_item = existing.get(effective_title, {})
        current_status = current_item.get("status", "")
        current_issue_state = current_item.get("issueState", "")
        issue_repo = current_item.get("repo") or ISSUE_REPO

        if _should_move_to_ready(
            created=created,
            issue_state=current_issue_state,
            current_status=current_status,
        ):
            _graphql(token, SET_STATUS_MUT, {
                "projectId": project_id, "itemId": item_id,
                "fieldId": status_field_id, "optionId": ready_opt,
            })
            entry["project_status"] = f"{current_status or '∅'}→{READY_COLUMN}"
        else:
            entry["project_status"] = current_status or READY_COLUMN

        entry["linked_prs"] = _collect_issue_linked_prs(token, issue_repo, issue_number)

        seen_titles.add(effective_title)
        state["tickets"][effective_title] = {
            "issue_number": issue_number,
            "issue_url": issue_url,
            "last_seen": summary["latest_date"],
            "our_title": title,
        }

    # Auto-close: previously-tracked tickets whose group is no longer failing.
    for title, meta in list(state["tickets"].items()):
        if title in seen_titles:
            continue
        issue_number = meta.get("issue_number")
        if not issue_number:
            continue
        # Only close if it's still open on GitHub.
        item = existing.get(title)
        if item and item["issueState"].lower() == "open":
            _comment_issue(token, ISSUE_REPO, issue_number,
                           f"Group passing again as of {datetime.now(timezone.utc).date()}. Closing.\n\n*{run_url}*")
            _close_issue(token, ISSUE_REPO, issue_number)
            if done_opt:
                _graphql(token, SET_STATUS_MUT, {
                    "projectId": project_id, "itemId": item["itemId"],
                    "fieldId": status_field_id, "optionId": done_opt,
                })
        state["tickets"].pop(title, None)

    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2, sort_keys=True))
    OUT.write_text(json.dumps(output, indent=2, sort_keys=True))
    log.info("Synced %d tickets (live).", len(plan))
    return 0


if __name__ == "__main__":
    sys.exit(run())

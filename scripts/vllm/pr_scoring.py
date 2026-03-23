"""PR importance scoring for vLLM ROCm contributions.

Heuristic scoring system that evaluates PR importance based on:
- Diff size (additions + deletions, files changed)
- File type weights (kernels > model code > tests > config > docs)
- Complexity signals (commits, review comments, duration)
- PR state (merged > approved > open > draft > closed)

Produces a 1-10 importance score and a category label.
"""

import logging
import re

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# File type weights — what kind of work does this file represent?
# ---------------------------------------------------------------------------

# Higher weight = more important/complex work
FILE_WEIGHTS = [
    # Kernel implementations — highest value
    (re.compile(r'(kernels?|csrc|cuda|hip|triton.*\.py)/', re.I), 5.0, "kernel"),
    (re.compile(r'\.(cu|hip|cuh)$', re.I), 5.0, "kernel"),
    # Model code — core logic
    (re.compile(r'(model_executor|layers|attention|quantization)/', re.I), 4.0, "model"),
    (re.compile(r'vllm/model_executor/', re.I), 4.0, "model"),
    # Engine / scheduler / core
    (re.compile(r'(engine|scheduler|worker|executor|core)/', re.I), 3.5, "engine"),
    # API / entrypoints
    (re.compile(r'(entrypoints|api_server|openai)/', re.I), 3.0, "api"),
    # Tests — meaningful but lower than implementation
    (re.compile(r'tests?/', re.I), 2.0, "test"),
    # CI / buildkite config
    (re.compile(r'(\.buildkite|\.github|ci)/', re.I), 2.0, "ci"),
    # Config / setup / packaging
    (re.compile(r'(setup\.|pyproject|requirements|Dockerfile|CMake)', re.I), 1.5, "config"),
    # Docs / markdown
    (re.compile(r'\.(md|rst|txt)$', re.I), 1.0, "docs"),
    (re.compile(r'docs?/', re.I), 1.0, "docs"),
]

DEFAULT_FILE_WEIGHT = 2.5  # Unknown files get middle weight


def classify_file(path: str) -> tuple[float, str]:
    """Return (weight, category) for a file path."""
    for pattern, weight, category in FILE_WEIGHTS:
        if pattern.search(path):
            return weight, category
    return DEFAULT_FILE_WEIGHT, "other"


# ---------------------------------------------------------------------------
# PR importance scoring
# ---------------------------------------------------------------------------

def score_pr(pr: dict) -> dict:
    """Compute an importance score (1-10) for a PR.

    Args:
        pr: PR dict with fields from GitHub API including:
            - additions, deletions, changed_files (from detailed PR endpoint)
            - commits (commit count)
            - review_comments (review comment count)
            - state, merged, draft
            - created_at, updated_at, merged_at, closed_at
            - files (list of {filename, additions, deletions} if available)

    Returns:
        Dict with score, breakdown, and category.
    """
    additions = pr.get("additions", 0) or 0
    deletions = pr.get("deletions", 0) or 0
    changed_files = pr.get("changed_files", 0) or 0
    commits = pr.get("commits", 0) or 0
    review_comments = pr.get("review_comments", 0) or 0
    comments = pr.get("comments", 0) or 0
    total_lines = additions + deletions
    merged = pr.get("merged", False)
    draft = pr.get("draft", False)
    state = pr.get("state", "open")
    bk_builds = pr.get("bk_build_count", 0) or 0  # Buildkite builds on this branch
    title = (pr.get("title") or "").lower()

    # --- Component scores (each 0-10) ---

    # 1. Size score: logarithmic, but penalize pure-move PRs
    #    Detect move-heavy PRs: additions ≈ deletions with many files
    files = pr.get("files", [])
    rename_count = sum(1 for f in files if f.get("status") == "renamed")
    is_likely_move = (
        changed_files > 5
        and abs(additions - deletions) < total_lines * 0.15  # add ≈ del
        and rename_count > changed_files * 0.3                # many renames
    )

    if total_lines == 0:
        size_score = 0.5
    elif is_likely_move:
        # Moves/renames: cap the size score low
        size_score = min(3.0, total_lines / 1000 + 1.0)
    elif total_lines <= 10:
        size_score = 1.5  # Small but could be a surgical fix
    elif total_lines <= 50:
        size_score = 2.5
    elif total_lines <= 200:
        size_score = 4.0
    elif total_lines <= 500:
        size_score = 5.5
    elif total_lines <= 1000:
        size_score = 7.0
    elif total_lines <= 3000:
        size_score = 8.0
    else:
        size_score = 9.0

    # 2. File type score: weighted average of touched file types
    if files:
        weighted_sum = 0
        total_file_lines = 0
        categories_touched = set()
        for f in files:
            fname = f.get("filename", "")
            flines = (f.get("additions", 0) or 0) + (f.get("deletions", 0) or 0)
            weight, category = classify_file(fname)
            weighted_sum += weight * max(flines, 1)
            total_file_lines += max(flines, 1)
            categories_touched.add(category)
        file_type_score = (weighted_sum / total_file_lines) * 2 if total_file_lines > 0 else 5.0
        file_type_score = min(file_type_score, 10.0)
    else:
        # No file details — estimate from changed_files count
        file_type_score = min(changed_files * 0.5, 5.0) if changed_files > 0 else 2.5
        categories_touched = set()

    # 3. Complexity score: commits, review comments, files breadth
    complexity_signals = 0
    if commits > 5:
        complexity_signals += 2
    elif commits > 2:
        complexity_signals += 1
    if review_comments > 10:
        complexity_signals += 2
    elif review_comments > 3:
        complexity_signals += 1
    if changed_files > 20:
        complexity_signals += 2
    elif changed_files > 8:
        complexity_signals += 1
    if len(categories_touched) > 3:
        complexity_signals += 1
    complexity_score = min(complexity_signals * 1.5 + 1, 10.0)

    # 4. Effort score: Buildkite builds, PR duration, iteration intensity
    #    Many BK builds = heavy testing/iteration = harder problem
    effort_score = 1.0
    if bk_builds > 20:
        effort_score = 8.0
    elif bk_builds > 10:
        effort_score = 6.0
    elif bk_builds > 5:
        effort_score = 4.0
    elif bk_builds > 2:
        effort_score = 2.5

    # PR duration: long-lived PRs with active commits = sustained effort
    created = pr.get("created_at", "")
    closed = pr.get("merged_at") or pr.get("closed_at") or pr.get("updated_at", "")
    if created and closed:
        try:
            from datetime import datetime
            d1 = datetime.fromisoformat(created.replace("Z", "+00:00"))
            d2 = datetime.fromisoformat(closed.replace("Z", "+00:00"))
            pr_days = (d2 - d1).days
            if pr_days > 14 and commits > 5:
                effort_score = max(effort_score, 6.0)  # Long-lived with active dev
            elif pr_days > 7 and commits > 3:
                effort_score = max(effort_score, 4.0)
        except (ValueError, TypeError):
            pass

    # 5. Surgical fix boost: small diff on hard files gets a bonus
    #    Catches race-condition fixes, one-liner kernel fixes, etc.
    surgical_boost = 0.0
    is_bugfix = any(kw in title for kw in ["bugfix", "bug fix", "fix", "race", "deadlock",
                                            "crash", "segfault", "oob", "overflow", "leak"])
    if total_lines <= 20 and file_type_score >= 6.0:
        # Tiny change on kernel/model code — likely surgical fix
        surgical_boost = 2.0
    if is_bugfix and total_lines <= 50:
        surgical_boost = max(surgical_boost, 1.5)
    if is_bugfix and review_comments > 5:
        # Hard-to-find bug with lots of discussion
        surgical_boost = max(surgical_boost, 2.5)

    # 6. State multiplier
    if merged:
        state_mult = 1.0
    elif state == "open" and not draft:
        state_mult = 0.85
    elif draft:
        state_mult = 0.6
    else:  # closed unmerged
        state_mult = 0.3

    # --- Final score ---
    # Weighted combination: size 20%, file_type 30%, complexity 20%, effort 15%, surgical 15%
    raw_score = (
        size_score * 0.20
        + file_type_score * 0.30
        + complexity_score * 0.20
        + effort_score * 0.15
        + surgical_boost * 0.15 / max(surgical_boost, 0.01) * min(surgical_boost, 10) * 0.15
    )
    # Simpler: add surgical boost directly
    raw_score = (
        size_score * 0.20
        + file_type_score * 0.30
        + complexity_score * 0.20
        + effort_score * 0.15
    ) + surgical_boost * 0.5  # Boost adds up to +1.25 to final score
    final_score = round(max(1.0, min(10.0, raw_score * state_mult)), 1)

    # Category label
    if final_score >= 8:
        category = "major"
    elif final_score >= 6:
        category = "significant"
    elif final_score >= 4:
        category = "moderate"
    elif final_score >= 2:
        category = "minor"
    else:
        category = "trivial"

    return {
        "score": final_score,
        "category": category,
        "breakdown": {
            "size": round(size_score, 1),
            "file_type": round(file_type_score, 1),
            "complexity": round(complexity_score, 1),
            "effort": round(effort_score, 1),
            "surgical_boost": round(surgical_boost, 1),
            "state_multiplier": state_mult,
            "is_likely_move": is_likely_move,
            "is_bugfix": is_bugfix,
        },
        "stats": {
            "additions": additions,
            "deletions": deletions,
            "changed_files": changed_files,
            "commits": commits,
            "bk_builds": bk_builds,
            "review_comments": review_comments,
            "total_lines": total_lines,
        },
        "categories_touched": sorted(categories_touched) if categories_touched else [],
    }


# ---------------------------------------------------------------------------
# Engineer activity profile
# ---------------------------------------------------------------------------

def compute_engineer_profile(author: str, scored_prs: list[dict]) -> dict:
    """Compute an activity profile for an engineer.

    Args:
        author: GitHub username
        scored_prs: List of scored PR dicts (PR data + 'importance' field from score_pr)

    Returns:
        Engineer profile dict.
    """
    if not scored_prs:
        return {"author": author, "activity_score": 0, "prs": []}

    total_score = sum(p["importance"]["score"] for p in scored_prs)
    merged_prs = [p for p in scored_prs if p.get("merged")]
    open_prs = [p for p in scored_prs if p.get("state") == "open" and not p.get("merged")]
    draft_prs = [p for p in scored_prs if p.get("draft")]

    total_additions = sum(p.get("additions", 0) or 0 for p in scored_prs)
    total_deletions = sum(p.get("deletions", 0) or 0 for p in scored_prs)
    total_commits = sum(p.get("commits", 0) or 0 for p in scored_prs)

    # Aggregate categories
    all_categories = set()
    for p in scored_prs:
        all_categories.update(p["importance"].get("categories_touched", []))

    # Activity score = sum of importance scores, weighted by recency
    # (most recent PRs count more)
    activity_score = round(total_score, 1)

    # Average importance
    avg_importance = round(total_score / len(scored_prs), 1) if scored_prs else 0

    return {
        "author": author,
        "activity_score": activity_score,
        "avg_importance": avg_importance,
        "total_prs": len(scored_prs),
        "merged": len(merged_prs),
        "open": len(open_prs),
        "draft": len(draft_prs),
        "total_additions": total_additions,
        "total_deletions": total_deletions,
        "total_commits": total_commits,
        "categories_touched": sorted(all_categories),
        "top_prs": sorted(
            [{"number": p["number"], "title": p.get("title", ""), "score": p["importance"]["score"],
              "category": p["importance"]["category"]}
             for p in scored_prs],
            key=lambda x: x["score"], reverse=True
        )[:10],
    }

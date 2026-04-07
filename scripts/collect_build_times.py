#!/usr/bin/env python3
"""Collect CI workflow build times from GitHub Actions API.

For each project with build_workflows configured (or auto-discovered),
fetches the last 20 completed runs and computes duration statistics.

Output: data/{project}/build_times.json
"""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config" / "projects.yaml"
DATA = ROOT / "data"


def gh_api(endpoint, method="GET"):
    """Call GitHub API via gh CLI."""
    cmd = ["gh", "api", endpoint, "--method", method]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout) if result.stdout.strip() else {}
    except subprocess.CalledProcessError as e:
        print(
            f"  WARNING: gh api {endpoint} failed: {e.stderr.strip()}", file=sys.stderr
        )
        return {}
    except json.JSONDecodeError:
        print(f"  WARNING: could not parse response for {endpoint}", file=sys.stderr)
        return {}


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso(s):
    """Parse ISO timestamp to datetime."""
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def minutes_between(iso_start, iso_end):
    """Return minutes between two ISO timestamps, or None."""
    s = parse_iso(iso_start)
    e = parse_iso(iso_end)
    if s and e:
        return round((e - s).total_seconds() / 60, 1)
    return None


def compute_stats(values):
    """Compute median, p90, min, max from a list of numbers."""
    if not values:
        return None
    values = sorted(values)
    n = len(values)
    mid = n // 2
    if n % 2 == 0 and n > 1:
        median = round((values[mid - 1] + values[mid]) / 2, 1)
    else:
        median = values[mid]
    p90_idx = int(n * 0.9)
    if p90_idx >= n:
        p90_idx = n - 1
    return {
        "sample_size": n,
        "median_minutes": median,
        "p90_minutes": values[p90_idx],
        "min_minutes": values[0],
        "max_minutes": values[-1],
    }


def discover_workflows(repo):
    """Auto-discover workflows for a repo. Returns list of {name, id}."""
    data = gh_api(f"/repos/{repo}/actions/workflows")
    workflows = data.get("workflows", [])
    if not workflows:
        return []
    # Return all active workflows
    return [
        {"name": w["name"], "id": w["id"]}
        for w in workflows
        if w.get("state") == "active"
    ]


def resolve_workflow_id(repo, wf_config):
    """Resolve workflow ID from config. If id is set, use it. Otherwise match by name."""
    if wf_config.get("id"):
        return wf_config["id"]
    # Search by name
    data = gh_api(f"/repos/{repo}/actions/workflows")
    for w in data.get("workflows", []):
        if w["name"] == wf_config["name"]:
            return w["id"]
    return None


def collect_workflow_build_times(repo, wf_id, wf_name, target_minutes=None):
    """Collect build time data for a single workflow."""
    # Fetch last 20 completed runs on default branch
    data = gh_api(
        f"/repos/{repo}/actions/workflows/{wf_id}/runs"
        f"?status=completed&per_page=20"
    )
    runs = data.get("workflow_runs", [])
    if not runs:
        return None

    durations = []
    recent_runs = []

    for run in runs:
        started = run.get("run_started_at") or run.get("created_at")
        updated = run.get("updated_at")
        dur = minutes_between(started, updated)
        conclusion = run.get("conclusion")
        # For failed/cancelled runs, updated_at can be far after start
        # (GitHub updates it on re-checks, etc.), producing bogus durations
        if conclusion != "success" and dur is not None and dur > 1440:
            dur = None
        if dur is not None and dur > 0:
            recent_runs.append(
                {
                    "id": run["id"],
                    "conclusion": conclusion,
                    "duration_minutes": dur,
                    "date": (run.get("run_started_at") or run.get("created_at", ""))[
                        :10
                    ],
                }
            )
            # Only count successful runs for duration stats;
            # failed/cancelled runs have unreliable updated_at timestamps
            if conclusion == "success":
                durations.append(dur)

    # Latest run details
    latest = runs[0]
    latest_started = latest.get("run_started_at") or latest.get("created_at")
    latest_dur = minutes_between(latest_started, latest.get("updated_at"))

    # For failed/cancelled runs, duration from updated_at is unreliable
    # (can be days/months after start). Cap or nullify it.
    if latest.get("conclusion") != "success" and latest_dur is not None and latest_dur > 1440:
        latest_dur = None

    result = {
        "workflow_id": wf_id,
        "latest_run": {
            "id": latest["id"],
            "conclusion": latest.get("conclusion"),
            "duration_minutes": latest_dur,
            "started_at": latest_started,
            "html_url": latest.get("html_url", ""),
        },
        "stats": compute_stats(durations) if durations else None,
        "recent_runs": recent_runs[:20],
    }

    if target_minutes is not None:
        result["target_minutes"] = target_minutes

    # Fetch jobs for latest run to find bottleneck
    jobs_data = gh_api(f"/repos/{repo}/actions/runs/{latest['id']}/jobs?per_page=50")
    jobs = jobs_data.get("jobs", [])
    if jobs:
        longest_job = None
        longest_dur = 0
        for job in jobs:
            if job.get("conclusion") and job.get("started_at") and job.get("completed_at"):
                job_dur = minutes_between(job["started_at"], job["completed_at"])
                if job_dur and job_dur > longest_dur:
                    longest_dur = job_dur
                    longest_job = job
        if longest_job:
            result["bottleneck_job"] = {
                "name": longest_job["name"],
                "duration_minutes": longest_dur,
            }

    return result


def collect_project_build_times(name, cfg):
    """Collect build times for a single project."""
    repo = cfg["repo"]
    build_workflows = cfg.get("build_workflows", [])

    print(f"Collecting build times for {name} ({repo})...")

    workflows_result = {}

    if build_workflows:
        for wf_config in build_workflows:
            wf_name = wf_config["name"]
            wf_id = resolve_workflow_id(repo, wf_config)
            if not wf_id:
                print(f"  WARNING: Could not resolve workflow '{wf_name}' for {repo}")
                continue
            target = wf_config.get("target_minutes")
            print(f"  Workflow: {wf_name} (id={wf_id})...")
            result = collect_workflow_build_times(repo, wf_id, wf_name, target)
            if result:
                workflows_result[wf_name] = result
                stats = result.get("stats") or {}
                if stats:
                    print(
                        f"    Median: {stats.get('median_minutes')}m, "
                        f"P90: {stats.get('p90_minutes')}m"
                    )
                else:
                    print(f"    No successful runs (stats: N/A)")
    else:
        # Auto-discover: find workflows and pick the longest-running one
        discovered = discover_workflows(repo)
        if not discovered:
            print(f"  No workflows found for {repo}")
            return None

        # Try each discovered workflow, keep ones with data
        for wf in discovered[:3]:  # Limit to 3 to avoid API abuse
            print(f"  Auto-discovered workflow: {wf['name']} (id={wf['id']})...")
            result = collect_workflow_build_times(repo, wf["id"], wf["name"])
            if result:
                workflows_result[wf["name"]] = result

    if not workflows_result:
        return None

    return {
        "collected_at": now_iso(),
        "workflows": workflows_result,
    }


def main():
    with open(CONFIG) as f:
        config = yaml.safe_load(f)

    for name, cfg in config["projects"].items():
        if name != "vllm":
            print(f"Skipping {name} (test-parity only)")
            continue
        try:
            build_times = collect_project_build_times(name, cfg)
            if build_times:
                out_dir = DATA / name
                out_dir.mkdir(parents=True, exist_ok=True)
                with open(out_dir / "build_times.json", "w") as f:
                    json.dump(build_times, f, indent=2)
                wf_count = len(build_times.get("workflows", {}))
                print(f"  Saved {wf_count} workflow(s) to data/{name}/build_times.json")
            else:
                print(f"  No build time data for {name}")
        except Exception as e:
            print(f"  ERROR collecting build times for {name}: {e}", file=sys.stderr)
            import traceback

            traceback.print_exc()

    # vLLM override: populate from Buildkite nightly builds (not GitHub Actions)
    _vllm_build_times_from_buildkite()

    print("Build time collection complete.")


def _vllm_build_times_from_buildkite():
    """Populate vLLM build_times.json from Buildkite nightly data."""
    analytics_path = DATA / "vllm" / "ci" / "analytics.json"
    if not analytics_path.exists():
        return
    try:
        analytics = json.loads(analytics_path.read_text())
    except Exception:
        return

    workflows_result = {}
    for bk_key, wf_name in [("amd-ci", "AMD Nightly"), ("ci", "Upstream Nightly")]:
        builds = analytics.get(bk_key, {}).get("builds", [])
        if not builds:
            continue

        seen = set()
        durations = []
        recent_runs = []
        for b in builds:
            bn = b.get("number")
            if bn in seen:
                continue
            seen.add(bn)
            state = b.get("state", "")
            wm = b.get("wall_mins")
            if state not in ("passed", "failed", "canceled", "timed_out", "broken"):
                continue
            if wm and wm > 0:
                recent_runs.append({
                    "id": bn,
                    "conclusion": "success" if state == "passed" else "failure",
                    "duration_minutes": round(wm, 1),
                    "date": b.get("date", ""),
                })
                if state == "passed":
                    durations.append(round(wm, 1))

        latest = builds[0]
        latest_wm = latest.get("wall_mins")
        result = {
            "workflow_id": bk_key,
            "latest_run": {
                "id": latest.get("number"),
                "conclusion": latest.get("state"),
                "duration_minutes": round(latest_wm, 1) if latest_wm else None,
                "started_at": latest.get("created_at", ""),
                "html_url": latest.get("web_url", ""),
            },
            "stats": compute_stats(durations) if durations else None,
            "recent_runs": recent_runs[:20],
        }

        # Bottleneck job: find the longest job in the latest completed build
        for bb in builds:
            if bb.get("state") in ("passed", "failed") and bb.get("jobs"):
                bottle_jobs = [j for j in bb["jobs"] if j.get("dur") and j.get("state") in ("passed", "failed", "soft_fail")]
                if bottle_jobs:
                    longest = max(bottle_jobs, key=lambda j: j.get("dur", 0))
                    result["bottleneck_job"] = {
                        "name": longest.get("name", "unknown"),
                        "duration_minutes": round(longest["dur"], 1),
                    }
                break

        workflows_result[wf_name] = result
        stats = result.get("stats")
        if stats:
            print(f"  vLLM {wf_name}: Median={stats['median_minutes']}m, P90={stats['p90_minutes']}m")
        else:
            print(f"  vLLM {wf_name}: No successful runs for stats")

    # Track Docker Build step specifically (the ":docker: build image" job)
    docker_key = "amd-ci"
    docker_builds = analytics.get(docker_key, {}).get("builds", [])
    if docker_builds:
        docker_pattern = "docker"
        seen = set()
        docker_durations = []
        docker_recent = []
        latest_docker_job = None
        for b in docker_builds:
            bn = b.get("number")
            if bn in seen:
                continue
            seen.add(bn)
            state = b.get("state", "")
            if state not in ("passed", "failed", "canceled", "timed_out", "broken"):
                continue
            docker_jobs = [j for j in (b.get("jobs") or [])
                           if docker_pattern in j.get("name", "").lower()
                           and j.get("state") in ("passed", "failed", "soft_fail")]
            if not docker_jobs:
                continue
            dj = docker_jobs[0]
            dur = dj.get("dur", 0)
            if dur <= 0:
                continue
            docker_recent.append({
                "id": bn,
                "conclusion": "success" if dj["state"] == "passed" else "failure",
                "duration_minutes": round(dur, 1),
                "date": b.get("date", ""),
            })
            if dj["state"] == "passed":
                docker_durations.append(round(dur, 1))
            if latest_docker_job is None:
                latest_docker_job = (b, dj)
        if docker_recent:
            lb, lj = latest_docker_job or (docker_builds[0], {})
            workflows_result["Docker Build"] = {
                "workflow_id": docker_key,
                "latest_run": {
                    "id": lb.get("number"),
                    "conclusion": lj.get("state"),
                    "duration_minutes": round(lj["dur"], 1) if lj.get("dur") else None,
                    "started_at": lb.get("created_at", ""),
                    "html_url": lb.get("web_url", ""),
                },
                "stats": compute_stats(docker_durations) if docker_durations else None,
                "recent_runs": docker_recent[:20],
            }
            ds = compute_stats(docker_durations) if docker_durations else {}
            if ds:
                print(f"  vLLM Docker Build: Median={ds['median_minutes']}m, P90={ds['p90_minutes']}m")

    if workflows_result:
        out = {
            "collected_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "workflows": workflows_result,
        }
        out_path = DATA / "vllm" / "build_times.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w") as f:
            json.dump(out, f, indent=2)
        print(f"  Saved vLLM Buildkite build times ({len(workflows_result)} workflows)")


if __name__ == "__main__":
    main()

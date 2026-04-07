"""Tests for GitHub Actions workflow YAML integrity, CI collect completeness,
framework isolation, and cron schedule safety.

These tests ensure:
- All workflow files are valid YAML with required fields
- ci-collect.yml calls all necessary collection scripts
- Deploying workflows sync vLLM CI data from gh-pages (prevents clobbering)
- No cron schedule conflicts between hourly workflows
"""

import re
from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).resolve().parent.parent.parent / ".github" / "workflows"


def _load_workflow(name):
    path = WORKFLOWS / name
    assert path.exists(), f"Workflow file not found: {name}"
    return yaml.safe_load(path.read_text())


def _load_workflow_text(name):
    path = WORKFLOWS / name
    assert path.exists(), f"Workflow file not found: {name}"
    return path.read_text()


# ---------------------------------------------------------------------------
# 3a. Workflow YAML validation
# ---------------------------------------------------------------------------

class TestWorkflowYAML:
    """Validate all workflow files parse and have required fields."""

    def test_all_workflows_parse_as_yaml(self):
        yml_files = list(WORKFLOWS.glob("*.yml"))
        assert len(yml_files) >= 5, f"Expected at least 5 workflow files, found {len(yml_files)}"
        for f in yml_files:
            try:
                data = yaml.safe_load(f.read_text())
                assert isinstance(data, dict), f"{f.name}: parsed but is not a dict"
            except yaml.YAMLError as e:
                raise AssertionError(f"{f.name}: invalid YAML — {e}")

    def test_all_workflows_have_name_on_jobs(self):
        for f in WORKFLOWS.glob("*.yml"):
            data = yaml.safe_load(f.read_text())
            assert "name" in data, f"{f.name}: missing 'name' field"
            # YAML parses 'on:' as the boolean True key
            assert True in data or "on" in data, f"{f.name}: missing 'on' trigger field"
            assert "jobs" in data, f"{f.name}: missing 'jobs' field"

    def test_no_duplicate_concurrency_groups(self):
        # gh-pages-deploy is intentionally shared between deploy-pages.yml
        # and hourly-master.yml to prevent concurrent gh-pages pushes.
        SHARED_GROUPS = {"gh-pages-deploy"}
        groups = {}
        for f in WORKFLOWS.glob("*.yml"):
            data = yaml.safe_load(f.read_text())
            conc = data.get("concurrency", {})
            if isinstance(conc, dict):
                group = conc.get("group")
            elif isinstance(conc, str):
                group = conc
            else:
                continue
            if group and group not in SHARED_GROUPS:
                assert group not in groups, (
                    f"Duplicate concurrency group '{group}' in {f.name} and {groups[group]}"
                )
                groups[group] = f.name


# ---------------------------------------------------------------------------
# 3b. CI Collect workflow completeness
# ---------------------------------------------------------------------------

class TestHourlyMasterWorkflow:
    """Validate hourly-master.yml runs all collection, tests, and deploys."""

    def test_exists(self):
        assert (WORKFLOWS / "hourly-master.yml").exists()

    def test_calls_collect_ci_script(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "collect_ci.py" in text

    def test_calls_collect_analytics_script(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "collect_analytics.py" in text

    def test_calls_collect_queue_snapshot(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "collect_queue_snapshot.py" in text

    def test_calls_collect_group_changes(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "collect_group_changes.py" in text

    def test_calls_github_data_collection(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "collect.py" in text, "hourly-master.yml must call collect.py"

    def test_runs_pytest(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "pytest" in text

    def test_has_buildkite_token(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "BUILDKITE_TOKEN" in text

    def test_deploys_to_gh_pages(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "peaceiris/actions-gh-pages" in text
        assert "publish_branch: gh-pages" in text

    def test_assembles_site(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "rm -rf _site" in text
        assert "cp -r docs/* _site/" in text

    def test_has_frequent_cron(self):
        data = _load_workflow("hourly-master.yml")
        triggers = data.get(True, data.get("on", {}))
        schedules = triggers.get("schedule", []) if isinstance(triggers, dict) else []
        crons = [s.get("cron", "") for s in schedules]
        has_frequent = any("* * * *" in c for c in crons)
        assert has_frequent, f"hourly-master.yml must have a recurring cron, found: {crons}"

    def test_syncs_ci_data_from_gh_pages(self):
        text = _load_workflow_text("hourly-master.yml")
        assert "git fetch origin gh-pages" in text or "git show origin/gh-pages" in text


class TestNoOrphanedCronSchedules:
    """Ensure only hourly-master and sync-upstream have cron schedules."""

    def test_only_master_and_sync_have_cron(self):
        allowed = {"hourly-master.yml", "sync-upstream.yml"}
        for f in WORKFLOWS.glob("*.yml"):
            data = yaml.safe_load(f.read_text())
            triggers = data.get(True, data.get("on", {}))
            if not isinstance(triggers, dict):
                continue
            schedules = triggers.get("schedule", [])
            if schedules:
                assert f.name in allowed, (
                    f"{f.name} has a cron schedule but should not — "
                    f"all scheduled runs should be in hourly-master.yml"
                )


# ---------------------------------------------------------------------------
# 3c. Framework isolation
# ---------------------------------------------------------------------------

class TestFrameworkIsolation:
    """Validate workflows don't clobber other frameworks' data."""

    def _deploying_workflows(self):
        """Return workflow names that deploy to gh-pages."""
        result = []
        for f in WORKFLOWS.glob("*.yml"):
            text = f.read_text()
            if "peaceiris/actions-gh-pages" in text:
                result.append(f.name)
        return result

    def test_deploying_workflows_sync_ci_from_gh_pages(self):
        """All workflows that deploy to gh-pages must sync CI data from gh-pages first,
        to prevent overwriting fresh CI data with stale copies from main."""
        for wf in self._deploying_workflows():
            # ci-collect.yml produces CI data itself, so it doesn't need to sync
            # pr-preview.yml deploys to a subdirectory (pr-preview/pr-N), not root
            if wf in ("ci-collect.yml", "pr-preview.yml"):
                continue
            text = _load_workflow_text(wf)
            assert "git fetch origin gh-pages" in text or "git show origin/gh-pages" in text, (
                f"{wf} deploys to gh-pages but does not sync CI data from gh-pages first. "
                "This will overwrite fresh CI data with stale copies from main."
            )

    def test_shard_bases_available_at_deploy(self):
        """shard_bases.json must be on the main branch (committed by hourly-master)
        so deploy workflows can include it in _site/. No gh-pages sync needed."""
        shard_path = Path(__file__).resolve().parent.parent.parent / "data" / "vllm" / "ci" / "shard_bases.json"
        assert shard_path.exists(), (
            "shard_bases.json not found on main branch. "
            "hourly-master should generate and commit it."
        )

    def test_ci_collect_only_writes_vllm_ci_data(self):
        """ci-collect.yml should only write to data/vllm/ci/."""
        text = _load_workflow_text("ci-collect.yml")
        # Find all 'git add' targets
        git_adds = re.findall(r"git add\s+(\S+)", text)
        for target in git_adds:
            assert "data/vllm/ci" in target, (
                f"ci-collect.yml has 'git add {target}' — expected only data/vllm/ci/"
            )

    def test_queue_monitor_only_writes_queue_data(self):
        """queue-monitor.yml should only write to queue_timeseries.jsonl."""
        text = _load_workflow_text("queue-monitor.yml")
        git_adds = re.findall(r"git add\s+(\S+)", text)
        for target in git_adds:
            assert "queue_timeseries" in target, (
                f"queue-monitor.yml has 'git add {target}' — expected only queue data"
            )


# ---------------------------------------------------------------------------
# 3d. Cron schedule safety
# ---------------------------------------------------------------------------

class TestCronSchedules:
    """Validate no cron schedule conflicts between hourly workflows."""

    def _extract_crons(self):
        """Extract all cron schedules from all workflows."""
        result = []
        for f in WORKFLOWS.glob("*.yml"):
            data = yaml.safe_load(f.read_text())
            # YAML parses 'on:' as boolean True
            triggers = data.get(True, data.get("on", {}))
            if not isinstance(triggers, dict):
                continue
            schedules = triggers.get("schedule", [])
            if not schedules:
                continue
            for s in schedules:
                cron = s.get("cron", "")
                if cron:
                    result.append((f.name, cron))
        return result

    def test_no_conflicting_cron_minutes_for_hourly_workflows(self):
        """Hourly workflows must not share the same minute to prevent deploy races."""
        # Only check hourly workflows (cron minute field is a number, hour field is *)
        hourly_by_minute = {}
        for wf, cron in self._extract_crons():
            parts = cron.split()
            if len(parts) < 5:
                continue
            minute, hour = parts[0], parts[1]
            # Only flag conflicts for workflows that run every hour (hour = *)
            if hour != "*":
                continue
            if minute in hourly_by_minute:
                raise AssertionError(
                    f"Cron minute conflict at :{minute} between "
                    f"{hourly_by_minute[minute]} and {wf}. "
                    "Hourly workflows must use different minutes to prevent deploy races."
                )
            hourly_by_minute[minute] = wf

    def test_cron_minutes_have_safe_spacing(self):
        """Hourly workflows should have at least 10 minutes between them."""
        hourly_minutes = []
        for wf, cron in self._extract_crons():
            parts = cron.split()
            if len(parts) < 5:
                continue
            minute, hour = parts[0], parts[1]
            if hour != "*":
                continue
            try:
                hourly_minutes.append((int(minute), wf))
            except ValueError:
                continue
        hourly_minutes.sort()
        for i in range(len(hourly_minutes) - 1):
            m1, wf1 = hourly_minutes[i]
            m2, wf2 = hourly_minutes[i + 1]
            gap = m2 - m1
            assert gap >= 10, (
                f"Only {gap} minutes between {wf1} (:{m1:02d}) and {wf2} (:{m2:02d}). "
                "Hourly workflows should be at least 10 minutes apart."
            )


# ---------------------------------------------------------------------------
# 3e. Sync-upstream workflow correctness
# ---------------------------------------------------------------------------

class TestSyncUpstreamWorkflow:
    """Validate sync-upstream.yml has required git config and gh pr flags."""

    def test_exists(self):
        assert (WORKFLOWS / "sync-upstream.yml").exists()

    def test_sets_git_user_name(self):
        """The workflow must configure git user.name before merging,
        otherwise the merge commit fails on GitHub Actions runners."""
        text = _load_workflow_text("sync-upstream.yml")
        assert "git config user.name" in text, (
            "sync-upstream.yml must set git user.name before merging. "
            "GitHub Actions runners have no default committer identity."
        )

    def test_sets_git_user_email(self):
        """The workflow must configure git user.email before merging."""
        text = _load_workflow_text("sync-upstream.yml")
        assert "git config user.email" in text, (
            "sync-upstream.yml must set git user.email before merging. "
            "GitHub Actions runners have no default committer identity."
        )

    def test_git_config_before_merge(self):
        """git config must appear BEFORE git merge in the workflow."""
        text = _load_workflow_text("sync-upstream.yml")
        lines = text.split("\n")
        config_line = None
        merge_line = None
        for i, line in enumerate(lines):
            if "git config user.name" in line and config_line is None:
                config_line = i
            if "git merge" in line and merge_line is None:
                merge_line = i
        assert config_line is not None, "No git config user.name found"
        assert merge_line is not None, "No git merge found"
        assert config_line < merge_line, (
            f"git config (line {config_line + 1}) must come BEFORE "
            f"git merge (line {merge_line + 1})"
        )

    def test_gh_pr_create_has_head_flag(self):
        """gh pr create must use --head to specify the branch, otherwise
        it fails with 'you must first push the current branch to a remote'."""
        text = _load_workflow_text("sync-upstream.yml")
        assert re.search(r"gh pr create.*--head", text, re.DOTALL), (
            "sync-upstream.yml: 'gh pr create' must use --head flag. "
            "Without it, gh cannot determine the PR head branch."
        )


class TestDeployDataFreshness:
    """Ensure deploy workflows don't overwrite fresh main data with stale gh-pages data."""

    def test_deploy_pages_does_not_sync_ci_json_from_ghpages(self):
        """deploy-pages.yml must NOT overwrite CI analysis JSON files from gh-pages.

        Main branch always has the latest data (committed by hourly-master).
        The deploy workflow should use main's data as-is, not replace it
        with potentially stale gh-pages copies.

        Only queue_timeseries.jsonl (append-only) may be synced from gh-pages.
        """
        wf = _load_workflow("deploy-pages.yml")
        wf_text = (WORKFLOWS / "deploy-pages.yml").read_text()

        # Check that no step writes CI JSON files from gh-pages to local.
        # Pattern: echo "$LIVE" > data/vllm/ci/<file>  (overwrite with gh-pages data)
        # Reading gh-pages for corruption checks is OK; WRITING is not.
        import re as _re
        ci_files = [
            "ci_health.json", "parity_report.json", "analytics.json",
            "shard_bases.json", "group_changes.json",
        ]
        for f in ci_files:
            # Match: > data/vllm/ci/<file>  (redirect/write to local file)
            write_pattern = _re.compile(r'>\s*data/vllm/ci/' + _re.escape(f))
            assert not write_pattern.search(wf_text), (
                f"deploy-pages.yml writes {f} from gh-pages to local, which "
                f"overwrites fresh main data with stale copies. Remove the sync."
            )

    def test_hourly_master_syncs_before_collection(self):
        """hourly-master.yml may sync CI data from gh-pages, but ONLY
        before the collection step (as seed data for the collector).
        The collector then overwrites with fresh Buildkite data.

        Verify the sync step comes BEFORE 'Collect CI data'.
        """
        wf_text = (WORKFLOWS / "hourly-master.yml").read_text()
        lines = wf_text.split("\n")

        sync_line = None
        collect_line = None
        for i, line in enumerate(lines):
            if "Sync CI data from gh-pages" in line:
                sync_line = i
            if "Collect CI data" in line and collect_line is None:
                collect_line = i

        if sync_line is None:
            return  # no sync step, that's fine

        assert collect_line is not None, (
            "hourly-master.yml has 'Sync CI data from gh-pages' but no "
            "'Collect CI data' step to overwrite the synced data."
        )
        assert sync_line < collect_line, (
            f"'Sync CI data from gh-pages' (line {sync_line}) must come BEFORE "
            f"'Collect CI data' (line {collect_line}). Otherwise fresh data "
            f"gets overwritten with stale gh-pages copies."
        )

    def test_no_ghpages_sync_after_collection(self):
        """No workflow step after 'Collect CI data' should sync data FROM gh-pages.
        After collection, main has the freshest data."""
        wf_text = (WORKFLOWS / "hourly-master.yml").read_text()
        lines = wf_text.split("\n")

        collect_line = None
        for i, line in enumerate(lines):
            if "Collect CI data" in line:
                collect_line = i
                break

        if collect_line is None:
            pytest.skip("no Collect CI data step")

        # Check all lines after collection for gh-pages sync patterns
        for i in range(collect_line, len(lines)):
            line = lines[i]
            if "git show origin/gh-pages:data/vllm/ci/" in line and \
               "queue_timeseries" not in line:
                assert False, (
                    f"Line {i+1} syncs CI data from gh-pages AFTER collection: "
                    f"{line.strip()}\n"
                    "This overwrites fresh data with stale copies."
                )

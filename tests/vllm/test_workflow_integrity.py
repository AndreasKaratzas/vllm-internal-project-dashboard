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
            if group:
                assert group not in groups, (
                    f"Duplicate concurrency group '{group}' in {f.name} and {groups[group]}"
                )
                groups[group] = f.name


# ---------------------------------------------------------------------------
# 3b. CI Collect workflow completeness
# ---------------------------------------------------------------------------

class TestCICollectWorkflow:
    """Validate ci-collect.yml calls all collection scripts and deploys."""

    def test_calls_collect_ci_script(self):
        text = _load_workflow_text("ci-collect.yml")
        assert "collect_ci.py" in text, "ci-collect.yml must call collect_ci.py"

    def test_calls_collect_analytics_script(self):
        text = _load_workflow_text("ci-collect.yml")
        assert "collect_analytics.py" in text, (
            "ci-collect.yml must call collect_analytics.py for CI Analytics data"
        )

    def test_has_buildkite_token(self):
        text = _load_workflow_text("ci-collect.yml")
        assert "BUILDKITE_TOKEN" in text, "ci-collect.yml must use BUILDKITE_TOKEN"

    def test_deploys_to_gh_pages(self):
        text = _load_workflow_text("ci-collect.yml")
        assert "peaceiris/actions-gh-pages" in text, "ci-collect.yml must deploy to gh-pages"
        assert "publish_branch: gh-pages" in text, "ci-collect.yml must target gh-pages branch"

    def test_assembles_site(self):
        text = _load_workflow_text("ci-collect.yml")
        assert "rm -rf _site" in text, "ci-collect.yml must clear _site before assembly"
        assert "cp -r docs/* _site/" in text, "ci-collect.yml must copy docs to _site"
        assert "cp -r data/* _site/data/" in text, "ci-collect.yml must copy data to _site"

    def test_has_3_hour_cron(self):
        data = _load_workflow("ci-collect.yml")
        # YAML parses 'on:' as boolean True
        triggers = data.get(True, data.get("on", {}))
        schedules = triggers.get("schedule", []) if isinstance(triggers, dict) else []
        crons = [s.get("cron", "") for s in schedules]
        has_3h = any("*/3" in c for c in crons)
        assert has_3h, f"ci-collect.yml must have a 3-hourly cron schedule, found: {crons}"


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

    def test_deploying_workflows_sync_shard_bases(self):
        """Workflows that sync CI data must include shard_bases.json."""
        for wf in self._deploying_workflows():
            if wf in ("ci-collect.yml", "pr-preview.yml"):
                continue
            text = _load_workflow_text(wf)
            if "shard_bases.json" not in text:
                raise AssertionError(
                    f"{wf} syncs CI data from gh-pages but does not include shard_bases.json"
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

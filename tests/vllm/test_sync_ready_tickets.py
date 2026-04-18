"""Tests for ``scripts/vllm/sync_ready_tickets.py``.

We isolate the script from disk + GitHub by:

    * Pointing ``RESULTS_DIR``, ``OUT`` and ``STATE`` at tmp_path.
    * Seeding synthetic AMD nightly JSONL files across dates so the history
      aggregator has real input.
    * Never supplying ``PROJECTS_TOKEN`` so the ``live`` branch never fires.
      The live branch talks to GitHub GraphQL and REST — we exercise it
      indirectly via the dry-run plan instead. Integration against the real
      projects API is not something unit tests should do.

The tests focus on the *logic* the team lead pushed back on:
    - canonical title format is locked to upstream's ``[CI Failure]: <agent>: <test>``
      convention — the exact string vllm-project engineers grep for on board #39
    - hardware prefix is PRESERVED so each (agent, test) pair gets its own
      ticket (matching how the board is already populated by hand)
    - summary metrics (first failure, streak start, last success, break count)
      match what a human would draw from a timeline
    - plan JSON only contains currently-failing groups
    - dry-run writes a plan WITHOUT touching the network even if PROJECTS_TOKEN
      is set to garbage (we still force dry-run via READY_TICKETS_LIVE unset)
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from vllm import sync_ready_tickets as srt


@pytest.fixture(autouse=True)
def _no_upstream_yaml_fetch(monkeypatch):
    # Every ``_collect_group_history`` call now tries to fetch test-amd.yaml
    # from upstream to learn which labels use ``%N`` parallelism. Unit tests
    # must not touch the network — default to no templates so grouping is
    # an identity function, and individual tests can override as needed.
    monkeypatch.setattr(srt, "_fetch_shard_templates", lambda: [])


@pytest.fixture
def isolated_paths(tmp_path, monkeypatch):
    results = tmp_path / "test_results"
    results.mkdir()
    out = tmp_path / "ready_tickets.json"
    state = tmp_path / "ready_tickets_state.json"
    monkeypatch.setattr(srt, "RESULTS_DIR", results, raising=False)
    monkeypatch.setattr(srt, "OUT", out, raising=False)
    monkeypatch.setattr(srt, "STATE", state, raising=False)
    return results, out, state


def _write_jsonl(path: Path, rows):
    path.write_text("\n".join(json.dumps(r) for r in rows) + "\n")


def _today_minus(days: int) -> str:
    from datetime import datetime, timezone, timedelta
    return (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

class TestGroupKey:
    # Upstream's project-#39 convention is one ticket per agent/test pair.
    # The key MUST preserve the agent prefix — dropping it would collapse
    # mi250/mi300/mi325 failures into one ticket and break title-lookup
    # parity with tickets that vllm-project engineers file by hand.

    def test_preserves_agent_prefix(self):
        assert srt._group_key("mi250_1: EPLB Algorithm") == "mi250_1: EPLB Algorithm"
        assert srt._group_key("mi300_2: Pipeline parallel") == "mi300_2: Pipeline parallel"

    def test_no_prefix_returns_as_is(self):
        assert srt._group_key("EPLB Algorithm") == "EPLB Algorithm"

    def test_empty_string(self):
        assert srt._group_key("") == ""

    def test_none_tolerated(self):
        assert srt._group_key(None) == ""

    def test_trims_surrounding_whitespace(self):
        assert srt._group_key("  mi325_1: Quantized MoE Test (B200-MI325)  ") == (
            "mi325_1: Quantized MoE Test (B200-MI325)"
        )


class TestShardCanonicalization:
    # Buildkite expands ``parallelism: N`` with ``%N`` label substitution, so
    # ``Kernels MoE Test %N`` renders as ``...Test 1`` / ``...Test 2`` /
    # ``...Test 3`` / ``...Test 4``. Upstream authors it as ONE step — we
    # should file ONE ticket, not four. The YAML is the authority: we can't
    # strip trailing integers heuristically because non-parallelized groups
    # legitimately end in digits (e.g. ``LoRA 4`` when it's its own step).

    def _patterns(self, templates):
        return srt._compile_shard_patterns(templates)

    def test_collapses_parallel_shards_to_template(self):
        patterns = self._patterns(["Kernels MoE Test %N"])
        assert srt._group_key("mi325_1: Kernels MoE Test 1", patterns) == (
            "mi325_1: Kernels MoE Test %N"
        )
        assert srt._group_key("mi325_1: Kernels MoE Test 4", patterns) == (
            "mi325_1: Kernels MoE Test %N"
        )
        # Double-digit shard indices still collapse.
        assert srt._group_key("mi325_1: Kernels MoE Test 12", patterns) == (
            "mi325_1: Kernels MoE Test %N"
        )

    def test_non_parallel_trailing_digit_is_preserved(self):
        # ``LoRA 4`` is a real non-parallelized step — must NOT be swallowed
        # by a ``LoRA %N`` template that doesn't exist.
        patterns = self._patterns(["Kernels MoE Test %N"])
        assert srt._group_key("mi250_1: LoRA 4", patterns) == "mi250_1: LoRA 4"

    def test_without_templates_is_identity(self):
        assert srt._group_key("mi325_1: Kernels MoE Test 1", []) == (
            "mi325_1: Kernels MoE Test 1"
        )
        assert srt._group_key("mi325_1: Kernels MoE Test 1", None) == (
            "mi325_1: Kernels MoE Test 1"
        )

    def test_agent_prefix_preserved_across_shards(self):
        # Different HW agents keep separate tickets even if the test template
        # matches — mi325 and mi355 failures are triaged independently.
        patterns = self._patterns(["Kernels MoE Test %N"])
        assert srt._group_key("mi325_1: Kernels MoE Test 1", patterns) == (
            "mi325_1: Kernels MoE Test %N"
        )
        assert srt._group_key("mi355_1: Kernels MoE Test 1", patterns) == (
            "mi355_1: Kernels MoE Test %N"
        )

    def test_partial_match_does_not_collapse(self):
        # Template matching is full-string: ``Kernels MoE Test 1 Extended``
        # is not a shard of ``Kernels MoE Test %N``.
        patterns = self._patterns(["Kernels MoE Test %N"])
        assert srt._group_key("mi325_1: Kernels MoE Test 1 Extended", patterns) == (
            "mi325_1: Kernels MoE Test 1 Extended"
        )

    def test_collapsed_shards_aggregate_in_history(self, isolated_paths, monkeypatch):
        # End-to-end: four failing shards → one group in the plan, with
        # build numbers and hardware merged.
        results, _, _ = isolated_paths
        d = _today_minus(1)
        _write_jsonl(results / f"{d}_amd.jsonl", [
            {"job_name": f"mi325_1: Kernels MoE Test {i}",
             "classname": "mi325_1: kernels.moe",
             "status": "failed", "build_number": 100 + i}
            for i in range(1, 5)
        ])
        monkeypatch.setattr(
            srt, "_fetch_shard_templates", lambda: ["Kernels MoE Test %N"]
        )
        hist = srt._collect_group_history(days=60)
        assert set(hist.keys()) == {"mi325_1: Kernels MoE Test %N"}
        bucket = hist["mi325_1: Kernels MoE Test %N"][d]
        assert bucket["fail"] == 4
        assert bucket["build_numbers"] == [101, 102, 103, 104]


class TestIsFailing:
    def test_failing_statuses(self):
        for s in ("failed", "FAILED", "error", "broken", "timed_out"):
            assert srt._is_failing(s) is True

    def test_passing_statuses_not_failing(self):
        for s in ("passed", "xpassed", "skipped", "", None):
            assert srt._is_failing(s) is False


class TestCanonicalTitle:
    def test_exact_format_matches_upstream_convention(self):
        # CRITICAL: this title is both the dedup key AND the string vllm-project
        # engineers grep for on the board. Must match their own [CI Failure]:
        # prefix character-for-character.
        assert srt._canonical_title("mi325_1: Quantized MoE Test (B200-MI325)") == (
            "[CI Failure]: mi325_1: Quantized MoE Test (B200-MI325)"
        )

    def test_title_unique_per_group(self):
        a = srt._canonical_title("A")
        b = srt._canonical_title("B")
        assert a != b


class TestNormalizeTitle:
    # Secondary lookup so a hand-filed ``[CI Failure]: Transformers ...``
    # collides with our machine-generated ``[CI Failure]: mi325_1: Transformers
    # ...`` — preventing the very-real failure the team lead flagged where
    # we duplicated a ticket that already existed on the backlog.

    def test_strips_ci_failure_prefix(self):
        assert srt._normalize_title("[CI Failure]: Foo") == "foo"

    def test_strips_hw_agent_prefix(self):
        assert srt._normalize_title("[CI Failure]: mi325_1: Foo Bar") == "foo bar"
        assert srt._normalize_title("[CI Failure]: mi250_4: Something") == "something"

    def test_strips_trailing_shard_template(self):
        assert srt._normalize_title("[CI Failure]: mi325_1: Kernels MoE Test %N") == (
            "kernels moe test"
        )

    def test_hand_filed_and_generated_collide(self):
        # The real-world bug: upstream filed a HW-agnostic ticket and the
        # sync filed an HW-qualified duplicate. Normalization MUST treat
        # them as equivalent.
        hand = "[CI Failure]: Transformers Nightly Models Test"
        ours = "[CI Failure]: mi325_1: Transformers Nightly Models Test"
        assert srt._normalize_title(hand) == srt._normalize_title(ours)

    def test_case_insensitive(self):
        assert srt._normalize_title("[CI Failure]: Foo BAR") == (
            srt._normalize_title("[ci failure]: foo bar")
        )

    def test_collapses_internal_whitespace(self):
        assert srt._normalize_title("[CI Failure]:  Foo   Bar  ") == "foo bar"

    def test_does_not_strip_non_shard_trailing_digits(self):
        # ``LoRA 4`` is its own test step (not a shard), so the trailing
        # digit must remain to keep it distinct from ``LoRA 1``.
        assert srt._normalize_title("[CI Failure]: mi250_1: LoRA 4") == "lora 4"
        assert srt._normalize_title("[CI Failure]: mi250_1: LoRA 1") == "lora 1"
        assert srt._normalize_title("[CI Failure]: mi250_1: LoRA 4") != (
            srt._normalize_title("[CI Failure]: mi250_1: LoRA 1")
        )

    def test_empty_and_none(self):
        assert srt._normalize_title("") == ""
        assert srt._normalize_title(None) == ""


# ---------------------------------------------------------------------------
# History aggregation
# ---------------------------------------------------------------------------

class TestCollectGroupHistory:
    def test_aggregates_across_dates_and_hardware(self, isolated_paths):
        results, _, _ = isolated_paths
        d1 = _today_minus(3)
        d2 = _today_minus(2)
        d3 = _today_minus(1)
        _write_jsonl(results / f"{d1}_amd.jsonl", [
            {"job_name": "mi250_1: EPLB", "classname": "mi250_1: tests.eplb",
             "status": "failed", "build_number": 100},
            {"job_name": "mi300_1: EPLB", "classname": "mi300_1: tests.eplb",
             "status": "passed", "build_number": 100},
        ])
        _write_jsonl(results / f"{d2}_amd.jsonl", [
            {"job_name": "mi250_1: EPLB", "classname": "mi250_1: tests.eplb",
             "status": "passed", "build_number": 101},
        ])
        _write_jsonl(results / f"{d3}_amd.jsonl", [
            {"job_name": "mi250_1: EPLB", "classname": "mi250_1: tests.eplb",
             "status": "failed", "build_number": 102},
            {"job_name": "mi300_1: EPLB", "classname": "mi300_1: tests.eplb",
             "status": "failed", "build_number": 102},
        ])

        hist = srt._collect_group_history(days=60)
        # Agent-qualified keys (one ticket per {agent: test} pair, matching
        # upstream project #39 convention).
        assert set(hist.keys()) == {"mi250_1: EPLB", "mi300_1: EPLB"}

        mi250 = hist["mi250_1: EPLB"]
        mi300 = hist["mi300_1: EPLB"]

        # mi250 timeline: fail → pass → fail
        assert mi250[d1]["fail"] == 1 and mi250[d1]["pass"] == 0
        assert mi250[d2]["fail"] == 0 and mi250[d2]["pass"] == 1
        assert mi250[d3]["fail"] == 1 and mi250[d3]["pass"] == 0
        # mi300 timeline: pass → (absent d2) → fail
        assert mi300[d1]["fail"] == 0 and mi300[d1]["pass"] == 1
        assert mi300[d3]["fail"] == 1 and mi300[d3]["pass"] == 0
        # Build numbers kept so the dashboard can link back.
        assert 102 in mi250[d3]["build_numbers"]
        assert 102 in mi300[d3]["build_numbers"]

    def test_ignores_files_outside_window(self, isolated_paths):
        results, _, _ = isolated_paths
        old = _today_minus(200)  # outside 60d window
        fresh = _today_minus(5)
        _write_jsonl(results / f"{old}_amd.jsonl", [
            {"job_name": "mi250_1: stale", "classname": "mi250_1: stale",
             "status": "failed"},
        ])
        _write_jsonl(results / f"{fresh}_amd.jsonl", [
            {"job_name": "mi250_1: fresh", "classname": "mi250_1: fresh",
             "status": "failed"},
        ])
        hist = srt._collect_group_history(days=60)
        assert "mi250_1: stale" not in hist
        assert "mi250_1: fresh" in hist

    def test_ignores_malformed_date_filenames(self, isolated_paths):
        results, _, _ = isolated_paths
        (results / "not-a-date_amd.jsonl").write_text(
            json.dumps({"job_name": "x", "status": "failed"}) + "\n"
        )
        assert srt._collect_group_history(days=60) == {}

    def test_ignores_malformed_json_lines(self, isolated_paths):
        results, _, _ = isolated_paths
        d = _today_minus(1)
        (results / f"{d}_amd.jsonl").write_text(
            "not-json\n"
            + json.dumps({"job_name": "mi250_1: keep", "status": "failed"}) + "\n"
            + "{broken\n"
        )
        hist = srt._collect_group_history(days=60)
        assert "mi250_1: keep" in hist


# ---------------------------------------------------------------------------
# Summary metrics
# ---------------------------------------------------------------------------

class TestSummarizeGroup:
    def test_currently_failing_when_latest_date_has_fail(self):
        history = {
            "2026-04-15": {"pass": 0, "fail": 1, "hardware": {"mi250_1": "fail"}, "build_numbers": [10]},
            "2026-04-16": {"pass": 1, "fail": 0, "hardware": {"mi250_1": "pass"}, "build_numbers": [11]},
            "2026-04-17": {"pass": 0, "fail": 1, "hardware": {"mi250_1": "fail"}, "build_numbers": [12]},
        }
        s = srt._summarize_group("G", history)
        assert s["currently_failing"] is True
        assert s["latest_date"] == "2026-04-17"
        # First failure in window is the *earliest* fail, not the current streak.
        assert s["first_failure_in_window"] == "2026-04-15"
        # Current streak starts only after the most recent pass.
        assert s["current_streak_started"] == "2026-04-17"
        assert s["last_successful"] == "2026-04-16"
        # pass↔fail flips: F→P + P→F = 2 flips.
        assert s["break_frequency"] == 2
        assert s["hardware_latest"] == {"mi250_1": "fail"}
        assert s["builds_latest"] == [12]

    def test_not_currently_failing_when_latest_is_pass(self):
        history = {
            "2026-04-15": {"pass": 0, "fail": 1, "hardware": {}, "build_numbers": []},
            "2026-04-16": {"pass": 1, "fail": 0, "hardware": {}, "build_numbers": []},
        }
        s = srt._summarize_group("G", history)
        assert s["currently_failing"] is False
        assert s["current_streak_started"] is None

    def test_all_passing_no_failures(self):
        history = {
            "2026-04-15": {"pass": 1, "fail": 0, "hardware": {"mi250_1": "pass"}, "build_numbers": []},
            "2026-04-16": {"pass": 1, "fail": 0, "hardware": {"mi250_1": "pass"}, "build_numbers": []},
        }
        s = srt._summarize_group("G", history)
        assert s["currently_failing"] is False
        assert s["first_failure_in_window"] is None
        assert s["break_frequency"] == 0
        assert s["current_streak_started"] is None

    def test_empty_history(self):
        s = srt._summarize_group("G", {})
        assert s["currently_failing"] is False
        assert s["latest_date"] is None
        assert s["builds_latest"] == []

    def test_current_streak_walks_back_through_only_failures(self):
        history = {
            "2026-04-14": {"pass": 1, "fail": 0, "hardware": {}, "build_numbers": []},
            "2026-04-15": {"pass": 0, "fail": 1, "hardware": {}, "build_numbers": []},
            "2026-04-16": {"pass": 0, "fail": 1, "hardware": {}, "build_numbers": []},
            "2026-04-17": {"pass": 0, "fail": 1, "hardware": {}, "build_numbers": []},
        }
        s = srt._summarize_group("G", history)
        assert s["current_streak_started"] == "2026-04-15"
        assert s["first_failure_in_window"] == "2026-04-15"


# ---------------------------------------------------------------------------
# run()
# ---------------------------------------------------------------------------

class TestRunDryRun:
    def test_dry_run_emits_plan_and_never_hits_network(
        self, isolated_paths, monkeypatch
    ):
        results, out, _ = isolated_paths
        d = _today_minus(1)
        _write_jsonl(results / f"{d}_amd.jsonl", [
            {"job_name": "mi250_1: Broken Group", "classname": "mi250_1: x",
             "status": "failed", "build_number": 200},
            {"job_name": "mi250_1: Clean Group", "classname": "mi250_1: y",
             "status": "passed", "build_number": 200},
        ])

        # Explode if _graphql is called — dry-run must not touch GitHub.
        def _boom(*a, **kw):
            raise AssertionError("dry-run must not call GitHub GraphQL")
        monkeypatch.setattr(srt, "_graphql", _boom)
        monkeypatch.setattr(srt, "_fetch_project_meta", _boom)

        monkeypatch.delenv("READY_TICKETS_LIVE", raising=False)
        monkeypatch.delenv("PROJECTS_TOKEN", raising=False)

        rc = srt.run()
        assert rc == 0
        data = json.loads(out.read_text())
        assert data["mode"] == "dry_run"
        # Only failing groups show up as tickets.
        titles = {t["title"] for t in data["tickets"]}
        assert titles == {"[CI Failure]: mi250_1: Broken Group"}
        # Canonical shape of a dry-run ticket.
        ticket = data["tickets"][0]
        assert ticket["action"] == "would_create_or_update"
        assert ticket["issue_number"] is None
        # The dashboard's "create ↗" link builds a pre-filled GitHub
        # ``issues/new?title=&body=&labels=`` URL from these three fields.
        # If any go missing the admin would land on an empty compose form
        # and file a ticket without the hardware / streak / build context.
        assert ticket["labels"] == ["ci-failure"]
        assert ticket["body"], "dry-run ticket must carry a ready-to-post body"
        assert "mi250_1: Broken Group" in ticket["body"]
        # The body must identify it as a CI-failure template so we're not
        # pre-filling the compose form with something unrelated.
        assert "AMD nightly" in ticket["body"]
        # PII guarantee: the roster must NOT be in this file. The plan is
        # served publicly on gh-pages; the admin dropdown reads the roster
        # from the encrypted engineers.enc.json instead.
        assert "engineers" not in data
        assert data["failing_groups_total"] == 1

    def test_live_requested_but_no_token_forces_dry_run(
        self, isolated_paths, monkeypatch
    ):
        results, out, _ = isolated_paths
        d = _today_minus(1)
        _write_jsonl(results / f"{d}_amd.jsonl", [
            {"job_name": "mi250_1: G", "classname": "mi250_1: c",
             "status": "failed", "build_number": 1},
        ])

        def _boom(*a, **kw):
            raise AssertionError("must not reach GitHub without PROJECTS_TOKEN")
        monkeypatch.setattr(srt, "_graphql", _boom)

        monkeypatch.setenv("READY_TICKETS_LIVE", "1")
        monkeypatch.delenv("PROJECTS_TOKEN", raising=False)

        rc = srt.run()
        assert rc == 0
        data = json.loads(out.read_text())
        assert data["mode"] == "dry_run_forced"

    def test_no_failing_groups_produces_empty_plan(self, isolated_paths, monkeypatch):
        results, out, _ = isolated_paths
        d = _today_minus(1)
        _write_jsonl(results / f"{d}_amd.jsonl", [
            {"job_name": "mi250_1: OK", "classname": "mi250_1: x",
             "status": "passed", "build_number": 1},
        ])
        monkeypatch.delenv("READY_TICKETS_LIVE", raising=False)
        monkeypatch.delenv("PROJECTS_TOKEN", raising=False)
        rc = srt.run()
        assert rc == 0
        data = json.loads(out.read_text())
        assert data["failing_groups_total"] == 0
        assert data["tickets"] == []

    def test_plan_includes_all_groups_in_groups_all(
        self, isolated_paths, monkeypatch
    ):
        # Design intent: `tickets` only has failing groups, but `groups_all`
        # has the full window so the dashboard can show "tracked 150 groups".
        results, out, _ = isolated_paths
        d = _today_minus(1)
        _write_jsonl(results / f"{d}_amd.jsonl", [
            {"job_name": "mi250_1: pass-me", "classname": "mi250_1: x",
             "status": "passed", "build_number": 1},
            {"job_name": "mi250_1: fail-me", "classname": "mi250_1: y",
             "status": "failed", "build_number": 1},
        ])
        monkeypatch.delenv("READY_TICKETS_LIVE", raising=False)
        srt.run()
        data = json.loads(out.read_text())
        all_groups = {g["group"] for g in data["groups_all"]}
        assert all_groups == {"mi250_1: pass-me", "mi250_1: fail-me"}
        # tickets only contains the failing one
        assert {t["summary"]["group"] for t in data["tickets"]} == {"mi250_1: fail-me"}

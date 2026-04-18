"""Tests for ``scripts/vllm/register_test_build.py``.

The registry script is the **admin-token-free** half of the Test Build tab:
the browser creates the Buildkite build itself with the user's own Buildkite
token, then dispatches the workflow which runs this script to record the
build metadata. No admin token is used on this path, so the tests here lock
in two things:

    1. The script faithfully records what the browser sent it. If the
       registry entries drift, the collector can't poll results.
    2. It never tries to call Buildkite itself. The whole point of this
       refactor was to isolate the admin's BUILDKITE_TOKEN from any
       per-user write path; if this script ever starts calling the
       Buildkite API, that boundary is gone.

The implementation is env-var driven, so we set envs via monkeypatch and
assert on the JSON file written.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from vllm import register_test_build as rtb


@pytest.fixture
def isolated_registry(tmp_path, monkeypatch):
    """Point the registry file at a tmp location per test."""
    reg_dir = tmp_path / "registry"
    reg_file = reg_dir / "index.json"
    monkeypatch.setattr(rtb, "REGISTRY_DIR", reg_dir, raising=False)
    monkeypatch.setattr(rtb, "REGISTRY_FILE", reg_file, raising=False)
    return reg_dir, reg_file


def _set_common_env(monkeypatch, **overrides):
    base = {
        "TB_BUILD_NUMBER": "1234",
        "TB_WEB_URL": "https://buildkite.com/vllm/amd-ci/builds/1234",
        "TB_COMMIT": "deadbeefcafebabe" * 2 + "00000000",
        "TB_MESSAGE": "Testing XYZ",
        "TB_BRANCH": "main",
        "TB_ENV": "FOO=bar\nBAZ=qux",
        "TB_CLEAN": "true",
        "TB_CLEANUP": "on_success",
        "TB_FORK_REPO": "",
        "TB_BRANCH_REF": "",
        "TB_BASE_IMAGE": "rocm/vllm-dev:latest",
        "TB_REQUESTED_BY": "someone-amd",
    }
    base.update(overrides)
    for k, v in base.items():
        monkeypatch.setenv(k, v)
    monkeypatch.delenv("GITHUB_OUTPUT", raising=False)


class TestEnvParsing:
    def test_parses_simple_env_pairs(self):
        out = rtb._parse_env("A=1\nB=two\nC=x=y")
        # Preserves '=' in value ("C=x=y" → C="x=y")
        assert out == {"A": "1", "B": "two", "C": "x=y"}

    def test_ignores_comments_and_blanks(self):
        out = rtb._parse_env("\n# a comment\n \nFOO=bar\n\n")
        assert out == {"FOO": "bar"}

    def test_empty_string_returns_empty_dict(self):
        assert rtb._parse_env("") == {}

    def test_whitespace_trimmed_on_keys_and_values(self):
        out = rtb._parse_env("  SPACE =  padded  ")
        assert out == {"SPACE": "padded"}

    def test_rejects_invalid_lines_without_equals(self):
        out = rtb._parse_env("NO_EQUALS_HERE\nREAL=1")
        assert out == {"REAL": "1"}


class TestRegistryIO:
    def test_round_trip(self, isolated_registry):
        _, reg_file = isolated_registry
        rows = [{"build_number": 42, "state": "scheduled"}]
        rtb._save_registry(rows)
        assert reg_file.exists()
        assert rtb._load_registry() == rows

    def test_missing_file_returns_empty(self, isolated_registry):
        assert rtb._load_registry() == []

    def test_corrupted_file_returns_empty(self, isolated_registry):
        _, reg_file = isolated_registry
        reg_file.parent.mkdir(parents=True, exist_ok=True)
        reg_file.write_text("not valid json {")
        assert rtb._load_registry() == []

    def test_non_list_returns_empty(self, isolated_registry):
        _, reg_file = isolated_registry
        reg_file.parent.mkdir(parents=True, exist_ok=True)
        reg_file.write_text(json.dumps({"build_number": 1}))
        # Top-level object not a list — treat as corrupt & start fresh.
        assert rtb._load_registry() == []


class TestMainRegister:
    def test_registers_entry_with_expected_shape(self, isolated_registry, monkeypatch):
        _, reg_file = isolated_registry
        _set_common_env(monkeypatch)
        rc = rtb.main()
        assert rc == 0
        rows = json.loads(reg_file.read_text())
        assert len(rows) == 1
        e = rows[0]
        # Key invariants — the collector relies on these fields.
        assert e["id"] == "amd-ci-1234"
        assert e["pipeline"] == "amd-ci"
        assert e["build_number"] == 1234
        assert e["web_url"].startswith("https://buildkite.com/")
        assert e["state"] == "scheduled"
        assert e["results_fetched"] is False
        assert e["comparison"] is None
        assert e["clean_checkout"] is True
        assert e["cleanup_mode"] == "on_success"
        assert e["env"] == {"FOO": "bar", "BAZ": "qux"}
        assert e["requested_by"] == "someone-amd"
        assert "created_at" in e

    def test_rejects_missing_build_number(self, isolated_registry, monkeypatch):
        _set_common_env(monkeypatch, TB_BUILD_NUMBER="")
        rc = rtb.main()
        assert rc == 1

    def test_rejects_non_integer_build_number(self, isolated_registry, monkeypatch):
        _set_common_env(monkeypatch, TB_BUILD_NUMBER="not-a-number")
        rc = rtb.main()
        assert rc == 1

    def test_deduplicates_on_build_number(self, isolated_registry, monkeypatch):
        _, reg_file = isolated_registry
        # First register with message A.
        _set_common_env(monkeypatch, TB_MESSAGE="first message")
        rtb.main()
        # Re-register the same build_number with different metadata.
        _set_common_env(monkeypatch, TB_MESSAGE="second message")
        rtb.main()
        rows = json.loads(reg_file.read_text())
        assert len(rows) == 1
        assert rows[0]["message"] == "second message"

    def test_preserves_other_builds_when_re_registering(self, isolated_registry, monkeypatch):
        _, reg_file = isolated_registry
        _set_common_env(monkeypatch, TB_BUILD_NUMBER="100")
        rtb.main()
        _set_common_env(monkeypatch, TB_BUILD_NUMBER="200")
        rtb.main()
        _set_common_env(monkeypatch, TB_BUILD_NUMBER="100", TB_MESSAGE="updated 100")
        rtb.main()
        rows = json.loads(reg_file.read_text())
        assert len(rows) == 2
        by_bn = {r["build_number"]: r for r in rows}
        assert by_bn[100]["message"] == "updated 100"
        assert by_bn[200]["message"] == "Testing XYZ"

    def test_default_branch_ref_uses_vllm_default(self, isolated_registry, monkeypatch):
        _, reg_file = isolated_registry
        _set_common_env(monkeypatch, TB_BRANCH_REF="", TB_BRANCH="feature/xyz")
        rtb.main()
        rows = json.loads(reg_file.read_text())
        assert rows[0]["branch_ref"] == "vllm/vllm-project:feature/xyz"

    def test_custom_branch_ref_preserved(self, isolated_registry, monkeypatch):
        _, reg_file = isolated_registry
        _set_common_env(monkeypatch, TB_BRANCH_REF="myfork/vllm:mybranch")
        rtb.main()
        rows = json.loads(reg_file.read_text())
        assert rows[0]["branch_ref"] == "myfork/vllm:mybranch"

    def test_writes_github_output_when_set(self, isolated_registry, tmp_path, monkeypatch):
        gh_out = tmp_path / "gh_out.txt"
        _set_common_env(monkeypatch)
        monkeypatch.setenv("GITHUB_OUTPUT", str(gh_out))
        rtb.main()
        content = gh_out.read_text()
        assert "build_number=1234" in content
        assert "web_url=" in content


class TestNoBuildkiteAPI:
    """Invariant: the register script must never call Buildkite.

    This is the *whole point* of the admin-token isolation — the browser
    creates the build with the user's token, this script only records the
    metadata.
    """

    def test_source_has_no_buildkite_http(self):
        src = Path(rtb.__file__).read_text()
        assert "buildkite.com/v2" not in src
        assert "api.buildkite.com" not in src
        # BUILDKITE_TOKEN has no business in this script.
        assert "BUILDKITE_TOKEN" not in src
        # requests library would only be there for Buildkite calls — none needed.
        assert "import requests" not in src and "from requests" not in src

    def test_no_buildkite_http_call_during_main(self, isolated_registry, monkeypatch):
        # Second-line defence: even if someone imports requests indirectly,
        # ensure no outbound HTTP happens during a register run. Patch urlopen
        # broadly so any network attempt explodes.
        import urllib.request

        def _boom(*a, **kw):
            raise AssertionError("register_test_build attempted a network call")

        monkeypatch.setattr(urllib.request, "urlopen", _boom, raising=False)
        _set_common_env(monkeypatch)
        assert rtb.main() == 0

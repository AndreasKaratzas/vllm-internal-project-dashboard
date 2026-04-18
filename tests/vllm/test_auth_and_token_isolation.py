"""Tests for the dashboard's auth gate + admin-token isolation.

The dashboard is a static GitHub Pages site, so these aren't Selenium tests.
They're static-analysis tests on the committed source files:

    1. Admin tokens (BUILDKITE_TOKEN, PROJECTS_TOKEN) are never used on any
       per-user write path. User-initiated writes must use the user's own
       tokens, never the admin's.
    2. The Test Build browser flow uses the user's BK token to create the
       build, and the workflow's job never touches BUILDKITE_TOKEN.
    3. The auth gate:
         - is loaded before any ci-*.js tab script
         - hides the protected tabs for guests / non-admins
         - stores no password material (PAT-paste architecture, no passwords)
         - the signup issue body carries only ``{email, requested_at}`` —
           identity (github_id, login) comes from github.event.issue.user
    4. The signup workflow uses github.event.issue.user.id as the anti-spoof
       anchor (GitHub itself authenticates the issue author). Without that,
       anyone could spoof another engineer's signup.
    5. The Ready Tickets live sync requires PROJECTS_TOKEN which only the
       admin can set at the repo secrets level; the script fails open into
       dry-run otherwise.

If any of these asserts break, security review the change before merging.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPTS = ROOT / "scripts" / "vllm"
JS = ROOT / "docs" / "assets" / "js"
WORKFLOWS = ROOT / ".github" / "workflows"


def _read(path: Path) -> str:
    return path.read_text()


# ---------------------------------------------------------------------------
# 1. Admin BUILDKITE_TOKEN is NEVER sent through a per-user write path.
# ---------------------------------------------------------------------------

class TestBuildkiteTokenIsolation:
    def test_register_test_build_has_no_buildkite_token(self):
        src = _read(SCRIPTS / "register_test_build.py")
        assert "BUILDKITE_TOKEN" not in src, (
            "register_test_build.py must not reference BUILDKITE_TOKEN — the "
            "user's own BK token creates the build in the browser."
        )
        assert "api.buildkite.com" not in src, (
            "register_test_build.py must not call the Buildkite API directly."
        )

    def test_register_test_build_workflow_has_no_buildkite_token(self):
        # The dispatch workflow that runs register_test_build.py must not
        # pass BUILDKITE_TOKEN into any step — a user-triggered dispatch
        # must not carry the admin token.
        wf = _read(WORKFLOWS / "test-build.yml")
        assert "BUILDKITE_TOKEN" not in wf, (
            "test-build.yml must NOT carry BUILDKITE_TOKEN — user-initiated "
            "writes to Buildkite use the user's own token, not the admin's."
        )

    def test_testbuild_js_uses_vault_for_bk_token(self):
        src = _read(JS / "ci-testbuild.js")
        # The BK token must go through the encrypted vault — never a raw
        # ``sessionStorage.setItem`` with a plaintext token key. The vault
        # holds AES-GCM ciphertext with a key that lives only in memory.
        assert "window.__tokenVault" in src or "__tokenVault" in src, (
            "ci-testbuild.js must delegate BK token I/O to window.__tokenVault"
        )
        assert "bk_token" in src, (
            "ci-testbuild.js must reference the vault entry name bk_token"
        )
        # The direct API call must be present — browser does the build creation.
        assert "api.buildkite.com/v2/organizations/vllm/pipelines/amd-ci/builds" in src
        # The legacy plaintext keys must NOT appear in committed code — if
        # they do, the dashboard would write raw tokens to sessionStorage.
        assert "setItem('vllm_dashboard_bk_token'" not in src
        assert "setItem(\"vllm_dashboard_bk_token\"" not in src
        assert "setItem('vllm_dashboard_gh_pat'" not in src

    def test_user_signup_workflow_does_not_touch_buildkite_token(self):
        wf = _read(WORKFLOWS / "user-signup.yml")
        assert "BUILDKITE_TOKEN" not in wf

    def test_hourly_master_passes_bk_token_only_to_known_collectors(self):
        """BUILDKITE_TOKEN in hourly-master.yml only reaches read-only steps.

        These are the admin's polling paths — acceptable because no user can
        trigger them. But it must NEVER land in a step that handles
        user-supplied input (register_test_build, process_signup, etc.).
        """
        text = _read(WORKFLOWS / "hourly-master.yml")
        data = yaml.safe_load(text)
        allowed_scripts = {
            "collect_queue_snapshot.py",
            "collect_hotness.py",
            "collect_ci.py",
            "collect_analytics.py",
            "collect_test_builds.py",
        }
        # Walk every step; for any step with BUILDKITE_TOKEN in env, its run:
        # body must only invoke scripts from the allowlist.
        job = data["jobs"]["collect-and-deploy"]
        for step in job["steps"]:
            env = step.get("env", {}) or {}
            if "BUILDKITE_TOKEN" not in env:
                continue
            run_cmd = step.get("run", "") or ""
            assert run_cmd, "step with BUILDKITE_TOKEN must have a run: block"
            invoked = re.findall(r"python\s+scripts/(?:vllm/)?(\S+\.py)", run_cmd)
            invoked = [Path(p).name for p in invoked]
            for script in invoked:
                assert script in allowed_scripts, (
                    f"BUILDKITE_TOKEN reached unauthorized script {script!r} "
                    f"in step {step.get('name')!r}"
                )


# ---------------------------------------------------------------------------
# 2. PROJECTS_TOKEN — admin-only, never user-reachable.
# ---------------------------------------------------------------------------

class TestProjectsTokenIsolation:
    def test_projects_token_only_in_ready_tickets_script(self):
        # Only sync_ready_tickets.py should read PROJECTS_TOKEN.
        hits = []
        for py in SCRIPTS.rglob("*.py"):
            if "PROJECTS_TOKEN" in _read(py):
                hits.append(py.name)
        assert hits == ["sync_ready_tickets.py"], (
            f"Unexpected PROJECTS_TOKEN consumers: {hits}"
        )

    def test_projects_token_only_in_scheduled_workflow(self):
        # PROJECTS_TOKEN must only appear in workflows that are cron/scheduled
        # — never in ones that users can trigger via workflow_dispatch with
        # untrusted inputs.
        for wf in WORKFLOWS.glob("*.yml"):
            text = _read(wf)
            if "PROJECTS_TOKEN" not in text:
                continue
            data = yaml.safe_load(text)
            triggers = data.get(True) or data.get("on") or {}
            assert isinstance(triggers, dict), (
                f"{wf.name}: PROJECTS_TOKEN-using workflow should have a "
                "structured on: trigger list"
            )
            # The only acceptable triggers for a PROJECTS_TOKEN-carrying workflow
            # are schedule, workflow_dispatch (admin-only), and repository_dispatch.
            allowed = {"schedule", "workflow_dispatch", "repository_dispatch"}
            disallowed = set(triggers.keys()) - allowed
            assert not disallowed, (
                f"{wf.name}: PROJECTS_TOKEN-carrying workflow cannot be triggered by {disallowed}"
            )

    def test_sync_ready_tickets_falls_back_to_dry_run_without_token(self):
        src = _read(SCRIPTS / "sync_ready_tickets.py")
        # The script must check for the PAT and force dry-run if missing.
        assert "READY_TICKETS_LIVE" in src
        assert "PROJECTS_TOKEN not set" in src or "PROJECTS_TOKEN" in src
        assert "dry_run_forced" in src


# ---------------------------------------------------------------------------
# 3. Auth gate static integrity (PAT-paste architecture).
# ---------------------------------------------------------------------------

class TestAuthGateWiring:
    def test_auth_js_is_loaded_before_ci_tabs(self):
        html = _read(ROOT / "docs" / "index.html")
        auth_idx = html.find("auth.js")
        assert auth_idx > 0, "auth.js must be included in index.html"
        # auth.js must come before every ci-*.js so the overlay paints first
        # and tab scripts can read window.__authGate during registration.
        for tab in ("ci-testbuild.js", "ci-ready.js", "ci-admin.js"):
            tab_idx = html.find(tab)
            assert tab_idx > auth_idx, (
                f"auth.js must be loaded before {tab} in index.html"
            )

    def test_auth_js_verifies_pat_against_github(self):
        # Signin proves identity by calling GET api.github.com/user with the
        # pasted PAT, not by hashing a password. The endpoint has CORS so
        # it works from the static page.
        src = _read(JS / "auth.js")
        assert "api.github.com/user" in src, (
            "auth.js must verify the PAT via GET api.github.com/user"
        )
        # Must match the returned numeric id against the allowlist, not just
        # the login (logins can be renamed; numeric ids are stable).
        assert "github_id" in src
        assert "me.id" in src

    def test_auth_js_signup_body_carries_only_audit_fields(self):
        # The signup issue body must be {email, requested_at} — nothing else.
        # Identity is pulled from github.event.issue.user in the workflow.
        src = _read(JS / "auth.js")
        body_match = re.search(
            r"JSON\.stringify\(\{([^}]+)\}", src, re.DOTALL
        )
        assert body_match, "auth.js must build the signup JSON block"
        body = body_match.group(1)
        # Only the two audit fields.
        assert "email" in body
        assert "requested_at" in body
        # Must NEVER include password material or a PAT in the issue body.
        assert "password" not in body, (
            "auth.js signup body must not include any password field"
        )
        assert "password_hash" not in body
        assert "salt" not in body
        assert "iterations" not in body
        assert re.search(r"\bpat\b", body) is None, (
            "auth.js signup body must NEVER include the PAT"
        )
        assert "github_login" not in body, (
            "login is pulled from github.event.issue.user, not supplied by the client"
        )

    def test_auth_js_never_persists_pat(self):
        # The PAT is held in a module-local closure var only. Never written
        # to sessionStorage/localStorage in cleartext.
        src = _read(JS / "auth.js")
        assert re.search(
            r"sessionStorage\.setItem\([^)]*pat", src, re.IGNORECASE
        ) is None
        assert re.search(
            r"localStorage\.setItem\([^)]*pat", src, re.IGNORECASE
        ) is None

    def test_auth_js_declares_gated_tabs(self):
        src = _read(JS / "auth.js")
        for tab in ("ci-testbuild", "ci-ready", "ci-admin"):
            assert f"'{tab}'" in src or f'"{tab}"' in src, (
                f"auth.js must include {tab} in the gated tab list"
            )
        assert "ADMIN_ONLY_TABS" in src
        assert "ci-admin" in src

    def test_auth_js_exposes_global_gate_api(self):
        src = _read(JS / "auth.js")
        # ci-*.js scripts depend on these surface members.
        for symbol in (
            "isAuthed",
            "isAdmin",
            "isGuest",
            "getGithubPat",
            "__authGate",
        ):
            assert symbol in src, f"auth.js must expose {symbol}"


class TestSignupAntiSpoof:
    def test_workflow_exposes_issue_author_id_to_script(self):
        wf = _read(WORKFLOWS / "user-signup.yml")
        # GitHub itself authenticates the issue author, and its numeric id is
        # the anti-spoof anchor (stable across renames).
        assert "github.event.issue.user.id" in wf, (
            "user-signup.yml must pass the authenticated author's numeric id "
            "into the processor — this is the anti-spoof anchor."
        )
        assert "ISSUE_AUTHOR_ID" in wf
        assert "github.event.issue.user.login" in wf
        assert "ISSUE_AUTHOR" in wf

    def test_workflow_has_contents_write_for_users_json(self):
        # The processor commits data/users.json via the Contents API, so the
        # workflow needs contents: write. Without it, the PUT fails and no
        # signups ever land.
        wf = yaml.safe_load(_read(WORKFLOWS / "user-signup.yml"))
        perms = wf.get("permissions") or {}
        assert perms.get("contents") == "write", (
            "user-signup.yml must grant contents: write so process_signup.py "
            "can PUT a new data/users.json via the Contents API."
        )
        assert perms.get("issues") == "write"

    def test_processor_uses_author_id_not_body_login(self):
        src = _read(SCRIPTS / "process_signup.py")
        # Identity must come from the env (authenticated issue author id),
        # never from the issue body.
        assert "ISSUE_AUTHOR_ID" in src
        assert "ISSUE_AUTHOR" in src
        # The committed entry must be github_id-keyed.
        assert "github_id" in src

    def test_processor_parser_drops_identity_fields_from_body(self):
        # Even if a client sneaks ``github_id`` or ``github_login`` into the
        # body, the parser must only surface {email, requested_at}. This is
        # asserted via the unit test suite too, but pin it structurally here
        # so the defence cannot be deleted accidentally.
        src = _read(SCRIPTS / "process_signup.py")
        # parse_signup_body returns only the two audit fields.
        m = re.search(
            r"def parse_signup_body.+?return\s*\{(.+?)\}",
            src,
            re.DOTALL,
        )
        assert m, "parse_signup_body must exist and return a dict literal"
        returned = m.group(1)
        assert '"email"' in returned
        assert '"requested_at"' in returned
        assert "github_login" not in returned
        assert "github_id" not in returned

    def test_processor_only_triggered_by_signup_request_label(self):
        wf = yaml.safe_load(_read(WORKFLOWS / "user-signup.yml"))
        process_job = wf["jobs"]["process"]
        assert "signup-request" in process_job["if"], (
            "user-signup workflow must only run on issues labeled signup-request"
        )


# ---------------------------------------------------------------------------
# 4. Admin-only tab & data/users.json structure.
# ---------------------------------------------------------------------------

class TestAdminTab:
    def test_admin_tab_gated_by_isAdmin(self):
        src = _read(JS / "ci-admin.js")
        # Must refuse to render for non-admins.
        assert "isAdmin" in src
        assert "isAuthed" in src

    def test_admin_tab_uses_session_pat_not_sessionstorage(self):
        src = _read(JS / "ci-admin.js")
        # Deletions must PUT users.json with the admin's own PAT, read from
        # the in-memory session via __authGate.getGithubPat(). Never from a
        # raw sessionStorage key, never a hard-coded token.
        assert "getGithubPat" in src, (
            "ci-admin.js must read the session PAT via __authGate.getGithubPat()"
        )
        # Must NOT contain a hard-coded bearer token or API key.
        assert not re.search(r"ghp_[A-Za-z0-9]{20,}", src)
        # Must not write a plaintext token under any of the legacy keys.
        assert "setItem('vllm_dashboard_gh_pat'" not in src
        assert "setItem(\"vllm_dashboard_gh_pat\"" not in src

    def test_users_json_has_expected_shape(self):
        import json
        db = json.loads(_read(ROOT / "data" / "users.json"))
        # New schema: admin_id (numeric GitHub id) + users: [{github_id,
        # email, requested_at}]. No password material anywhere.
        assert isinstance(db.get("admin_id"), int)
        assert db["admin_id"] > 0
        assert isinstance(db.get("users"), list)
        allowed_keys = {"github_id", "email", "requested_at"}
        for u in db["users"]:
            assert set(u.keys()) <= allowed_keys, (
                f"users.json entry has unexpected keys: "
                f"{set(u.keys()) - allowed_keys}"
            )
            assert isinstance(u.get("github_id"), int)
            assert isinstance(u.get("email"), str)
            # No credential fields allowed — the whole point of this migration.
            for forbidden in ("password_hash", "password", "salt", "iterations", "pat"):
                assert forbidden not in u


# ---------------------------------------------------------------------------
# 5. Secrets hygiene in committed files.
# ---------------------------------------------------------------------------

class TestNoLeakedSecrets:
    def test_no_pat_in_any_js(self):
        pat_patterns = [
            re.compile(r"ghp_[A-Za-z0-9]{36,}"),
            re.compile(r"github_pat_[A-Za-z0-9_]{50,}"),
            re.compile(r"bkua_[a-f0-9]{40}"),
        ]
        for js in JS.glob("*.js"):
            text = _read(js)
            for pat in pat_patterns:
                m = pat.search(text)
                assert not m, (
                    f"Possible token leak in {js.name}: {m.group(0)[:10]}…"
                )

    def test_users_json_has_no_plaintext_fields(self):
        text = _read(ROOT / "data" / "users.json")
        for forbidden in ("plaintext", "\"password\":", "\"password_hash\":", "\"salt\":", "pat\":"):
            assert forbidden not in text


# ---------------------------------------------------------------------------
# 6. Encrypted token vault.
#
#    Tokens sit in sessionStorage as AES-GCM ciphertext; the unwrap key is
#    derived from the user's PAT + numeric GitHub id at sign-in and held
#    only in memory. These are structural checks on the committed vault
#    source — the actual crypto runs in the browser and is exercised
#    manually. We assert the file is wired correctly so an accidental
#    refactor doesn't regress the protection.
# ---------------------------------------------------------------------------

class TestTokenVault:
    def test_vault_file_exists_and_is_loaded_first(self):
        vault_path = JS / "token-vault.js"
        assert vault_path.exists(), "token-vault.js must exist"
        html = _read(ROOT / "docs" / "index.html")
        vault_idx = html.find("token-vault.js")
        auth_idx = html.find("auth.js")
        assert vault_idx > 0 and auth_idx > 0
        assert vault_idx < auth_idx, (
            "token-vault.js must load before auth.js so the unlock call at "
            "sign-in can reach __tokenVault"
        )
        for tab in ("ci-testbuild.js", "ci-ready.js", "ci-admin.js"):
            assert vault_idx < html.find(tab), (
                f"token-vault.js must load before {tab}"
            )

    def test_vault_uses_aes_gcm_and_pbkdf2(self):
        src = _read(JS / "token-vault.js")
        assert "AES-GCM" in src, "token-vault must use AES-GCM"
        assert "PBKDF2" in src, "wrap key must be derived via PBKDF2"
        # Non-extractable key is the whole point — reject if someone flips
        # the extractable flag to true (makes raw key readable from JS).
        assert re.search(r"false,[^\n]*non-extractable", src), (
            "deriveKey must be called with extractable=false (non-extractable)"
        )
        # Iteration count — vault wrap key protects session-lifetime ciphertext.
        m = re.search(r"KDF_ITERATIONS\s*=\s*(\d+)", src)
        assert m and int(m.group(1)) >= 100_000, (
            "token-vault KDF_ITERATIONS must be ≥ 100k"
        )

    def test_vault_uses_domain_separator_for_wrap_key(self):
        # The wrap key salt must be scoped with a domain separator so it can
        # never collide with another PBKDF2 derivation that reuses the same
        # (pat, id) inputs.
        src = _read(JS / "token-vault.js")
        assert "|vault" in src, (
            "wrap-key derivation must use a '|vault' domain separator"
        )

    def test_vault_unlock_requires_pat_and_user_id(self):
        # The new KDF signature is ``unlock(pat, userId)`` — both required.
        src = _read(JS / "token-vault.js")
        assert re.search(r"async function unlock\(\s*pat\s*,\s*userId", src), (
            "token-vault.unlock must take (pat, userId) — the new KDF inputs"
        )
        # Validates both arguments before deriving.
        assert "pat required" in src
        assert "userId" in src

    def test_vault_never_persists_pat_or_password(self):
        src = _read(JS / "token-vault.js")
        # The PAT is used only to derive the wrap key and must not be stashed.
        assert "sessionStorage.setItem('pat'" not in src
        assert "localStorage.setItem(" not in src
        assert not re.search(r"^\s*(var|let|const)\s+_pat\b", src, re.MULTILINE)
        assert not re.search(r"^\s*(var|let|const)\s+_password\b", src, re.MULTILINE)

    def test_vault_fresh_iv_per_put(self):
        src = _read(JS / "token-vault.js")
        # AES-GCM demands a fresh IV per (key, plaintext); reusing an IV
        # leaks plaintext xor. Confirm getRandomValues is invoked inside put.
        put_block = re.search(r"async function put\([^)]*\) \{(.+?)\n  \}", src, re.DOTALL)
        assert put_block, "put() must exist in token-vault.js"
        assert "getRandomValues" in put_block.group(1), (
            "put() must draw a fresh IV via crypto.getRandomValues for every call"
        )

    def test_auth_js_unlocks_vault_on_signin(self):
        src = _read(JS / "auth.js")
        assert "__tokenVault" in src
        assert ".unlock(" in src, (
            "auth.js must call window.__tokenVault.unlock at sign-in"
        )
        assert ".lock(" in src, (
            "auth.js must call window.__tokenVault.lock on sign-out"
        )

    def test_auth_js_evicts_legacy_plaintext_keys(self):
        # Older dashboard builds stored the PAT / BK token in plaintext
        # sessionStorage. Any session carried forward from that build must be
        # wiped on boot so the very first load of this version gives us a
        # clean slate. If this assert breaks, the migration is incomplete.
        src = _read(JS / "auth.js")
        assert "removeItem" in src
        assert "vllm_dashboard_gh_pat" in src
        assert "vllm_dashboard_bk_token" in src


# ---------------------------------------------------------------------------
# 7. CSP — the network-layer guard against malicious-script injection.
# ---------------------------------------------------------------------------

class TestContentSecurityPolicy:
    def _csp(self) -> str:
        html = _read(ROOT / "docs" / "index.html")
        m = re.search(
            r'<meta\s+http-equiv=["\']Content-Security-Policy["\']\s+content=["\']([^"\']+)["\']',
            html,
        )
        assert m, "index.html must declare a Content-Security-Policy meta tag"
        return m.group(1)

    def test_connect_src_is_allowlisted(self):
        csp = self._csp()
        # If connect-src ever becomes '*' or 'https:', a malicious injected
        # script could POST tokens to any host. Assert the two concrete
        # origins are present and no wildcard is.
        connect = re.search(r"connect-src\s+([^;]+)", csp)
        assert connect, "CSP must declare connect-src"
        directive = connect.group(1)
        assert "api.github.com" in directive
        assert "api.buildkite.com" in directive
        assert " * " not in directive and not directive.strip().endswith("*")
        assert "https:" not in directive, (
            "connect-src must enumerate hosts, not open 'https:'"
        )

    def test_frame_ancestors_none(self):
        # Defeat clickjacking — the dashboard cannot be framed.
        csp = self._csp()
        assert "frame-ancestors 'none'" in csp

    def test_script_src_is_allowlisted(self):
        csp = self._csp()
        script_src = re.search(r"script-src\s+([^;]+)", csp)
        assert script_src
        directive = script_src.group(1)
        # Only 'self' and the Chart.js CDN are allowed.
        assert "'self'" in directive
        assert "cdn.jsdelivr.net" in directive
        # No arbitrary https: or unsafe-eval.
        assert "unsafe-eval" not in directive

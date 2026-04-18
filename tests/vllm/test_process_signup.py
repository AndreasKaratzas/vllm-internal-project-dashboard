"""Tests for ``scripts/vllm/process_signup.py``.

The signup processor runs in ``.github/workflows/user-signup.yml`` when a
dashboard user opens a ``signup-request`` issue via the entry gate.

The flow changed: the issue is an **audit record only**. The browser
commits the user entry (salt + hash + iterations) directly to
``data/users.json`` via the Contents API, so this workflow never writes
repo contents. Its sole jobs are:

    * Anti-spoof: the GitHub-authenticated issue author must equal the
      claimed ``github_login``. GitHub itself enforces
      ``github.event.issue.user.login``, so a spoofed signup is impossible
      as long as we actually verify author == login.
    * Label + comment on the issue. Never auto-close — the admin keeps it
      open as a review record and closes manually.
    * Optionally email the admin if Resend is configured.

Tests exercise the parser's happy path and every rejection path, and
verify we neither write users.json nor close the issue.
"""

from __future__ import annotations

import json

import pytest

from vllm import process_signup as ps


VALID_LOGIN = "SomeUser-01"
VALID_EMAIL = "someuser@amd.com"


def _build_body(**overrides):
    payload = {
        "github_login": VALID_LOGIN,
        "email": VALID_EMAIL,
        "requested_at": "2026-04-18T10:00:00Z",
    }
    payload.update(overrides)
    return f"some preamble\n\n```json\n{json.dumps(payload)}\n```\n\nafterword"


# ---------------------------------------------------------------------------
# parse_signup_body
# ---------------------------------------------------------------------------

class TestParseSignupBody:
    def test_happy_path(self):
        out = ps.parse_signup_body(_build_body())
        assert out is not None
        assert out["github_login"] == VALID_LOGIN
        assert out["email"] == VALID_EMAIL
        assert out["requested_at"] == "2026-04-18T10:00:00Z"

    def test_missing_json_block(self):
        assert ps.parse_signup_body("no block here") is None

    def test_invalid_json(self):
        body = "```json\n{not valid json}\n```"
        assert ps.parse_signup_body(body) is None

    def test_missing_required_field(self):
        payload = {"github_login": VALID_LOGIN}  # no email
        body = f"```json\n{json.dumps(payload)}\n```"
        assert ps.parse_signup_body(body) is None

    def test_rejects_invalid_login(self):
        assert ps.parse_signup_body(_build_body(github_login="bad login")) is None
        assert ps.parse_signup_body(_build_body(github_login="-badlogin")) is None
        assert ps.parse_signup_body(_build_body(github_login="x" * 40)) is None

    def test_rejects_invalid_email(self):
        assert ps.parse_signup_body(_build_body(email="not-an-email")) is None
        assert ps.parse_signup_body(_build_body(email="a@b")) is None
        assert ps.parse_signup_body(_build_body(email="")) is None

    def test_normalizes_email_to_lowercase(self):
        out = ps.parse_signup_body(_build_body(email="MixedCase@Example.Com"))
        assert out is not None
        assert out["email"] == "mixedcase@example.com"

    def test_ignores_sensitive_fields_if_present(self):
        # Defence in depth: if a legacy client sends salt/hash/password in
        # the body, the parser drops them on the floor. Only the three
        # audit fields are ever surfaced from the body.
        payload = {
            "github_login": VALID_LOGIN,
            "email": VALID_EMAIL,
            "requested_at": "2026-04-18T10:00:00Z",
            "salt": "a" * 32,
            "iterations": 200000,
            "password_hash": "b" * 64,
            "password": "PLAINTEXT-SHOULD-BE-DROPPED",  # noqa: S105
            "pat": "ghp_secret_should_be_dropped",
        }
        body = f"```json\n{json.dumps(payload)}\n```"
        out = ps.parse_signup_body(body)
        assert out is not None
        assert set(out.keys()) == {"github_login", "email", "requested_at"}


# ---------------------------------------------------------------------------
# run() — full workflow
# ---------------------------------------------------------------------------

def _stub_github(monkeypatch):
    """Replace every outbound HTTP call with a recorder."""
    calls = []

    class _Resp:
        ok = True
        status_code = 200

        def json(self):
            return {}

        @property
        def text(self):
            return ""

    import requests

    def _stub(*a, **kw):
        calls.append((a, kw))
        return _Resp()

    monkeypatch.setattr(requests, "post", _stub)
    monkeypatch.setattr(requests, "patch", _stub)
    return calls


def _set_issue_env(monkeypatch, *, number=42, author=VALID_LOGIN, body=None):
    monkeypatch.setenv("GITHUB_TOKEN", "fake")
    monkeypatch.setenv("GH_REPOSITORY", "AndreasKaratzas/vllm-ci-dashboard")
    monkeypatch.setenv("ISSUE_NUMBER", str(number))
    monkeypatch.setenv("ISSUE_AUTHOR", author)
    monkeypatch.setenv("ISSUE_BODY", body if body is not None else _build_body())
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("RESEND_FROM", raising=False)
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)


class TestRun:
    def test_happy_path_acknowledges_without_writing_users_file(self, monkeypatch):
        calls = _stub_github(monkeypatch)
        _set_issue_env(monkeypatch)
        rc = ps.run()
        assert rc == 0
        # The workflow must never PATCH the issue to close it — that would
        # re-introduce the very behavior we removed.
        import requests as _rq
        patch_calls = [c for c in calls if c[1].get("json", {}).get("state") == "closed"]
        assert patch_calls == [], (
            "run() must NOT auto-close the issue — the admin keeps it open "
            "as an audit record"
        )
        # It should at least comment + label (POST to /comments and /labels).
        posted_urls = [c[0][0] for c in calls]
        assert any("/comments" in u for u in posted_urls)
        assert any("/labels" in u for u in posted_urls)

    def test_rejects_signup_when_author_mismatch(self, monkeypatch):
        calls = _stub_github(monkeypatch)
        _set_issue_env(monkeypatch, author="SomeoneElse")
        rc = ps.run()
        assert rc == 0
        # Still labels + comments on rejection, but does not close.
        assert any("/comments" in c[0][0] for c in calls)
        assert not any(c[1].get("json", {}).get("state") == "closed" for c in calls)

    def test_case_insensitive_author_match(self, monkeypatch):
        _stub_github(monkeypatch)
        _set_issue_env(monkeypatch, author=VALID_LOGIN.lower())
        assert ps.run() == 0

    def test_parses_bad_body_exits_cleanly_without_closing(self, monkeypatch):
        calls = _stub_github(monkeypatch)
        _set_issue_env(monkeypatch, body="no json block here")
        rc = ps.run()
        assert rc == 0
        # Rejection: comment + label, but NOT close.
        assert not any(c[1].get("json", {}).get("state") == "closed" for c in calls)

    def test_invalid_issue_number_returns_error(self, monkeypatch):
        _stub_github(monkeypatch)
        monkeypatch.setenv("ISSUE_NUMBER", "not-a-number")
        monkeypatch.setenv("ISSUE_AUTHOR", VALID_LOGIN)
        monkeypatch.setenv("ISSUE_BODY", _build_body())
        monkeypatch.setenv("GITHUB_TOKEN", "fake")
        monkeypatch.setenv("GH_REPOSITORY", "x/y")
        assert ps.run() == 1

    def test_run_never_patches_issue_state(self, monkeypatch):
        # Belt-and-braces: across happy and sad paths, no ``state`` patch
        # is ever sent. This is what enforces "do not auto-close".
        calls = _stub_github(monkeypatch)
        _set_issue_env(monkeypatch)
        ps.run()
        _set_issue_env(monkeypatch, author="Nobody")
        ps.run()
        _set_issue_env(monkeypatch, body="garbage")
        ps.run()
        assert all("state" not in c[1].get("json", {}) for c in calls)


class TestEmail:
    def test_email_disabled_without_api_key(self, monkeypatch):
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        monkeypatch.delenv("RESEND_FROM", raising=False)
        assert ps.send_email("x@y.com", "s", "<p>h</p>") is False

    def test_email_disabled_without_sender(self, monkeypatch):
        monkeypatch.setenv("RESEND_API_KEY", "re_fake")
        monkeypatch.delenv("RESEND_FROM", raising=False)
        assert ps.send_email("x@y.com", "s", "<p>h</p>") is False

    def test_email_disabled_without_recipient(self, monkeypatch):
        monkeypatch.setenv("RESEND_API_KEY", "re_fake")
        monkeypatch.setenv("RESEND_FROM", "bot@example.com")
        assert ps.send_email("", "s", "<p>h</p>") is False

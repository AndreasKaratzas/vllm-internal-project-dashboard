"""Tests for ``scripts/vllm/process_signup.py``.

The signup processor runs in ``.github/workflows/user-signup.yml`` when a
dashboard visitor opens a ``signup-request`` issue via the entry gate.

Current flow: the issue body is an **audit record** carrying
``{email, requested_at}``. Identity (``github_id`` + ``github_login``) is
pulled from ``github.event.issue.user``, which GitHub itself authenticates,
so spoofing is impossible. The workflow:

    * Parses + validates the JSON block (email shape, required keys).
    * Reads ``data/users.json`` via the Contents API, filters any existing
      entry with the same ``github_id`` (idempotent retry), appends
      ``{github_id, email, requested_at}``, and commits a new users.json
      to main via Contents API PUT.
    * Labels + comments on the issue. Never auto-closes — the admin keeps
      it open as a review record.
    * Optionally emails the admin if Resend is configured.

Tests exercise the parser happy path and every rejection path, and verify
run() commits exactly one users.json update with the correct shape and
never closes the issue.
"""

from __future__ import annotations

import base64
import json

import pytest

from vllm import process_signup as ps


VALID_LOGIN = "SomeUser-01"
VALID_ID = 987654321
VALID_EMAIL = "someuser@amd.com"


def _build_body(**overrides):
    payload = {
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
        assert out["email"] == VALID_EMAIL
        assert out["requested_at"] == "2026-04-18T10:00:00Z"

    def test_missing_json_block(self):
        assert ps.parse_signup_body("no block here") is None

    def test_invalid_json(self):
        body = "```json\n{not valid json}\n```"
        assert ps.parse_signup_body(body) is None

    def test_missing_email(self):
        payload = {"requested_at": "2026-04-18T10:00:00Z"}
        body = f"```json\n{json.dumps(payload)}\n```"
        assert ps.parse_signup_body(body) is None

    def test_rejects_invalid_email(self):
        assert ps.parse_signup_body(_build_body(email="not-an-email")) is None
        assert ps.parse_signup_body(_build_body(email="a@b")) is None
        assert ps.parse_signup_body(_build_body(email="")) is None

    def test_normalizes_email_to_lowercase(self):
        out = ps.parse_signup_body(_build_body(email="MixedCase@Example.Com"))
        assert out is not None
        assert out["email"] == "mixedcase@example.com"

    def test_drops_extra_fields(self):
        # Defence in depth: legacy clients may include salt/hash/password.
        # The parser returns only {email, requested_at}.
        payload = {
            "email": VALID_EMAIL,
            "requested_at": "2026-04-18T10:00:00Z",
            "github_login": "spoofed",
            "github_id": 1,
            "salt": "a" * 32,
            "iterations": 200000,
            "password_hash": "b" * 64,
            "password": "PLAINTEXT-SHOULD-BE-DROPPED",  # noqa: S105
            "pat": "ghp_secret_should_be_dropped",
        }
        body = f"```json\n{json.dumps(payload)}\n```"
        out = ps.parse_signup_body(body)
        assert out is not None
        assert set(out.keys()) == {"email", "requested_at"}


# ---------------------------------------------------------------------------
# run() — full workflow
# ---------------------------------------------------------------------------

def _stub_requests(monkeypatch, *, initial_db=None):
    """Replace every outbound HTTP call with a recorder + fake Contents API.

    GETs against ``/contents/data/users.json`` return a base64-encoded
    representation of ``initial_db``. PUTs against the same path capture
    the new body so tests can assert on what would be committed.
    """
    if initial_db is None:
        initial_db = {"admin_id": ps.DEFAULT_ADMIN_ID, "users": []}

    calls = []
    state = {"db": dict(initial_db), "sha": "sha-initial"}

    class _Resp:
        def __init__(self, status_code=200, payload=None, text=""):
            self.status_code = status_code
            self.ok = 200 <= status_code < 300
            self._payload = payload if payload is not None else {}
            self.text = text

        def json(self):
            return self._payload

        def raise_for_status(self):
            if not self.ok:
                raise RuntimeError(f"HTTP {self.status_code}")

    def _get(url, *a, **kw):
        calls.append(("GET", url, kw))
        if "/contents/" in url and "users.json" in url:
            raw = json.dumps(state["db"]).encode("utf-8")
            return _Resp(
                200,
                {
                    "content": base64.b64encode(raw).decode("ascii"),
                    "sha": state["sha"],
                },
            )
        return _Resp(200, {})

    def _post(url, *a, **kw):
        calls.append(("POST", url, kw))
        return _Resp(201, {})

    def _put(url, *a, **kw):
        calls.append(("PUT", url, kw))
        if "/contents/" in url and "users.json" in url:
            body = kw.get("json", {})
            new_raw = base64.b64decode(body["content"]).decode("utf-8")
            state["db"] = json.loads(new_raw)
            state["sha"] = "sha-next"
        return _Resp(200, {})

    def _patch(url, *a, **kw):
        calls.append(("PATCH", url, kw))
        return _Resp(200, {})

    import requests

    monkeypatch.setattr(requests, "get", _get)
    monkeypatch.setattr(requests, "post", _post)
    monkeypatch.setattr(requests, "put", _put)
    monkeypatch.setattr(requests, "patch", _patch)
    return calls, state


def _set_issue_env(
    monkeypatch,
    *,
    number=42,
    author=VALID_LOGIN,
    author_id=VALID_ID,
    body=None,
):
    monkeypatch.setenv("GITHUB_TOKEN", "fake")
    monkeypatch.setenv("GH_REPOSITORY", "AndreasKaratzas/vllm-ci-dashboard")
    monkeypatch.setenv("ISSUE_NUMBER", str(number))
    monkeypatch.setenv("ISSUE_AUTHOR", author)
    monkeypatch.setenv("ISSUE_AUTHOR_ID", str(author_id))
    monkeypatch.setenv("ISSUE_BODY", body if body is not None else _build_body())
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("RESEND_FROM", raising=False)
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)


class TestRun:
    def test_happy_path_appends_user_and_commits(self, monkeypatch):
        calls, state = _stub_requests(monkeypatch)
        _set_issue_env(monkeypatch)
        rc = ps.run()
        assert rc == 0

        # No PATCH to close the issue.
        assert not any(c[0] == "PATCH" for c in calls)
        assert not any(
            c[2].get("json", {}).get("state") == "closed" for c in calls
        )

        # Exactly one PUT against contents/users.json.
        puts = [c for c in calls if c[0] == "PUT" and "users.json" in c[1]]
        assert len(puts) == 1

        # Committed db contains our user with the three fields only.
        users = state["db"]["users"]
        assert len(users) == 1
        entry = users[0]
        assert entry == {
            "github_id": VALID_ID,
            "email": VALID_EMAIL,
            "requested_at": "2026-04-18T10:00:00Z",
        }

        # Comment + label posted.
        posted = [c[1] for c in calls if c[0] == "POST"]
        assert any("/comments" in u for u in posted)
        assert any("/labels" in u for u in posted)

    def test_idempotent_retry_replaces_existing_entry(self, monkeypatch):
        # A prior signup for this github_id exists with an old email —
        # a retry should drop the old row and insert the new one.
        initial = {
            "admin_id": ps.DEFAULT_ADMIN_ID,
            "users": [
                {
                    "github_id": VALID_ID,
                    "email": "old@example.com",
                    "requested_at": "2026-01-01T00:00:00Z",
                },
            ],
        }
        calls, state = _stub_requests(monkeypatch, initial_db=initial)
        _set_issue_env(monkeypatch)
        assert ps.run() == 0
        users = state["db"]["users"]
        assert len(users) == 1
        assert users[0]["email"] == VALID_EMAIL

    def test_preserves_admin_id_and_other_users(self, monkeypatch):
        other = {
            "github_id": 111,
            "email": "other@example.com",
            "requested_at": "2026-02-02T00:00:00Z",
        }
        initial = {"admin_id": 42451412, "users": [other]}
        _, state = _stub_requests(monkeypatch, initial_db=initial)
        _set_issue_env(monkeypatch)
        assert ps.run() == 0
        assert state["db"]["admin_id"] == 42451412
        ids = sorted(u["github_id"] for u in state["db"]["users"])
        assert ids == [111, VALID_ID]

    def test_bad_body_rejects_without_commit(self, monkeypatch):
        calls, state = _stub_requests(monkeypatch)
        _set_issue_env(monkeypatch, body="no json block here")
        rc = ps.run()
        assert rc == 0
        # No PUT, no closing.
        assert not any(c[0] == "PUT" for c in calls)
        assert not any(
            c[2].get("json", {}).get("state") == "closed" for c in calls
        )
        assert state["db"]["users"] == []

    def test_invalid_issue_number_returns_error(self, monkeypatch):
        _stub_requests(monkeypatch)
        monkeypatch.setenv("ISSUE_NUMBER", "not-a-number")
        monkeypatch.setenv("ISSUE_AUTHOR", VALID_LOGIN)
        monkeypatch.setenv("ISSUE_AUTHOR_ID", str(VALID_ID))
        monkeypatch.setenv("ISSUE_BODY", _build_body())
        monkeypatch.setenv("GITHUB_TOKEN", "fake")
        monkeypatch.setenv("GH_REPOSITORY", "x/y")
        assert ps.run() == 1

    def test_invalid_issue_author_id_returns_error(self, monkeypatch):
        _stub_requests(monkeypatch)
        _set_issue_env(monkeypatch)
        monkeypatch.setenv("ISSUE_AUTHOR_ID", "not-a-number")
        assert ps.run() == 1

    def test_run_never_patches_issue_state(self, monkeypatch):
        calls, _ = _stub_requests(monkeypatch)
        _set_issue_env(monkeypatch)
        ps.run()
        _set_issue_env(monkeypatch, body="garbage")
        ps.run()
        assert all(
            "state" not in c[2].get("json", {}) for c in calls
        )


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

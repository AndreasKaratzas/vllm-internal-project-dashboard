#!/usr/bin/env python3
"""React to a user signup-request issue.

Invoked from ``.github/workflows/user-signup.yml`` when someone opens an
issue labeled ``signup-request`` via the dashboard entry gate.

The issue body is an **audit record only** — it carries ``github_login``,
``email`` and ``requested_at`` and nothing else. The actual user entry
(salt + iterations + password_hash) is committed directly to
``data/users.json`` by the signing-up browser via the Contents API; this
workflow does NOT write to ``data/users.json``.

Responsibilities:
    * Verify the issue author matches the claimed GitHub login
      (anti-spoof — GitHub itself guarantees the issue author).
    * Apply the ``signup-processed`` or ``signup-rejected`` label + post
      an acknowledgement comment.
    * Optionally email the user / admin if Resend is configured.
    * **Never** auto-close the issue — the admin may want to review it,
      add context, or close manually once triage is done.

Environment:
    GITHUB_TOKEN     GITHUB_TOKEN injected by Actions; used to comment +
                     label the issue. No write to repo contents.
    GH_REPOSITORY    owner/name of the dashboard repo.
    ISSUE_NUMBER     integer, the issue we're processing.
    ISSUE_AUTHOR     github login of the issue author (anti-spoof check).
    ISSUE_BODY       raw issue body; parse the ```json``` block from it.
    RESEND_API_KEY   optional — if set, send notification emails via Resend.
    RESEND_FROM      optional — "Name <addr@domain>" sender for Resend.
    ADMIN_EMAIL      optional — admin address (copy on each signup).
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys

import requests

GH_API = "https://api.github.com"
RESEND_API = "https://api.resend.com/emails"

log = logging.getLogger("process_signup")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


LOGIN_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-]{0,38}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
JSON_BLOCK_RE = re.compile(r"```json\s*(\{.*?\})\s*```", re.DOTALL)


def _gh_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _comment_and_label(
    token: str, repo: str, number: int, comment: str, label: str
) -> None:
    """Comment + label an issue. Never closes it — the admin may want to
    review or add notes, and auto-closing an audit record is noise."""
    if not token:
        log.warning("No GITHUB_TOKEN; skipping issue mutations")
        return
    h = _gh_headers(token)
    requests.post(
        f"{GH_API}/repos/{repo}/issues/{number}/comments",
        headers=h, json={"body": comment}, timeout=20,
    )
    requests.post(
        f"{GH_API}/repos/{repo}/issues/{number}/labels",
        headers=h, json={"labels": [label]}, timeout=20,
    )


def parse_signup_body(body: str) -> dict | None:
    """Extract + validate the audit JSON block from a signup-request body.

    Returns ``None`` if the block is missing/invalid. On success returns
    the three public fields: ``github_login``, ``email``, ``requested_at``.

    This intentionally does NOT accept salt / iterations / password_hash —
    those live only in ``data/users.json`` (committed directly by the
    browser via the Contents API) and would be out of place in a public
    issue body.
    """
    if not body:
        return None
    m = JSON_BLOCK_RE.search(body)
    if not m:
        return None
    try:
        raw = json.loads(m.group(1))
    except json.JSONDecodeError:
        return None
    if not isinstance(raw, dict):
        return None

    required = ("github_login", "email")
    for k in required:
        if k not in raw:
            return None

    login = str(raw["github_login"]).strip()
    email = str(raw["email"]).strip().lower()

    if not LOGIN_RE.match(login):
        return None
    if not EMAIL_RE.match(email):
        return None

    return {
        "github_login": login,
        "email": email,
        "requested_at": str(raw.get("requested_at", "")).strip(),
    }


def send_email(to_addr: str, subject: str, html: str) -> bool:
    api_key = os.getenv("RESEND_API_KEY")
    sender = os.getenv("RESEND_FROM")
    if not api_key or not sender or not to_addr:
        return False
    try:
        r = requests.post(
            RESEND_API,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={"from": sender, "to": [to_addr], "subject": subject, "html": html},
            timeout=15,
        )
        if r.status_code >= 300:
            log.warning("Resend failed (%s): %s", r.status_code, r.text[:160])
            return False
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("Resend exception: %s", e)
        return False


def run() -> int:
    token = os.getenv("GITHUB_TOKEN", "")
    repo = os.getenv("GH_REPOSITORY", "")
    number_raw = os.getenv("ISSUE_NUMBER", "").strip()
    author = os.getenv("ISSUE_AUTHOR", "").strip()
    body = os.getenv("ISSUE_BODY", "")

    try:
        number = int(number_raw)
    except ValueError:
        log.error("Bad ISSUE_NUMBER: %r", number_raw)
        return 1

    parsed = parse_signup_body(body)
    if parsed is None:
        log.error("Could not parse signup JSON block")
        _comment_and_label(
            token, repo, number,
            ":x: Could not parse the signup JSON block. If you submitted this "
            "by hand, use the dashboard entry gate instead.",
            "signup-rejected",
        )
        return 0

    # Anti-spoof: the GitHub-authenticated issue author must match the login
    # they're claiming. This is the entire trust anchor — it's enforced by
    # GitHub itself, not by us.
    if author.lower() != parsed["github_login"].lower():
        log.error(
            "Login mismatch: issue author=%r vs claimed login=%r", author, parsed["github_login"]
        )
        _comment_and_label(
            token, repo, number,
            f":x: Rejected — issue author `@{author}` does not match the "
            f"claimed login `{parsed['github_login']}`. Sign up from your own "
            "GitHub account via the dashboard entry gate.",
            "signup-rejected",
        )
        return 0

    log.info("Signup acknowledged: login=%s email=%s", parsed["github_login"], parsed["email"])

    # Emails are best-effort side effects — never block the workflow on a
    # missing API key. The UI no longer promises email delivery, so the
    # user never sees an expectation we can't meet.
    admin_email = os.getenv("ADMIN_EMAIL", "").strip()
    admin_subject = f"[dashboard] signup: {parsed['github_login']}"
    admin_html = (
        f"<p>Signup-request issue "
        f"#{number} on <code>{repo}</code>.</p>"
        f"<ul>"
        f"<li>Login: <code>{parsed['github_login']}</code></li>"
        f"<li>Email: <code>{parsed['email']}</code></li>"
        f"<li>Requested at: <code>{parsed['requested_at']}</code></li>"
        f"</ul>"
    )
    send_email(admin_email, admin_subject, admin_html) if admin_email else False

    _comment_and_label(
        token, repo, number,
        f":white_check_mark: Signup acknowledged for @{parsed['github_login']}. "
        "The user entry is committed directly to `data/users.json` by the "
        "signing-up browser; this issue stays open as an audit record for "
        "the admin to review.",
        "signup-processed",
    )
    return 0


if __name__ == "__main__":
    sys.exit(run())

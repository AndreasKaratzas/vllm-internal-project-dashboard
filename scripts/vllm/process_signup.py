#!/usr/bin/env python3
"""React to a user signup-request issue and append to the allowlist.

Invoked from ``.github/workflows/user-signup.yml`` when a dashboard visitor
opens an issue labeled ``signup-request`` via the entry gate.

The issue body is an **audit record**::

    ```json
    {"email": "user@example.com", "requested_at": "2026-04-18T..."}
    ```

GitHub itself authenticates the issue author, so we trust ``github.event.issue.user``
for identity. This workflow:

    * Parses the JSON block for ``email`` + ``requested_at``.
    * Rejects if the label was applied by someone other than the issue
      author (stops a drive-by labeler from elevating a random issue).
    * Commits a new ``data/users.json`` to main via the Contents API with
      an entry ``{github_id, email, requested_at}`` — ``github_id`` and
      ``github_login`` both come from ``github.event.issue.user``, which
      is authoritative.
    * Labels + comments on the issue. Never auto-closes — admin reviews
      manually.

The old flow (PBKDF2 password hash committed by the browser) is gone. No
salt, no iteration count, no password material touches this workflow.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import sys

import requests

GH_API = "https://api.github.com"
RESEND_API = "https://api.resend.com/emails"
USERS_PATH = "data/users.json"
DEFAULT_ADMIN_ID = 42451412  # @AndreasKaratzas; falls back if users.json has no admin_id

log = logging.getLogger("process_signup")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


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

    Returns ``None`` if the block is missing or invalid. On success returns
    ``{"email": str, "requested_at": str}`` — only the two user-supplied
    audit fields. Identity (``github_id`` / ``github_login``) is pulled
    from ``github.event.issue.user``, not from the body.
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
    if "email" not in raw:
        return None

    email = str(raw["email"]).strip().lower()
    if not EMAIL_RE.match(email):
        return None

    return {
        "email": email,
        "requested_at": str(raw.get("requested_at", "")).strip(),
    }


def _load_users_json(token: str, repo: str) -> tuple[dict, str]:
    """Return (db, sha) for the current users.json on main."""
    r = requests.get(
        f"{GH_API}/repos/{repo}/contents/{USERS_PATH}?ref=main",
        headers=_gh_headers(token),
        timeout=20,
    )
    r.raise_for_status()
    meta = r.json()
    raw = base64.b64decode(meta.get("content", "").replace("\n", "")).decode("utf-8")
    try:
        db = json.loads(raw)
    except json.JSONDecodeError:
        db = {}
    if not isinstance(db, dict):
        db = {}
    db.setdefault("admin_id", DEFAULT_ADMIN_ID)
    if not isinstance(db.get("users"), list):
        db["users"] = []
    return db, meta["sha"]


def _put_users_json(token: str, repo: str, db: dict, sha: str, message: str) -> None:
    payload = json.dumps(db, indent=2) + "\n"
    body = {
        "message": message,
        "content": base64.b64encode(payload.encode("utf-8")).decode("ascii"),
        "sha": sha,
        "branch": "main",
    }
    r = requests.put(
        f"{GH_API}/repos/{repo}/contents/{USERS_PATH}",
        headers=_gh_headers(token),
        json=body,
        timeout=30,
    )
    r.raise_for_status()


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
    author_login = os.getenv("ISSUE_AUTHOR", "").strip()
    author_id_raw = os.getenv("ISSUE_AUTHOR_ID", "").strip()
    body = os.getenv("ISSUE_BODY", "")

    try:
        number = int(number_raw)
    except ValueError:
        log.error("Bad ISSUE_NUMBER: %r", number_raw)
        return 1
    try:
        author_id = int(author_id_raw)
    except ValueError:
        log.error("Bad ISSUE_AUTHOR_ID: %r", author_id_raw)
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

    log.info(
        "Signup acknowledged: login=%s id=%d email=%s", author_login, author_id, parsed["email"]
    )

    # Read, mutate, and commit users.json. Filter out any existing entry for
    # this id so the signup is idempotent — a user retrying signup gets their
    # email updated rather than a duplicate row.
    try:
        db, sha = _load_users_json(token, repo)
    except Exception as e:  # noqa: BLE001
        log.error("Failed to read %s: %s", USERS_PATH, e)
        _comment_and_label(
            token, repo, number,
            f":x: Could not read `{USERS_PATH}` (workflow error). Admin will retry.",
            "signup-rejected",
        )
        return 1

    db["users"] = [u for u in db["users"] if int(u.get("github_id", 0)) != author_id]
    db["users"].append({
        "github_id": author_id,
        "email": parsed["email"],
        "requested_at": parsed["requested_at"],
    })
    db["users"].sort(key=lambda u: int(u.get("github_id", 0)))

    try:
        _put_users_json(token, repo, db, sha, f"signup: add @{author_login} (#{number})")
    except Exception as e:  # noqa: BLE001
        log.error("Failed to commit %s: %s", USERS_PATH, e)
        _comment_and_label(
            token, repo, number,
            f":x: Could not commit to `{USERS_PATH}`. Check workflow permissions "
            "(`contents: write`) and branch protection.",
            "signup-rejected",
        )
        return 1

    admin_email = os.getenv("ADMIN_EMAIL", "").strip()
    if admin_email:
        send_email(
            admin_email,
            f"[dashboard] signup: {author_login}",
            (
                f"<p>Signup-request issue #{number} on <code>{repo}</code>.</p>"
                f"<ul>"
                f"<li>Login: <code>{author_login}</code></li>"
                f"<li>Id: <code>{author_id}</code></li>"
                f"<li>Email: <code>{parsed['email']}</code></li>"
                f"<li>Requested at: <code>{parsed['requested_at']}</code></li>"
                f"</ul>"
            ),
        )

    _comment_and_label(
        token, repo, number,
        (
            f":white_check_mark: Signup processed for @{author_login} "
            f"(id={author_id}). You've been added to `{USERS_PATH}` on main; "
            "sign in on the dashboard with a fresh PAT. This issue stays open "
            "as an audit record."
        ),
        "signup-processed",
    )
    return 0


if __name__ == "__main__":
    sys.exit(run())

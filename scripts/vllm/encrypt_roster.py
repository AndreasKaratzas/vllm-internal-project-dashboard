#!/usr/bin/env python3
"""Encrypt the engineer roster with the admin's vault key.

Run this locally (never in CI) whenever ``ENGINEERS`` changes in
``scripts/vllm/engineers.py``. The output at
``data/vllm/ci/engineers.enc.json`` is an AES-GCM ciphertext that only the
admin's browser can decrypt — via ``docs/assets/js/token-vault.js`` after
the admin signs in and unlocks the vault with their password.

Why we go through this dance
----------------------------
The dashboard is served publicly on gh-pages. ``ready_tickets.json`` used
to embed the roster verbatim ``{github_login, display_name}``. Even though
those fields are individually public on GitHub, the *association* — "this
is the AMD-internal vLLM triage team" — is PII we do not want to hand to
anyone who pulls the static site. The roster is only actually consumed by
the admin's assignee ``<select>``; gating it behind the admin's password
leaves non-admin viewers looking at an opaque blob they can't decrypt.

Key derivation
--------------
Matches ``_deriveWrapKey`` in token-vault.js exactly:

    wrap_key = PBKDF2(password, salt_bytes || b"|vault", iters, dklen=32)

where ``salt`` and ``iters`` come from the admin's entry in ``users.json``
(populated by the signup flow). The password itself is never stored; this
CLI prompts for it each run and verifies it by re-deriving the login hash
and comparing against ``password_hash`` in users.json — so a typo fails
fast instead of shipping undecryptable ciphertext.

Output format
-------------
Matches the record shape token-vault.js writes to sessionStorage::

    {"v": 1, "iv": <12-byte IV, hex>, "ct": <base64(ciphertext+tag)>}

WebCrypto's AES-GCM output and pyca/cryptography's ``AESGCM.encrypt`` both
emit ``ciphertext || tag`` in the same order, so the browser can decrypt
without any re-framing.
"""

from __future__ import annotations

import base64
import getpass
import hashlib
import json
import secrets
import sys
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vllm.engineers import to_dict as engineers_to_dict  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent.parent
USERS = ROOT / "data" / "users.json"
OUT = ROOT / "data" / "vllm" / "ci" / "engineers.enc.json"
ADMIN_LOGIN_DEFAULT = "AndreasKaratzas"


def _derive_wrap_key(password: str, salt_hex: str, iterations: int) -> bytes:
    # Must match docs/assets/js/token-vault.js :: _deriveWrapKey exactly,
    # otherwise the browser will fail to decrypt.
    salt = bytes.fromhex(salt_hex) + b"|vault"
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations, dklen=32)


def _derive_login_hash(password: str, salt_hex: str, iterations: int) -> str:
    # Mirrors docs/assets/js/auth.js :: derivePasswordHash — same salt, no
    # "|vault" suffix. We use it here only to verify the typed password.
    bits = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), iterations, dklen=32
    )
    return bits.hex()


def main() -> int:
    if not USERS.exists():
        print(f"users.json not found at {USERS}", file=sys.stderr)
        return 1
    db = json.loads(USERS.read_text())
    admin_login = db.get("admin") or ADMIN_LOGIN_DEFAULT
    user = next((u for u in db.get("users", []) if u.get("github_login") == admin_login), None)
    if not user:
        print(
            f"Admin {admin_login!r} has no entry in users.json — sign up via the "
            "dashboard UI first, then re-run this script.",
            file=sys.stderr,
        )
        return 2

    salt = user["salt"]
    iters = int(user["iterations"])
    pw = getpass.getpass(f"Password for @{admin_login}: ")
    if not pw:
        print("No password entered; aborting.", file=sys.stderr)
        return 3

    if _derive_login_hash(pw, salt, iters) != user["password_hash"]:
        print("Wrong password.", file=sys.stderr)
        return 4

    wrap_key = _derive_wrap_key(pw, salt, iters)
    roster = engineers_to_dict()
    plaintext = json.dumps(roster, separators=(",", ":")).encode("utf-8")
    iv = secrets.token_bytes(12)
    ct = AESGCM(wrap_key).encrypt(iv, plaintext, None)

    record = {
        "v": 1,
        "iv": iv.hex(),
        "ct": base64.b64encode(ct).decode("ascii"),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(record, indent=2) + "\n")
    print(f"Wrote encrypted roster ({len(roster)} entries) → {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

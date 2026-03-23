"""Buildkite webhook handler for triggering CI data collection.

This script can be used as a lightweight webhook endpoint that receives
Buildkite build.finished events and triggers a GitHub Actions workflow
via repository_dispatch.

Two deployment options:

Option A: GitHub Actions workflow_dispatch (recommended)
  - Configure Buildkite notification service to call GitHub API directly
  - No separate server needed

Option B: Standalone webhook receiver (for advanced setups)
  - Run this script as a small HTTP server
  - It validates Buildkite webhook signatures and triggers GitHub Actions

See README.md for Buildkite webhook configuration instructions.
"""

import hashlib
import hmac
import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

import requests

log = logging.getLogger(__name__)

# Configuration
WEBHOOK_SECRET = os.getenv("BUILDKITE_WEBHOOK_SECRET", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "AndreasKaratzas/vllm-internal-project-dashboard")
LISTEN_PORT = int(os.getenv("WEBHOOK_PORT", "8080"))

# Only process these pipelines
WATCHED_PIPELINES = {"amd-ci", "ci"}

# Only process nightly builds (by name pattern)
NIGHTLY_PATTERNS = ["nightly", "daily"]


def is_nightly_build(build: dict) -> bool:
    """Check if this build is a nightly/daily build we care about."""
    message = (build.get("message") or "").lower()
    return any(p in message for p in NIGHTLY_PATTERNS)


def trigger_github_action(pipeline_slug: str, build_number: int):
    """Trigger the CI collection GitHub Action via repository_dispatch."""
    if not GITHUB_TOKEN:
        log.error("GITHUB_TOKEN not set, cannot trigger GitHub Action")
        return False

    url = f"https://api.github.com/repos/{GITHUB_REPO}/dispatches"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    payload = {
        "event_type": "buildkite_build_finished",
        "client_payload": {
            "pipeline": pipeline_slug,
            "build_number": build_number,
        },
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        resp.raise_for_status()
        log.info(
            "Triggered GitHub Action for %s build #%d",
            pipeline_slug, build_number,
        )
        return True
    except Exception as e:
        log.error("Failed to trigger GitHub Action: %s", e)
        return False


def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify Buildkite webhook HMAC signature."""
    if not WEBHOOK_SECRET:
        log.warning("No BUILDKITE_WEBHOOK_SECRET set, skipping signature verification")
        return True

    expected = hmac.new(
        WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


class WebhookHandler(BaseHTTPRequestHandler):
    """HTTP handler for Buildkite webhook events."""

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        # Verify signature
        signature = self.headers.get("X-Buildkite-Signature", "")
        if not verify_signature(body, signature):
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b"Invalid signature")
            return

        # Parse event
        try:
            event = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Invalid JSON")
            return

        event_type = self.headers.get("X-Buildkite-Event", "")
        if event_type != "build.finished":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Ignored (not build.finished)")
            return

        build = event.get("build", {})
        pipeline = event.get("pipeline", {})
        pipeline_slug = pipeline.get("slug", "")
        build_number = build.get("number", 0)

        # Filter to watched pipelines and nightly builds
        if pipeline_slug not in WATCHED_PIPELINES:
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Ignored (unwatched pipeline)")
            return

        if not is_nightly_build(build):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Ignored (not nightly)")
            return

        log.info(
            "Received build.finished for %s #%d: %s",
            pipeline_slug, build_number, build.get("state"),
        )

        # Trigger GitHub Action
        success = trigger_github_action(pipeline_slug, build_number)

        self.send_response(200 if success else 500)
        self.end_headers()
        self.wfile.write(
            b"Triggered" if success else b"Failed to trigger"
        )

    def log_message(self, format, *args):
        log.info(format, *args)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    if not GITHUB_TOKEN:
        log.warning("GITHUB_TOKEN not set - webhook will not be able to trigger GitHub Actions")

    server = HTTPServer(("0.0.0.0", LISTEN_PORT), WebhookHandler)
    log.info("Webhook server listening on port %d", LISTEN_PORT)
    log.info("Watching pipelines: %s", WATCHED_PIPELINES)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Shutting down")
        server.shutdown()


if __name__ == "__main__":
    main()

from __future__ import annotations

import json

from vllm import backfill_ready_ticket_comments as brtc


class TestGeneratedCommentDetection:
    def test_matches_still_failing_comment(self):
        body = (
            "Still failing as of 2026-04-19. Build(s): #7806.\n\n"
            "*https://github.com/AndreasKaratzas/vllm-ci-dashboard/actions/runs/24641501904*"
        )
        assert brtc.is_generated_ready_ticket_comment(body) is True

    def test_matches_full_sync_body_comment(self):
        body = (
            "## AMD nightly — failing test group\n\n"
            "**Group:** `mi325_1: Kernels MoE Test %N`\n\n"
            "Auto-managed by `sync_ready_tickets.py`. Closed + moved to Done when this group passes.\n"
        )
        assert brtc.is_generated_ready_ticket_comment(body) is True

    def test_ignores_human_comment(self):
        assert brtc.is_generated_ready_ticket_comment("Human triage note") is False


class TestDesiredBodyLoading:
    def test_loads_issue_number_to_body_map(self, tmp_path):
        path = tmp_path / "ready_tickets.json"
        path.write_text(json.dumps({
            "tickets": [
                {"issue_number": 40212, "body": "body 40212"},
                {"issue_number": 40213, "body": "body 40213"},
                {"issue_number": None, "body": "skip"},
            ]
        }))
        assert brtc._load_desired_issue_bodies(str(path)) == {
            40212: "body 40212",
            40213: "body 40213",
        }

    def test_missing_file_is_empty(self):
        assert brtc._load_desired_issue_bodies("/no/such/file.json") == {}

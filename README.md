# Project Dashboard

Auto-updated tracking of AMD GPU ecosystem projects. Last updated: **2026-04-18 18:29 UTC**

## Overview

| Project | Role | Latest Release | Open PRs | Open Issues | Links |
|---------|------|----------------|----------|-------------|-------|
| **vllm** | watch | v0.19.1 | 68 | 89 | [repo](https://github.com/vllm-project/vllm) / [fork](https://github.com/sunway513/vllm) |

## Live Dashboard

Interactive dashboard with 4 views: **Projects**, **Test Parity**, **Activity**, and **Trends**.

Hosted on GitHub Pages — deployed automatically on every push to main.

## Signing in (request access)

The dashboard is open to guests in read-only mode. If you want to use
features that write to the repo (e.g. the Ready Tickets admin actions,
omni-triage), you need a lightweight allowlist entry. No password, no
hash — we store only your GitHub id, your email, and the request
timestamp.

Steps:

1. **Generate a fine-grained GitHub PAT** for your own account at
   https://github.com/settings/tokens?type=beta
   - *Resource owner*: your own user
   - *Repository access*: "Public repositories (read-only)" is enough
     for sign-in; add write-scoped repos only if you need to perform
     admin actions.
   - *Account permissions*: `Email addresses — Read` is nice to have
     so the UI can prefill your email. Not required.
   - Copy the `github_pat_…` token somewhere safe — GitHub only shows
     it once.
2. **Open the dashboard** → click **Sign in** → paste the PAT.
   The token is verified against `GET api.github.com/user`, then
   encrypted with AES-GCM in a local Web Crypto vault keyed by the
   PAT + your numeric GitHub id. It never leaves your browser and is
   never stored in `data/users.json` or in a repo secret.
3. **Click "Request access"** in the sign-in dialog. This opens a
   prefilled `signup-request` issue against this repo with your
   email + request timestamp. GitHub signs the issue with your real
   `user.id`, so the backend does not need to trust anything in the
   body for identity.
4. **Wait ~30 seconds.** The `user-signup` workflow validates the
   issue body, appends `{github_id, email, requested_at}` to
   `data/users.json`, labels the issue, and comments confirmation.
   The issue stays open as a review record — the admin never
   auto-closes it.
5. **Refresh the dashboard.** You are now in the allowlist and
   signed-in features unlock.

If you skip the signup, the dashboard still works in guest mode —
you just see read-only views.

Troubleshooting:

- *"Invalid token" at sign-in*: the PAT expired, was revoked, or
  you pasted something else. Regenerate at the URL above.
- *Signup issue opened but nothing happens*: check the
  `user-signup` workflow run — the issue body must contain a valid
  ```json``` block with `email` + `requested_at` (the UI writes
  this for you; don't hand-edit).
- *Lost your PAT*: generate a new one. The vault is per-device, so
  re-signing-in on a new device also requires pasting the new PAT.

## Views

| View | Description |
|------|-------------|
| **Projects** | Per-project cards with PRs, issues, releases, and weekly activity |
| **Test Parity** | ROCm vs CUDA test pass rates with CUDA parity ratio |
| **Activity** | PR velocity, CI health, CI signal time, contributor stats, issue health, release cadence |
| **Trends** | Weekly trend charts (PRs merged, open issues, contributors, TTM, CI signal, test pass rate) |

## Markdown Dashboards

- [PR Tracker](dashboards/pr-tracker.md) — all tracked PRs across projects
- [Weekly Digest](dashboards/weekly-digest.md) — weekly summary of releases, PRs, and issues

## Data Collection

Data is collected daily at 8am UTC via GitHub Actions (`daily-update.yml`).

| Script | Purpose |
|--------|---------|
| `scripts/collect.py` | PRs, issues, releases from GitHub API |
| `scripts/collect_tests.py` | ROCm/CUDA test results from CI artifacts (JUnit XML + job-level) |
| `scripts/collect_activity.py` | PR velocity, CI health, contributor stats, issue health |
| `scripts/snapshot.py` | Weekly trend snapshots for historical charts |
| `scripts/render.py` | Generate markdown dashboards and site data |

To run manually:

```bash
pip install pyyaml
python scripts/collect.py
python scripts/collect_tests.py
python scripts/collect_activity.py
python scripts/snapshot.py
python scripts/render.py
```

Configure tracked projects in [`config/projects.yaml`](config/projects.yaml).

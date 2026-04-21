# Project Dashboard

Auto-updated tracking of AMD GPU ecosystem projects. Last updated: **2026-04-21 04:46 UTC**

## Overview

| Project | Role | Latest Release | Open PRs | Open Issues | Links |
|---------|------|----------------|----------|-------------|-------|
| **vllm** | watch | v0.19.1 | 5 | 85 | [repo](https://github.com/vllm-project/vllm) / [fork](https://github.com/sunway513/vllm) |

## Live Dashboard

Interactive dashboard with 4 views: **Projects**, **Test Parity**, **Activity**, and **Trends**.

Hosted on GitHub Pages — deployed automatically on every push to main.

## Dashboard Access

Dashboard access is managed manually by the repository owner.

### For the requester

Send the owner:

- GitHub login
- GitHub profile URL
- Work email
- Short reason they need access

Example request:

```text
GitHub login: AndreasKaratzas
GitHub profile URL: https://github.com/AndreasKaratzas
Work email: akaratza@amd.com
Reason: Need dashboard access for CI triage and Buildkite actions.
```

After the owner confirms you were added, generate a GitHub PAT and sign in to
the dashboard with that PAT. Never send your PAT to the owner.

### For the admin / owner

When someone requests access:

1. Resolve their numeric GitHub id.
2. Add them to [`data/users.json`](data/users.json).
3. Commit and push that change to `main`.
4. Tell them to generate a GitHub PAT and sign in to the dashboard.

Example entry:

```json
{
  "github_id": 12345678,
  "email": "user@amd.com",
  "requested_at": "2026-04-21T05:10:00Z"
}
```

Example command to resolve the numeric GitHub id:

```bash
gh api users/<github-login> --jq .id
```

Important notes:

- Requesters should never send you their PAT.
- Being on the dashboard allowlist is separate from being a GitHub repo collaborator.
- The admin account is the numeric `admin_id` in [`data/users.json`](data/users.json).
- Legacy/manual signup issues may still appear in the Admin tab, but the
  normal path is the manual allowlist update above.

## Site Layout

- `docs/` — static shell assets (HTML, CSS, JS)
- `data/` — published JSON payloads fetched by the shell at runtime, including `data/site/projects.json`
- `scripts/build_site.py` — assembles `docs/` + `data/` into `_site/` for Pages deploys

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

## Local development (Nix)

A Nix flake pins Python, Node, and every CLI the collectors / linters
need, so you do not have to manage a venv or a global `npm i -g`.

```bash
# One-time: enable flakes + nix-command if you haven't already.
nix develop            # or: direnv allow  (with .envrc)
```

The default `devShells.default` (`dashboard`) gives you Python 3.12
(`uv`-managed), Node 22, `prettier`, `cspell`, `gh`, `git-lfs`, `jq`,
`yq-go`, `shellcheck`, `yamllint`, `actionlint`, and `act` for running
workflows locally. The shell hook wires up shortcut functions:

| Function | What it does |
|----------|--------------|
| `dash-collect` | Run the full collector pipeline (`collect.py`, `collect_tests.py`, `collect_activity.py`, `snapshot.py`) |
| `dash-render` | Regenerate `data/site/projects.json` and markdown dashboards |
| `dash-test` | Run the pytest suite |
| `dash-clean` | Remove generated artifacts (`_site/`, caches) |
| `dash-lint-js` / `dash-fmt-js` | `cspell` + `prettier` over `docs/assets/js` |
| `dash-lint-workflows` | `actionlint` + `yamllint` over `.github/workflows` |
| `dash-lint-shell` | `shellcheck` over tracked shell scripts |
| `dash-lint-spell` | `cspell` over docs, scripts, tests, and workflows |

For a minimal shell with only Python + the collector deps, use
`nix develop .#minimal`.

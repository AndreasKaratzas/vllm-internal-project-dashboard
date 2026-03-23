# Project Dashboard

Auto-updated tracking of AMD GPU ecosystem projects.

**Live Dashboard:** [andreaskaratzas.github.io/vllm-internal-project-dashboard](https://andreaskaratzas.github.io/vllm-internal-project-dashboard/)

## Overview

| Project | Role | Latest Release | Open PRs | Open Issues | Links |
|---------|------|----------------|----------|-------------|-------|
| **llvm** | watch | llvmorg-22.1.1 | 30 | 30 | [repo](https://github.com/llvm/llvm-project) |
| **pytorch** | watch | v2.10.0 | 52 | 51 | [repo](https://github.com/pytorch/pytorch) |
| **jax** | watch | jax-v0.9.2 | 11 | 33 | [repo](https://github.com/jax-ml/jax) |
| **vllm** | watch | v0.18.0 | 75 | 57 | [repo](https://github.com/vllm-project/vllm) / [fork](https://github.com/sunway513/vllm) |
| **sglang** | watch | v0.5.9 | 65 | 1 | [repo](https://github.com/sgl-project/sglang) |
| **xla** | watch | - | 3 | - | [repo](https://github.com/openxla/xla) |
| **triton** | watch | v3.6.0 | - | - | [repo](https://github.com/triton-lang/triton) |
| **migraphx** | dev | rocm-7.2.0 | 84 | 238 | [repo](https://github.com/ROCm/AMDMIGraphX) |
| **aiter** | dev | v0.1.9 | 178 | 131 | [repo](https://github.com/ROCm/aiter) / [fork](https://github.com/sunway513/aiter) |
| **atom** | dev | - | 42 | 18 | [repo](https://github.com/ROCm/ATOM) / [fork](https://github.com/sunway513/ATOM) |
| **mori** | dev | - | 10 | 11 | [repo](https://github.com/ROCm/mori) / [fork](https://github.com/sunway513/mori) |
| **flydsl** | dev | exp_i8smooth_v0.1 | 13 | 16 | [repo](https://github.com/ROCm/FlyDSL) / [fork](https://github.com/sunway513/FlyDSL) |

## Live Dashboard

Interactive dashboard with sidebar navigation and multiple views.

**Hosted on GitHub Pages** — deployed automatically every hour.

### Views

| View | Description |
|------|-------------|
| **Projects** | Per-project cards with PRs, issues, releases, and weekly activity |
| **Test Parity** | ROCm vs CUDA/Upstream test pass rates with parity analysis |
| **Activity** | PR velocity, CI health, CI signal time, contributor stats, issue health, release cadence |
| **Trends** | Weekly trend charts (PRs merged, open issues, contributors, TTM, CI signal, test pass rate) |
| **Builds** | Dependency graph, build times, and target tracking |

### vLLM CI Views

| View | Description |
|------|-------------|
| **CI Health** | AMD pass rate, hardware breakdown (MI250/MI325/MI355), test area heatmap, grouped parity analysis, flaky tests, top offenders, config parity, engineer activity |
| **CI Analytics** | Side-by-side pipeline comparison (AMD CI vs Upstream CI), failure rankings, duration rankings, queue wait time comparison (AMD queues vs Other agents) |
| **Queue Monitor** | Real-time queue time-series chart with per-queue toggles, interval selector, waiting/running metrics |

### Tools

| View | Description |
|------|-------------|
| **AI Op Coverage** | Operator coverage matrix across AMD and NVIDIA backends |

## Data Collection

Data is collected and deployed via GitHub Actions workflows:

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `daily-update.yml` | Hourly (:45) | Collects GitHub data with min-frequency guard, always deploys site |
| `ci-collect.yml` | Daily (1 PM UTC) + webhook | Collects vLLM CI nightly build data from Buildkite |
| `queue-monitor.yml` | Hourly (:15) | Collects Buildkite queue snapshots for time-series charts |

### Min-frequency logic

The hourly update workflow checks data freshness before running expensive GitHub API calls. If data was collected less than 1 hour ago, it skips collection but still deploys the site (picking up queue snapshots and CI data committed by other workflows). This ensures the live site is always current without wasting API quota.

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/collect.py` | PRs, issues, releases from GitHub API |
| `scripts/collect_tests.py` | ROCm/CUDA test results from CI artifacts |
| `scripts/collect_activity.py` | PR velocity, CI health, contributor stats |
| `scripts/collect_build_times.py` | Build time tracking and targets |
| `scripts/collect_ci.py` | vLLM Buildkite CI data (nightly builds, test results, parity) |
| `scripts/vllm/collect_queue_snapshot.py` | Buildkite queue snapshot for time-series |
| `scripts/vllm/collect_analytics.py` | CI analytics (failure/duration rankings, queue stats) |
| `scripts/vllm/collect_activity.py` | Engineer activity profiles and PR scoring |
| `scripts/vllm/config_parity.py` | AMD vs NVIDIA config comparison |
| `scripts/snapshot.py` | Weekly trend snapshots for historical charts |
| `scripts/render.py` | Generate markdown dashboards and site data |

### Secrets

| Secret | Required by | Purpose |
|--------|-------------|---------|
| `GITHUB_TOKEN` | All workflows | GitHub API access (auto-provided) |
| `BUILDKITE_TOKEN` | `ci-collect.yml`, `queue-monitor.yml`, `daily-update.yml` | Buildkite API access for CI data |

### Manual run

```bash
pip install pyyaml requests
python scripts/collect.py
python scripts/collect_tests.py
python scripts/collect_activity.py
python scripts/snapshot.py
python scripts/render.py
```

Configure tracked projects in [`config/projects.yaml`](config/projects.yaml).

## Markdown Dashboards

- [PR Tracker](dashboards/pr-tracker.md) — all tracked PRs across projects
- [Weekly Digest](dashboards/weekly-digest.md) — weekly summary of releases, PRs, and issues

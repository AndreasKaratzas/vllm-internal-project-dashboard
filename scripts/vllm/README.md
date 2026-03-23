# vLLM Dashboard Scripts

Additional data collection scripts specific to the vLLM CI dashboard.

## Scripts

| Script | Purpose | Trigger |
|--------|---------|---------|
| `collect_queue_snapshot.py` | Captures Buildkite queue state (waiting/running jobs per queue) | Hourly via `queue-monitor.yml` |
| `collect_analytics.py` | Builds failure rankings, duration rankings, queue wait stats | Part of `collect_ci.py` |
| `collect_activity.py` | Engineer activity profiles and contribution scoring | Part of `daily-update.yml` |
| `config_parity.py` | Compares AMD vs NVIDIA CI config (commands, test lists) | Part of `collect_ci.py` |
| `pr_scoring.py` | Scores PRs by importance (area, size, impact) | Part of `daily-update.yml` |
| `pipelines.py` | Pipeline definitions (slug, name patterns, build filters) | Imported by other scripts |

## Environment

All scripts read the `BUILDKITE_TOKEN` from environment variables. This is managed via GitHub Actions encrypted secrets — never hardcode tokens in source files.

## Data Flow

```
Buildkite API
    |
    v
collect_queue_snapshot.py --> data/vllm/ci/queue_timeseries.jsonl
collect_analytics.py      --> data/vllm/ci/analytics.json
collect_activity.py       --> data/vllm/engineer_activity.json
config_parity.py          --> data/vllm/ci/config_parity.json
pr_scoring.py             --> data/vllm/pr_scores.json
```

These JSON files are then copied to `docs/data/vllm/` and deployed to GitHub Pages.

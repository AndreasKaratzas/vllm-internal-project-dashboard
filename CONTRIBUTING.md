# Contributing to Project Dashboard

This repo is the **source of truth** for AMD GPU ecosystem test data. Team members contribute test results and parity data via pull requests, which feed the live dashboard and downstream team dashboards.

## How Data Gets Into the Dashboard

There are three data paths — know which one applies to your contribution:

| Path | How it works | What you submit |
|------|-------------|-----------------|
| **Automated** | `collect_tests.py` pulls from GitHub Actions CI | Nothing — runs daily at 8am UTC |
| **Parity CSV** | `collect_parity.py` parses CSV into JSON | Parity CSV or the generated JSON |
| **Manual override** | `config/test_results_manual.yaml` | YAML entries with test summaries |

### Automated Projects (no PR needed for data)

These projects have their test results collected automatically from GitHub Actions:

| Project | ROCm Workflow | CUDA Workflow | Data Level |
|---------|--------------|---------------|------------|
| pytorch | `rocm-mi300` | `trunk` | Test-level (JUnit XML) |
| sglang | `Nightly Test (AMD)` | `PR Test` | Job-level |
| triton | `Integration Tests` (AMD filter) | `Integration Tests` (NVIDIA filter) | Job-level |
| jax | `CI - Bazel ROCm tests` | `CI - Bazel H100 and B200 CUDA tests` | Job-level |
| xla | `CI ROCm` | `CI` (GPU L4 filter) | Job-level |
| transformer_engine | `TransformerEngine CI` | — (ROCm only) | Job-level |

If you need to fix or override automated results, use the manual override path below.

### Path 1: PyTorch Parity Data (PR required)

This is the primary contribution path for the team. Submit unit test parity results from the `frameworks-internal` parity suite.

**Steps:**

1. Run `frameworks-internal/pytorch-unit-test-scripts/parity.sh` to produce `all_tests_status.csv`
2. Run the parser:
   ```bash
   python3 scripts/collect_parity.py \
       --csv /path/to/all_tests_status.csv \
       --sha <pytorch_commit_sha> \
       --arch mi300 \
       --date 2026-03-24
   ```
3. This generates:
   - `data/pytorch/parity_report.json` — latest snapshot (overwritten)
   - `data/pytorch/parity_history.json` — trend history (appended)
4. Commit **both** files and open a PR

**Input CSV columns** (produced by `parity.sh`):

| Column | Description |
|--------|-------------|
| `test_file` | Test file name |
| `test_class` | Test class |
| `test_name` | Test method |
| `work_flow_name` | CI workflow that ran the test |
| `skip_reason` | Why skipped (if applicable) |
| `assignee` | Person assigned to investigate |
| `comments` | Notes |
| `status_set1` | **ROCm** result: `PASSED`, `SKIPPED`, `MISSED`, or `FAILED` |
| `status_set2` | **CUDA** result: `PASSED`, `SKIPPED`, `MISSED`, or `FAILED` |

**Output metrics** (in `parity_report.json`):
- Per-workflow ROCm/CUDA test counts
- `skipped` — tests ROCm skips but CUDA doesn't
- `missed` — tests ROCm is missing but CUDA has
- `parity_pct` — `(1 - gap/total_cuda) * 100`
- Top skip reasons with counts
- ROCm vs CUDA running time totals

### Path 2: Manual Test Result Overrides (PR required)

For projects where CI data isn't accessible via GitHub API (e.g., vllm on Buildkite), add entries to `config/test_results_manual.yaml`:

```yaml
vllm:
  rocm:
    workflow_name: "ROCm Buildkite"
    run_url: "https://buildkite.com/vllm/..."
    run_date: "2026-03-24T12:00:00Z"
    conclusion: "success"
    summary:
      total_jobs: 10
      passed: 9
      failed: 1
      skipped: 0
      pass_rate: 90.0
  cuda:
    workflow_name: "CUDA Buildkite"
    run_url: "https://buildkite.com/vllm/..."
    run_date: "2026-03-24T12:00:00Z"
    conclusion: "success"
    summary:
      total_jobs: 12
      passed: 12
      failed: 0
      skipped: 0
      pass_rate: 100.0
```

### Path 3: Adding a New Project

To track a new project, edit `config/projects.yaml`:

```yaml
  newproject:
    repo: org/repo-name
    role: upstream_watch  # or active_dev
    track_authors: []
    track_labels: ["relevant-label"]
    track_keywords: [ROCm, AMD]
    keyword_scope: title
    depends_on: []
    build_workflows: []
```

To add automated test collection for the new project, you'll also need to add a workflow entry in `scripts/collect_tests.py` under `WORKFLOWS`.

## PR Workflow

1. **Branch** from `main`:
   ```bash
   git checkout -b data/<your-name>/<description>
   ```
2. **Make changes** — update data files, config, or scripts
3. **Commit** with a clear prefix:
   ```bash
   git commit -m "data: update pytorch parity for mi300 (2026-03-24)"
   ```
4. **Push and open a PR**:
   ```bash
   git push origin data/<your-name>/<description>
   ```
5. On merge → dashboard auto-deploys via GitHub Pages

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Data submission | `data/<name>/<desc>` | `data/pensun/mi300-parity-w12` |
| Script changes | `scripts/<name>/<desc>` | `scripts/ljin1/add-triton-parity` |
| Config changes | `config/<name>/<desc>` | `config/wenchen2/add-new-project` |
| Dashboard/docs | `docs/<name>/<desc>` | `docs/jnair/fix-trend-chart` |

### Commit Prefixes

- `data:` — raw data updates
- `scripts:` — collection/parsing script changes
- `config:` — project configuration
- `docs:` — dashboard UI or documentation
- `ci:` — GitHub Actions workflow changes

## Repository Structure

```
├── config/
│   ├── projects.yaml              # Tracked projects configuration
│   └── test_results_manual.yaml   # Manual test result overrides
├── data/
│   └── <project>/
│       ├── prs.json               # (automated) PRs from GitHub API
│       ├── issues.json            # (automated) Issues
│       ├── releases.json          # (automated) Releases
│       ├── activity.json          # (automated) PR velocity, contributors
│       ├── test_results.json      # (automated) ROCm vs CUDA CI pass rates
│       ├── parity_report.json     # (PR-submitted) Parity snapshot
│       └── parity_history.json    # (PR-submitted) Parity trend
├── scripts/
│   ├── collect.py                 # PRs, issues, releases (automated)
│   ├── collect_tests.py           # CI test results (automated)
│   ├── collect_activity.py        # Activity metrics (automated)
│   ├── collect_parity.py          # Parity CSV parser (manual input)
│   ├── snapshot.py                # Weekly trend snapshots
│   └── render.py                  # Generate dashboards + site data
└── docs/                          # GitHub Pages dashboard
```

## Questions?

Open an issue or reach out to the team.

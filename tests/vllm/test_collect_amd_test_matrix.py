"""Unit tests for ``scripts/vllm/collect_amd_test_matrix.py``."""

from __future__ import annotations

from vllm.collect_amd_test_matrix import (
    aggregate_state,
    build_latest_job_index,
    build_matrix,
    canonical_title,
    parse_steps,
    strip_shard_index,
)


SAMPLE_YAML = """
steps:
  - label: Kernels
    agent_pool: mi250_1
  - label: Kernels (B200-MI355)
    agent_pool: mi355_1
  - label: Distributed Tests (2 GPUs)
    agent_pool: mi250_2
  - label: Distributed Tests (2 GPUs)
    agent_pool: mi355_2
  - label: Kernels MoE Test %N
    agent_pool: mi355_1
    parallelism: 4
"""


def test_canonical_title_strips_hardware_suffix_only():
    assert canonical_title("Kernels (B200-MI355)") == "Kernels"
    assert canonical_title("LM Eval Small Models (2xB200-2xMI355)") == "LM Eval Small Models"
    assert canonical_title("Distributed Tests (2 GPUs)") == "Distributed Tests (2 GPUs)"


def test_strip_shard_index_only_for_known_bases():
    shard_bases = ["kernels moe test"]
    assert strip_shard_index("Kernels MoE Test 2", shard_bases) == "kernels moe test"
    assert strip_shard_index("Entrypoints Integration (API Server 2)", shard_bases) == (
        "entrypoints integration (api server 2)"
    )


def test_aggregate_state_prioritizes_failures():
    assert aggregate_state(["passed", "failed"]) == "failed"
    assert aggregate_state(["passed", "soft_fail"]) == "soft_fail"
    assert aggregate_state(["scheduled", "passed"]) == "scheduled"


def test_build_matrix_collapses_titles_and_matches_latest_nightly():
    steps, architectures = parse_steps(SAMPLE_YAML)
    analytics = {
        "amd-ci": {
            "builds": [
                {
                    "number": 7824,
                    "date": "2026-04-20",
                    "web_url": "https://buildkite.com/vllm/amd-ci/builds/7824",
                    "message": "AMD Full CI Run - nightly",
                    "jobs": [
                        {"name": "Kernels", "state": "passed", "q": "amd_mi250_1"},
                        {"name": "Kernels (B200-MI355)", "state": "failed", "q": "amd_mi355_1"},
                        {"name": "Distributed Tests (2 GPUs)", "state": "passed", "q": "amd_mi250_2"},
                        {"name": "Distributed Tests (2 GPUs)", "state": "passed", "q": "amd_mi355_2"},
                        {"name": "Kernels MoE Test 1", "state": "passed", "q": "amd_mi355_1"},
                        {"name": "Kernels MoE Test 2", "state": "passed", "q": "amd_mi355_1"},
                    ],
                }
            ]
        }
    }
    shard_bases = ["kernels moe test"]
    latest_job_index, latest_build = build_latest_job_index(analytics, shard_bases)
    matrix = build_matrix(
        steps=steps,
        architectures=architectures,
        latest_job_index=latest_job_index,
        latest_build=latest_build,
        shard_bases=shard_bases,
        yaml_url="https://example.invalid/test-amd.yaml",
    )

    assert [a["id"] for a in matrix["architectures"]] == ["mi250", "mi355"]
    assert matrix["summary"]["unique_groups"] == 3

    rows = {row["title"]: row for row in matrix["rows"]}
    kernels = rows["Kernels"]
    assert kernels["coverage_count"] == 2
    assert kernels["cells"]["mi250"]["latest_state"] == "passed"
    assert kernels["cells"]["mi355"]["latest_state"] == "failed"

    dist = rows["Distributed Tests (2 GPUs)"]
    assert dist["coverage_count"] == 2
    assert dist["nightly_coverage_count"] == 2

    moe = rows["Kernels MoE Test"]
    assert moe["coverage_count"] == 1
    assert moe["cells"]["mi355"]["variant_count"] == 1
    assert moe["cells"]["mi355"]["variants"][0]["latest_match_count"] == 2
    assert moe["cells"]["mi355"]["latest_state"] == "passed"

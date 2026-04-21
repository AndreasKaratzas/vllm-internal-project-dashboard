#!/usr/bin/env python3
"""Build an AMD test-group coverage matrix from upstream ``test-amd.yaml``.

The output powers the CI Analytics "AMD HW Matrix" view:

- one canonical row per unique test-group title
- one dynamic column per AMD architecture found in the YAML
- per-cell metadata about the exact YAML label(s) and the latest AMD nightly
  match, so the frontend can link each symbol to Buildkite

Usage:
    python scripts/vllm/collect_amd_test_matrix.py --output data/vllm/ci/
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import yaml


log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT = ROOT / "data" / "vllm" / "ci"
RAW_YAML_URL = (
    "https://raw.githubusercontent.com/vllm-project/vllm/"
    "refs/heads/main/.buildkite/test-amd.yaml"
)

AREA_PATTERNS = [
    ("Kernels", re.compile(r"^kernels?|attention test|quantization test", re.I)),
    ("Attention", re.compile(r"attention", re.I)),
    ("Distributed", re.compile(r"distributed|torchrun|pipeline parallel|elastic ep|eplb", re.I)),
    ("Models", re.compile(r"models? test|weight loading", re.I)),
    ("Multi-Modal", re.compile(r"multi-modal|whisper|vision|audio", re.I)),
    ("Entrypoints", re.compile(r"entrypoint|api server|openai", re.I)),
    ("Compile", re.compile(r"compile|compilation|pytorch fullgraph|fullgraph", re.I)),
    ("Engine", re.compile(r"engine|async engine|inputs, utils, worker|shutdown", re.I)),
    ("LoRA", re.compile(r"lora", re.I)),
    ("Spec Decode", re.compile(r"spec.?decode|eagle|ngram|speculator|mtp", re.I)),
    ("Evaluations", re.compile(r"lm eval|gsm8k|gpqa|accuracy eval|ppl", re.I)),
    ("Quantization", re.compile(r"quantiz|fp8|mxfp4", re.I)),
    ("Examples", re.compile(r"examples?", re.I)),
    ("Benchmarks", re.compile(r"benchmark", re.I)),
    ("V1", re.compile(r"^v1\b", re.I)),
]

MULTISPACE_RE = re.compile(r"\s+")
HW_ARCH_RE = re.compile(r"mi\d{3}", re.I)
TRAILING_PARENS_RE = re.compile(r"\s*\(([^)]*)\)\s*$")
SIMPLE_HARDWARE_PAYLOAD_RE = re.compile(r"[a-z0-9-]+", re.I)
AMD_VARIANT_TOKEN_RE = re.compile(r"mi(?:250|300|325|355)\b", re.I)


def _github_headers() -> dict[str, str]:
    headers = {}
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return default


def clean_label(label: str) -> str:
    text = (label or "").strip().strip('"').strip("'")
    return MULTISPACE_RE.sub(" ", text).strip()


def link_label(label: str) -> str:
    text = clean_label(label)
    text = re.sub(r"\s*%N\s*$", "", text)
    return MULTISPACE_RE.sub(" ", text).strip()


def canonical_title(label: str) -> str:
    text = link_label(label)
    match = TRAILING_PARENS_RE.search(text)
    if match:
        payload = match.group(1).strip()
        is_hardware = re.search(r"(mi\d+|h\d{3}|b\d{3}|gfx\d+|hw-tag)", payload, re.I)
        has_counts = re.search(r"\b\d+x", payload, re.I)
        if is_hardware and not has_counts and SIMPLE_HARDWARE_PAYLOAD_RE.fullmatch(payload):
            text = text[:match.start()].strip()
        elif is_hardware and has_counts:
            normalized_payload = AMD_VARIANT_TOKEN_RE.sub("MI", payload)
            text = f"{text[:match.start()].strip()} ({normalized_payload})"
    return MULTISPACE_RE.sub(" ", text).strip()


def classify_area(title: str) -> str:
    for area, pattern in AREA_PATTERNS:
        if pattern.search(title):
            return area
    return "Other"


def arch_from_agent_pool(agent_pool: str) -> str | None:
    pool = (agent_pool or "").strip().lower()
    if not pool:
        return None
    match = HW_ARCH_RE.search(pool)
    if not match:
        return None
    return match.group(0).lower()


def arch_from_queue(queue: str) -> str | None:
    return arch_from_agent_pool(queue)


def _normalize_job_name(name: str) -> str:
    name = re.sub(r"^(mi\d+_\d+|gpu_\d+|amd_\w+):\s*", "", name or "", flags=re.I)
    return MULTISPACE_RE.sub(" ", name).strip().lower()


def strip_shard_index(name: str, shard_bases: list[str]) -> str:
    lower = _normalize_job_name(name)
    for base in shard_bases:
        if lower.startswith(base) and lower != base:
            rest = lower[len(base):]
            if re.fullmatch(r"\s+\d+\s*", rest):
                return base
    return lower


def aggregate_state(states: list[str]) -> str | None:
    ordered = [s for s in states if s]
    if not ordered:
        return None
    priority = {
        "failed": 6,
        "timed_out": 6,
        "broken": 6,
        "soft_fail": 5,
        "running": 4,
        "scheduled": 3,
        "assigned": 3,
        "passed": 2,
        "canceled": 1,
        "skipped": 1,
    }
    return max(ordered, key=lambda s: priority.get(s, 0))


def fetch_yaml_text(url: str) -> str:
    resp = requests.get(url, headers=_github_headers(), timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_steps(yaml_text: str) -> tuple[list[dict[str, Any]], list[str]]:
    parsed = yaml.safe_load(yaml_text) or {}
    raw_steps = parsed.get("steps", []) if isinstance(parsed, dict) else []
    steps: list[dict[str, Any]] = []
    arches: set[str] = set()

    for idx, step in enumerate(raw_steps):
        if not isinstance(step, dict):
            continue
        label = clean_label(step.get("label", ""))
        arch = arch_from_agent_pool(step.get("agent_pool", ""))
        if not label or not arch:
            continue
        arches.add(arch)
        steps.append(
            {
                "label": label,
                "link_label": link_label(label),
                "title": canonical_title(label),
                "area": classify_area(canonical_title(label)),
                "arch": arch,
                "yaml_order": idx,
                "optional": bool(step.get("optional")),
                "parallelism": int(step.get("parallelism") or 1),
                "agent_pool": step.get("agent_pool", ""),
            }
        )

    arch_list = sorted(arches, key=lambda a: int(re.search(r"\d+", a).group(0)))
    return steps, arch_list


def build_latest_job_index(
    analytics: dict[str, Any],
    shard_bases: list[str],
) -> tuple[dict[str, dict[str, list[dict[str, Any]]]], dict[str, Any] | None]:
    amd = analytics.get("amd-ci", {}) if isinstance(analytics, dict) else {}
    latest_builds = amd.get("builds", []) if isinstance(amd, dict) else []
    latest_build = latest_builds[0] if latest_builds else None
    index: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))

    if not isinstance(latest_build, dict):
        return index, None

    for job in latest_build.get("jobs", []) or []:
        arch = arch_from_queue(job.get("q", ""))
        if not arch:
            continue
        key = strip_shard_index(job.get("name", ""), shard_bases)
        index[arch][key].append(job)
    return index, latest_build


def build_matrix(
    steps: list[dict[str, Any]],
    architectures: list[str],
    latest_job_index: dict[str, dict[str, list[dict[str, Any]]]],
    latest_build: dict[str, Any] | None,
    shard_bases: list[str],
    yaml_url: str,
) -> dict[str, Any]:
    rows_by_title: dict[str, dict[str, Any]] = {}

    for step in steps:
        row = rows_by_title.setdefault(
            step["title"],
            {
                "title": step["title"],
                "area": step["area"],
                "yaml_order": step["yaml_order"],
                "cells": {arch: {"exists": False} for arch in architectures},
            },
        )
        row["yaml_order"] = min(row["yaml_order"], step["yaml_order"])
        cell = row["cells"][step["arch"]]
        if not cell.get("exists"):
            cell.update(
                {
                    "exists": True,
                    "optional": False,
                    "variant_count": 0,
                    "variants": [],
                    "latest_matched": False,
                    "latest_state": None,
                    "latest_build_number": latest_build.get("number") if latest_build else None,
                }
            )
        cell["optional"] = cell["optional"] or step["optional"]
        variant_key = strip_shard_index(step["link_label"], shard_bases)
        matches = latest_job_index.get(step["arch"], {}).get(variant_key, [])
        latest_state = aggregate_state([m.get("state") for m in matches])
        variant = {
            "label": step["link_label"],
            "agent_pool": step["agent_pool"],
            "optional": step["optional"],
            "parallelism": step["parallelism"],
            "latest_matched": bool(matches),
            "latest_match_count": len(matches),
            "latest_state": latest_state,
        }
        cell["variants"].append(variant)
        cell["variant_count"] += 1

    rows = []
    for row in rows_by_title.values():
        coverage_count = 0
        nightly_coverage_count = 0
        architectures_present = []
        for arch in architectures:
            cell = row["cells"][arch]
            if not cell.get("exists"):
                continue
            coverage_count += 1
            architectures_present.append(arch)
            cell["variants"].sort(key=lambda v: (v["label"].lower(), v["agent_pool"]))
            cell["primary_label"] = cell["variants"][0]["label"]
            cell["latest_matched"] = any(v["latest_matched"] for v in cell["variants"])
            cell["latest_state"] = aggregate_state(
                [v["latest_state"] for v in cell["variants"] if v["latest_state"]]
            )
            if cell["latest_matched"]:
                nightly_coverage_count += 1
        row["coverage_count"] = coverage_count
        row["nightly_coverage_count"] = nightly_coverage_count
        row["architectures_present"] = architectures_present
        row["signature"] = " + ".join(arch.upper() for arch in architectures_present)
        rows.append(row)

    rows.sort(key=lambda row: (row["yaml_order"], row["title"].lower()))

    fully_shared = sum(1 for row in rows if row["coverage_count"] == len(architectures))
    single_arch = sum(1 for row in rows if row["coverage_count"] == 1)
    multi_variant_cells = sum(
        1
        for row in rows
        for arch in architectures
        if row["cells"][arch].get("variant_count", 0) > 1
    )

    arch_stats = []
    for arch in architectures:
        total = sum(1 for row in rows if row["cells"][arch].get("exists"))
        nightly = sum(1 for row in rows if row["cells"][arch].get("latest_matched"))
        arch_stats.append(
            {
                "id": arch,
                "label": arch.upper(),
                "group_count": total,
                "nightly_match_count": nightly,
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": {
            "yaml_url": yaml_url,
            "latest_build_number": latest_build.get("number") if latest_build else None,
            "latest_build_date": latest_build.get("date") if latest_build else None,
            "latest_build_url": latest_build.get("web_url") if latest_build else None,
            "latest_build_message": latest_build.get("message") if latest_build else None,
        },
        "summary": {
            "unique_groups": len(rows),
            "architecture_count": len(architectures),
            "fully_shared_groups": fully_shared,
            "single_arch_groups": single_arch,
            "multi_variant_cells": multi_variant_cells,
        },
        "architectures": arch_stats,
        "areas": sorted({row["area"] for row in rows}),
        "rows": rows,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect AMD test-group coverage matrix")
    parser.add_argument("--output", type=str, default=str(OUTPUT))
    parser.add_argument("--yaml-url", type=str, default=RAW_YAML_URL)
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    args = parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    analytics = _load_json(output / "analytics.json", {})
    shard_bases = _load_json(output / "shard_bases.json", [])

    log.info("Fetching AMD YAML from %s", args.yaml_url)
    yaml_text = fetch_yaml_text(args.yaml_url)
    steps, architectures = parse_steps(yaml_text)
    latest_job_index, latest_build = build_latest_job_index(analytics, shard_bases)

    matrix = build_matrix(
        steps=steps,
        architectures=architectures,
        latest_job_index=latest_job_index,
        latest_build=latest_build,
        shard_bases=shard_bases,
        yaml_url=args.yaml_url,
    )

    out_path = output / "amd_test_matrix.json"
    out_path.write_text(json.dumps(matrix, indent=2))
    log.info(
        "Wrote %s with %d groups across %d architectures",
        out_path,
        matrix["summary"]["unique_groups"],
        matrix["summary"]["architecture_count"],
    )


if __name__ == "__main__":
    main()

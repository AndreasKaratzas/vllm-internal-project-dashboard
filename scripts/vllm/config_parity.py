"""YAML config parity analysis for vLLM CI pipelines.

Compares test step definitions between:
- AMD: .buildkite/test-amd.yaml
- NVIDIA: .buildkite/test_areas/*.yaml

Uses command similarity (adapted from vllm_ci_parity.py) to measure how
closely AMD test commands match their NVIDIA counterparts.

This is a *static* analysis of the CI config files, complementing the
*runtime* parity analysis in analyzer.py which compares actual test results.
"""

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml

from ci.analyzer import _normalize_job_name, commands_similarity, similarity_color

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class ConfigStep:
    """A test step parsed from CI YAML config."""
    label: str
    normalized_label: str
    source_file: str
    group: str
    commands: list[str] = field(default_factory=list)
    timeout_in_minutes: Optional[int] = None
    num_gpus: Optional[int] = None
    parallelism: Optional[int] = None
    optional: bool = False
    soft_fail: bool = False
    grade: Optional[str] = None


@dataclass
class ConfigMatch:
    """A matched pair of AMD and NVIDIA config steps."""
    amd_step: ConfigStep
    nvidia_step: ConfigStep
    command_similarity: float
    color: str  # green/yellow/orange/red


# ---------------------------------------------------------------------------
# YAML parsing (adapted from vllm_ci_parity.py)
# ---------------------------------------------------------------------------

def _flatten_commands(raw_cmds) -> list[str]:
    """Flatten potentially nested command structures into a simple list."""
    if not raw_cmds:
        return []
    flat = []
    for c in raw_cmds:
        if isinstance(c, list):
            flat.extend(_flatten_commands(c))
        elif isinstance(c, str):
            for line in c.strip().split('\n'):
                line = line.strip()
                if line and not line.startswith('#'):
                    flat.append(line)
    return flat


def _parse_step(item: dict, source_file: str, group: str) -> ConfigStep:
    """Parse a single step dictionary into a ConfigStep."""
    label = item.get('label', 'unknown')
    cmds = item.get('commands', [])
    if 'command' in item:
        cmds = [item['command']]
    cmds = _flatten_commands(cmds)

    return ConfigStep(
        label=label,
        normalized_label=_normalize_job_name(label),
        source_file=source_file,
        group=group,
        commands=cmds,
        timeout_in_minutes=item.get('timeout_in_minutes'),
        num_gpus=item.get('num_devices') or item.get('num_gpus'),
        parallelism=item.get('parallelism'),
        optional=item.get('optional', False) or False,
        soft_fail=item.get('soft_fail', False) or False,
        grade=item.get('grade'),
    )


def parse_amd_yaml(path: Path) -> list[ConfigStep]:
    """Parse test-amd.yaml into ConfigStep list."""
    with open(path) as f:
        data = yaml.safe_load(f)
    if not data:
        return []

    steps = []
    for item in data.get('steps', []):
        agent_pool = item.get('agent_pool', '')
        if 'mi355' in agent_pool:
            group = 'mi355'
        elif 'mi325' in agent_pool:
            group = 'mi325'
        else:
            group = 'amd'
        steps.append(_parse_step(item, str(path), group))
    return steps


def parse_nvidia_yamls(directory: Path) -> tuple[list[ConfigStep], list[dict]]:
    """Parse test_areas/*.yaml. Returns (nvidia_steps, mirror_entries)."""
    nvidia_steps = []
    mirrors = []

    for yaml_file in sorted(directory.glob('*.yaml')):
        with open(yaml_file) as f:
            data = yaml.safe_load(f)
        if not data:
            continue

        group_name = data.get('group', yaml_file.stem)

        for item in data.get('steps', []):
            step = _parse_step(item, str(yaml_file), group_name)
            nvidia_steps.append(step)

            mirror = item.get('mirror')
            if mirror and isinstance(mirror, dict) and 'amd' in mirror:
                amd_cfg = mirror['amd']
                amd_cmds_raw = amd_cfg.get('commands')
                commands_overridden = amd_cmds_raw is not None

                if commands_overridden:
                    amd_cmds = _flatten_commands(amd_cmds_raw)
                else:
                    amd_cmds = list(step.commands)

                mirrors.append({
                    "nvidia_label": step.label,
                    "normalized": step.normalized_label,
                    "nvidia_commands": step.commands,
                    "amd_commands": amd_cmds,
                    "commands_overridden": commands_overridden,
                    "command_similarity": commands_similarity(step.commands, amd_cmds),
                    "source_file": str(yaml_file),
                })

    return nvidia_steps, mirrors


# ---------------------------------------------------------------------------
# Config parity report
# ---------------------------------------------------------------------------

def build_config_parity(repo_root: Path) -> dict:
    """Build a YAML config parity report.

    Args:
        repo_root: Path to the vLLM repo root (containing .buildkite/)

    Returns:
        Config parity report dict.
    """
    amd_yaml = repo_root / ".buildkite" / "test-amd.yaml"
    test_areas = repo_root / ".buildkite" / "test_areas"

    if not amd_yaml.exists():
        log.warning("AMD YAML not found: %s", amd_yaml)
        return {"error": f"AMD YAML not found: {amd_yaml}"}
    if not test_areas.exists():
        log.warning("test_areas dir not found: %s", test_areas)
        return {"error": f"test_areas dir not found: {test_areas}"}

    amd_steps = parse_amd_yaml(amd_yaml)
    nvidia_steps, mirrors = parse_nvidia_yamls(test_areas)

    # Deduplicate AMD steps (mi325 vs mi355 copies)
    seen = {}
    amd_deduped = []
    for step in amd_steps:
        if step.normalized_label not in seen:
            seen[step.normalized_label] = step
            amd_deduped.append(step)

    # Build NVIDIA lookup by normalized label
    nvidia_by_label = {}
    for step in nvidia_steps:
        if step.normalized_label not in nvidia_by_label:
            nvidia_by_label[step.normalized_label] = step

    # Match AMD to NVIDIA by normalized label
    matches = []
    amd_only = []
    matched_nvidia = set()
    mirrored_nvidia = {m["normalized"] for m in mirrors}

    for amd_step in amd_deduped:
        nv_step = nvidia_by_label.get(amd_step.normalized_label)
        if nv_step:
            sim = commands_similarity(amd_step.commands, nv_step.commands)
            matches.append(ConfigMatch(
                amd_step=amd_step,
                nvidia_step=nv_step,
                command_similarity=sim,
                color=similarity_color(sim),
            ))
            matched_nvidia.add(amd_step.normalized_label)
        else:
            amd_only.append(amd_step)

    # NVIDIA-only: not matched and not mirrored
    nvidia_only = [
        s for s in nvidia_steps
        if s.normalized_label not in matched_nvidia
        and s.normalized_label not in mirrored_nvidia
    ]

    # Also filter amd_only: remove AMD tests covered by mirrors
    amd_only = [s for s in amd_only if s.normalized_label not in mirrored_nvidia]

    # Sort matches by similarity (lowest first = most divergent)
    matches.sort(key=lambda m: m.command_similarity)

    # Compute summary metrics
    total_amd = len(amd_deduped)
    total_nvidia = len(set(s.normalized_label for s in nvidia_steps))
    match_rate = len(matches) / (len(matches) + len(amd_only)) * 100 if (len(matches) + len(amd_only)) > 0 else 0
    avg_similarity = (
        sum(m.command_similarity for m in matches) / len(matches) * 100
        if matches else 0
    )

    return {
        "summary": {
            "total_amd_steps": total_amd,
            "total_nvidia_steps": total_nvidia,
            "matched": len(matches),
            "amd_only": len(amd_only),
            "nvidia_only": len(nvidia_only),
            "mirrors": len(mirrors),
            "match_rate_pct": round(match_rate, 1),
            "avg_command_similarity_pct": round(avg_similarity, 1),
        },
        "matches": [
            {
                "amd_label": m.amd_step.label,
                "nvidia_label": m.nvidia_step.label,
                "normalized": m.amd_step.normalized_label,
                "command_similarity": round(m.command_similarity, 4),
                "color": m.color,
                "amd_source": m.amd_step.source_file,
                "nvidia_source": m.nvidia_step.source_file,
            }
            for m in matches
        ],
        "amd_only": [
            {"label": s.label, "normalized": s.normalized_label, "group": s.group}
            for s in amd_only
        ],
        "nvidia_only": [
            {"label": s.label, "normalized": s.normalized_label, "source": s.source_file}
            for s in nvidia_only
        ],
        "mirrors": [
            {
                "nvidia_label": m["nvidia_label"],
                "commands_overridden": m["commands_overridden"],
                "command_similarity": round(m["command_similarity"], 4),
                "color": similarity_color(m["command_similarity"]),
                "source_file": m["source_file"],
            }
            for m in mirrors
        ],
    }

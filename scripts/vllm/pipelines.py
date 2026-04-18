"""vLLM-specific Buildkite pipeline definitions.

This file contains the pipeline configurations specific to vLLM.
To add a new project, create a similar file under scripts/<project>/pipelines.py
with its own PIPELINES dict.
"""

# vLLM Buildkite pipelines to monitor
PIPELINES = {
    "amd": {
        "slug": "amd-ci",
        "name_pattern": r"AMD Full CI Run.*nightly",
        "branch": "main",
        "display_name": "AMD Nightly",
    },
    "upstream": {
        "slug": "ci",
        "name_pattern": r"Full CI run.*nightly",
        "branch": "main",
        "display_name": "Upstream Nightly",
    },
}

# Buildkite org for vLLM
BK_ORG = "vllm"

# Job name patterns to skip (non-test infrastructure jobs).
# These are matched as substrings of lowercased job names.
# Be specific — "pipeline" was matching "Pipeline + Context Parallelism" test group!
SKIP_JOB_PATTERNS = ("bootstrap", "docker", "build image", "upload", "pipeline upload")

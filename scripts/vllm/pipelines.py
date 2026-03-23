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
        "name_pattern": r"Full CI run.*daily",
        "branch": "main",
        "display_name": "Upstream Daily",
    },
}

# Buildkite org for vLLM
BK_ORG = "vllm"

# Job name patterns to skip (non-test infrastructure jobs)
SKIP_JOB_PATTERNS = ("bootstrap", "docker", "build image", "upload", "pipeline")

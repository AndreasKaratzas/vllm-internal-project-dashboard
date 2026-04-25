# Weekly Digest

Week of 2026-04-18 to 2026-04-25

## New Releases

- **vllm**: [v0.20.0](https://github.com/vllm-project/vllm/releases/tag/v0.20.0)
- **vllm**: [v0.19.1](https://github.com/vllm-project/vllm/releases/tag/v0.19.1)

## PRs This Week

### vllm
- Opened: [#40773](https://github.com/vllm-project/vllm/pull/40773) [ROCm] AITER fused allreduce+rmsnorm: merge PRs #37646 + #81 (@rbrugaro-amd)
- Opened: [#40763](https://github.com/vllm-project/vllm/pull/40763) [Bug] Fix GLM-5.1 running error on ROCm platform (@qli88)
- Opened: [#40770](https://github.com/vllm-project/vllm/pull/40770) [ROCm] Rename LLMM1 to vecMatMul, refactor, and fix RDNA4 co (@wjabbour)
- Merged: [#34770](https://github.com/vllm-project/vllm/pull/34770) [Build] Add Python 3.14 to supported version list. (@nascheme)

## New Issues This Week

### vllm
- [#40554](https://github.com/vllm-project/vllm/issues/40554) [AMD][CI Failure][Tracker] Static dashboard tracker for curr (@AndreasKaratzas)
- [#40807](https://github.com/vllm-project/vllm/issues/40807) [Bug]: TurboQuant KV + spec-decode + chunked-prefill crashes (@noonghunna)
- [#40802](https://github.com/vllm-project/vllm/issues/40802) [Feature]: Deepseek V4 cannot run ,Please support SM120 GPU, (@wuwenthink)
- [#40632](https://github.com/vllm-project/vllm/issues/40632) [Feature]: Support DFlash for Kimi K2.5 and Qwen3.5-27B for  (@mdavedcgpu)
- [#40728](https://github.com/vllm-project/vllm/issues/40728) [CI Failure]: mi355_1: Kernels MoE Test %N (@AndreasKaratzas)
- [#40677](https://github.com/vllm-project/vllm/issues/40677) [Bug]: Gemma-4 fails when forcing FLASHINFER attention backe (@dhayanesh)
- [#40816](https://github.com/vllm-project/vllm/issues/40816) [Bug]: Qwen3.6 streaming chat completions emit final answer  (@xy3xy3)
- [#40778](https://github.com/vllm-project/vllm/issues/40778) [Feature]: deepseek v4 support (@liudonghua123)
- [#40801](https://github.com/vllm-project/vllm/issues/40801) [Bug]: Title: DeepSeek V4 intermittently leaks DSML fragment (@Windswithyou)
- [#40791](https://github.com/vllm-project/vllm/issues/40791) [Bug]: Workspace allocation failure when combining Decode Co (@BenWongCityuCS)
- [#40699](https://github.com/vllm-project/vllm/issues/40699) [Bug]: For Qwen3.5 serise, Large benchmark gap (~10 points)  (@Katono5)
- [#40259](https://github.com/vllm-project/vllm/issues/40259) [Bug]: v0.19.1 Crash with CUDA invalid argument / Segfault w (@BenWongCityuCS)
- [#40771](https://github.com/vllm-project/vllm/issues/40771) [Bug]: AMD MI250 scheduling bug on Gemma2 (@Concurrensee)
- [#40765](https://github.com/vllm-project/vllm/issues/40765) [Bug]: runai_streamer loads both Ministral consolidated and  (@dhayanesh)
- [#40675](https://github.com/vllm-project/vllm/issues/40675) [RFC] Support Intel ARK Quantization Toolkit for AutoRound o (@Zhenzhong1)
- [#40755](https://github.com/vllm-project/vllm/issues/40755) [Model Runner V2][Bug]: The _gumbel_sample_kernel exhibits p (@lio1226)
- [#40628](https://github.com/vllm-project/vllm/issues/40628) [RFC][vLLM IR]: Batch Invariance Dispatching in vLLM IR (@ProExpertProg)
- [#40740](https://github.com/vllm-project/vllm/issues/40740) [Bug]: assert is_mixture_of_experts fails on vllm serve with (@deveringham)
- [#40587](https://github.com/vllm-project/vllm/issues/40587) [Bug]: `+rotary_embedding` error with DeepSeek-V3.2-NVFP4 (@carlyou)
- [#40716](https://github.com/vllm-project/vllm/issues/40716) [Bug]: The size of tensor a (34) must match the size of tens (@ir1ka)
- [#40696](https://github.com/vllm-project/vllm/issues/40696) [Feature]: Prefix caching completely ineffective for Mamba-h (@Gaodzlearn)
- [#40301](https://github.com/vllm-project/vllm/issues/40301) [Bug]: Triton MXFP4 MoE device capability check < (11, 0) br (@kyuz0)
- [#40345](https://github.com/vllm-project/vllm/issues/40345) [Bug]: MTP draft head TP allgather deadlock under sustained  (@archit-spec)
- [#40645](https://github.com/vllm-project/vllm/issues/40645) [CI Failure]: mi355_1: Language Models Tests (Standard) (@AndreasKaratzas)
- [#40644](https://github.com/vllm-project/vllm/issues/40644) [CI Failure]: mi250_1: Basic Models Tests (Other) (@AndreasKaratzas)
- [#40240](https://github.com/vllm-project/vllm/issues/40240) [CI Failure]: mi355_1: V1 Spec Decode (@AndreasKaratzas)
- [#40421](https://github.com/vllm-project/vllm/issues/40421) [Feature]: [parity with CUDA] PD disagg recipes on vllm (@functionstackx)
- [#40593](https://github.com/vllm-project/vllm/issues/40593) [Bug][ROCm]: NIXL not available logs when using MoRI connect (@simondanielsson)
- [#40620](https://github.com/vllm-project/vllm/issues/40620) [RFC]: Unified Device Capability Abstraction for Cross-Platf (@jikunshang)
- [#40397](https://github.com/vllm-project/vllm/issues/40397) [Feature]: Add ROCm support for simple offload connector (@cquil11)
- [#40340](https://github.com/vllm-project/vllm/issues/40340) [Bug]: MoRI Connector hangs at >=128 concurrency (@simondanielsson)

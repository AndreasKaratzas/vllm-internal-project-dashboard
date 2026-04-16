# Weekly Digest

Week of 2026-04-09 to 2026-04-16

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#40033](https://github.com/vllm-project/vllm/pull/40033) [NVFP4][Hopper/AMD Instinct] Add Triton kernels for NVFP4 de (@fxmarty-amd)
- Opened: [#39953](https://github.com/vllm-project/vllm/pull/39953) [ROCm] Fix TurboQuant on ROCm: backend routing, flash-attn c (@aditi-amd)
- Opened: [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- Opened: [#40031](https://github.com/vllm-project/vllm/pull/40031) [ROCm][Perf] Replace WNA16 MoE Triton kernel with FlyDSL MoE (@amd-asalykov)
- Opened: [#39527](https://github.com/vllm-project/vllm/pull/39527) [Model][Hardware][AMD][Kernel]: Enable e2e QK Norm + RoPE +  (@jhu960213)
- Opened: [#39799](https://github.com/vllm-project/vllm/pull/39799) [ROCm][CI] Fix TestSiluMulGroupFp8QuantModel after W8A8 bloc (@AndreasKaratzas)
- Opened: [#40035](https://github.com/vllm-project/vllm/pull/40035) Rocclr profiler hotfix for ROCm 7.2 (@Rohan138)
- Opened: [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- Opened: [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- Opened: [#39915](https://github.com/vllm-project/vllm/issues/39915) [Bug]: Engine core initialization failed (Parent process exi (@MigueXl)
- Opened: [#40038](https://github.com/vllm-project/vllm/issues/40038) [Bug]: cudaErrorIllegalAddress during PIECEWISE CUDA graph r (@TheDuyIT)
- Opened: [#39524](https://github.com/vllm-project/vllm/pull/39524) [Refactor] Remove `resampy` dependency (@Isotr0py)
- Opened: [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- Opened: [#40016](https://github.com/vllm-project/vllm/issues/40016) [Bug]:[SM90][FP8 blockwise] swap_ab path for small/non-multi (@leonardHONG)
- Opened: [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- Opened: [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- Opened: [#40002](https://github.com/vllm-project/vllm/issues/40002) [Bug]: Inconsistent KV Cache reporting and system hang on lo (@GitEventhandler)
- Opened: [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- Opened: [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)
- Opened: [#39836](https://github.com/vllm-project/vllm/pull/39836) [ROCm] INT8 WMMA fast path for QK dot-product in unified att (@JartX)
- Opened: [#39944](https://github.com/vllm-project/vllm/pull/39944) [Kernel][Helion] Fix inductor fusion of Helion HOP (@gmagogsfm)
- Opened: [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- Opened: [#39996](https://github.com/vllm-project/vllm/issues/39996) [Bug] Fatal AssertionError: Encoder KV cache fails to evict  (@BioAGI-Moretti)
- Opened: [#39784](https://github.com/vllm-project/vllm/issues/39784) [Bug]: ReRank API online inference doesn't work well with gi (@Leo-yang-1020)
- Opened: [#39985](https://github.com/vllm-project/vllm/issues/39985) [Bug]: Qwen3.5-122B-A10B Engine hangs at Prefill phase under (@ShuZihan)
- Opened: [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- Opened: [#39757](https://github.com/vllm-project/vllm/issues/39757) [Bug]:  GLM-5 tool calls in stream mode get error tool name (@axinzhangyh)
- Opened: [#39814](https://github.com/vllm-project/vllm/issues/39814) [Bug]: FlashInferFP8ScaledMMLinearKernel segfaults on Blackw (@ZhanqiuHu)
- Opened: [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- Opened: [#39919](https://github.com/vllm-project/vllm/issues/39919) [Bug]: DeepSeek OCR doesn't work on vllm 0.19 (@PatrycyD)
- Opened: [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]:  PR de-dup/Similarity-Check  CI workflow ? (@panpan0000)
- Opened: [#39903](https://github.com/vllm-project/vllm/issues/39903) [Bug]: Significant Cross-Instance Inference Variance in vLLM (@yszhli)
- Opened: [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- Merged: [#38123](https://github.com/vllm-project/vllm/pull/38123) [compile] Allow strings in custom ops without regressing com (@zou3519)

## New Issues This Week

### vllm
- [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- [#39915](https://github.com/vllm-project/vllm/issues/39915) [Bug]: Engine core initialization failed (Parent process exi (@MigueXl)
- [#40038](https://github.com/vllm-project/vllm/issues/40038) [Bug]: cudaErrorIllegalAddress during PIECEWISE CUDA graph r (@TheDuyIT)
- [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- [#40016](https://github.com/vllm-project/vllm/issues/40016) [Bug]:[SM90][FP8 blockwise] swap_ab path for small/non-multi (@leonardHONG)
- [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- [#40002](https://github.com/vllm-project/vllm/issues/40002) [Bug]: Inconsistent KV Cache reporting and system hang on lo (@GitEventhandler)
- [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)
- [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- [#39996](https://github.com/vllm-project/vllm/issues/39996) [Bug] Fatal AssertionError: Encoder KV cache fails to evict  (@BioAGI-Moretti)
- [#39784](https://github.com/vllm-project/vllm/issues/39784) [Bug]: ReRank API online inference doesn't work well with gi (@Leo-yang-1020)
- [#39985](https://github.com/vllm-project/vllm/issues/39985) [Bug]: Qwen3.5-122B-A10B Engine hangs at Prefill phase under (@ShuZihan)
- [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- [#39757](https://github.com/vllm-project/vllm/issues/39757) [Bug]:  GLM-5 tool calls in stream mode get error tool name (@axinzhangyh)
- [#39814](https://github.com/vllm-project/vllm/issues/39814) [Bug]: FlashInferFP8ScaledMMLinearKernel segfaults on Blackw (@ZhanqiuHu)
- [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- [#39919](https://github.com/vllm-project/vllm/issues/39919) [Bug]: DeepSeek OCR doesn't work on vllm 0.19 (@PatrycyD)
- [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]:  PR de-dup/Similarity-Check  CI workflow ? (@panpan0000)
- [#39903](https://github.com/vllm-project/vllm/issues/39903) [Bug]: Significant Cross-Instance Inference Variance in vLLM (@yszhli)
- [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)

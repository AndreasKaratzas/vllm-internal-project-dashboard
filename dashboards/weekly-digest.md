# Weekly Digest

Week of 2026-04-09 to 2026-04-16

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#39616](https://github.com/vllm-project/vllm/pull/39616) [ROCm][Feature] Enable AITER MLA attention backend to work w (@larryli2-amd)
- Opened: [#39784](https://github.com/vllm-project/vllm/issues/39784) [Bug]: ReRank API online inference doesn't work well with gi (@Leo-yang-1020)
- Opened: [#39487](https://github.com/vllm-project/vllm/pull/39487) [Feature] Support custom callable proposer backend for specu (@CynicDora)
- Opened: [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- Opened: [#39967](https://github.com/vllm-project/vllm/pull/39967) [ZenCPU] AMD Zen CPU Backend with supported dtypes via zento (@Chinmay-Kulkarni-AMD)
- Opened: [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- Opened: [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- Opened: [#39757](https://github.com/vllm-project/vllm/issues/39757) [Bug]:  GLM-5 tool calls in stream mode get error tool name (@axinzhangyh)
- Opened: [#39814](https://github.com/vllm-project/vllm/issues/39814) [Bug]: FlashInferFP8ScaledMMLinearKernel segfaults on Blackw (@ZhanqiuHu)
- Opened: [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- Opened: [#39915](https://github.com/vllm-project/vllm/issues/39915) [Bug]: Engine core initialization failed (Parent process exi (@MigueXl)
- Opened: [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- Opened: [#39919](https://github.com/vllm-project/vllm/issues/39919) [Bug]: DeepSeek OCR doesn't work on vllm 0.19 (@PatrycyD)
- Opened: [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]:  PR de-dup/Similarity-Check  CI workflow ? (@panpan0000)
- Opened: [#39903](https://github.com/vllm-project/vllm/issues/39903) [Bug]: Significant Cross-Instance Inference Variance in vLLM (@yszhli)
- Opened: [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- Opened: [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- Opened: [#39788](https://github.com/vllm-project/vllm/issues/39788) [Bug]: CUDA OOM with Kimi-K2.5 NVFP4 on both TP4 and TP8 (@msanft)
- Opened: [#39863](https://github.com/vllm-project/vllm/issues/39863) [Bug]: V1 Engine: Child process (EngineCore) dies silently w (@HeisenbergUwU)
- Opened: [#39697](https://github.com/vllm-project/vllm/issues/39697) [Bug]: Qwen3.5 `thinking_token_budget` causes `reasoning_end (@andyphua114)
- Opened: [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- Opened: [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- Opened: [#39687](https://github.com/vllm-project/vllm/issues/39687) [Bug]: vllm(g0e39202ca) vllm serve: error: argument --limit- (@Honghe)
- Merged: [#33773](https://github.com/vllm-project/vllm/pull/33773) [ROCm][FEAT] Integrate aiter gemm w8a8 ptpc (@vllmellm)
- Merged: [#30566](https://github.com/vllm-project/vllm/pull/30566) Update to transformers v5 (@hmellor)

## New Issues This Week

### vllm
- [#39784](https://github.com/vllm-project/vllm/issues/39784) [Bug]: ReRank API online inference doesn't work well with gi (@Leo-yang-1020)
- [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- [#39757](https://github.com/vllm-project/vllm/issues/39757) [Bug]:  GLM-5 tool calls in stream mode get error tool name (@axinzhangyh)
- [#39814](https://github.com/vllm-project/vllm/issues/39814) [Bug]: FlashInferFP8ScaledMMLinearKernel segfaults on Blackw (@ZhanqiuHu)
- [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- [#39915](https://github.com/vllm-project/vllm/issues/39915) [Bug]: Engine core initialization failed (Parent process exi (@MigueXl)
- [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- [#39919](https://github.com/vllm-project/vllm/issues/39919) [Bug]: DeepSeek OCR doesn't work on vllm 0.19 (@PatrycyD)
- [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]:  PR de-dup/Similarity-Check  CI workflow ? (@panpan0000)
- [#39903](https://github.com/vllm-project/vllm/issues/39903) [Bug]: Significant Cross-Instance Inference Variance in vLLM (@yszhli)
- [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- [#39788](https://github.com/vllm-project/vllm/issues/39788) [Bug]: CUDA OOM with Kimi-K2.5 NVFP4 on both TP4 and TP8 (@msanft)
- [#39863](https://github.com/vllm-project/vllm/issues/39863) [Bug]: V1 Engine: Child process (EngineCore) dies silently w (@HeisenbergUwU)
- [#39697](https://github.com/vllm-project/vllm/issues/39697) [Bug]: Qwen3.5 `thinking_token_budget` causes `reasoning_end (@andyphua114)
- [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- [#39687](https://github.com/vllm-project/vllm/issues/39687) [Bug]: vllm(g0e39202ca) vllm serve: error: argument --limit- (@Honghe)
- [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)

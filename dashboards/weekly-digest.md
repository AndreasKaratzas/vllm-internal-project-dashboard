# Weekly Digest

Week of 2026-04-07 to 2026-04-14

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#39754](https://github.com/vllm-project/vllm/pull/39754) [Bugfix][ROCm]: Allow `gpt_oss_mxfp4` quantization method on (@Rohan138)
- Opened: [#39640](https://github.com/vllm-project/vllm/pull/39640) [ROCm] Use unified decode fallback for sliding-window AITER  (@Bortlesboat)
- Opened: [#39788](https://github.com/vllm-project/vllm/issues/39788) [Bug]: CUDA OOM with Kimi-K2.5 NVFP4 on both TP4 and TP8 (@msanft)
- Opened: [#39812](https://github.com/vllm-project/vllm/pull/39812) [ROCm][CI/Build] Guard gfx115x Docker base compatibility (@Bortlesboat)
- Opened: [#39811](https://github.com/vllm-project/vllm/pull/39811) [ROCm] Fallback SwigluOAI activation when _C op is absent (@Bortlesboat)
- Opened: [#39524](https://github.com/vllm-project/vllm/pull/39524) [Refactor] Remove `resampy` dependency (@Isotr0py)
- Opened: [#39810](https://github.com/vllm-project/vllm/pull/39810) [BugFix][ROCM] Align the block size of rocm_attn kernel in h (@bppps)
- Opened: [#39136](https://github.com/vllm-project/vllm/pull/39136) [ROCm][Quantization][2/N] Refactor quark_moe w4a8 w/ oracle  (@BowenBao)
- Opened: [#39730](https://github.com/vllm-project/vllm/pull/39730) [ROCm][CI] Fix condition for `test_per_token_group_quant_fp8 (@micah-wil)
- Opened: [#39208](https://github.com/vllm-project/vllm/pull/39208) [ROCm] Fix UnboundLocalError for prefix_scheduler_metadata i (@Bortlesboat)
- Opened: [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- Opened: [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- Opened: [#39757](https://github.com/vllm-project/vllm/issues/39757) [Bug]:  GLM-5 tool calls in stream mode get error tool name (@axinzhangyh)
- Opened: [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]:  PR de-dup/Similarity-Check  CI workflow ? (@panpan0000)
- Opened: [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- Opened: [#39697](https://github.com/vllm-project/vllm/issues/39697) [Bug]: Qwen3.5 `thinking_token_budget` causes `reasoning_end (@andyphua114)
- Opened: [#39784](https://github.com/vllm-project/vllm/issues/39784) [Bug]: ReRank API online inference doesn't work well with gi (@Leo-yang-1020)
- Opened: [#39761](https://github.com/vllm-project/vllm/issues/39761) [Bug]:CUDA illegal instruction during decode (V1 Engine + NV (@Xenon0220)
- Opened: [#39741](https://github.com/vllm-project/vllm/issues/39741) [Bug]: Empty tools array accepted with HTTP 200, should retu (@oromanenko-nv)
- Opened: [#39774](https://github.com/vllm-project/vllm/issues/39774) [Bug]: Inference qwen3.5 with tensor-parallel-size>1, Runtim (@ImsuperSH)
- Opened: [#39764](https://github.com/vllm-project/vllm/issues/39764) [Bug]: Uninitialized `PerTensorScaleParameter` slots corrupt (@Alnusjaponica)
- Opened: [#39620](https://github.com/vllm-project/vllm/issues/39620) [Bug]: TRT-LLM FP8 MoE kernel crash on B300 - launchHistogra (@arpera)
- Opened: [#39303](https://github.com/vllm-project/vllm/issues/39303) [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8 (@ghpu)
- Opened: [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- Opened: [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- Opened: [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- Opened: [#39687](https://github.com/vllm-project/vllm/issues/39687) [Bug]: vllm(g0e39202ca) vllm serve: error: argument --limit- (@Honghe)
- Opened: [#39202](https://github.com/vllm-project/vllm/issues/39202) [Bug]: Crash on Transcription (size for tensor a must match  (@DefinitlyEvil)
- Opened: [#39681](https://github.com/vllm-project/vllm/issues/39681) [Bug]: Gemma4 multimodal crashes with "pixel_values contains (@art3na)
- Opened: [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- Opened: [#39589](https://github.com/vllm-project/vllm/issues/39589) [Bug]: KV Cache Read/Write Index Corruption Under Concurrent (@Yunzez)
- Opened: [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4, The format of the tool call retu (@Honghe)

## New Issues This Week

### vllm
- [#39788](https://github.com/vllm-project/vllm/issues/39788) [Bug]: CUDA OOM with Kimi-K2.5 NVFP4 on both TP4 and TP8 (@msanft)
- [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- [#39757](https://github.com/vllm-project/vllm/issues/39757) [Bug]:  GLM-5 tool calls in stream mode get error tool name (@axinzhangyh)
- [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]:  PR de-dup/Similarity-Check  CI workflow ? (@panpan0000)
- [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- [#39697](https://github.com/vllm-project/vllm/issues/39697) [Bug]: Qwen3.5 `thinking_token_budget` causes `reasoning_end (@andyphua114)
- [#39784](https://github.com/vllm-project/vllm/issues/39784) [Bug]: ReRank API online inference doesn't work well with gi (@Leo-yang-1020)
- [#39761](https://github.com/vllm-project/vllm/issues/39761) [Bug]:CUDA illegal instruction during decode (V1 Engine + NV (@Xenon0220)
- [#39741](https://github.com/vllm-project/vllm/issues/39741) [Bug]: Empty tools array accepted with HTTP 200, should retu (@oromanenko-nv)
- [#39774](https://github.com/vllm-project/vllm/issues/39774) [Bug]: Inference qwen3.5 with tensor-parallel-size>1, Runtim (@ImsuperSH)
- [#39764](https://github.com/vllm-project/vllm/issues/39764) [Bug]: Uninitialized `PerTensorScaleParameter` slots corrupt (@Alnusjaponica)
- [#39620](https://github.com/vllm-project/vllm/issues/39620) [Bug]: TRT-LLM FP8 MoE kernel crash on B300 - launchHistogra (@arpera)
- [#39303](https://github.com/vllm-project/vllm/issues/39303) [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8 (@ghpu)
- [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- [#39687](https://github.com/vllm-project/vllm/issues/39687) [Bug]: vllm(g0e39202ca) vllm serve: error: argument --limit- (@Honghe)
- [#39202](https://github.com/vllm-project/vllm/issues/39202) [Bug]: Crash on Transcription (size for tensor a must match  (@DefinitlyEvil)
- [#39681](https://github.com/vllm-project/vllm/issues/39681) [Bug]: Gemma4 multimodal crashes with "pixel_values contains (@art3na)
- [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- [#39589](https://github.com/vllm-project/vllm/issues/39589) [Bug]: KV Cache Read/Write Index Corruption Under Concurrent (@Yunzez)
- [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4, The format of the tool call retu (@Honghe)
- [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)
- [#39348](https://github.com/vllm-project/vllm/issues/39348) [Bug]: Qwen3.5-9B-AWQ on ROCm/vLLM 0.19.0 can get stuck gene (@Saturnix)
- [#39357](https://github.com/vllm-project/vllm/issues/39357) [vLLM IR] Remove AITER/FlashInfer environment variables (@ProExpertProg)

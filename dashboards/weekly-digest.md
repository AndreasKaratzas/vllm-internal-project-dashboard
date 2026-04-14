# Weekly Digest

Week of 2026-04-07 to 2026-04-14

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#39342](https://github.com/vllm-project/vllm/pull/39342) [CPU] Fix AttributeError when loading GeluAndMul and similar (@ssam18)
- Opened: [#39697](https://github.com/vllm-project/vllm/issues/39697) [Bug]: Qwen3.5 `thinking_token_budget` causes `reasoning_end (@andyphua114)
- Opened: [#39616](https://github.com/vllm-project/vllm/pull/39616) [ROCm][Feature] Enable AITER MLA attention backend to work w (@larryli2-amd)
- Opened: [#39754](https://github.com/vllm-project/vllm/pull/39754) [Bugfix][ROCm]: Allow `gpt_oss_mxfp4` quantization method on (@Rohan138)
- Opened: [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- Opened: [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7 and other FP8 models fail o (@ehfd)
- Opened: [#39741](https://github.com/vllm-project/vllm/issues/39741) [Bug]: Empty tools array accepted with HTTP 200, should retu (@oromanenko-nv)
- Opened: [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- Opened: [#39620](https://github.com/vllm-project/vllm/issues/39620) [Bug]: TRT-LLM FP8 MoE kernel crash on B300 - launchHistogra (@arpera)
- Opened: [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]: maybe add PR deduplication CI workflow ? (@panpan0000)
- Opened: [#39705](https://github.com/vllm-project/vllm/pull/39705) [Bugfix][Kernel][ROCm] Fix triton_w4a16 scales mismatch when (@JartX)
- Opened: [#39581](https://github.com/vllm-project/vllm/issues/39581) [Bug]: `reasoning_effort` is silently ignored by nemotron_v3 (@key4ng)
- Opened: [#39437](https://github.com/vllm-project/vllm/pull/39437) Gfx1250 wip rebase test (@danichan-mkm)
- Opened: [#39432](https://github.com/vllm-project/vllm/pull/39432) Gfx1250 wip (@JadenMathias)
- Opened: [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- Opened: [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- Opened: [#39204](https://github.com/vllm-project/vllm/issues/39204) [Installation]: New 0.19.0 docker build to run gemma4: trans (@Huehnerbrust)
- Opened: [#39687](https://github.com/vllm-project/vllm/issues/39687) [Bug]: vllm(g0e39202ca) vllm serve: error: argument --limit- (@Honghe)
- Opened: [#39202](https://github.com/vllm-project/vllm/issues/39202) [Bug]: Crash on Transcription (size for tensor a must match  (@DefinitlyEvil)
- Opened: [#39681](https://github.com/vllm-project/vllm/issues/39681) [Bug]: Gemma4 multimodal crashes with "pixel_values contains (@art3na)
- Opened: [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- Opened: [#39663](https://github.com/vllm-project/vllm/issues/39663) [Bug]: Online FP8 quantization drops bias weights, which bre (@alankessler)
- Opened: [#39589](https://github.com/vllm-project/vllm/issues/39589) [Bug]: KV Cache Read/Write Index Corruption Under Concurrent (@Yunzez)
- Opened: [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4, The format of the tool call retu (@Honghe)
- Opened: [#39584](https://github.com/vllm-project/vllm/issues/39584) [Bug]:  AssertionError: Multiple tool calls in one delta is  (@scott8)
- Opened: [#39426](https://github.com/vllm-project/vllm/issues/39426) [Bug]:  /v1/responses: Protocol drift and malformed tool agg (@scott8)
- Opened: [#39532](https://github.com/vllm-project/vllm/issues/39532) [Bug]: `_CONFIG_REGISTRY` types get wrong config class since (@misaAle)
- Opened: [#39348](https://github.com/vllm-project/vllm/issues/39348) [Bug]: Qwen3.5-9B-AWQ on ROCm/vLLM 0.19.0 can get stuck gene (@Saturnix)
- Opened: [#39303](https://github.com/vllm-project/vllm/issues/39303) [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8 (@ghpu)
- Merged: [#38938](https://github.com/vllm-project/vllm/pull/38938) Bug/test eagle dp v0 (@Monishver11)

## New Issues This Week

### vllm
- [#39697](https://github.com/vllm-project/vllm/issues/39697) [Bug]: Qwen3.5 `thinking_token_budget` causes `reasoning_end (@andyphua114)
- [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7 and other FP8 models fail o (@ehfd)
- [#39741](https://github.com/vllm-project/vllm/issues/39741) [Bug]: Empty tools array accepted with HTTP 200, should retu (@oromanenko-nv)
- [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- [#39620](https://github.com/vllm-project/vllm/issues/39620) [Bug]: TRT-LLM FP8 MoE kernel crash on B300 - launchHistogra (@arpera)
- [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]: maybe add PR deduplication CI workflow ? (@panpan0000)
- [#39581](https://github.com/vllm-project/vllm/issues/39581) [Bug]: `reasoning_effort` is silently ignored by nemotron_v3 (@key4ng)
- [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- [#39204](https://github.com/vllm-project/vllm/issues/39204) [Installation]: New 0.19.0 docker build to run gemma4: trans (@Huehnerbrust)
- [#39687](https://github.com/vllm-project/vllm/issues/39687) [Bug]: vllm(g0e39202ca) vllm serve: error: argument --limit- (@Honghe)
- [#39202](https://github.com/vllm-project/vllm/issues/39202) [Bug]: Crash on Transcription (size for tensor a must match  (@DefinitlyEvil)
- [#39681](https://github.com/vllm-project/vllm/issues/39681) [Bug]: Gemma4 multimodal crashes with "pixel_values contains (@art3na)
- [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- [#39663](https://github.com/vllm-project/vllm/issues/39663) [Bug]: Online FP8 quantization drops bias weights, which bre (@alankessler)
- [#39589](https://github.com/vllm-project/vllm/issues/39589) [Bug]: KV Cache Read/Write Index Corruption Under Concurrent (@Yunzez)
- [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4, The format of the tool call retu (@Honghe)
- [#39584](https://github.com/vllm-project/vllm/issues/39584) [Bug]:  AssertionError: Multiple tool calls in one delta is  (@scott8)
- [#39426](https://github.com/vllm-project/vllm/issues/39426) [Bug]:  /v1/responses: Protocol drift and malformed tool agg (@scott8)
- [#39532](https://github.com/vllm-project/vllm/issues/39532) [Bug]: `_CONFIG_REGISTRY` types get wrong config class since (@misaAle)
- [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)
- [#39348](https://github.com/vllm-project/vllm/issues/39348) [Bug]: Qwen3.5-9B-AWQ on ROCm/vLLM 0.19.0 can get stuck gene (@Saturnix)
- [#39303](https://github.com/vllm-project/vllm/issues/39303) [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8 (@ghpu)
- [#39357](https://github.com/vllm-project/vllm/issues/39357) [vLLM IR] Remove AITER/FlashInfer environment variables (@ProExpertProg)

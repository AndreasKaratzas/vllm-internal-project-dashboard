# Weekly Digest

Week of 2026-04-06 to 2026-04-13

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#39687](https://github.com/vllm-project/vllm/issues/39687) [Bug]: vllm(g0e39202ca) vllm serve: error: argument --limit- (@Honghe)
- Opened: [#39681](https://github.com/vllm-project/vllm/issues/39681) [Bug]: Gemma4 multimodal crashes with "pixel_values contains (@art3na)
- Opened: [#39136](https://github.com/vllm-project/vllm/pull/39136) [ROCm][Quantization][2/N] Refactor quark_moe w4a8 w/ oracle  (@BowenBao)
- Opened: [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- Opened: [#39355](https://github.com/vllm-project/vllm/pull/39355) fix: raise ImportError early when xxhash is unavailable for  (@r266-tech)
- Opened: [#39385](https://github.com/vllm-project/vllm/pull/39385) [Bugfix] Validate block_size in FlexAttention at constructio (@r266-tech)
- Opened: [#39665](https://github.com/vllm-project/vllm/pull/39665) [Bugfix] Skip bias tensors in online FP8 quantization pipeli (@r266-tech)
- Opened: [#39651](https://github.com/vllm-project/vllm/pull/39651) [ROCm][CI] Removed stale tests and extended acceptance test (@AndreasKaratzas)
- Opened: [#39663](https://github.com/vllm-project/vllm/issues/39663) [Bug]: Online FP8 quantization drops bias weights, which bre (@alankessler)
- Opened: [#39589](https://github.com/vllm-project/vllm/issues/39589) [Bug]: KV Cache Read/Write Index Corruption Under Concurrent (@Yunzez)
- Opened: [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7 and other FP8 models fail o (@ehfd)
- Opened: [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4, The format of the tool call retu (@Honghe)
- Opened: [#39620](https://github.com/vllm-project/vllm/issues/39620) [Bug]: TRT-LLM FP8 MoE kernel crash on B300 - launchHistogra (@arpera)
- Opened: [#39584](https://github.com/vllm-project/vllm/issues/39584) [Bug]:  AssertionError: Multiple tool calls in one delta is  (@scott8)
- Opened: [#39581](https://github.com/vllm-project/vllm/issues/39581) [Bug]: `reasoning_effort` is silently ignored by nemotron_v3 (@key4ng)
- Opened: [#39426](https://github.com/vllm-project/vllm/issues/39426) [Bug]:  /v1/responses: Protocol drift and malformed tool agg (@scott8)
- Opened: [#39057](https://github.com/vllm-project/vllm/issues/39057) [Bug]: Deepseek v3.2 RuntimeError: Worker failed with error  (@jxdn)
- Opened: [#39540](https://github.com/vllm-project/vllm/issues/39540) [Bug]: Can't instantiate a local model if importing torch_ge (@joao-luz)
- Opened: [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- Opened: [#39532](https://github.com/vllm-project/vllm/issues/39532) [Bug]: `_CONFIG_REGISTRY` types get wrong config class since (@misaAle)
- Opened: [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- Opened: [#39348](https://github.com/vllm-project/vllm/issues/39348) [Bug]: Qwen3.5-9B-AWQ on ROCm/vLLM 0.19.0 can get stuck gene (@Saturnix)
- Opened: [#39303](https://github.com/vllm-project/vllm/issues/39303) [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8 (@ghpu)
- Opened: [#39158](https://github.com/vllm-project/vllm/issues/39158) [RFC][Test]: Unified Platform-Aware Test Skip Mechanism (@jikunshang)

## New Issues This Week

### vllm
- [#39687](https://github.com/vllm-project/vllm/issues/39687) [Bug]: vllm(g0e39202ca) vllm serve: error: argument --limit- (@Honghe)
- [#39681](https://github.com/vllm-project/vllm/issues/39681) [Bug]: Gemma4 multimodal crashes with "pixel_values contains (@art3na)
- [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- [#39663](https://github.com/vllm-project/vllm/issues/39663) [Bug]: Online FP8 quantization drops bias weights, which bre (@alankessler)
- [#39589](https://github.com/vllm-project/vllm/issues/39589) [Bug]: KV Cache Read/Write Index Corruption Under Concurrent (@Yunzez)
- [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7 and other FP8 models fail o (@ehfd)
- [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4, The format of the tool call retu (@Honghe)
- [#39620](https://github.com/vllm-project/vllm/issues/39620) [Bug]: TRT-LLM FP8 MoE kernel crash on B300 - launchHistogra (@arpera)
- [#39584](https://github.com/vllm-project/vllm/issues/39584) [Bug]:  AssertionError: Multiple tool calls in one delta is  (@scott8)
- [#39581](https://github.com/vllm-project/vllm/issues/39581) [Bug]: `reasoning_effort` is silently ignored by nemotron_v3 (@key4ng)
- [#39426](https://github.com/vllm-project/vllm/issues/39426) [Bug]:  /v1/responses: Protocol drift and malformed tool agg (@scott8)
- [#39057](https://github.com/vllm-project/vllm/issues/39057) [Bug]: Deepseek v3.2 RuntimeError: Worker failed with error  (@jxdn)
- [#39540](https://github.com/vllm-project/vllm/issues/39540) [Bug]: Can't instantiate a local model if importing torch_ge (@joao-luz)
- [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- [#39532](https://github.com/vllm-project/vllm/issues/39532) [Bug]: `_CONFIG_REGISTRY` types get wrong config class since (@misaAle)
- [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)
- [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- [#39348](https://github.com/vllm-project/vllm/issues/39348) [Bug]: Qwen3.5-9B-AWQ on ROCm/vLLM 0.19.0 can get stuck gene (@Saturnix)
- [#39303](https://github.com/vllm-project/vllm/issues/39303) [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8 (@ghpu)
- [#39158](https://github.com/vllm-project/vllm/issues/39158) [RFC][Test]: Unified Platform-Aware Test Skip Mechanism (@jikunshang)
- [#39357](https://github.com/vllm-project/vllm/issues/39357) [vLLM IR] Remove AITER/FlashInfer environment variables (@ProExpertProg)

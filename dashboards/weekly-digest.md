# Weekly Digest

Week of 2026-04-05 to 2026-04-12

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#39481](https://github.com/vllm-project/vllm/pull/39481) [vllm IR] Port FP8 Quantization to vLLM IR Ops (@BadrBasowid)
- Opened: [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7 and other FP8 models fail o (@ehfd)
- Opened: [#39262](https://github.com/vllm-project/vllm/pull/39262) [vLLM IR][RMSNorm] Port Mixer2RMSNormGated to vLLM IR Ops (@wxsIcey)
- Opened: [#39620](https://github.com/vllm-project/vllm/issues/39620) [Bug]: TRT-LLM FP8 MoE kernel crash on B300 - launchHistogra (@arpera)
- Opened: [#39616](https://github.com/vllm-project/vllm/pull/39616) Enable AITER MLA backend to support Eagle3 speculative decod (@larryli2-amd)
- Opened: [#39074](https://github.com/vllm-project/vllm/pull/39074) [Feature] KV cache per-token-head Int2/Int4 Quantization + T (@JartX)
- Opened: [#39555](https://github.com/vllm-project/vllm/pull/39555) [ROCm][CI/Build] Fix memory cleanup in MM test (@AndreasKaratzas)
- Opened: [#39602](https://github.com/vllm-project/vllm/pull/39602) Prefer fastsafetensors in auto load format on CUDA/ROCm (@aoshen524)
- Opened: [#39584](https://github.com/vllm-project/vllm/issues/39584) [Bug]:  AssertionError: Multiple tool calls in one delta is  (@scott8)
- Opened: [#39581](https://github.com/vllm-project/vllm/issues/39581) [Bug]: `reasoning_effort` is silently ignored by nemotron_v3 (@key4ng)
- Opened: [#39426](https://github.com/vllm-project/vllm/issues/39426) [Bug]:  /v1/responses: Protocol drift and malformed tool agg (@scott8)
- Opened: [#39589](https://github.com/vllm-project/vllm/issues/39589) [Bug]: KV Cache Read/Write Index Corruption Under Concurrent (@Yunzez)
- Opened: [#39057](https://github.com/vllm-project/vllm/issues/39057) [Bug]: Deepseek v3.2 RuntimeError: Worker failed with error  (@jxdn)
- Opened: [#39540](https://github.com/vllm-project/vllm/issues/39540) [Bug]: Can't instantiate a local model if importing torch_ge (@joao-luz)
- Opened: [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- Opened: [#39532](https://github.com/vllm-project/vllm/issues/39532) [Bug]: `_CONFIG_REGISTRY` types get wrong config class since (@misaAle)
- Opened: [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- Opened: [#39408](https://github.com/vllm-project/vllm/issues/39408) [Usage]: qwen3-asr-1.7b pre-allocated encoder cache size lim (@xi1212)
- Opened: [#39271](https://github.com/vllm-project/vllm/issues/39271) [Bug]: Qwen3.5 crashes when using suffix-decoding (@xhdidi)
- Opened: [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)
- Opened: [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- Opened: [#39348](https://github.com/vllm-project/vllm/issues/39348) [Bug]: Qwen3.5-9B-AWQ on ROCm/vLLM 0.19.0 can get stuck gene (@Saturnix)
- Opened: [#39303](https://github.com/vllm-project/vllm/issues/39303) [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8 (@ghpu)
- Opened: [#39472](https://github.com/vllm-project/vllm/issues/39472) [Bug]: Missing `soundfile` dependency breaks audio transcrip (@tunglinwood)
- Opened: [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4 tool-call-paser output format err (@Honghe)
- Opened: [#39043](https://github.com/vllm-project/vllm/issues/39043) [Bug]: Vllm + Gemma 4 + claude code: tool calling problems (@drrros)
- Opened: [#39158](https://github.com/vllm-project/vllm/issues/39158) [RFC][Test]: Unified Platform-Aware Test Skip Mechanism (@jikunshang)
- Opened: [#39049](https://github.com/vllm-project/vllm/issues/39049) [Bug]: Gemma 4 FP8 dynamic quantization = gibberish output (@frenzybiscuit)
- Opened: [#39334](https://github.com/vllm-project/vllm/issues/39334) [Bug]: [CPU] AttributeError: '_OpNamespace' '_C' object has  (@yaoluxun)
- Opened: [#39221](https://github.com/vllm-project/vllm/issues/39221) [Bug]: Inconsistent tool-calling behavior between Chat Compl (@robinnarsinghranabhat)

## New Issues This Week

### vllm
- [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7 and other FP8 models fail o (@ehfd)
- [#39620](https://github.com/vllm-project/vllm/issues/39620) [Bug]: TRT-LLM FP8 MoE kernel crash on B300 - launchHistogra (@arpera)
- [#39584](https://github.com/vllm-project/vllm/issues/39584) [Bug]:  AssertionError: Multiple tool calls in one delta is  (@scott8)
- [#39581](https://github.com/vllm-project/vllm/issues/39581) [Bug]: `reasoning_effort` is silently ignored by nemotron_v3 (@key4ng)
- [#39426](https://github.com/vllm-project/vllm/issues/39426) [Bug]:  /v1/responses: Protocol drift and malformed tool agg (@scott8)
- [#39589](https://github.com/vllm-project/vllm/issues/39589) [Bug]: KV Cache Read/Write Index Corruption Under Concurrent (@Yunzez)
- [#39057](https://github.com/vllm-project/vllm/issues/39057) [Bug]: Deepseek v3.2 RuntimeError: Worker failed with error  (@jxdn)
- [#39540](https://github.com/vllm-project/vllm/issues/39540) [Bug]: Can't instantiate a local model if importing torch_ge (@joao-luz)
- [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- [#39532](https://github.com/vllm-project/vllm/issues/39532) [Bug]: `_CONFIG_REGISTRY` types get wrong config class since (@misaAle)
- [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- [#39408](https://github.com/vllm-project/vllm/issues/39408) [Usage]: qwen3-asr-1.7b pre-allocated encoder cache size lim (@xi1212)
- [#39271](https://github.com/vllm-project/vllm/issues/39271) [Bug]: Qwen3.5 crashes when using suffix-decoding (@xhdidi)
- [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)
- [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- [#39348](https://github.com/vllm-project/vllm/issues/39348) [Bug]: Qwen3.5-9B-AWQ on ROCm/vLLM 0.19.0 can get stuck gene (@Saturnix)
- [#39303](https://github.com/vllm-project/vllm/issues/39303) [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8 (@ghpu)
- [#39472](https://github.com/vllm-project/vllm/issues/39472) [Bug]: Missing `soundfile` dependency breaks audio transcrip (@tunglinwood)
- [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4 tool-call-paser output format err (@Honghe)
- [#39043](https://github.com/vllm-project/vllm/issues/39043) [Bug]: Vllm + Gemma 4 + claude code: tool calling problems (@drrros)
- [#39158](https://github.com/vllm-project/vllm/issues/39158) [RFC][Test]: Unified Platform-Aware Test Skip Mechanism (@jikunshang)
- [#39357](https://github.com/vllm-project/vllm/issues/39357) [vLLM IR] Remove AITER/FlashInfer environment variables (@ProExpertProg)
- [#39049](https://github.com/vllm-project/vllm/issues/39049) [Bug]: Gemma 4 FP8 dynamic quantization = gibberish output (@frenzybiscuit)
- [#39334](https://github.com/vllm-project/vllm/issues/39334) [Bug]: [CPU] AttributeError: '_OpNamespace' '_C' object has  (@yaoluxun)
- [#39221](https://github.com/vllm-project/vllm/issues/39221) [Bug]: Inconsistent tool-calling behavior between Chat Compl (@robinnarsinghranabhat)
- [#39010](https://github.com/vllm-project/vllm/issues/39010) [Bug]: Hang During CUDA Graph Capture on ROCM in 0.19 (@depuhitv)

# Weekly Digest

Week of 2026-04-04 to 2026-04-11

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#39024](https://github.com/vllm-project/vllm/pull/39024) Add structure to `requirements/` directory (@hmellor)
- Opened: [#39538](https://github.com/vllm-project/vllm/pull/39538) [Kernel][UX] Add `--linear-backend` arg for linear kernel se (@mgoin)
- Opened: [#39540](https://github.com/vllm-project/vllm/issues/39540) [Bug]: Can't instantiate a local model if importing torch_ge (@joao-luz)
- Opened: [#39545](https://github.com/vllm-project/vllm/issues/39545) [Bug]: gpt-oss-20b unquantized model outputting gibberish wi (@jiosephlee)
- Opened: [#39532](https://github.com/vllm-project/vllm/issues/39532) [Bug]: `_CONFIG_REGISTRY` types get wrong config class since (@misaAle)
- Opened: [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- Opened: [#39509](https://github.com/vllm-project/vllm/pull/39509) [ROCm] [AITER] Revert AITER version to v0.1.10.post3 (@tjtanaa)
- Opened: [#39408](https://github.com/vllm-project/vllm/issues/39408) [Usage]: qwen3-asr-1.7b pre-allocated encoder cache size lim (@xi1212)
- Opened: [#39271](https://github.com/vllm-project/vllm/issues/39271) [Bug]: Qwen3.5 crashes when using suffix-decoding (@xhdidi)
- Opened: [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)
- Opened: [#39378](https://github.com/vllm-project/vllm/issues/39378) [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type (@kittyzero520)
- Opened: [#39348](https://github.com/vllm-project/vllm/issues/39348) [Bug]: Qwen3.5-9B-AWQ on ROCm/vLLM 0.19.0 can get stuck gene (@Saturnix)
- Opened: [#39303](https://github.com/vllm-project/vllm/issues/39303) [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8 (@ghpu)
- Opened: [#39261](https://github.com/vllm-project/vllm/issues/39261) [Bug]: Kimi K2.5 multimodal inference broken — media_placeho (@pstefa1707)
- Opened: [#39472](https://github.com/vllm-project/vllm/issues/39472) [Bug]: Missing `soundfile` dependency breaks audio transcrip (@tunglinwood)
- Opened: [#39198](https://github.com/vllm-project/vllm/issues/39198) [Bug]: HFValidationError when trying to run a GGUF model wit (@stanislavsimovski)
- Opened: [#39426](https://github.com/vllm-project/vllm/issues/39426) [Bug]:  /v1/responses: Protocol drift and malformed tool agg (@scott8)
- Opened: [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4 tool-call-paser output format err (@Honghe)
- Opened: [#39025](https://github.com/vllm-project/vllm/issues/39025) [Bug]: CUDA illegal memory access with CUDA graphs enabled u (@vibhavagarwal5)
- Opened: [#39204](https://github.com/vllm-project/vllm/issues/39204) [Installation]: New 0.19.0 docker build to run gemma4: trans (@Huehnerbrust)
- Opened: [#39043](https://github.com/vllm-project/vllm/issues/39043) [Bug]: Vllm + Gemma 4 + claude code: tool calling problems (@drrros)
- Opened: [#38972](https://github.com/vllm-project/vllm/issues/38972) [Bug]: Mistral Small 4 (119B MoE) fails to start on ROCm MI3 (@maincodeMax)
- Opened: [#39158](https://github.com/vllm-project/vllm/issues/39158) [RFC][Test]: Unified Platform-Aware Test Skip Mechanism (@jikunshang)
- Opened: [#39341](https://github.com/vllm-project/vllm/issues/39341) [Bug]: `max_num_batched_tokens=1` raises unhandled `IndexErr (@kvcache670)
- Opened: [#39049](https://github.com/vllm-project/vllm/issues/39049) [Bug]: Gemma 4 FP8 dynamic quantization = gibberish output (@frenzybiscuit)
- Opened: [#39334](https://github.com/vllm-project/vllm/issues/39334) [Bug]: [CPU] AttributeError: '_OpNamespace' '_C' object has  (@yaoluxun)
- Opened: [#39221](https://github.com/vllm-project/vllm/issues/39221) [Bug]: Inconsistent tool-calling behavior between Chat Compl (@robinnarsinghranabhat)
- Opened: [#39202](https://github.com/vllm-project/vllm/issues/39202) [Bug]: Crash on Transcription (size for tensor a must match  (@DefinitlyEvil)
- Opened: [#38979](https://github.com/vllm-project/vllm/issues/38979) [Bug]: Regression in vllm 0.19.0 - The page size of the laye (@outermeasure)
- Merged: [#37045](https://github.com/vllm-project/vllm/pull/37045) [Kernel] Porting the TRTLLM minimax_allreduce_rms kernels (@jeejeelee)

## New Issues This Week

### vllm
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
- [#39261](https://github.com/vllm-project/vllm/issues/39261) [Bug]: Kimi K2.5 multimodal inference broken — media_placeho (@pstefa1707)
- [#39472](https://github.com/vllm-project/vllm/issues/39472) [Bug]: Missing `soundfile` dependency breaks audio transcrip (@tunglinwood)
- [#39198](https://github.com/vllm-project/vllm/issues/39198) [Bug]: HFValidationError when trying to run a GGUF model wit (@stanislavsimovski)
- [#39426](https://github.com/vllm-project/vllm/issues/39426) [Bug]:  /v1/responses: Protocol drift and malformed tool agg (@scott8)
- [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4 tool-call-paser output format err (@Honghe)
- [#39025](https://github.com/vllm-project/vllm/issues/39025) [Bug]: CUDA illegal memory access with CUDA graphs enabled u (@vibhavagarwal5)
- [#39204](https://github.com/vllm-project/vllm/issues/39204) [Installation]: New 0.19.0 docker build to run gemma4: trans (@Huehnerbrust)
- [#39043](https://github.com/vllm-project/vllm/issues/39043) [Bug]: Vllm + Gemma 4 + claude code: tool calling problems (@drrros)
- [#38972](https://github.com/vllm-project/vllm/issues/38972) [Bug]: Mistral Small 4 (119B MoE) fails to start on ROCm MI3 (@maincodeMax)
- [#39158](https://github.com/vllm-project/vllm/issues/39158) [RFC][Test]: Unified Platform-Aware Test Skip Mechanism (@jikunshang)
- [#39341](https://github.com/vllm-project/vllm/issues/39341) [Bug]: `max_num_batched_tokens=1` raises unhandled `IndexErr (@kvcache670)
- [#39357](https://github.com/vllm-project/vllm/issues/39357) [vLLM IR] Remove AITER/FlashInfer environment variables (@ProExpertProg)
- [#39049](https://github.com/vllm-project/vllm/issues/39049) [Bug]: Gemma 4 FP8 dynamic quantization = gibberish output (@frenzybiscuit)
- [#39334](https://github.com/vllm-project/vllm/issues/39334) [Bug]: [CPU] AttributeError: '_OpNamespace' '_C' object has  (@yaoluxun)
- [#39221](https://github.com/vllm-project/vllm/issues/39221) [Bug]: Inconsistent tool-calling behavior between Chat Compl (@robinnarsinghranabhat)
- [#39202](https://github.com/vllm-project/vllm/issues/39202) [Bug]: Crash on Transcription (size for tensor a must match  (@DefinitlyEvil)
- [#38979](https://github.com/vllm-project/vllm/issues/38979) [Bug]: Regression in vllm 0.19.0 - The page size of the laye (@outermeasure)
- [#39010](https://github.com/vllm-project/vllm/issues/39010) [Bug]: Hang During CUDA Graph Capture on ROCM in 0.19 (@depuhitv)

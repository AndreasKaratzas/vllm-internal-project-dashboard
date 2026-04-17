# Weekly Digest

Week of 2026-04-10 to 2026-04-17

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#40121](https://github.com/vllm-project/vllm/issues/40121) [Bug]: CUDA graph replay triggers Xid 13 illegal memory acce (@kevinb361)
- Opened: [#39583](https://github.com/vllm-project/vllm/issues/39583) [RFC]: Deprecate bitsandbytes and GGUF quantization support (@mgoin)
- Opened: [#40107](https://github.com/vllm-project/vllm/issues/40107) [Bug]: Exception caught during TVMFFIGetTypeInfo (@lengrongfu)
- Opened: [#40080](https://github.com/vllm-project/vllm/issues/40080) [Bug]: Gemma 4 (31B / 26B-A4B) generates infinite repetition (@Foreist)
- Opened: [#40094](https://github.com/vllm-project/vllm/issues/40094) [Bug]: Turbo Quant keep failing TRITON_ATTN 'kv_cache_dtype  (@mohamed-em2m)
- Opened: [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- Opened: [#39768](https://github.com/vllm-project/vllm/issues/39768) [Bug]: Kwargs passed to `processor.__call__` have to be in ` (@fataldemon)
- Opened: [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- Opened: [#40081](https://github.com/vllm-project/vllm/issues/40081) [Bug]: vLLM fails to start on RDNA 4 (gfx1201) inside contai (@sleeepss)
- Opened: [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- Opened: [#39996](https://github.com/vllm-project/vllm/issues/39996) [Bug] Fatal AssertionError: Encoder KV cache fails to evict  (@BioAGI-Moretti)
- Opened: [#40069](https://github.com/vllm-project/vllm/issues/40069) [Tracking issue]: TurboQuant/HIGGS Attention follow-ups (@mgoin)
- Opened: [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- Opened: [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- Opened: [#39915](https://github.com/vllm-project/vllm/issues/39915) [Bug]: Engine core initialization failed (Parent process exi (@MigueXl)
- Opened: [#40038](https://github.com/vllm-project/vllm/issues/40038) [Bug]: cudaErrorIllegalAddress during PIECEWISE CUDA graph r (@TheDuyIT)
- Opened: [#40016](https://github.com/vllm-project/vllm/issues/40016) [Bug]:[SM90][FP8 blockwise] swap_ab path for small/non-multi (@leonardHONG)
- Opened: [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- Opened: [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- Opened: [#40002](https://github.com/vllm-project/vllm/issues/40002) [Bug]: Inconsistent KV Cache reporting and system hang on lo (@GitEventhandler)
- Opened: [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- Opened: [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)
- Opened: [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- Opened: [#39985](https://github.com/vllm-project/vllm/issues/39985) [Bug]: Qwen3.5-122B-A10B Engine hangs at Prefill phase under (@ShuZihan)
- Opened: [#39757](https://github.com/vllm-project/vllm/issues/39757) [Bug]:  GLM-5 tool calls in stream mode get error tool name (@axinzhangyh)
- Opened: [#39919](https://github.com/vllm-project/vllm/issues/39919) [Bug]: DeepSeek OCR doesn't work on vllm 0.19 (@PatrycyD)
- Opened: [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]:  PR de-dup/Similarity-Check  CI workflow ? (@panpan0000)
- Merged: [#28275](https://github.com/vllm-project/vllm/pull/28275) [Misc] add ignore mapper for quark quantization (@haoyangli0109)
- Merged: [#25892](https://github.com/vllm-project/vllm/pull/25892) [Bugfix][Rocm] fix qr error when different inp shape (@haoyangli0109)
- Merged: [#24649](https://github.com/vllm-project/vllm/pull/24649) [Rocm] [quantization] Fix quark ptpc moe and add test case (@haoyangli0109)
- Merged: [#30257](https://github.com/vllm-project/vllm/pull/30257) [bugfix][quantization] Fix fp8 per_tensor scale shape (@haoyangli0109)
- Merged: [#38479](https://github.com/vllm-project/vllm/pull/38479) [Attention Backend] TurboQuant: 2-bit KV cache compression w (@vibhavagarwal5)

## New Issues This Week

### vllm
- [#40121](https://github.com/vllm-project/vllm/issues/40121) [Bug]: CUDA graph replay triggers Xid 13 illegal memory acce (@kevinb361)
- [#39583](https://github.com/vllm-project/vllm/issues/39583) [RFC]: Deprecate bitsandbytes and GGUF quantization support (@mgoin)
- [#40107](https://github.com/vllm-project/vllm/issues/40107) [Bug]: Exception caught during TVMFFIGetTypeInfo (@lengrongfu)
- [#40080](https://github.com/vllm-project/vllm/issues/40080) [Bug]: Gemma 4 (31B / 26B-A4B) generates infinite repetition (@Foreist)
- [#40094](https://github.com/vllm-project/vllm/issues/40094) [Bug]: Turbo Quant keep failing TRITON_ATTN 'kv_cache_dtype  (@mohamed-em2m)
- [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- [#39768](https://github.com/vllm-project/vllm/issues/39768) [Bug]: Kwargs passed to `processor.__call__` have to be in ` (@fataldemon)
- [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- [#40081](https://github.com/vllm-project/vllm/issues/40081) [Bug]: vLLM fails to start on RDNA 4 (gfx1201) inside contai (@sleeepss)
- [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- [#39996](https://github.com/vllm-project/vllm/issues/39996) [Bug] Fatal AssertionError: Encoder KV cache fails to evict  (@BioAGI-Moretti)
- [#40069](https://github.com/vllm-project/vllm/issues/40069) [Tracking issue]: TurboQuant/HIGGS Attention follow-ups (@mgoin)
- [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- [#39915](https://github.com/vllm-project/vllm/issues/39915) [Bug]: Engine core initialization failed (Parent process exi (@MigueXl)
- [#40038](https://github.com/vllm-project/vllm/issues/40038) [Bug]: cudaErrorIllegalAddress during PIECEWISE CUDA graph r (@TheDuyIT)
- [#40016](https://github.com/vllm-project/vllm/issues/40016) [Bug]:[SM90][FP8 blockwise] swap_ab path for small/non-multi (@leonardHONG)
- [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- [#39491](https://github.com/vllm-project/vllm/issues/39491) [Bug]: OffloadingConnector GPU->CPU KV offload crashes with  (@archit-spec)
- [#40002](https://github.com/vllm-project/vllm/issues/40002) [Bug]: Inconsistent KV Cache reporting and system hang on lo (@GitEventhandler)
- [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)
- [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- [#39985](https://github.com/vllm-project/vllm/issues/39985) [Bug]: Qwen3.5-122B-A10B Engine hangs at Prefill phase under (@ShuZihan)
- [#39757](https://github.com/vllm-project/vllm/issues/39757) [Bug]:  GLM-5 tool calls in stream mode get error tool name (@axinzhangyh)
- [#39919](https://github.com/vllm-project/vllm/issues/39919) [Bug]: DeepSeek OCR doesn't work on vllm 0.19 (@PatrycyD)
- [#39694](https://github.com/vllm-project/vllm/issues/39694) [RFC]:  PR de-dup/Similarity-Check  CI workflow ? (@panpan0000)
- [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)

# Weekly Digest

Week of 2026-04-10 to 2026-04-17

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#39953](https://github.com/vllm-project/vllm/pull/39953) [ROCm] Fix TurboQuant on ROCm: backend routing, flash-attn c (@aditi-amd)
- Opened: [#39801](https://github.com/vllm-project/vllm/pull/39801) [ROCm][CI] Add missing quantization methods and fix online q (@AndreasKaratzas)
- Opened: [#39978](https://github.com/vllm-project/vllm/pull/39978) [ROCm][CI] Build fastsafetensors from source so it links aga (@AndreasKaratzas)
- Opened: [#39835](https://github.com/vllm-project/vllm/pull/39835) [ROCm][P/D][MORI][BugFix] Ensure correct api is used when ma (@rasmith)
- Opened: [#39583](https://github.com/vllm-project/vllm/issues/39583) [RFC]: Deprecate bitsandbytes and GGUF quantization support (@mgoin)
- Opened: [#40144](https://github.com/vllm-project/vllm/issues/40144) [Bug]: vllm/vllm-openai:nightly-18013df6ae27c3fb941307c46c97 (@psv666)
- Opened: [#40165](https://github.com/vllm-project/vllm/issues/40165) [Bug]: HunyuanOCR crashes with "query and key must have the  (@hungthikcode)
- Opened: [#40080](https://github.com/vllm-project/vllm/issues/40080) [Bug]: Gemma 4 (31B / 26B-A4B) generates infinite repetition (@Foreist)
- Opened: [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- Opened: [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4, The format of the tool call retu (@Honghe)
- Opened: [#40153](https://github.com/vllm-project/vllm/issues/40153) [Bug]: GPT-OSS-20B on RTX PRO 6000 (SM120) falls back to TRI (@dhayanesh)
- Opened: [#40069](https://github.com/vllm-project/vllm/issues/40069) [Tracking issue]: TurboQuant/HIGGS Attention follow-ups (@mgoin)
- Opened: [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- Opened: [#40107](https://github.com/vllm-project/vllm/issues/40107) [Bug]: Exception caught during TVMFFIGetTypeInfo (@lengrongfu)
- Opened: [#39985](https://github.com/vllm-project/vllm/issues/39985) [Bug]: Qwen3.5-122B-A10B Engine hangs at Prefill phase under (@ShuZihan)
- Opened: [#39915](https://github.com/vllm-project/vllm/issues/39915) [Bug]: Engine core initialization failed (Parent process exi (@MigueXl)
- Opened: [#40121](https://github.com/vllm-project/vllm/issues/40121) [Bug]: CUDA graph replay triggers Xid 13 illegal memory acce (@kevinb361)
- Opened: [#40094](https://github.com/vllm-project/vllm/issues/40094) [Bug]: Turbo Quant keep failing TRITON_ATTN 'kv_cache_dtype  (@mohamed-em2m)
- Opened: [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- Opened: [#39768](https://github.com/vllm-project/vllm/issues/39768) [Bug]: Kwargs passed to `processor.__call__` have to be in ` (@fataldemon)
- Opened: [#40081](https://github.com/vllm-project/vllm/issues/40081) [Bug]: vLLM fails to start on RDNA 4 (gfx1201) inside contai (@sleeepss)
- Opened: [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- Opened: [#39996](https://github.com/vllm-project/vllm/issues/39996) [Bug] Fatal AssertionError: Encoder KV cache fails to evict  (@BioAGI-Moretti)
- Opened: [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- Opened: [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- Opened: [#40038](https://github.com/vllm-project/vllm/issues/40038) [Bug]: cudaErrorIllegalAddress during PIECEWISE CUDA graph r (@TheDuyIT)
- Opened: [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- Opened: [#40002](https://github.com/vllm-project/vllm/issues/40002) [Bug]: Inconsistent KV Cache reporting and system hang on lo (@GitEventhandler)
- Opened: [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- Opened: [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)
- Merged: [#38396](https://github.com/vllm-project/vllm/pull/38396) [AMD][CI] Update DeepEP branch (@rjrock)

## New Issues This Week

### vllm
- [#39583](https://github.com/vllm-project/vllm/issues/39583) [RFC]: Deprecate bitsandbytes and GGUF quantization support (@mgoin)
- [#40144](https://github.com/vllm-project/vllm/issues/40144) [Bug]: vllm/vllm-openai:nightly-18013df6ae27c3fb941307c46c97 (@psv666)
- [#40165](https://github.com/vllm-project/vllm/issues/40165) [Bug]: HunyuanOCR crashes with "query and key must have the  (@hungthikcode)
- [#40080](https://github.com/vllm-project/vllm/issues/40080) [Bug]: Gemma 4 (31B / 26B-A4B) generates infinite repetition (@Foreist)
- [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- [#39468](https://github.com/vllm-project/vllm/issues/39468) [Bug]: vllm 0.19.0, gemma4, The format of the tool call retu (@Honghe)
- [#40153](https://github.com/vllm-project/vllm/issues/40153) [Bug]: GPT-OSS-20B on RTX PRO 6000 (SM120) falls back to TRI (@dhayanesh)
- [#40069](https://github.com/vllm-project/vllm/issues/40069) [Tracking issue]: TurboQuant/HIGGS Attention follow-ups (@mgoin)
- [#39610](https://github.com/vllm-project/vllm/issues/39610) [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model (@ehfd)
- [#40107](https://github.com/vllm-project/vllm/issues/40107) [Bug]: Exception caught during TVMFFIGetTypeInfo (@lengrongfu)
- [#39985](https://github.com/vllm-project/vllm/issues/39985) [Bug]: Qwen3.5-122B-A10B Engine hangs at Prefill phase under (@ShuZihan)
- [#39915](https://github.com/vllm-project/vllm/issues/39915) [Bug]: Engine core initialization failed (Parent process exi (@MigueXl)
- [#40121](https://github.com/vllm-project/vllm/issues/40121) [Bug]: CUDA graph replay triggers Xid 13 illegal memory acce (@kevinb361)
- [#40094](https://github.com/vllm-project/vllm/issues/40094) [Bug]: Turbo Quant keep failing TRITON_ATTN 'kv_cache_dtype  (@mohamed-em2m)
- [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- [#39768](https://github.com/vllm-project/vllm/issues/39768) [Bug]: Kwargs passed to `processor.__call__` have to be in ` (@fataldemon)
- [#40081](https://github.com/vllm-project/vllm/issues/40081) [Bug]: vLLM fails to start on RDNA 4 (gfx1201) inside contai (@sleeepss)
- [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- [#39996](https://github.com/vllm-project/vllm/issues/39996) [Bug] Fatal AssertionError: Encoder KV cache fails to evict  (@BioAGI-Moretti)
- [#39734](https://github.com/vllm-project/vllm/issues/39734) [Bug]: Scheduler deadlocks when request exceeds KV cache cap (@bbrowning)
- [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- [#40038](https://github.com/vllm-project/vllm/issues/40038) [Bug]: cudaErrorIllegalAddress during PIECEWISE CUDA graph r (@TheDuyIT)
- [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- [#40002](https://github.com/vllm-project/vllm/issues/40002) [Bug]: Inconsistent KV Cache reporting and system hang on lo (@GitEventhandler)
- [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)
- [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)
- [#39485](https://github.com/vllm-project/vllm/issues/39485) [Bug]: Runtime error on ROCm platform serving Deepseek-R1 us (@vllmellm)

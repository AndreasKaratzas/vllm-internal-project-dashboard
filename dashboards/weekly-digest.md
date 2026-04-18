# Weekly Digest

Week of 2026-04-11 to 2026-04-18

## New Releases

- **vllm**: [v0.19.1](https://github.com/vllm-project/vllm/releases/tag/v0.19.1)

## PRs This Week

### vllm
- Opened: [#39721](https://github.com/vllm-project/vllm/pull/39721) [ROCm] ROCm DeepEP API updated to latest (@itej89)
- Opened: [#39931](https://github.com/vllm-project/vllm/pull/39931) [Feature] TurboQuant: support hybrid models and uniform quan (@JartX)
- Opened: [#40254](https://github.com/vllm-project/vllm/pull/40254) [ROCm] Add missing gfx1152, gfx1153, and enable all gpu arch (@thelittlefireman)
- Opened: [#39967](https://github.com/vllm-project/vllm/pull/39967) [ZenCPU] AMD Zen CPU Backend with supported dtypes via zento (@Chinmay-Kulkarni-AMD)
- Opened: [#39953](https://github.com/vllm-project/vllm/pull/39953) [ROCm] Fix TurboQuant on ROCm: backend routing, flash-attn c (@aditi-amd)
- Opened: [#39978](https://github.com/vllm-project/vllm/pull/39978) [ROCm][CI] Build fastsafetensors from source so it links aga (@AndreasKaratzas)
- Merged: [#39079](https://github.com/vllm-project/vllm/pull/39079) [Refactor] Drop direct dependency on librosa (@NickCao)
- Merged: [#38396](https://github.com/vllm-project/vllm/pull/38396) [AMD][CI] Update DeepEP branch (@rjrock)

## New Issues This Week

### vllm
- [#40260](https://github.com/vllm-project/vllm/issues/40260) [Bug]: Incompatible dimension when usiong Mistral Small 4 (@MalcolmMielle)
- [#40259](https://github.com/vllm-project/vllm/issues/40259) [Bug]: v0.19.1 Crash with CUDA invalid argument / Segfault w (@BenWongCityuCS)
- [#40256](https://github.com/vllm-project/vllm/issues/40256) [Bug]: Inaccurate available memory for KV cache when sleep m (@djparente)
- [#40212](https://github.com/vllm-project/vllm/issues/40212) [CI Failure]: mi325_1: Kernels MoE Test %N (@AndreasKaratzas)
- [#40241](https://github.com/vllm-project/vllm/issues/40241) [CI Failure]: mi355_2: Distributed Tests (2 GPUs)(H100-MI355 (@AndreasKaratzas)
- [#40243](https://github.com/vllm-project/vllm/issues/40243) [CI Failure]: mi355_4: DP EP Distributed NixlConnector PD ac (@AndreasKaratzas)
- [#40242](https://github.com/vllm-project/vllm/issues/40242) [CI Failure]: mi355_2: NixlConnector PD + Spec Decode accept (@AndreasKaratzas)
- [#40240](https://github.com/vllm-project/vllm/issues/40240) [CI Failure]: mi355_1: V1 Spec Decode (@AndreasKaratzas)
- [#40239](https://github.com/vllm-project/vllm/issues/40239) [CI Failure]: mi355_1: V1 Sample + Logits (@AndreasKaratzas)
- [#40238](https://github.com/vllm-project/vllm/issues/40238) [CI Failure]: mi355_1: V1 Core + KV + Metrics (@AndreasKaratzas)
- [#40237](https://github.com/vllm-project/vllm/issues/40237) [CI Failure]: mi355_1: Quantization (@AndreasKaratzas)
- [#40236](https://github.com/vllm-project/vllm/issues/40236) [CI Failure]: mi355_1: Multi-Modal Models (Standard) 4: othe (@AndreasKaratzas)
- [#40235](https://github.com/vllm-project/vllm/issues/40235) [CI Failure]: mi355_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40234](https://github.com/vllm-project/vllm/issues/40234) [CI Failure]: mi355_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40233](https://github.com/vllm-project/vllm/issues/40233) [CI Failure]: mi355_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40232](https://github.com/vllm-project/vllm/issues/40232) [CI Failure]: mi355_1: Language Models Tests (Standard) (@AndreasKaratzas)
- [#40231](https://github.com/vllm-project/vllm/issues/40231) [CI Failure]: mi355_1: Language Models Test (Extended Genera (@AndreasKaratzas)
- [#40225](https://github.com/vllm-project/vllm/issues/40225) [CI Failure]: mi325_2: Distributed Tests (2 GPUs)(H100-MI325 (@AndreasKaratzas)
- [#40230](https://github.com/vllm-project/vllm/issues/40230) [CI Failure]: mi355_1: Kernels Quantization Test 2 (@AndreasKaratzas)
- [#40229](https://github.com/vllm-project/vllm/issues/40229) [CI Failure]: mi355_1: Kernels Quantization Test 1 (@AndreasKaratzas)
- [#40227](https://github.com/vllm-project/vllm/issues/40227) [CI Failure]: mi355_1: Entrypoints Integration (API Server o (@AndreasKaratzas)
- [#40226](https://github.com/vllm-project/vllm/issues/40226) [CI Failure]: mi355_1: Entrypoints Integration (API Server o (@AndreasKaratzas)
- [#40224](https://github.com/vllm-project/vllm/issues/40224) [CI Failure]: mi325_1: V1 Spec Decode (@AndreasKaratzas)
- [#40223](https://github.com/vllm-project/vllm/issues/40223) [CI Failure]: mi325_1: V1 Core + KV + Metrics (@AndreasKaratzas)
- [#40221](https://github.com/vllm-project/vllm/issues/40221) [CI Failure]: mi325_1: Spec Decode Eagle (@AndreasKaratzas)
- [#40220](https://github.com/vllm-project/vllm/issues/40220) [CI Failure]: mi325_1: Spec Decode Draft Model (@AndreasKaratzas)
- [#40219](https://github.com/vllm-project/vllm/issues/40219) [CI Failure]: mi325_1: PyTorch Compilation Passes Unit Tests (@AndreasKaratzas)
- [#40218](https://github.com/vllm-project/vllm/issues/40218) [CI Failure]: mi325_1: Multi-Modal Models (Standard) 4: othe (@AndreasKaratzas)
- [#40217](https://github.com/vllm-project/vllm/issues/40217) [CI Failure]: mi325_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40216](https://github.com/vllm-project/vllm/issues/40216) [CI Failure]: mi325_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40016](https://github.com/vllm-project/vllm/issues/40016) [Bug]:[SM90][FP8 blockwise] swap_ab path for small/non-multi (@leonardHONG)
- [#40195](https://github.com/vllm-project/vllm/issues/40195) [Bug]: (@kulpsin)
- [#39761](https://github.com/vllm-project/vllm/issues/39761) [Bug]:CUDA illegal instruction during decode (V1 Engine + NV (@Xenon0220)
- [#40192](https://github.com/vllm-project/vllm/issues/40192) [Bug]: vllm在服务claud code时会卡死 (@bltcn)
- [#40153](https://github.com/vllm-project/vllm/issues/40153) [Bug]: GPT-OSS-20B on RTX PRO 6000 (SM120) falls back to TRI (@dhayanesh)
- [#40165](https://github.com/vllm-project/vllm/issues/40165) [Bug]: HunyuanOCR crashes with "query and key must have the  (@hungthikcode)
- [#40144](https://github.com/vllm-project/vllm/issues/40144) [Bug]: vllm/vllm-openai:nightly-18013df6ae27c3fb941307c46c97 (@psv666)
- [#40080](https://github.com/vllm-project/vllm/issues/40080) [Bug]: Gemma 4 (31B / 26B-A4B) generates infinite repetition (@Foreist)
- [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- [#40107](https://github.com/vllm-project/vllm/issues/40107) [Bug]: Exception caught during TVMFFIGetTypeInfo (@lengrongfu)
- [#39985](https://github.com/vllm-project/vllm/issues/39985) [Bug]: Qwen3.5-122B-A10B Engine hangs at Prefill phase under (@ShuZihan)
- [#39915](https://github.com/vllm-project/vllm/issues/39915) [Bug]: Engine core initialization failed (Parent process exi (@MigueXl)
- [#40121](https://github.com/vllm-project/vllm/issues/40121) [Bug]: CUDA graph replay triggers Xid 13 illegal memory acce (@kevinb361)
- [#40094](https://github.com/vllm-project/vllm/issues/40094) [Bug]: Turbo Quant keep failing TRITON_ATTN 'kv_cache_dtype  (@mohamed-em2m)
- [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- [#40081](https://github.com/vllm-project/vllm/issues/40081) [Bug]: vLLM fails to start on RDNA 4 (gfx1201) inside contai (@sleeepss)
- [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)
- [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)

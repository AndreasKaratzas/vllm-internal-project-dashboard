# Weekly Digest

Week of 2026-04-13 to 2026-04-20

## New Releases

- **vllm**: [v0.19.1](https://github.com/vllm-project/vllm/releases/tag/v0.19.1)

## PRs This Week

### vllm
- Opened: [#39703](https://github.com/vllm-project/vllm/pull/39703) [Feat] dflash support for ROCm (@hangy-amd)
- Opened: [#40162](https://github.com/vllm-project/vllm/pull/40162) [ROCm][CI] Patching docker mirrors amidst ubuntu archive out (@AndreasKaratzas)
- Merged: [#39120](https://github.com/vllm-project/vllm/pull/39120) [ROCm] Fix cu_seqlens_q off-by-one in AITER FA speculative d (@Bortlesboat)

## New Issues This Week

### vllm
- [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- [#40297](https://github.com/vllm-project/vllm/issues/40297) [CI Failure]: mi355_1: Kernels Quantization Test %N (@AndreasKaratzas)
- [#40261](https://github.com/vllm-project/vllm/issues/40261) [CI Failure]: mi250_1: LoRA %N (@AndreasKaratzas)
- [#40242](https://github.com/vllm-project/vllm/issues/40242) [CI Failure]: mi355_2: NixlConnector PD + Spec Decode accept (@AndreasKaratzas)
- [#40241](https://github.com/vllm-project/vllm/issues/40241) [CI Failure]: mi355_2: Distributed Tests (2 GPUs)(H100-MI355 (@AndreasKaratzas)
- [#40240](https://github.com/vllm-project/vllm/issues/40240) [CI Failure]: mi355_1: V1 Spec Decode (@AndreasKaratzas)
- [#40239](https://github.com/vllm-project/vllm/issues/40239) [CI Failure]: mi355_1: V1 Sample + Logits (@AndreasKaratzas)
- [#40237](https://github.com/vllm-project/vllm/issues/40237) [CI Failure]: mi355_1: Quantization (@AndreasKaratzas)
- [#40236](https://github.com/vllm-project/vllm/issues/40236) [CI Failure]: mi355_1: Multi-Modal Models (Standard) 4: othe (@AndreasKaratzas)
- [#40235](https://github.com/vllm-project/vllm/issues/40235) [CI Failure]: mi355_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40234](https://github.com/vllm-project/vllm/issues/40234) [CI Failure]: mi355_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40233](https://github.com/vllm-project/vllm/issues/40233) [CI Failure]: mi355_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40232](https://github.com/vllm-project/vllm/issues/40232) [CI Failure]: mi355_1: Language Models Tests (Standard) (@AndreasKaratzas)
- [#40231](https://github.com/vllm-project/vllm/issues/40231) [CI Failure]: mi355_1: Language Models Test (Extended Genera (@AndreasKaratzas)
- [#40227](https://github.com/vllm-project/vllm/issues/40227) [CI Failure]: mi355_1: Entrypoints Integration (API Server o (@AndreasKaratzas)
- [#40226](https://github.com/vllm-project/vllm/issues/40226) [CI Failure]: mi355_1: Entrypoints Integration (API Server o (@AndreasKaratzas)
- [#40225](https://github.com/vllm-project/vllm/issues/40225) [CI Failure]: mi325_2: Distributed Tests (2 GPUs)(H100-MI325 (@AndreasKaratzas)
- [#40224](https://github.com/vllm-project/vllm/issues/40224) [CI Failure]: mi325_1: V1 Spec Decode (@AndreasKaratzas)
- [#40222](https://github.com/vllm-project/vllm/issues/40222) [CI Failure]: mi325_1: Transformers Nightly Models (@AndreasKaratzas)
- [#40221](https://github.com/vllm-project/vllm/issues/40221) [CI Failure]: mi325_1: Spec Decode Eagle (@AndreasKaratzas)
- [#40219](https://github.com/vllm-project/vllm/issues/40219) [CI Failure]: mi325_1: PyTorch Compilation Passes Unit Tests (@AndreasKaratzas)
- [#40218](https://github.com/vllm-project/vllm/issues/40218) [CI Failure]: mi325_1: Multi-Modal Models (Standard) 4: othe (@AndreasKaratzas)
- [#40217](https://github.com/vllm-project/vllm/issues/40217) [CI Failure]: mi325_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40216](https://github.com/vllm-project/vllm/issues/40216) [CI Failure]: mi325_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40215](https://github.com/vllm-project/vllm/issues/40215) [CI Failure]: mi325_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40210](https://github.com/vllm-project/vllm/issues/40210) [CI Failure]: mi325_1: Kernels Core Operation Test (@AndreasKaratzas)
- [#40209](https://github.com/vllm-project/vllm/issues/40209) [CI Failure]: mi325_1: Entrypoints Integration (Pooling) (@AndreasKaratzas)
- [#40208](https://github.com/vllm-project/vllm/issues/40208) [CI Failure]: mi325_1: Entrypoints Integration (API Server o (@AndreasKaratzas)
- [#40207](https://github.com/vllm-project/vllm/issues/40207) [CI Failure]: mi250_4: Hyrbid SSM NixlConnector PD accuracy  (@AndreasKaratzas)
- [#40204](https://github.com/vllm-project/vllm/issues/40204) [CI Failure]: mi250_1: OpenAI API correctness (@AndreasKaratzas)
- [#40302](https://github.com/vllm-project/vllm/issues/40302) [Bug]: Engine crashes with AssertionError when prompt exceed (@key4ng)
- [#40301](https://github.com/vllm-project/vllm/issues/40301) [Bug]: Triton MXFP4 MoE device capability check < (11, 0) br (@kyuz0)
- [#40094](https://github.com/vllm-project/vllm/issues/40094) [Bug]: Turbo Quant keep failing TRITON_ATTN 'kv_cache_dtype  (@mohamed-em2m)
- [#40291](https://github.com/vllm-project/vllm/issues/40291) [Bug]:  Gemma-4-31B-IT-NVFP4  (modelopt) causing OOM on sing (@Cbr81)
- [#40290](https://github.com/vllm-project/vllm/issues/40290) [Bug]: Gemma 4 (31B/26B-A4B) vision outputs only <pad> under (@wenqiangire-commits)
- [#40286](https://github.com/vllm-project/vllm/issues/40286) [Bug]: v0.19.1 failed to load AWQ 4bit quantization of Gemma (@NeoChen1024)
- [#40080](https://github.com/vllm-project/vllm/issues/40080) [Bug]: Gemma 4 (31B / 26B-A4B) generates infinite repetition (@Foreist)
- [#40144](https://github.com/vllm-project/vllm/issues/40144) [Bug]: vllm/vllm-openai:nightly-18013df6ae27c3fb941307c46c97 (@psv666)
- [#40165](https://github.com/vllm-project/vllm/issues/40165) [Bug]: HunyuanOCR crashes with "query and key must have the  (@hungthikcode)
- [#40260](https://github.com/vllm-project/vllm/issues/40260) [Bug]: Incompatible dimension when using Mistral Small 4 (@MalcolmMielle)
- [#40259](https://github.com/vllm-project/vllm/issues/40259) [Bug]: v0.19.1 Crash with CUDA invalid argument / Segfault w (@BenWongCityuCS)
- [#40256](https://github.com/vllm-project/vllm/issues/40256) [Bug]: Inaccurate available memory for KV cache when sleep m (@djparente)
- [#40195](https://github.com/vllm-project/vllm/issues/40195) [Bug]: (@kulpsin)
- [#40192](https://github.com/vllm-project/vllm/issues/40192) [Bug]: vllm在服务claud code时会卡死 (@bltcn)
- [#40153](https://github.com/vllm-project/vllm/issues/40153) [Bug]: GPT-OSS-20B on RTX PRO 6000 (SM120) falls back to TRI (@dhayanesh)
- [#39749](https://github.com/vllm-project/vllm/issues/39749) [Roadmap] [Draft] vLLM Roadmap Q2 2026 (@simon-mo)
- [#40081](https://github.com/vllm-project/vllm/issues/40081) [Bug]: vLLM fails to start on RDNA 4 (gfx1201) inside contai (@sleeepss)
- [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)
- [#39678](https://github.com/vllm-project/vllm/issues/39678) [RFC]: Async parallel startup for EngineCore processes in DP (@hwhaokun)

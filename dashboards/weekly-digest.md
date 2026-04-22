# Weekly Digest

Week of 2026-04-15 to 2026-04-22

## New Releases

- **vllm**: [v0.19.1](https://github.com/vllm-project/vllm/releases/tag/v0.19.1)

## PRs This Week

### vllm
- Opened: [#39931](https://github.com/vllm-project/vllm/pull/39931) [Feature] TurboQuant: support hybrid models and uniform quan (@JartX)
- Opened: [#40549](https://github.com/vllm-project/vllm/pull/40549) [ROCm] Enable SimpleCPUOffloadConnector on ROCm (@hongxiayang)
- Opened: [#40561](https://github.com/vllm-project/vllm/pull/40561) [Core] Add `VLLM_GPU_SYNC_CHECK` env var (@njhill)
- Opened: [#40338](https://github.com/vllm-project/vllm/pull/40338) [LoRA] MoE LoRA Refactor (@jeejeelee)
- Opened: [#40360](https://github.com/vllm-project/vllm/pull/40360) [ROCm][MoRI] Add layer for building bnxt (Thor2) NIC stack  (@simondanielsson)
- Opened: [#40132](https://github.com/vllm-project/vllm/pull/40132) [xpu][rocm] Update `current_platform.supports_fp8()` for Tri (@ILikeIneine)
- Merged: [#39024](https://github.com/vllm-project/vllm/pull/39024) Add structure to `requirements/` directory (@hmellor)
- Merged: [#35737](https://github.com/vllm-project/vllm/pull/35737) [NVFP4] NVFP4 MOE emulation fallback for H100/MI300/MI350, s (@fxmarty-amd)

## New Issues This Week

### vllm
- [#40551](https://github.com/vllm-project/vllm/issues/40551) [Bug]: Worse EAGLE3 acceptance rates on MRV2 (@benchislett)
- [#40628](https://github.com/vllm-project/vllm/issues/40628) [RFC][vLLM IR]: Batch Invariance Dispatching in vLLM IR (@ProExpertProg)
- [#40649](https://github.com/vllm-project/vllm/issues/40649) [Bug]: KeyError on model.layers.N.self_attn.attn during init (@andersonlunz)
- [#40645](https://github.com/vllm-project/vllm/issues/40645) [CI Failure]: mi355_1: Language Models Tests (Standard) (@AndreasKaratzas)
- [#40644](https://github.com/vllm-project/vllm/issues/40644) [CI Failure]: mi250_1: Basic Models Tests (Other) (@AndreasKaratzas)
- [#40632](https://github.com/vllm-project/vllm/issues/40632) [Feature]: Support DFlash for Kimi K2.5 and Qwen3.5-27B for  (@mdavedcgpu)
- [#40240](https://github.com/vllm-project/vllm/issues/40240) [CI Failure]: mi355_1: V1 Spec Decode (@AndreasKaratzas)
- [#40554](https://github.com/vllm-project/vllm/issues/40554) [AMD][CI Failure][Tracker] Static dashboard tracker for curr (@AndreasKaratzas)
- [#40421](https://github.com/vllm-project/vllm/issues/40421) [Feature]: [parity with CUDA] PD disagg recipes on vllm (@functionstackx)
- [#40593](https://github.com/vllm-project/vllm/issues/40593) [Bug][ROCm]: NIXL not available logs when using MoRI connect (@simondanielsson)
- [#40620](https://github.com/vllm-project/vllm/issues/40620) [RFC]: Unified Device Capability Abstraction for Cross-Platf (@jikunshang)
- [#40437](https://github.com/vllm-project/vllm/issues/40437) [Bug]: error in the vllm deployment model gemma-4-31B-it-uns (@GoGo-UpUp)
- [#40604](https://github.com/vllm-project/vllm/issues/40604) [Bug]: DeepSeek-R1 hang on 8xB200 after NCCL Initialization (@SecretSettler)
- [#40081](https://github.com/vllm-project/vllm/issues/40081) [Bug]: vLLM fails to start on RDNA 4 (gfx1201) inside contai (@sleeepss)
- [#40590](https://github.com/vllm-project/vllm/issues/40590) [Bug]: A CUDA memory out-of-bounds bug was triggered. (@SongXiaoMao)
- [#40587](https://github.com/vllm-project/vllm/issues/40587) [Bug]: enable_qk_norm_rope_fusion error on DeepSeek-V3.2-NVF (@carlyou)
- [#40585](https://github.com/vllm-project/vllm/issues/40585) [Bug]: qwen3.5 can not use --decode-context-parallel-size wi (@crystalww)
- [#40397](https://github.com/vllm-project/vllm/issues/40397) [Feature]: Add ROCm support for simple offload connector (@cquil11)
- [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- [#40340](https://github.com/vllm-project/vllm/issues/40340) [Bug]: MoRI Connector hangs at >=128 concurrency (@simondanielsson)
- [#40259](https://github.com/vllm-project/vllm/issues/40259) [Bug]: v0.19.1 Crash with CUDA invalid argument / Segfault w (@BenWongCityuCS)
- [#40435](https://github.com/vllm-project/vllm/issues/40435) [Bug]: v0.19.1 CUDA illegal memory access with --kv-cache-dt (@BenWongCityuCS)
- [#40069](https://github.com/vllm-project/vllm/issues/40069) [Tracking issue]: TurboQuant/HIGGS Attention follow-ups (@mgoin)
- [#40382](https://github.com/vllm-project/vllm/issues/40382) [Bug]: Gemma-4 + DFlash unservable on Ampere — non-causal +  (@noonghunna)
- [#40301](https://github.com/vllm-project/vllm/issues/40301) [Bug]: Triton MXFP4 MoE device capability check < (11, 0) br (@kyuz0)
- [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)

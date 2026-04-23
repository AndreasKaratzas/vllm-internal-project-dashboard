# Weekly Digest

Week of 2026-04-16 to 2026-04-23

## New Releases

- **vllm**: [v0.19.1](https://github.com/vllm-project/vllm/releases/tag/v0.19.1)

## PRs This Week

### vllm
- Opened: [#40549](https://github.com/vllm-project/vllm/pull/40549) [ROCm] Enable SimpleCPUOffloadConnector on ROCm (@hongxiayang)
- Opened: [#39987](https://github.com/vllm-project/vllm/pull/39987) [ROCm] Add env flags to disable dynamic MXFP4 quant and enab (@heachary)
- Opened: [#40037](https://github.com/vllm-project/vllm/pull/40037) [ROCm] Add gfx1102/gfx1103 support (@mgehre-amd)
- Merged: [#38479](https://github.com/vllm-project/vllm/pull/38479) [Attention Backend] TurboQuant: 2-bit KV cache compression w (@vibhavagarwal5)
- Merged: [#39565](https://github.com/vllm-project/vllm/pull/39565) [Fix][MoRI] Align MoRI-IO message format with P2pNcclConnect (@simondanielsson)

## New Issues This Week

### vllm
- [#40301](https://github.com/vllm-project/vllm/issues/40301) [Bug]: Triton MXFP4 MoE device capability check < (11, 0) br (@kyuz0)
- [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)
- [#40699](https://github.com/vllm-project/vllm/issues/40699) [Bug]: For Qwen3.5 serise, Large benchmark gap (~10 points)  (@Katono5)
- [#40696](https://github.com/vllm-project/vllm/issues/40696) [Feature]: Prefix caching completely ineffective for Mamba-h (@Gaodzlearn)
- [#40675](https://github.com/vllm-project/vllm/issues/40675) [RFC] Support Intel ARK Toolkit for AutoRound Quantization o (@Zhenzhong1)
- [#40677](https://github.com/vllm-project/vllm/issues/40677) [Bug]: Gemma-4 fails when forcing FLASHINFER attention backe (@dhayanesh)
- [#40345](https://github.com/vllm-project/vllm/issues/40345) [Bug]: MTP draft head TP allgather deadlock under sustained  (@archit-spec)
- [#40587](https://github.com/vllm-project/vllm/issues/40587) [Bug]: `+rotary_embedding` error with DeepSeek-V3.2-NVFP4 (@carlyou)
- [#40628](https://github.com/vllm-project/vllm/issues/40628) [RFC][vLLM IR]: Batch Invariance Dispatching in vLLM IR (@ProExpertProg)
- [#40551](https://github.com/vllm-project/vllm/issues/40551) [Bug]: Worse EAGLE3 acceptance rates on MRV2 (@benchislett)
- [#40554](https://github.com/vllm-project/vllm/issues/40554) [AMD][CI Failure][Tracker] Static dashboard tracker for curr (@AndreasKaratzas)
- [#40069](https://github.com/vllm-project/vllm/issues/40069) [Tracking issue]: TurboQuant/HIGGS Attention follow-ups (@mgoin)
- [#40649](https://github.com/vllm-project/vllm/issues/40649) [Bug]: KeyError on model.layers.N.self_attn.attn during init (@andersonlunz)
- [#40645](https://github.com/vllm-project/vllm/issues/40645) [CI Failure]: mi355_1: Language Models Tests (Standard) (@AndreasKaratzas)
- [#40644](https://github.com/vllm-project/vllm/issues/40644) [CI Failure]: mi250_1: Basic Models Tests (Other) (@AndreasKaratzas)
- [#40632](https://github.com/vllm-project/vllm/issues/40632) [Feature]: Support DFlash for Kimi K2.5 and Qwen3.5-27B for  (@mdavedcgpu)
- [#40240](https://github.com/vllm-project/vllm/issues/40240) [CI Failure]: mi355_1: V1 Spec Decode (@AndreasKaratzas)
- [#40421](https://github.com/vllm-project/vllm/issues/40421) [Feature]: [parity with CUDA] PD disagg recipes on vllm (@functionstackx)
- [#40593](https://github.com/vllm-project/vllm/issues/40593) [Bug][ROCm]: NIXL not available logs when using MoRI connect (@simondanielsson)
- [#40620](https://github.com/vllm-project/vllm/issues/40620) [RFC]: Unified Device Capability Abstraction for Cross-Platf (@jikunshang)
- [#40081](https://github.com/vllm-project/vllm/issues/40081) [Bug]: vLLM fails to start on RDNA 4 (gfx1201) inside contai (@sleeepss)
- [#40590](https://github.com/vllm-project/vllm/issues/40590) [Bug]: A CUDA memory out-of-bounds bug was triggered. (@SongXiaoMao)
- [#40397](https://github.com/vllm-project/vllm/issues/40397) [Feature]: Add ROCm support for simple offload connector (@cquil11)
- [#40340](https://github.com/vllm-project/vllm/issues/40340) [Bug]: MoRI Connector hangs at >=128 concurrency (@simondanielsson)
- [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)

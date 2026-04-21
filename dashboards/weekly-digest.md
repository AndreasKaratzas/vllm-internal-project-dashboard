# Weekly Digest

Week of 2026-04-14 to 2026-04-21

## New Releases

- **vllm**: [v0.19.1](https://github.com/vllm-project/vllm/releases/tag/v0.19.1)

## PRs This Week

### vllm
- Opened: [#40418](https://github.com/vllm-project/vllm/pull/40418) fix: emit response.failed for responses streaming generation (@Adolfo-Karim)
- Opened: [#39835](https://github.com/vllm-project/vllm/pull/39835) [ROCm][P/D][MORI][BugFix] Ensure correct api is used when ma (@rasmith)
- Opened: [#40366](https://github.com/vllm-project/vllm/pull/40366) [ROCm] Enable building MoRI with AINIC and Broadcom bnxt (Th (@haic0)
- Merged: [#38479](https://github.com/vllm-project/vllm/pull/38479) [Attention Backend] TurboQuant: 2-bit KV cache compression w (@vibhavagarwal5)

## New Issues This Week

### vllm
- [#39885](https://github.com/vllm-project/vllm/issues/39885) [Bug]: --reasoning-parser gemma4: streaming leaks reasoning  (@abdel21k)
- [#40240](https://github.com/vllm-project/vllm/issues/40240) [CI Failure]: mi355_1: V1 Spec Decode (@AndreasKaratzas)
- [#40375](https://github.com/vllm-project/vllm/issues/40375) [CI Failure]: mi250_1: Multi-Modal Models (Extended Generati (@AndreasKaratzas)
- [#40340](https://github.com/vllm-project/vllm/issues/40340) [Bug]: MoRI Connector hangs at >=128 concurrency (@simondanielsson)
- [#40397](https://github.com/vllm-project/vllm/issues/40397) [Feature]: Add ROCm support for simple offload connector (@cquil11)
- [#40466](https://github.com/vllm-project/vllm/issues/40466) [Bug]: Streaming output incorrectly mapped to `reasoning` fi (@linqiuu)
- [#40437](https://github.com/vllm-project/vllm/issues/40437) [Bug]: error in the vllm deployment model gemma-4-31B-it-uns (@GoGo-UpUp)
- [#40259](https://github.com/vllm-project/vllm/issues/40259) [Bug]: v0.19.1 Crash with CUDA invalid argument / Segfault w (@BenWongCityuCS)
- [#40435](https://github.com/vllm-project/vllm/issues/40435) [Bug]: v0.19.1 CUDA illegal memory access with --kv-cache-dt (@BenWongCityuCS)
- [#40421](https://github.com/vllm-project/vllm/issues/40421) [Feature]: [parity with CUDA] PD disagg recipes on vllm (@functionstackx)
- [#39871](https://github.com/vllm-project/vllm/issues/39871) [RFC]: Replace Hardcoded Device Strings with current_platfor (@wincent8)
- [#40365](https://github.com/vllm-project/vllm/issues/40365) [Bug]: Multi-modal warmup is run even in `language_model_onl (@mxbi)
- [#40069](https://github.com/vllm-project/vllm/issues/40069) [Tracking issue]: TurboQuant/HIGGS Attention follow-ups (@mgoin)
- [#40382](https://github.com/vllm-project/vllm/issues/40382) [Bug]: Gemma-4 + DFlash unservable on Ampere — non-causal +  (@noonghunna)
- [#40081](https://github.com/vllm-project/vllm/issues/40081) [Bug]: vLLM fails to start on RDNA 4 (gfx1201) inside contai (@sleeepss)
- [#40381](https://github.com/vllm-project/vllm/issues/40381) [Bug]: Buffer overflow when allocating memory error on Qwen3 (@ECMGit)
- [#40374](https://github.com/vllm-project/vllm/issues/40374) [Bug]: vllm does not use all of the available RAM (@ggaudeau)
- [#40358](https://github.com/vllm-project/vllm/issues/40358) [Usage]: KeyError: 'layers.0.mlp.experts.w13_bias' when runn (@damadei-g)
- [#40354](https://github.com/vllm-project/vllm/issues/40354) [Bug]: Ampere sm_86 can't load W4A16 quant at TP=2 when a la (@noonghunna)
- [#40345](https://github.com/vllm-project/vllm/issues/40345) [Bug]: MTP draft head TP allgather deadlock under sustained  (@archit-spec)
- [#40301](https://github.com/vllm-project/vllm/issues/40301) [Bug]: Triton MXFP4 MoE device capability check < (11, 0) br (@kyuz0)
- [#40302](https://github.com/vllm-project/vllm/issues/40302) [Bug]: Engine crashes with AssertionError when prompt exceed (@key4ng)
- [#40094](https://github.com/vllm-project/vllm/issues/40094) [Bug]: Turbo Quant keep failing TRITON_ATTN 'kv_cache_dtype  (@mohamed-em2m)
- [#40195](https://github.com/vllm-project/vllm/issues/40195) [Bug]: (@kulpsin)
- [#40153](https://github.com/vllm-project/vllm/issues/40153) [Bug]: GPT-OSS-20B on RTX PRO 6000 (SM120) falls back to TRI (@dhayanesh)
- [#40018](https://github.com/vllm-project/vllm/issues/40018) [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for  (@ghpu)
- [#39965](https://github.com/vllm-project/vllm/issues/39965) [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b (@RagulMCW)
- [#40000](https://github.com/vllm-project/vllm/issues/40000) [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 (@vllmellm)
- [#40008](https://github.com/vllm-project/vllm/issues/40008) [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con (@fxmarty-amd)

# Weekly Digest

Week of 2026-04-23 to 2026-04-30

## New Releases

- **vllm**: [v0.20.0](https://github.com/vllm-project/vllm/releases/tag/v0.20.0)

## PRs This Week

### vllm
- Opened: [#41020](https://github.com/vllm-project/vllm/pull/41020) [ROCm] Eliminate redundant MoE buffer copies in AITER fused  (@frida-andersson)
- Opened: [#41165](https://github.com/vllm-project/vllm/pull/41165) [ROCm][Bugfix][GPTOSS]: fix input_ids and expert_map args fo (@Rohan138)
- Opened: [#41060](https://github.com/vllm-project/vllm/pull/41060) [Model] Add RWKV-7 (Goose) inference support (@sirus20x6)
- Opened: [#41294](https://github.com/vllm-project/vllm/pull/41294) [ROCm][CI] Fix and stabilize EAGLE3 acceptance tests (@AndreasKaratzas)
- Opened: [#41290](https://github.com/vllm-project/vllm/pull/41290) [Bugfix][CI][Hardware][AMD] Fix various e4m3fn -> e4m3fnuz n (@mawong-amd)
- Opened: [#41175](https://github.com/vllm-project/vllm/pull/41175) [ROCm][Bugfix]: W4A4 MOE using emulation instead of AITER on (@Rohan138)
- Opened: [#41226](https://github.com/vllm-project/vllm/pull/41226) [ROCm][AITER][Bugfix] Disable emulation for MoE (@heachary)
- Merged: [#39978](https://github.com/vllm-project/vllm/pull/39978) [ROCm][CI] Build fastsafetensors from source so it links aga (@AndreasKaratzas)
- Merged: [#39987](https://github.com/vllm-project/vllm/pull/39987) [ROCm] Add env flags to disable dynamic MXFP4 quant and enab (@heachary)
- Merged: [#39121](https://github.com/vllm-project/vllm/pull/39121) [ROCm] Use quant_dtype in per_token_quant instead of hardcod (@Bortlesboat)

## New Issues This Week

### vllm
- [#41295](https://github.com/vllm-project/vllm/issues/41295) [CI Failure]:  mi355_1: Quantization (@AndreasKaratzas)
- [#41291](https://github.com/vllm-project/vllm/issues/41291) [Refactor] Merge `select_gpt_oss_mxfp4_moe_backend` and `sel (@BowenBao)
- [#41292](https://github.com/vllm-project/vllm/issues/41292) [Bug]: KDA chunked prefill uses wrong recurrent state layout (@yudigege86)
- [#41287](https://github.com/vllm-project/vllm/issues/41287) [Bug]: V1 + Ray multi-node pipeline parallel `KeyError` at K (@jamesbraza)
- [#41284](https://github.com/vllm-project/vllm/issues/41284) [Bug]: Unable to use ibm-granite/granite-speech-4.1-2b with  (@wnm3)
- [#41257](https://github.com/vllm-project/vllm/issues/41257) [Bug]: vLLM + FlexAttention crashes with torch._dynamo.exc.I (@JamesLee-Jones)
- [#41103](https://github.com/vllm-project/vllm/issues/41103) [Bug]: glibc error when using vllm-0.20.0+cu129-cp38-abi3-ma (@JaheimLee)
- [#40801](https://github.com/vllm-project/vllm/issues/40801) [Bug]: Title: DeepSeek V4 intermittently leaks DSML fragment (@Windswithyou)
- [#40980](https://github.com/vllm-project/vllm/issues/40980) [Bug]: TP=2 deadlock on dual AMD R9700 (gfx1201/RDNA4) — GPU (@kyuz0)
- [#41207](https://github.com/vllm-project/vllm/issues/41207) [Bug]: MM accuracy issue caused by transformers upgrade (@yma11)
- [#41108](https://github.com/vllm-project/vllm/issues/41108) [Bug]: GLM-5.1-NVFP4 RuntimeError: The size of tensor a (307 (@paolovic)
- [#40756](https://github.com/vllm-project/vllm/issues/40756) [Bug]: MTP speculative decoding crash with illegal memory ac (@SongXiaoMao)
- [#40902](https://github.com/vllm-project/vllm/issues/40902) [Roadmap] DeepSeek V4 (@ivanium)
- [#41027](https://github.com/vllm-project/vllm/issues/41027) [Bug]: can't run deepseek v4 flash (@WangHHY19931001)
- [#40949](https://github.com/vllm-project/vllm/issues/40949) [Bug]: Huggingface Tokenizer "RuntimeError: Already borrowed (@yzong-rh)
- [#41174](https://github.com/vllm-project/vllm/issues/41174) [Bug]: `sharded_state` load fails for FP8 models: `_filter_s (@mickelliu)
- [#41153](https://github.com/vllm-project/vllm/issues/41153) [Bug]:[Qwen3.5] V1 KV cache page size unification fails for  (@shanyulu)
- [#41092](https://github.com/vllm-project/vllm/issues/41092) [ROCm][Bug]: Quark MXFP4 `w_mxfp4_a_mxfp4` linear path corru (@AndreasKaratzas)
- [#41071](https://github.com/vllm-project/vllm/issues/41071) [Bug]: KeyError: 'layers.0.mlp.experts.w13_bias' when runnin (@damadei-g)
- [#40994](https://github.com/vllm-project/vllm/issues/40994) [Bug]: vllm does not expose /v1/audio/transcriptions for goo (@vanbukin)
- [#40675](https://github.com/vllm-project/vllm/issues/40675) [RFC] Support Intel Quantization Toolkit AutoRound on Intel  (@Zhenzhong1)
- [#40966](https://github.com/vllm-project/vllm/issues/40966) [Bug]: Triton MLA decode kernel shape mismatch for Mistral-S (@vllmellm)
- [#40771](https://github.com/vllm-project/vllm/issues/40771) [Bug]: AMD MI250 scheduling bug on Gemma2 (@Concurrensee)

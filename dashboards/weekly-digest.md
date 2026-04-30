# Weekly Digest

Week of 2026-04-23 to 2026-04-30

## New Releases

- **vllm**: [v0.20.0](https://github.com/vllm-project/vllm/releases/tag/v0.20.0)

## PRs This Week

### vllm
- Opened: [#41197](https://github.com/vllm-project/vllm/pull/41197) [ROCM][benchmark] reduce moe tuning search space (@amd-xavierwang)
- Opened: [#41335](https://github.com/vllm-project/vllm/pull/41335) [ROCm][CI] Align spec decode logprob test prefill settings (@AndreasKaratzas)
- Opened: [#41341](https://github.com/vllm-project/vllm/pull/41341) [ROCm][CI] Add ROCm score absolute tolerance floor (@AndreasKaratzas)
- Opened: [#41330](https://github.com/vllm-project/vllm/pull/41330) [ROCm][CI] Fix GPT-OSS Quark MXFP4+FP8 MoE startup (@AndreasKaratzas)
- Opened: [#41313](https://github.com/vllm-project/vllm/pull/41313) [ROCm][CI] Fix NIXL spec-decode acceptance startup and diagn (@AndreasKaratzas)
- Opened: [#41294](https://github.com/vllm-project/vllm/pull/41294) [ROCm][CI] Fix and stabilize EAGLE3 acceptance tests (@AndreasKaratzas)
- Opened: [#41290](https://github.com/vllm-project/vllm/pull/41290) [Bugfix][CI][Hardware][AMD] Fix various e4m3fn -> e4m3fnuz n (@mawong-amd)
- Merged: [#39721](https://github.com/vllm-project/vllm/pull/39721) [ROCm] ROCm DeepEP API updated to latest (@itej89)
- Merged: [#39079](https://github.com/vllm-project/vllm/pull/39079) [Refactor] Drop direct dependency on librosa (@NickCao)

## New Issues This Week

### vllm
- [#41369](https://github.com/vllm-project/vllm/issues/41369) [Bug]: Gemma4 Fast Prefill Optimization degrades p95 inter-t (@GaurangTandon)
- [#41368](https://github.com/vllm-project/vllm/issues/41368) [Bug]: vllm-0.20.0 metrics not accurate (@crystalww)
- [#41321](https://github.com/vllm-project/vllm/issues/41321) [CI Failure]:  mi300_1: Acceptance Length Test (Large Models (@AndreasKaratzas)
- [#41343](https://github.com/vllm-project/vllm/issues/41343) [Bug]: `kv_cache_dtype="fp8_e5m2"` silently corrupts output  (@Ningke-Li)
- [#41360](https://github.com/vllm-project/vllm/issues/41360) [Bug]: Qwen3-30B-A3B on B200 (TP=8) — K must be divisible by (@huydhn)
- [#41027](https://github.com/vllm-project/vllm/issues/41027) [Bug]: can't run deepseek v4 flash (@WangHHY19931001)
- [#40801](https://github.com/vllm-project/vllm/issues/40801) [Bug]: Title: DeepSeek V4 intermittently leaks DSML fragment (@Windswithyou)
- [#41292](https://github.com/vllm-project/vllm/issues/41292) [Bug]: KDA chunked prefill uses wrong recurrent state layout (@yudigege86)
- [#41342](https://github.com/vllm-project/vllm/issues/41342) [CI Failure]:  mi355_1: Entrypoints Integration (Pooling) (@AndreasKaratzas)
- [#41339](https://github.com/vllm-project/vllm/issues/41339) [Bug]: block_size < 16 silently falls back to FLEX_ATTENTION (@Ningke-Li)
- [#41324](https://github.com/vllm-project/vllm/issues/41324) [CI Failure]:  mi355_2: GPQA Eval (GPT-OSS) (2xB200-2xMI355) (@AndreasKaratzas)
- [#41257](https://github.com/vllm-project/vllm/issues/41257) [Bug]: vLLM + FlexAttention crashes with torch._dynamo.exc.I (@JamesLee-Jones)
- [#41336](https://github.com/vllm-project/vllm/issues/41336) [CI Failure]:  mi355_1: V1 Sample + Logits (@AndreasKaratzas)
- [#41295](https://github.com/vllm-project/vllm/issues/41295) [CI Failure]:  mi355_1: Quantization (@AndreasKaratzas)
- [#41331](https://github.com/vllm-project/vllm/issues/41331) [Bug]: Garbled Output in DeepSeek-V4 with CUDA Graph Enabled (@ftgreat)
- [#40728](https://github.com/vllm-project/vllm/issues/40728) [CI Failure]: mi355_1: Kernels MoE Test %N (@AndreasKaratzas)
- [#40675](https://github.com/vllm-project/vllm/issues/40675) [RFC] Support Intel Quantization Toolkit AutoRound on Intel  (@Zhenzhong1)
- [#41323](https://github.com/vllm-project/vllm/issues/41323) [CI Failure]:  mi300_1: V1 Core + KV + Metrics (@AndreasKaratzas)
- [#41319](https://github.com/vllm-project/vllm/issues/41319) [CI Failure]:  mi355_2: NixlConnector PD + Spec Decode accep (@AndreasKaratzas)
- [#41291](https://github.com/vllm-project/vllm/issues/41291) [Refactor] Merge `select_gpt_oss_mxfp4_moe_backend` and `sel (@BowenBao)
- [#40902](https://github.com/vllm-project/vllm/issues/40902) [Roadmap] DeepSeek V4 (@ivanium)
- [#41287](https://github.com/vllm-project/vllm/issues/41287) [Bug]: V1 + Ray multi-node pipeline parallel `KeyError` at K (@jamesbraza)
- [#41284](https://github.com/vllm-project/vllm/issues/41284) [Bug]: Unable to use ibm-granite/granite-speech-4.1-2b with  (@wnm3)
- [#41103](https://github.com/vllm-project/vllm/issues/41103) [Bug]: glibc error when using vllm-0.20.0+cu129-cp38-abi3-ma (@JaheimLee)
- [#40980](https://github.com/vllm-project/vllm/issues/40980) [Bug]: TP=2 deadlock on dual AMD R9700 (gfx1201/RDNA4) — GPU (@kyuz0)
- [#41207](https://github.com/vllm-project/vllm/issues/41207) [Bug]: MM accuracy issue caused by transformers upgrade (@yma11)
- [#41174](https://github.com/vllm-project/vllm/issues/41174) [Bug]: `sharded_state` load fails for FP8 models: `_filter_s (@mickelliu)
- [#41092](https://github.com/vllm-project/vllm/issues/41092) [ROCm][Bug]: Quark MXFP4 `w_mxfp4_a_mxfp4` linear path corru (@AndreasKaratzas)
- [#40966](https://github.com/vllm-project/vllm/issues/40966) [Bug]: Triton MLA decode kernel shape mismatch for Mistral-S (@vllmellm)
- [#40771](https://github.com/vllm-project/vllm/issues/40771) [Bug]: AMD MI250 scheduling bug on Gemma2 (@Concurrensee)

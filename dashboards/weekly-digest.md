# Weekly Digest

Week of 2026-04-24 to 2026-05-01

## New Releases

- **vllm**: [v0.20.0](https://github.com/vllm-project/vllm/releases/tag/v0.20.0)

## PRs This Week

### vllm
- Opened: [#41315](https://github.com/vllm-project/vllm/pull/41315) Avoid redundant AITER MoE output copies (@jiacao-amd)
- Opened: [#41423](https://github.com/vllm-project/vllm/pull/41423) [Bugfix] Fix spawn_new_process_for_each_test silently swallo (@dzhengAP)
- Opened: [#41165](https://github.com/vllm-project/vllm/pull/41165) [ROCm][Bugfix][GPTOSS]: fix input_ids and expert_map args fo (@Rohan138)
- Opened: [#41217](https://github.com/vllm-project/vllm/pull/41217) [ROCm][Deepseek] dsv3.2 further optimization (@ganyi1996ppo)
- Opened: [#41294](https://github.com/vllm-project/vllm/pull/41294) [ROCm][CI] Fix and stabilize EAGLE3 acceptance tests (@AndreasKaratzas)
- Opened: [#41335](https://github.com/vllm-project/vllm/pull/41335) [ROCm][CI] Align spec decode logprob test prefill settings (@AndreasKaratzas)
- Opened: [#41290](https://github.com/vllm-project/vllm/pull/41290) [Bugfix][CI][Hardware][AMD] Fix various e4m3fn -> e4m3fnuz n (@mawong-amd)
- Opened: [#41330](https://github.com/vllm-project/vllm/pull/41330) [ROCm][CI] Fix GPT-OSS Quark MXFP4+FP8 MoE startup (@AndreasKaratzas)
- Opened: [#41313](https://github.com/vllm-project/vllm/pull/41313) [ROCm][CI] Fix NIXL spec-decode acceptance startup and diagn (@AndreasKaratzas)
- Merged: [#32623](https://github.com/vllm-project/vllm/pull/32623) [Attention] Abstract the MLA prefill backends and eliminate  (@MatthewBonanni)
- Merged: [#37646](https://github.com/vllm-project/vllm/pull/37646) [ROCm][FEAT] AITER Fused Allreduce + RMSNorm (@vllmellm)

## New Issues This Week

### vllm
- [#41472](https://github.com/vllm-project/vllm/issues/41472) [Bug]: ROCM_ATTN produces incorrect output for LiquidAI LFM2 (@tianshu-Michael-yu)
- [#41468](https://github.com/vllm-project/vllm/issues/41468) [Bug]: Deepseek-OCR-2 cannot be deployed on H20 GPUs with vl (@peterzheng98)
- [#41469](https://github.com/vllm-project/vllm/issues/41469) [Bug]: AttributeError: '_C' object has no attribute 'awq_deq (@noverd)
- [#41207](https://github.com/vllm-project/vllm/issues/41207) [Bug]: MM accuracy issue caused by transformers upgrade (@yma11)
- [#41456](https://github.com/vllm-project/vllm/issues/41456) [Bug]: “max_model_len” in “--speculative-config” is invalid (@KevinLiuMY)
- [#41452](https://github.com/vllm-project/vllm/issues/41452) [Bug]: Gemma4-31B-it deployed on vLLM cannot process images  (@CloudyDory)
- [#40902](https://github.com/vllm-project/vllm/issues/40902) [Roadmap] DeepSeek V4 (@ivanium)
- [#41257](https://github.com/vllm-project/vllm/issues/41257) [Bug]: vLLM + FlexAttention crashes with torch._dynamo.exc.I (@JamesLee-Jones)
- [#41343](https://github.com/vllm-project/vllm/issues/41343) [Bug]: `kv_cache_dtype="fp8_e5m2"` silently corrupts output  (@Ningke-Li)
- [#41402](https://github.com/vllm-project/vllm/issues/41402) [Bug]: DeepSeek-V4-Flash MTP hangs with `vllm bench serve` w (@jasl)
- [#41369](https://github.com/vllm-project/vllm/issues/41369) [Bug]: Gemma4 Fast Prefill Optimization degrades p95 inter-t (@GaurangTandon)
- [#41027](https://github.com/vllm-project/vllm/issues/41027) [Bug]: can't run deepseek v4 flash (@WangHHY19931001)
- [#41413](https://github.com/vllm-project/vllm/issues/41413) [Bug]: TurboQuant fails on non-power-of-2 head_dim (Phi-2, M (@TheTom)
- [#41360](https://github.com/vllm-project/vllm/issues/41360) [Bug]: Qwen3-30B-A3B on B200 (TP=8) — K must be divisible by (@huydhn)
- [#41368](https://github.com/vllm-project/vllm/issues/41368) [Bug]: vllm-0.20.0 metrics not accurate (@crystalww)
- [#40816](https://github.com/vllm-project/vllm/issues/40816) [Bug]: Qwen3.6 streaming chat completions emit final answer  (@xy3xy3)
- [#41390](https://github.com/vllm-project/vllm/issues/41390) [Performance]: Llama-Nemotron embedding is slower than Trans (@charlesbluca)
- [#41321](https://github.com/vllm-project/vllm/issues/41321) [CI Failure]:  mi300_1: Acceptance Length Test (Large Models (@AndreasKaratzas)
- [#40801](https://github.com/vllm-project/vllm/issues/40801) [Bug]: Title: DeepSeek V4 intermittently leaks DSML fragment (@Windswithyou)
- [#41342](https://github.com/vllm-project/vllm/issues/41342) [CI Failure]:  mi355_1: Entrypoints Integration (Pooling) (@AndreasKaratzas)
- [#41324](https://github.com/vllm-project/vllm/issues/41324) [CI Failure]:  mi355_2: GPQA Eval (GPT-OSS) (2xB200-2xMI355) (@AndreasKaratzas)
- [#41336](https://github.com/vllm-project/vllm/issues/41336) [CI Failure]:  mi355_1: V1 Sample + Logits (@AndreasKaratzas)
- [#41295](https://github.com/vllm-project/vllm/issues/41295) [CI Failure]:  mi355_1: Quantization (@AndreasKaratzas)
- [#41331](https://github.com/vllm-project/vllm/issues/41331) [Bug]: Garbled Output in DeepSeek-V4 with CUDA Graph Enabled (@ftgreat)
- [#41323](https://github.com/vllm-project/vllm/issues/41323) [CI Failure]:  mi300_1: V1 Core + KV + Metrics (@AndreasKaratzas)
- [#41319](https://github.com/vllm-project/vllm/issues/41319) [CI Failure]:  mi355_2: NixlConnector PD + Spec Decode accep (@AndreasKaratzas)
- [#41291](https://github.com/vllm-project/vllm/issues/41291) [Refactor] Merge `select_gpt_oss_mxfp4_moe_backend` and `sel (@BowenBao)
- [#40980](https://github.com/vllm-project/vllm/issues/40980) [Bug]: TP=2 deadlock on dual AMD R9700 (gfx1201/RDNA4) — GPU (@kyuz0)
- [#41092](https://github.com/vllm-project/vllm/issues/41092) [ROCm][Bug]: Quark MXFP4 `w_mxfp4_a_mxfp4` linear path corru (@AndreasKaratzas)
- [#40966](https://github.com/vllm-project/vllm/issues/40966) [Bug]: Triton MLA decode kernel shape mismatch for Mistral-S (@vllmellm)
- [#40771](https://github.com/vllm-project/vllm/issues/40771) [Bug]: AMD MI250 scheduling bug on Gemma2 (@Concurrensee)

# PR Tracker

All tracked PRs across projects, grouped by project.

## vllm (Upstream Watch)
Repo: `vllm-project/vllm` | Last collected: 2026-04-08T20:10:11Z

| # | Title | Author | Status | Created | Updated |
|---|-------|--------|--------|---------|---------|
| [#38479](https://github.com/vllm-project/vllm/pull/38479) | [Attention Backend] TurboQuant: 2-bit KV cache compression w... | @vibhavagarwal5 | open | 2026-03-29 | 2026-04-08 |
| [#39219](https://github.com/vllm-project/vllm/pull/39219) | [CI] Fix mypy for `vllm/v1/ops` | @yewentao256 | open | 2026-04-07 | 2026-04-08 |
| [#39341](https://github.com/vllm-project/vllm/issues/39341) | [Bug]: `max_num_batched_tokens=1` raises unhandled `IndexErr... | @kvcache670 | open | 2026-04-08 | 2026-04-08 |
| [#39225](https://github.com/vllm-project/vllm/pull/39225) | [Bug] Fix rocm sparse attn indexer issue | @yewentao256 | open | 2026-04-07 | 2026-04-08 |
| [#39340](https://github.com/vllm-project/vllm/issues/39340) | [Bug]: `block_size=8` triggers Triton CompilationError in Fl... | @kvcache670 | open | 2026-04-08 | 2026-04-08 |
| [#39339](https://github.com/vllm-project/vllm/issues/39339) | [Bug]: `attention_backend='FLASH_ATTN_DIFFKV'` crashes init ... | @kvcache670 | open | 2026-04-08 | 2026-04-08 |
| [#39338](https://github.com/vllm-project/vllm/issues/39338) | [Bug]: `prefix_caching_hash_algo='xxhash'` without `xxhash` ... | @kvcache670 | open | 2026-04-08 | 2026-04-08 |
| [#37249](https://github.com/vllm-project/vllm/pull/37249) | [MoE] Introduce Fp8PrepMixin and class-based dispatch for De... | @yzong-rh | open | 2026-03-17 | 2026-04-08 |
| [#37352](https://github.com/vllm-project/vllm/pull/37352) | [Kernel][Hardware][AMD] Add TritonW4A16LinearKernel for ROCm | @jatseng-ai | open | 2026-03-17 | 2026-04-08 |
| [#39297](https://github.com/vllm-project/vllm/pull/39297) | feat: skip-softmax support for FlashInfer attention path | @jdebache | draft | 2026-04-08 | 2026-04-08 |
| [#39303](https://github.com/vllm-project/vllm/issues/39303) | [Bug]: aiter.ops.triton.attention.pa_mqa_logits.deepgemm_fp8... | @ghpu | open | 2026-04-08 | 2026-04-08 |
| [#39334](https://github.com/vllm-project/vllm/issues/39334) | [Bug]: [CPU] AttributeError: '_OpNamespace' '_C' object has ... | @yaoluxun | open | 2026-04-08 | 2026-04-08 |
| [#39319](https://github.com/vllm-project/vllm/issues/39319) | [Bug]: vLLM docker container with Qwen3.5 - Connection error | @MatteoRiva95 | open | 2026-04-08 | 2026-04-08 |
| [#38817](https://github.com/vllm-project/vllm/pull/38817) | [ROCm] Enable fused_silu_mul_block_quant on ROCm | @gshtras | merged | 2026-04-02 | 2026-04-08 |
| [#38580](https://github.com/vllm-project/vllm/pull/38580) | [ROCm][CI-Build] Cherry pick triton BUFFER_OPS fix and updat... | @gshtras | merged | 2026-03-30 | 2026-04-08 |
| [#37996](https://github.com/vllm-project/vllm/issues/37996) | [Bug]: Qwen3.5 397B GPTQ model outputs all exclamation point... | @hnhyzz | open | 2026-03-24 | 2026-04-08 |
| [#38692](https://github.com/vllm-project/vllm/issues/38692) | [Bug]: parity with CUDA & parity with rocm sglang: vLLM rout... | @functionstackx | open | 2026-04-01 | 2026-04-08 |
| [#32004](https://github.com/vllm-project/vllm/issues/32004) | [Bug]: When running the model on an RTX 5090 GPU, the model ... | @ljwps | open | 2026-01-09 | 2026-04-08 |
| [#38820](https://github.com/vllm-project/vllm/issues/38820) | [Usage]: port question | @CertainlyGo | open | 2026-04-02 | 2026-04-08 |
| [#39300](https://github.com/vllm-project/vllm/pull/39300) | Revert "[release 2.11] Update to torch 2.11" (#34644) | @vllm-agent | closed | 2026-04-08 | 2026-04-08 |
| [#31018](https://github.com/vllm-project/vllm/issues/31018) | [Bug]: ImportError: libcudart.so.12: cannot open shared obje... | @shahizat | open | 2025-12-19 | 2026-04-08 |
| [#38113](https://github.com/vllm-project/vllm/issues/38113) | [Installation]: Ray not present in Container Image | @ed-pai | open | 2026-03-25 | 2026-04-08 |
| [#38903](https://github.com/vllm-project/vllm/issues/38903) | [Bug]: Cross-request context contamination with async schedu... | @agis09 | open | 2026-04-03 | 2026-04-08 |
| [#34644](https://github.com/vllm-project/vllm/pull/34644) | [release 2.11] Update to torch 2.11 | @atalman | merged | 2026-02-16 | 2026-04-08 |
| [#32914](https://github.com/vllm-project/vllm/pull/32914) | [ROCm][perf] Shuffle KV cache to use paged_attention_common | @samutamm | merged | 2026-01-23 | 2026-04-08 |
| [#38171](https://github.com/vllm-project/vllm/issues/38171) | [Feature]: Add TurboQuant Support for KV Cache Quantization | @tunglinwood | open | 2026-03-26 | 2026-04-08 |
| [#38527](https://github.com/vllm-project/vllm/issues/38527) | [Bug]: Qwen3.5-35B-A3B-FP8 model outputs all exclamation poi... | @dengtong | open | 2026-03-30 | 2026-04-08 |
| [#35087](https://github.com/vllm-project/vllm/issues/35087) | [Bug]: DeepSeek 3.2 P/D Disaggregation Support | @yanminjia | open | 2026-02-23 | 2026-04-08 |
| [#38972](https://github.com/vllm-project/vllm/issues/38972) | [Bug]: Mistral Small 4 (119B MoE) fails to start on ROCm MI3... | @maincodeMax | open | 2026-04-04 | 2026-04-08 |
| [#39087](https://github.com/vllm-project/vllm/pull/39087) | [CI][AMD][BugFix][Kernel] Cast induction variable to int64 o... | @rasmith | merged | 2026-04-06 | 2026-04-08 |
| [#39163](https://github.com/vllm-project/vllm/issues/39163) | [Bug]: First request after startup is unexpectedly slow with... | @gakugaku | open | 2026-04-07 | 2026-04-08 |
| [#39271](https://github.com/vllm-project/vllm/issues/39271) | [Bug]: Qwen3.5 crashes when using suffix-decoding | @xhdidi | open | 2026-04-08 | 2026-04-08 |
| [#36456](https://github.com/vllm-project/vllm/issues/36456) | [Bug]: Local GGUF path fails with "architecture qwen35 is no... | @shba007 | open | 2026-03-09 | 2026-04-08 |
| [#39149](https://github.com/vllm-project/vllm/issues/39149) | [Bug]: Segfault in Triton LLVM (MachineCSE / translateLLVMIR... | @1220856302 | open | 2026-04-07 | 2026-04-08 |
| [#39179](https://github.com/vllm-project/vllm/issues/39179) | [Bug]: GLM5 on B300 generates garbage output | @jeejeelee | open | 2026-04-07 | 2026-04-08 |
| [#34449](https://github.com/vllm-project/vllm/issues/34449) | [Bug]: GLM-5-FP8 malformed tool calls | @TALLEC-Scott | open | 2026-02-12 | 2026-04-08 |
| [#39261](https://github.com/vllm-project/vllm/issues/39261) | [Bug]: Kimi K2.5 multimodal inference broken — media_placeho... | @pstefa1707 | open | 2026-04-08 | 2026-04-08 |
| [#19670](https://github.com/vllm-project/vllm/issues/19670) | [Bug]: torch.distributed.DistNetworkError: The client socket... | @zerosurplus | open | 2025-06-16 | 2026-04-08 |
| [#27642](https://github.com/vllm-project/vllm/issues/27642) | [Bug]: SamplingParams.truncate_prompt_tokens has no effect i... | @muupan | open | 2025-10-28 | 2026-04-08 |
| [#29945](https://github.com/vllm-project/vllm/issues/29945) | [Bug]: Got different `max model len` using MTP with Qwen3 ne... | @JaheimLee | open | 2025-12-03 | 2026-04-08 |
| [#30819](https://github.com/vllm-project/vllm/issues/30819) | [Bug]: vLLM inference stuck when requesting video descriptio... | @sidezrw | open | 2025-12-16 | 2026-04-08 |
| [#31884](https://github.com/vllm-project/vllm/issues/31884) | [Bug]: run Qwen3-30B-A3B on 8*A800 2  nodes with DP failed z... | @baoqian426 | open | 2026-01-07 | 2026-04-08 |
| [#39247](https://github.com/vllm-project/vllm/issues/39247) | [Bug]: CUDA illegal memory access when using extract_hidden_... | @noahrossi | open | 2026-04-08 | 2026-04-08 |
| [#39043](https://github.com/vllm-project/vllm/issues/39043) | [Bug]: Vllm + Gemma 4 + claude code: tool calling problems | @drrros | open | 2026-04-05 | 2026-04-07 |
| [#39221](https://github.com/vllm-project/vllm/issues/39221) | [Bug]: Inconsistent tool-calling behavior between Chat Compl... | @robinnarsinghranabhat | open | 2026-04-07 | 2026-04-07 |
| [#39025](https://github.com/vllm-project/vllm/issues/39025) | [Bug]: CUDA illegal memory access with CUDA graphs enabled u... | @vibhavagarwal5 | open | 2026-04-05 | 2026-04-07 |
| [#39071](https://github.com/vllm-project/vllm/issues/39071) | [Bug]: Gemma 4 31B Structured Outputs weird behaviour / char... | @NilsHellwig | open | 2026-04-06 | 2026-04-07 |
| [#39210](https://github.com/vllm-project/vllm/issues/39210) | [Bug] Embedding/pooling models crash on B200 (SM 10.0) — enc... | @praateekmahajan | open | 2026-04-07 | 2026-04-07 |
| [#34851](https://github.com/vllm-project/vllm/issues/34851) | [Feature]: Refactor Quark MoE and mxfp4 MoE to align with Mo... | @BowenBao | open | 2026-02-18 | 2026-04-07 |
| [#39202](https://github.com/vllm-project/vllm/issues/39202) | [Bug]: Crash on Transcription (size for tensor a must match ... | @DefinitlyEvil | open | 2026-04-07 | 2026-04-07 |
| [#38979](https://github.com/vllm-project/vllm/issues/38979) | [Bug]: Regression in vllm 0.19.0 - The page size of the laye... | @outermeasure | open | 2026-04-04 | 2026-04-07 |
| [#27433](https://github.com/vllm-project/vllm/issues/27433) | [Feature]: Batch Invariant Feature and Performance Optimizat... | @yewentao256 | open | 2025-10-23 | 2026-04-07 |
| [#39198](https://github.com/vllm-project/vllm/issues/39198) | [Bug]: HFValidationError when trying to run a GGUF model wit... | @stanislavsimovski | open | 2026-04-07 | 2026-04-07 |
| [#39010](https://github.com/vllm-project/vllm/issues/39010) | [Bug]: Hang During CUDA Graph Capture on ROCM in 0.19 | @depuhitv | open | 2026-04-05 | 2026-04-07 |
| [#39170](https://github.com/vllm-project/vllm/issues/39170) | [Intel-GPU]: Using docker image at intel/vllm:0.17.0-xpu -> ... | @Huehnerbrust | open | 2026-04-07 | 2026-04-07 |
| [#38693](https://github.com/vllm-project/vllm/issues/38693) | [Feature]: Parity with CUDA: vLLM router should have ROCm CI | @functionstackx | open | 2026-04-01 | 2026-04-07 |
| [#39146](https://github.com/vllm-project/vllm/issues/39146) | [Bug]: KV block corruption in base scheduler, Non-determinis... | @Yunzez | open | 2026-04-07 | 2026-04-07 |
| [#27977](https://github.com/vllm-project/vllm/issues/27977) | [Bug]: Qwen3-4B  Engine core proc EngineCore_DP0 died unexpe... | @Ethereal-sakura | open | 2025-11-03 | 2026-04-07 |
| [#30717](https://github.com/vllm-project/vllm/issues/30717) | [RFC]: Token Padding Strategy for FP8 GEMM Performance Optim... | @0xjunhao | open | 2025-12-15 | 2026-04-07 |
| [#38656](https://github.com/vllm-project/vllm/issues/38656) | [Bug]: qwen 3.5 model launch get stuck for quite a long time | @yanan1116 | open | 2026-03-31 | 2026-04-06 |
| [#38936](https://github.com/vllm-project/vllm/issues/38936) | [Bug]: NVIDIA-Nemotron-Nano-12B-v2-VL-BF16 offline execution... | @shilpa-ananth | open | 2026-04-03 | 2026-04-06 |
| [#38994](https://github.com/vllm-project/vllm/issues/38994) | Qwen-3.5 9B often producing repetitive/garbled output with I... | @AlexanderValentini | open | 2026-04-04 | 2026-04-06 |
| [#27340](https://github.com/vllm-project/vllm/issues/27340) | [Bug]: Qwen3-VL-2B-Instruct vllm推理报错 | @mllmivy-ship-it | open | 2025-10-22 | 2026-04-06 |
| [#31687](https://github.com/vllm-project/vllm/issues/31687) | [Bug]: BitBlas quantized models fail during inference | @Conzel | open | 2026-01-04 | 2026-04-06 |
| [#39049](https://github.com/vllm-project/vllm/issues/39049) | [Bug]: Gemma 4 FP8 dynamic quantization = gibberish output | @frenzybiscuit | open | 2026-04-05 | 2026-04-05 |
| [#30136](https://github.com/vllm-project/vllm/issues/30136) | [RFC]: Deprecate Legacy Quantization Formats | @robertgshaw2-redhat | open | 2025-12-05 | 2026-04-05 |
| [#29341](https://github.com/vllm-project/vllm/issues/29341) | [Bug]: sleep level 2 causes gibberish outputs | @qgallouedec | open | 2025-11-24 | 2026-04-05 |

# PR Tracker

All tracked PRs across projects, grouped by project.

## vllm (Upstream Watch)
Repo: `vllm-project/vllm` | Last collected: 2026-04-16T19:18:44Z

| # | Title | Author | Status | Created | Updated |
|---|-------|--------|--------|---------|---------|
| [#39527](https://github.com/vllm-project/vllm/pull/39527) | [Model][Hardware][AMD][Kernel]: Enable e2e QK Norm + RoPE + ... | @jhu960213 | open | 2026-04-10 | 2026-04-16 |
| [#39610](https://github.com/vllm-project/vllm/issues/39610) | [Bug]: [Regression] MiniMax-M2.7/Qwen3.5 and other FP8 model... | @ehfd | open | 2026-04-12 | 2026-04-16 |
| [#39185](https://github.com/vllm-project/vllm/pull/39185) | [KV Offload] Pass request context | @omerpaz95 | open | 2026-04-07 | 2026-04-16 |
| [#38502](https://github.com/vllm-project/vllm/pull/38502) | [ROCm] Cap Triton paged attention block size to fix ROCm sha... | @AndreasKaratzas | open | 2026-03-30 | 2026-04-16 |
| [#40035](https://github.com/vllm-project/vllm/pull/40035) | Rocclr profiler hotfix for ROCm 7.2 | @Rohan138 | open | 2026-04-16 | 2026-04-16 |
| [#38605](https://github.com/vllm-project/vllm/pull/38605) | [Quant][Feature] Support online block_fp8 quant for dense an... | @EdalatiAli | closed | 2026-03-31 | 2026-04-16 |
| [#40049](https://github.com/vllm-project/vllm/pull/40049) | fix(vllm): port skip_kv_gather check and workspace reservati... | @Mati0kez | open | 2026-04-16 | 2026-04-16 |
| [#39513](https://github.com/vllm-project/vllm/pull/39513) | [ROCm] 1st stage of enabling torch stable on ROCm. | @gshtras | open | 2026-04-10 | 2026-04-16 |
| [#40018](https://github.com/vllm-project/vllm/issues/40018) | [Bug]: `ROCM_AITER_MLA_SPARSE` prefill produces garbage for ... | @ghpu | open | 2026-04-16 | 2026-04-16 |
| [#38503](https://github.com/vllm-project/vllm/pull/38503) | [ROCm][Engine] Fix GPU memory leaks in engine shutdown and t... | @AndreasKaratzas | open | 2026-03-30 | 2026-04-16 |
| [#39734](https://github.com/vllm-project/vllm/issues/39734) | [Bug]: Scheduler deadlocks when request exceeds KV cache cap... | @bbrowning | open | 2026-04-13 | 2026-04-16 |
| [#39915](https://github.com/vllm-project/vllm/issues/39915) | [Bug]: Engine core initialization failed (Parent process exi... | @MigueXl | open | 2026-04-15 | 2026-04-16 |
| [#40038](https://github.com/vllm-project/vllm/issues/40038) | [Bug]: cudaErrorIllegalAddress during PIECEWISE CUDA graph r... | @TheDuyIT | open | 2026-04-16 | 2026-04-16 |
| [#39524](https://github.com/vllm-project/vllm/pull/39524) | [Refactor] Remove `resampy` dependency | @Isotr0py | merged | 2026-04-10 | 2026-04-16 |
| [#38123](https://github.com/vllm-project/vllm/pull/38123) | [compile] Allow strings in custom ops without regressing com... | @zou3519 | merged | 2026-03-25 | 2026-04-16 |
| [#29920](https://github.com/vllm-project/vllm/issues/29920) | [Feature]: Add support for fused fp8 output to FlashAttentio... | @ProExpertProg | open | 2025-12-02 | 2026-04-16 |
| [#39871](https://github.com/vllm-project/vllm/issues/39871) | [RFC]: Replace Hardcoded Device Strings with current_platfor... | @wincent8 | open | 2026-04-15 | 2026-04-16 |
| [#40016](https://github.com/vllm-project/vllm/issues/40016) | [Bug]:[SM90][FP8 blockwise] swap_ab path for small/non-multi... | @leonardHONG | open | 2026-04-16 | 2026-04-16 |
| [#39965](https://github.com/vllm-project/vllm/issues/39965) | [Bug]: [ROCm] Performance regression in v0.18.2: ROCM_ATTN b... | @RagulMCW | open | 2026-04-16 | 2026-04-16 |
| [#29117](https://github.com/vllm-project/vllm/pull/29117) | [torch.compile] refactor config hashing to compile_factors a... | @vnadathur | closed | 2025-11-20 | 2026-04-16 |
| [#39491](https://github.com/vllm-project/vllm/issues/39491) | [Bug]: OffloadingConnector GPU->CPU KV offload crashes with ... | @archit-spec | open | 2026-04-10 | 2026-04-16 |
| [#40002](https://github.com/vllm-project/vllm/issues/40002) | [Bug]: Inconsistent KV Cache reporting and system hang on lo... | @GitEventhandler | open | 2026-04-16 | 2026-04-16 |
| [#40000](https://github.com/vllm-project/vllm/issues/40000) | [Bug]: Step 3.5 Flash MTP failed to start in v0.19.0 | @vllmellm | open | 2026-04-16 | 2026-04-16 |
| [#38109](https://github.com/vllm-project/vllm/pull/38109) | [Bugfix] Fix FP8 MoE support detection on ROCm when amdsmi r... | @nemanjaudovic | closed | 2026-03-25 | 2026-04-16 |
| [#40008](https://github.com/vllm-project/vllm/issues/40008) | [Bug][ROCm] MI355 + AITER MXFP4 MOE: `Unsupported kernel con... | @fxmarty-amd | open | 2026-04-16 | 2026-04-16 |
| [#39836](https://github.com/vllm-project/vllm/pull/39836) | [ROCm] INT8 WMMA fast path for QK dot-product in unified att... | @JartX | closed | 2026-04-14 | 2026-04-16 |
| [#39944](https://github.com/vllm-project/vllm/pull/39944) | [Kernel][Helion] Fix inductor fusion of Helion HOP | @gmagogsfm | merged | 2026-04-15 | 2026-04-16 |
| [#39885](https://github.com/vllm-project/vllm/issues/39885) | [Bug]: --reasoning-parser gemma4: streaming leaks reasoning ... | @abdel21k | open | 2026-04-15 | 2026-04-16 |
| [#38171](https://github.com/vllm-project/vllm/issues/38171) | [Feature]: Add TurboQuant Support for KV Cache Quantization | @tunglinwood | open | 2026-03-26 | 2026-04-16 |
| [#38498](https://github.com/vllm-project/vllm/issues/38498) | [Bug][ROCm]: Step3.5 Flash MTP init error | @starwang1024 | open | 2026-03-30 | 2026-04-16 |
| [#39996](https://github.com/vllm-project/vllm/issues/39996) | [Bug] Fatal AssertionError: Encoder KV cache fails to evict ... | @BioAGI-Moretti | open | 2026-04-16 | 2026-04-16 |
| [#19668](https://github.com/vllm-project/vllm/issues/19668) | [Bug]: vllm, EngineCore encountered a fatal error TimeoutErr... | @surajssd | open | 2025-06-15 | 2026-04-16 |
| [#39784](https://github.com/vllm-project/vllm/issues/39784) | [Bug]: ReRank API online inference doesn't work well with gi... | @Leo-yang-1020 | open | 2026-04-14 | 2026-04-16 |
| [#39985](https://github.com/vllm-project/vllm/issues/39985) | [Bug]: Qwen3.5-122B-A10B Engine hangs at Prefill phase under... | @ShuZihan | open | 2026-04-16 | 2026-04-16 |
| [#30679](https://github.com/vllm-project/vllm/issues/30679) | [RFC]: Replace `torch.cuda` API with `torch.accelerator` for... | @jikunshang | open | 2025-12-15 | 2026-04-16 |
| [#31333](https://github.com/vllm-project/vllm/issues/31333) | [Bug]: The base image used by rocm Docker is 7.0-complete, a... | @Uhao-P | open | 2025-12-25 | 2026-04-16 |
| [#39378](https://github.com/vllm-project/vllm/issues/39378) | [Bug]: 0.19.0  rocm+7900xtx： Failed to infer device type | @kittyzero520 | open | 2026-04-09 | 2026-04-16 |
| [#39757](https://github.com/vllm-project/vllm/issues/39757) | [Bug]:  GLM-5 tool calls in stream mode get error tool name | @axinzhangyh | open | 2026-04-14 | 2026-04-16 |
| [#21864](https://github.com/vllm-project/vllm/issues/21864) | [Bug]: GPU OOM when processing AWQ Marlin weights with UVA C... | @averageFOSSenjoyer | open | 2025-07-29 | 2026-04-16 |
| [#26420](https://github.com/vllm-project/vllm/issues/26420) | [Bug]: vLLM server not starting when running Qwen/Qwen3-VL-3... | @dhruvil237 | open | 2025-10-08 | 2026-04-16 |
| [#32242](https://github.com/vllm-project/vllm/issues/32242) | [Bug]: GLM-4.5-Air-NVFP4 models show unexpectedly low throug... | @east612-ai | open | 2026-01-13 | 2026-04-16 |
| [#32278](https://github.com/vllm-project/vllm/issues/32278) | [Bug]: MiniMax M2 Tool Parser Incorrectly Converts Optional ... | @KevinBuettner | open | 2026-01-13 | 2026-04-16 |
| [#32352](https://github.com/vllm-project/vllm/issues/32352) | [Bug]: Seed OSS 36B Tool Parser Fails to Parse Array Paramet... | @ApexArray | open | 2026-01-14 | 2026-04-16 |
| [#32399](https://github.com/vllm-project/vllm/issues/32399) | [Bug]: High Rate of endless Decoding in DeepSeekV3.2 Inferen... | @makabaka6338 | open | 2026-01-15 | 2026-04-16 |
| [#39814](https://github.com/vllm-project/vllm/issues/39814) | [Bug]: FlashInferFP8ScaledMMLinearKernel segfaults on Blackw... | @ZhanqiuHu | open | 2026-04-14 | 2026-04-16 |
| [#39749](https://github.com/vllm-project/vllm/issues/39749) | [Roadmap] [Draft] vLLM Roadmap Q2 2026 | @simon-mo | open | 2026-04-13 | 2026-04-15 |
| [#37406](https://github.com/vllm-project/vllm/issues/37406) | [Bug]: GPU hang on MI325/300 when serving MiniMax-M2.1-MXFP4... | @xuebwang-amd | open | 2026-03-18 | 2026-04-15 |
| [#32434](https://github.com/vllm-project/vllm/issues/32434) | [Bug]: gpt-oss no output with TRITON_ATTN backend with spec ... | @micah-wil | open | 2026-01-15 | 2026-04-15 |
| [#39919](https://github.com/vllm-project/vllm/issues/39919) | [Bug]: DeepSeek OCR doesn't work on vllm 0.19 | @PatrycyD | open | 2026-04-15 | 2026-04-15 |
| [#38687](https://github.com/vllm-project/vllm/issues/38687) | [Bug]: parity with CUDA: ROCm nightly & release docker image... | @functionstackx | open | 2026-04-01 | 2026-04-15 |
| [#39694](https://github.com/vllm-project/vllm/issues/39694) | [RFC]:  PR de-dup/Similarity-Check  CI workflow ? | @panpan0000 | open | 2026-04-13 | 2026-04-15 |
| [#39348](https://github.com/vllm-project/vllm/issues/39348) | [Bug]: Qwen3.5-9B-AWQ on ROCm/vLLM 0.19.0 can get stuck gene... | @Saturnix | open | 2026-04-08 | 2026-04-15 |
| [#39903](https://github.com/vllm-project/vllm/issues/39903) | [Bug]: Significant Cross-Instance Inference Variance in vLLM... | @yszhli | open | 2026-04-15 | 2026-04-15 |
| [#36010](https://github.com/vllm-project/vllm/issues/36010) | [Bug]: Qwen/Qwen3.5-27B Batch Inference very slow / not work... | @NilsHellwig | open | 2026-03-04 | 2026-04-15 |
| [#38692](https://github.com/vllm-project/vllm/issues/38692) | [Bug]: parity with CUDA & parity with rocm sglang: vLLM rout... | @functionstackx | open | 2026-04-01 | 2026-04-15 |
| [#39545](https://github.com/vllm-project/vllm/issues/39545) | [Bug]: gpt-oss-20b unquantized model outputting gibberish wi... | @jiosephlee | open | 2026-04-10 | 2026-04-15 |
| [#39788](https://github.com/vllm-project/vllm/issues/39788) | [Bug]: CUDA OOM with Kimi-K2.5 NVFP4 on both TP4 and TP8 | @msanft | open | 2026-04-14 | 2026-04-15 |
| [#26118](https://github.com/vllm-project/vllm/issues/26118) | [RFC]: Migrate from Ubuntu 20.04 as Build Base to manylinux | @simon-mo | open | 2025-10-02 | 2026-04-15 |
| [#32330](https://github.com/vllm-project/vllm/issues/32330) | [Usage]: Running Qwen3-VL-235B-A22B-Instruct-AWQ on two A100... | @StormMapleleaf | open | 2026-01-14 | 2026-04-15 |
| [#27178](https://github.com/vllm-project/vllm/issues/27178) | [Bug]: torch._dynamo hit recompile_limit using FlexAttention... | @tlrmchlsmth | open | 2025-10-20 | 2026-04-15 |
| [#29076](https://github.com/vllm-project/vllm/issues/29076) | [Bug][RAY]: V1 engine hang with multi-requests on 2 nodes | @Rus-P | open | 2025-11-20 | 2026-04-14 |
| [#30839](https://github.com/vllm-project/vllm/issues/30839) | [RFC]: Enabling Zero-Copy Video with PyNvVideoCodec and IPC | @brandonpelfrey | open | 2025-12-17 | 2026-04-14 |

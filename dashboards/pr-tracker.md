# PR Tracker

All tracked PRs across projects, grouped by project.

## vllm (Upstream Watch)
Repo: `vllm-project/vllm` | Last collected: 2026-04-21T02:32:29Z

| # | Title | Author | Status | Created | Updated |
|---|-------|--------|--------|---------|---------|
| [#39748](https://github.com/vllm-project/vllm/pull/39748) | [Perf] Re-enable dual-stream input projection for Qwen3/Qwen... | @jhsmith409 | open | 2026-04-13 | 2026-04-21 |
| [#39466](https://github.com/vllm-project/vllm/pull/39466) | [XPU] Enable torch.compile for XPU GDN attention | @yuwenzho | open | 2026-04-10 | 2026-04-21 |
| [#32640](https://github.com/vllm-project/vllm/pull/32640) | [ROCm] [CI] [Release] Update the docker image annotation | @tjtanaa | open | 2026-01-20 | 2026-04-21 |
| [#40132](https://github.com/vllm-project/vllm/pull/40132) | [xpu][rocm] Update `current_platform.supports_fp8()` for Tri... | @ILikeIneine | open | 2026-04-17 | 2026-04-21 |
| [#38476](https://github.com/vllm-project/vllm/pull/38476) | [WIP] Add TRITON_MLA_SPARSE backend for SM80 sparse MLA supp... | @haosdent | draft | 2026-03-29 | 2026-04-21 |
| [#40077](https://github.com/vllm-project/vllm/pull/40077) | [WIP][Core] Update PyTorch to 2.12.0, torchvision to 0.27.0,... | @atalman | draft | 2026-04-16 | 2026-04-21 |
| [#40415](https://github.com/vllm-project/vllm/pull/40415) | [CI] Automate Docker Hub release image publishing | @khluu | open | 2026-04-20 | 2026-04-21 |
| [#39931](https://github.com/vllm-project/vllm/pull/39931) | [Feature] TurboQuant: support hybrid models and uniform quan... | @JartX | open | 2026-04-15 | 2026-04-21 |
| [#40167](https://github.com/vllm-project/vllm/pull/40167) | [vLLM IR] Add IR op testing and benchmarking infrastructure | @gmagogsfm | merged | 2026-04-17 | 2026-04-21 |
| [#40416](https://github.com/vllm-project/vllm/pull/40416) | [EC Connector] Fix ECExampleConnector load device under TP>1 | @miyakido | open | 2026-04-21 | 2026-04-21 |
| [#39074](https://github.com/vllm-project/vllm/pull/39074) | [Feature] KV cache per-token-head Int2/Int4 Quantization + T... | @JartX | open | 2026-04-06 | 2026-04-20 |
| [#40390](https://github.com/vllm-project/vllm/pull/40390) | [Bugfix][Rocm]Aiter MoE re-uses existing tensor addresses af... | @yuankaichen-amd | open | 2026-04-20 | 2026-04-20 |
| [#37243](https://github.com/vllm-project/vllm/pull/37243) | [ROCm][CI] Refine gating tests | @AndreasKaratzas | open | 2026-03-17 | 2026-04-20 |
| [#36297](https://github.com/vllm-project/vllm/pull/36297) | Fused BMM+FP8 quant Triton kernel for MLA _v_up_proj (forwar... | @dorhuri123 | open | 2026-03-07 | 2026-04-20 |
| [#40176](https://github.com/vllm-project/vllm/pull/40176) | [ROCm] Support non-causal attention in ROCM_ATTN | @micah-wil | open | 2026-04-17 | 2026-04-20 |
| [#40386](https://github.com/vllm-project/vllm/pull/40386) | [ROCm] Hotfix: guard MLA dual RMS norm fusion against older ... | @rbrugaro-amd | merged | 2026-04-20 | 2026-04-20 |
| [#38299](https://github.com/vllm-project/vllm/pull/38299) | [ROCm] Add AITER RMSNorm+FP8 quantization fusion for MLA | @khairulkabir1661 | open | 2026-03-27 | 2026-04-20 |
| [#39488](https://github.com/vllm-project/vllm/pull/39488) | [vLLM IR][Rope] Port RotaryEmbedding and DeepseekScalingRota... | @wxsIcey | draft | 2026-04-10 | 2026-04-20 |
| [#40396](https://github.com/vllm-project/vllm/pull/40396) | Feat/tq rocm decode v2 | @aditi-amd | draft | 2026-04-20 | 2026-04-20 |
| [#40393](https://github.com/vllm-project/vllm/pull/40393) | [ROCm] Add HIP paged attention kernel for TurboQuant k8v4 de... | @andyluo7 | open | 2026-04-20 | 2026-04-20 |
| [#38166](https://github.com/vllm-project/vllm/pull/38166) | [ROCm][CI] Fix CK MXFP4 MoE GEMM crash for unaligned interme... | @AndreasKaratzas | open | 2026-03-26 | 2026-04-20 |
| [#39716](https://github.com/vllm-project/vllm/pull/39716) | Test mi300 2 | @dhonnappa-amd | open | 2026-04-13 | 2026-04-20 |
| [#40344](https://github.com/vllm-project/vllm/pull/40344) | [Fix] Resolve MoRI connector hangs at high concurrency | @simondanielsson | draft | 2026-04-20 | 2026-04-20 |
| [#38371](https://github.com/vllm-project/vllm/pull/38371) | Enable building MoRI with AMD AINIC stack | @ichbinblau | merged | 2026-03-27 | 2026-04-20 |
| [#39236](https://github.com/vllm-project/vllm/pull/39236) | [Perf] Downgrade mxfp4 triton_kernels to 3.5 | @xyang16 | open | 2026-04-07 | 2026-04-20 |
| [#39987](https://github.com/vllm-project/vllm/pull/39987) | [ROCm] Add env flags to disable dynamic MXFP4 quant and enab... | @heachary | open | 2026-04-16 | 2026-04-20 |
| [#40035](https://github.com/vllm-project/vllm/pull/40035) | [ROCm] torch 2.11 + rocclr profiler hotfix for ROCm 7.2 + ai... | @Rohan138 | open | 2026-04-16 | 2026-04-20 |
| [#39799](https://github.com/vllm-project/vllm/pull/39799) | [ROCm][CI] Fix TestSiluMulGroupFp8QuantModel after W8A8 bloc... | @AndreasKaratzas | open | 2026-04-14 | 2026-04-20 |
| [#38502](https://github.com/vllm-project/vllm/pull/38502) | [ROCm] Cap Triton paged attention block size to fix ROCm sha... | @AndreasKaratzas | open | 2026-03-30 | 2026-04-20 |
| [#39999](https://github.com/vllm-project/vllm/pull/39999) | [ROCm] Cast score correction bias tensor during model constr... | @heachary | open | 2026-04-16 | 2026-04-20 |
| [#35949](https://github.com/vllm-project/vllm/pull/35949) | [MoE Refactor] Move the shared/fused expert output sum into ... | @bnellnm | merged | 2026-03-04 | 2026-04-20 |
| [#40380](https://github.com/vllm-project/vllm/pull/40380) | Require C++20 for compatibility with PyTorch | @r-barnes | open | 2026-04-20 | 2026-04-20 |
| [#32553](https://github.com/vllm-project/vllm/pull/32553) | [P/D] Prefill compute optimizations with bi-directional KV c... | @snadampal | open | 2026-01-18 | 2026-04-20 |
| [#36517](https://github.com/vllm-project/vllm/pull/36517) | Add VLLM_USE_SPINLOOP_EXT to use more efficient busy polling | @pschlan-amd | open | 2026-03-09 | 2026-04-20 |
| [#39513](https://github.com/vllm-project/vllm/pull/39513) | [ROCm] 1st stage of enabling torch stable on ROCm. | @gshtras | open | 2026-04-10 | 2026-04-20 |
| [#40360](https://github.com/vllm-project/vllm/pull/40360) | [ROCm][MoRI] Add layer for building bnxt (Thor2) NIC stack  | @simondanielsson | open | 2026-04-20 | 2026-04-20 |
| [#39242](https://github.com/vllm-project/vllm/pull/39242) | [ROCm] Add MLA dual RMS norm fusion (Q, KV) pass for DeepSee... | @rbrugaro-amd | merged | 2026-04-07 | 2026-04-20 |
| [#39616](https://github.com/vllm-project/vllm/pull/39616) | [ROCm][Feature] Enable AITER MLA attention backend to work w... | @larryli2-amd | merged | 2026-04-12 | 2026-04-20 |
| [#40366](https://github.com/vllm-project/vllm/pull/40366) | [ROCm] Enable building MoRI with AINIC and Broadcom bnxt (Th... | @haic0 | open | 2026-04-20 | 2026-04-20 |
| [#40327](https://github.com/vllm-project/vllm/pull/40327) | attention: add USE_TD constexpr for tensor descriptor Q/K/V ... | @afierka-intel | open | 2026-04-20 | 2026-04-20 |
| [#36276](https://github.com/vllm-project/vllm/pull/36276) | [EPLB] Add nixl-based eplb communicator | @ilmarkov | merged | 2026-03-06 | 2026-04-20 |
| [#39538](https://github.com/vllm-project/vllm/pull/39538) | [Kernel][UX] Add `--linear-backend` arg for linear kernel se... | @mgoin | open | 2026-04-10 | 2026-04-20 |
| [#39653](https://github.com/vllm-project/vllm/pull/39653) | [ROCm] Improve failed device detection diagnostics | @Bortlesboat | open | 2026-04-13 | 2026-04-20 |
| [#39849](https://github.com/vllm-project/vllm/pull/39849) | [ROCm] route known-bad gfx9 ROCM_ATTN mfma4 shapes to Triton | @Bortlesboat | open | 2026-04-15 | 2026-04-20 |
| [#40015](https://github.com/vllm-project/vllm/pull/40015) | [ROCm] Implement GPU-to-NUMA-node detection | @pschlan-amd | open | 2026-04-16 | 2026-04-20 |
| [#38479](https://github.com/vllm-project/vllm/pull/38479) | [Attention Backend] TurboQuant: 2-bit KV cache compression w... | @vibhavagarwal5 | merged | 2026-03-29 | 2026-04-20 |
| [#39531](https://github.com/vllm-project/vllm/pull/39531) | [ROCm][CI] Introducing new MI300 nodes | @AndreasKaratzas | merged | 2026-04-10 | 2026-04-20 |
| [#38503](https://github.com/vllm-project/vllm/pull/38503) | [ROCm][Engine] Fix GPU memory leaks in engine shutdown and t... | @AndreasKaratzas | open | 2026-03-30 | 2026-04-20 |
| [#40037](https://github.com/vllm-project/vllm/pull/40037) | [ROCm] Add gfx1102/gfx1103 support | @mgehre-amd | open | 2026-04-16 | 2026-04-20 |
| [#39801](https://github.com/vllm-project/vllm/pull/39801) | [ROCm][CI] Add missing quantization methods and fix online q... | @AndreasKaratzas | open | 2026-04-14 | 2026-04-20 |
| [#37826](https://github.com/vllm-project/vllm/pull/37826) | [ROCm] Widen OAI Triton MoE capability range to include gfx1... | @laudney | open | 2026-03-22 | 2026-04-20 |
| [#39703](https://github.com/vllm-project/vllm/pull/39703) | [Feat] dflash support for ROCm | @hangy-amd | open | 2026-04-13 | 2026-04-20 |
| [#33955](https://github.com/vllm-project/vllm/pull/33955) | Rocm/fused short seq attention | @MohamedSayedFathy | open | 2026-02-06 | 2026-04-20 |
| [#39856](https://github.com/vllm-project/vllm/pull/39856) | [XPU] update dp rank w/o env-var isolation | @zhenwei-intel | open | 2026-04-15 | 2026-04-20 |
| [#40033](https://github.com/vllm-project/vllm/pull/40033) | [NVFP4][Hopper/AMD Instinct] Add Triton kernels for NVFP4 de... | @fxmarty-amd | open | 2026-04-16 | 2026-04-20 |
| [#35737](https://github.com/vllm-project/vllm/pull/35737) | [NVFP4] NVFP4 MOE emulation fallback for H100/MI300/MI350, s... | @fxmarty-amd | open | 2026-03-02 | 2026-04-20 |
| [#37146](https://github.com/vllm-project/vllm/pull/37146) | Add the option to turn on hipBLASLt online tuning | @hanlin12-AMD | open | 2026-03-16 | 2026-04-20 |
| [#39977](https://github.com/vllm-project/vllm/pull/39977) | [XPU] [torch.compile] Skipping CUDA graph memory estimation ... | @chaojun-zhang | merged | 2026-04-16 | 2026-04-20 |
| [#38444](https://github.com/vllm-project/vllm/pull/38444) | [ROCm][CI] Add K8s-hardened minimal Python CI runner with JU... | @AndreasKaratzas | open | 2026-03-28 | 2026-04-20 |
| [#36949](https://github.com/vllm-project/vllm/pull/36949) | [ROCm][CI] Optimize ROCm Docker build: registry cache, DeepE... | @AndreasKaratzas | open | 2026-03-13 | 2026-04-20 |
| [#39377](https://github.com/vllm-project/vllm/pull/39377) | [ROCm] Fix AssertionError in ActivationQuantFusionPass when ... | @Bortlesboat | open | 2026-04-09 | 2026-04-19 |
| [#39376](https://github.com/vllm-project/vllm/pull/39376) | [Core] Disable HMA for eagle/MTP with sliding window models | @Bortlesboat | open | 2026-04-09 | 2026-04-19 |
| [#39640](https://github.com/vllm-project/vllm/pull/39640) | [ROCm] Use unified decode fallback for sliding-window AITER ... | @Bortlesboat | open | 2026-04-12 | 2026-04-19 |
| [#39120](https://github.com/vllm-project/vllm/pull/39120) | [ROCm] Fix cu_seqlens_q off-by-one in AITER FA speculative d... | @Bortlesboat | merged | 2026-04-06 | 2026-04-19 |
| [#40273](https://github.com/vllm-project/vllm/pull/40273) | Fix MoE backend selection for LoRA (unquantized MoE) | @danisereb | merged | 2026-04-19 | 2026-04-19 |
| [#20859](https://github.com/vllm-project/vllm/pull/20859) | [Feature] limit thinking tokens (hard limit) | @llsj14 | merged | 2025-07-12 | 2026-04-18 |
| [#40254](https://github.com/vllm-project/vllm/pull/40254) | [ROCm] Add missing gfx1152, gfx1153, and enable all gpu arch... | @thelittlefireman | open | 2026-04-18 | 2026-04-18 |
| [#40246](https://github.com/vllm-project/vllm/pull/40246) | [torch.compile] refactor config hashing through compile_fact... | @WorldExplored | open | 2026-04-18 | 2026-04-18 |
| [#39967](https://github.com/vllm-project/vllm/pull/39967) | [ZenCPU] AMD Zen CPU Backend with supported dtypes via zento... | @Chinmay-Kulkarni-AMD | merged | 2026-04-16 | 2026-04-18 |
| [#39953](https://github.com/vllm-project/vllm/pull/39953) | [ROCm] Fix TurboQuant on ROCm: backend routing, flash-attn c... | @aditi-amd | merged | 2026-04-15 | 2026-04-17 |
| [#38396](https://github.com/vllm-project/vllm/pull/38396) | [AMD][CI] Update DeepEP branch | @rjrock | merged | 2026-03-27 | 2026-04-17 |
| [#39978](https://github.com/vllm-project/vllm/pull/39978) | [ROCm][CI] Build fastsafetensors from source so it links aga... | @AndreasKaratzas | merged | 2026-04-16 | 2026-04-17 |
| [#39342](https://github.com/vllm-project/vllm/pull/39342) | [CPU] Fix AttributeError when loading GeluAndMul and similar... | @ssam18 | open | 2026-04-08 | 2026-04-17 |
| [#39957](https://github.com/vllm-project/vllm/pull/39957) | skip fp8e4b15 on xpu | @xinyu-intel | merged | 2026-04-16 | 2026-04-17 |
| [#39481](https://github.com/vllm-project/vllm/pull/39481) | [vllm IR] Port FP8 Quantization to vLLM IR Ops | @BadrBasowid | open | 2026-04-10 | 2026-04-17 |
| [#40105](https://github.com/vllm-project/vllm/pull/40105) | [Bugfix] Add Marlin kernel in block scaled mm kernel selecti... | @maralbahari | merged | 2026-04-17 | 2026-04-17 |
| [#25892](https://github.com/vllm-project/vllm/pull/25892) | [Bugfix][Rocm] fix qr error when different inp shape | @haoyangli0109 | merged | 2025-09-29 | 2026-04-17 |
| [#24649](https://github.com/vllm-project/vllm/pull/24649) | [Rocm] [quantization] Fix quark ptpc moe and add test case | @haoyangli0109 | merged | 2025-09-11 | 2026-04-17 |
| [#30257](https://github.com/vllm-project/vllm/pull/30257) | [bugfix][quantization] Fix fp8 per_tensor scale shape | @haoyangli0109 | merged | 2025-12-08 | 2026-04-17 |
| [#30308](https://github.com/vllm-project/vllm/pull/30308) | [bugfix][quantization] fix quark qwen3 kv_cache quantization | @haoyangli0109 | merged | 2025-12-09 | 2026-04-17 |
| [#35466](https://github.com/vllm-project/vllm/pull/35466) | [CI/Build] CPU release supports both of AVX2 and AVX512 | @majian4work | merged | 2026-02-27 | 2026-04-17 |
| [#40078](https://github.com/vllm-project/vllm/pull/40078) | [CI/Build] Apply ruff formatter to pass pre-commit | @Alnusjaponica | merged | 2026-04-16 | 2026-04-17 |
| [#39527](https://github.com/vllm-project/vllm/pull/39527) | [Model][Hardware][AMD][Kernel]: Enable e2e QK Norm + RoPE + ... | @jhu960213 | open | 2026-04-10 | 2026-04-16 |
| [#39944](https://github.com/vllm-project/vllm/pull/39944) | [Kernel][Helion] Fix inductor fusion of Helion HOP | @gmagogsfm | merged | 2026-04-15 | 2026-04-16 |
| [#39217](https://github.com/vllm-project/vllm/pull/39217) | [Mistral Grammar] Fix tool and reasoning parsing | @juliendenize | merged | 2026-04-07 | 2026-04-16 |
| [#38657](https://github.com/vllm-project/vllm/pull/38657) | [compile] Invoke split FX graph by codegen. | @zhxchen17 | merged | 2026-03-31 | 2026-04-16 |
| [#33773](https://github.com/vllm-project/vllm/pull/33773) | [ROCm][FEAT] Integrate aiter gemm w8a8 ptpc | @vllmellm | merged | 2026-02-04 | 2026-04-16 |
| [#39604](https://github.com/vllm-project/vllm/pull/39604) | [Quantization] [Refactor] Create special "GptOssMxfp4MoeMeth... | @zyongye | merged | 2026-04-12 | 2026-04-16 |
| [#39882](https://github.com/vllm-project/vllm/pull/39882) | [CI] Only build release Docker images when NIGHTLY=1 | @khluu | merged | 2026-04-15 | 2026-04-15 |
| [#38272](https://github.com/vllm-project/vllm/pull/38272) | [ROCm][CI] Unsetting arch completely | @AndreasKaratzas | open | 2026-03-26 | 2026-04-15 |
| [#34741](https://github.com/vllm-project/vllm/pull/34741) | [ROCm] Enable FP8 KV-cache and relax constraints for RDNA4 c... | @laudney | open | 2026-02-17 | 2026-04-15 |
| [#38901](https://github.com/vllm-project/vllm/pull/38901) | refactor hard coded device string in test files under tests/... | @wincent8 | merged | 2026-04-03 | 2026-04-15 |
| [#37226](https://github.com/vllm-project/vllm/pull/37226) | [CI] Add PyTorch nightly build and test pipeline | @atalman | merged | 2026-03-16 | 2026-04-15 |
| [#39817](https://github.com/vllm-project/vllm/pull/39817) | [ROCm][DX] Clarify collect_env ROCm reporting | @Bortlesboat | draft | 2026-04-14 | 2026-04-14 |
| [#39119](https://github.com/vllm-project/vllm/pull/39119) | [ROCm] Align AiterFlashAttentionImpl attn_type check with ba... | @Bortlesboat | merged | 2026-04-06 | 2026-04-14 |
| [#39754](https://github.com/vllm-project/vllm/pull/39754) | [Bugfix][ROCm]: Allow `gpt_oss_mxfp4` quantization method on... | @Rohan138 | merged | 2026-04-14 | 2026-04-14 |
| [#39730](https://github.com/vllm-project/vllm/pull/39730) | [ROCm][CI] Fix condition for `test_per_token_group_quant_fp8... | @micah-wil | merged | 2026-04-13 | 2026-04-14 |
| [#39793](https://github.com/vllm-project/vllm/pull/39793) | Bugfix: `use_existing_torch.py`: Glob recursive subdirs in r... | @netanel-haber | merged | 2026-04-14 | 2026-04-14 |
| [#38654](https://github.com/vllm-project/vllm/pull/38654) | [Bugfix] Fix `vllm bench serve` to count multimodal tokens i... | @mgehre-amd | merged | 2026-03-31 | 2026-04-14 |
| [#30156](https://github.com/vllm-project/vllm/pull/30156) | feat: add TxtSlicesDataset to allow sampling slices from txt... | @jdebache | merged | 2025-12-05 | 2026-04-14 |
| [#36487](https://github.com/vllm-project/vllm/pull/36487) | [CPU] Replace OMP initialization | @kot-begemot-uk | merged | 2026-03-09 | 2026-04-13 |
| [#39713](https://github.com/vllm-project/vllm/pull/39713) | feat(gguf): add PRISM Q1_0 and Q1_0_G128 1-bit quantization ... | @carlosfundora | open | 2026-04-13 | 2026-04-13 |
| [#39280](https://github.com/vllm-project/vllm/pull/39280) | [ROCm][Perf] Add Fused Shared Expert (FSE) support for Qwen3... | @nholmber | open | 2026-04-08 | 2026-04-13 |
| [#38704](https://github.com/vllm-project/vllm/pull/38704) | [ROCm][perf] Use workspace manager for sparse indexer alloca... | @gronsti-amd | draft | 2026-04-01 | 2026-04-13 |
| [#39651](https://github.com/vllm-project/vllm/pull/39651) | [ROCm][CI] Removed stale tests and extended acceptance test | @AndreasKaratzas | merged | 2026-04-12 | 2026-04-13 |
| [#34275](https://github.com/vllm-project/vllm/pull/34275) | [ROCm] Add gfx1100 tile-size heuristic for triton_scaled_mm ... | @monajafi-amd | open | 2026-02-10 | 2026-04-13 |
| [#39555](https://github.com/vllm-project/vllm/pull/39555) | [ROCm][CI/Build] Fix memory cleanup in MM test | @AndreasKaratzas | merged | 2026-04-11 | 2026-04-12 |
| [#38922](https://github.com/vllm-project/vllm/pull/38922) | [Bugfix] Fix broken explicit unquantized kv cache dtype supp... | @Isotr0py | merged | 2026-04-03 | 2026-04-11 |
| [#37196](https://github.com/vllm-project/vllm/pull/37196) | [Perf] consolidating, vectorizing and cleaning up CUDA/HIP i... | @GOavi101 | open | 2026-03-16 | 2026-04-11 |
| [#37045](https://github.com/vllm-project/vllm/pull/37045) | [Kernel] Porting the TRTLLM minimax_allreduce_rms kernels | @jeejeelee | merged | 2026-03-14 | 2026-04-11 |
| [#38455](https://github.com/vllm-project/vllm/pull/38455) | [ROCm] Add RDNA 3.5/4 device IDs (gfx1150, gfx1151, gfx1201) | @dondetir | merged | 2026-03-29 | 2026-04-10 |
| [#37539](https://github.com/vllm-project/vllm/pull/37539) | [Performance] Remove unnecessary zero-fill of MLA decode out... | @xaguilar-amd | merged | 2026-03-19 | 2026-04-10 |
| [#37352](https://github.com/vllm-project/vllm/pull/37352) | [Kernel][Hardware][AMD] Add TritonW4A16LinearKernel for ROCm | @jatseng-ai | merged | 2026-03-17 | 2026-04-10 |
| [#39448](https://github.com/vllm-project/vllm/pull/39448) | AMD remove sync visible devices | @vickytsang | open | 2026-04-09 | 2026-04-10 |
| [#39421](https://github.com/vllm-project/vllm/pull/39421) | [ROCm][CI] Resolved nvidia package deps issue | @AndreasKaratzas | merged | 2026-04-09 | 2026-04-09 |
| [#33825](https://github.com/vllm-project/vllm/pull/33825) | [vLLM IR] 1/N Implement IR skeleton and rms_norm op | @ProExpertProg | merged | 2026-02-04 | 2026-04-09 |
| [#39181](https://github.com/vllm-project/vllm/pull/39181) | [Bugfix]Fix EP precision for Qwen3.5, Qwen3-Next | @USTCKAY | merged | 2026-04-07 | 2026-04-09 |
| [#33892](https://github.com/vllm-project/vllm/pull/33892) | [W8A8 Block Linear Refactor][2/N] Remove W8A8Fp8BlockLinearO... | @maralbahari | merged | 2026-02-05 | 2026-04-09 |
| [#38841](https://github.com/vllm-project/vllm/pull/38841) | [8/n] Migrate merge_attn_states, mamba, sampler to torch sta... | @mikaylagawarecki | draft | 2026-04-02 | 2026-04-08 |
| [#38783](https://github.com/vllm-project/vllm/pull/38783) | [7/n] Migrate pos_encoding and norm kernels to libtorch stab... | @mikaylagawarecki | open | 2026-04-02 | 2026-04-08 |
| [#38757](https://github.com/vllm-project/vllm/pull/38757) | [6/n] Migrate activation kernels, gptq, gguf, non cutlass w8... | @mikaylagawarecki | open | 2026-04-01 | 2026-04-08 |
| [#38580](https://github.com/vllm-project/vllm/pull/38580) | [ROCm][CI-Build] Cherry pick triton BUFFER_OPS fix and updat... | @gshtras | merged | 2026-03-30 | 2026-04-08 |
| [#32914](https://github.com/vllm-project/vllm/pull/32914) | [ROCm][perf] Shuffle KV cache to use paged_attention_common | @samutamm | merged | 2026-01-23 | 2026-04-08 |
| [#39224](https://github.com/vllm-project/vllm/pull/39224) | [Bugfix] Cuda Clean up scales Kvcache fp8/int8_per_token_hea... | @JartX | merged | 2026-04-07 | 2026-04-08 |
| [#39274](https://github.com/vllm-project/vllm/pull/39274) | fix: the hf3fs_utils in hf3fs_utils.cpp | @orbisai0security | open | 2026-04-08 | 2026-04-08 |
| [#39073](https://github.com/vllm-project/vllm/pull/39073) | Fix RMSNorm hidden_size validation crash for weightless norm... | @Chessing234 | open | 2026-04-06 | 2026-04-08 |
| [#36993](https://github.com/vllm-project/vllm/pull/36993) | [CI][Bugfix][AMD][ Ensure weights created when using emulati... | @rasmith | merged | 2026-03-13 | 2026-04-07 |
| [#38504](https://github.com/vllm-project/vllm/pull/38504) | [Kernels][MoE] Fix legacy_routing to use bitmatrix-based rou... | @AndreasKaratzas | merged | 2026-03-30 | 2026-04-07 |
| [#38961](https://github.com/vllm-project/vllm/pull/38961) | [IR][RmsNorm] pass None if not has_weight | @lk-chen | merged | 2026-04-04 | 2026-04-04 |
| [#36836](https://github.com/vllm-project/vllm/pull/36836) | [Feat][Executor] Introduce RayExecutorV2 | @jeffreywang-anyscale | merged | 2026-03-12 | 2026-04-01 |
| [#37221](https://github.com/vllm-project/vllm/pull/37221) | [3/n] Migrate cutlass/scaled_mm_entry.cu torch stable ABI  | @mikaylagawarecki | merged | 2026-03-16 | 2026-03-31 |
| [#38108](https://github.com/vllm-project/vllm/pull/38108) | Fix Device Index for ROCm Ray Workers in MoE Benchmark | @li-liwen | merged | 2026-03-25 | 2026-03-28 |
| [#36702](https://github.com/vllm-project/vllm/pull/36702) | [ROCm] Attention selector reordering | @gshtras | merged | 2026-03-10 | 2026-03-28 |
| [#37930](https://github.com/vllm-project/vllm/pull/37930) | [ROCm][CI] Add uv pip compile workflow for rocm-test.txt loc... | @AndreasKaratzas | merged | 2026-03-23 | 2026-03-26 |
| [#36058](https://github.com/vllm-project/vllm/pull/36058) | [2/n] Migrate per_token_group_quant to torch stable ABI | @mikaylagawarecki | merged | 2026-03-04 | 2026-03-25 |
| [#24532](https://github.com/vllm-project/vllm/pull/24532) | [core] add nccl symmetric memory for all reduce | @Amir-19 | merged | 2025-09-09 | 2026-03-24 |
| [#37533](https://github.com/vllm-project/vllm/pull/37533) | [ROCm] fix sleep mode not releasing GPU memory problem on RO... | @aaab8b | merged | 2026-03-19 | 2026-03-23 |
| [#32700](https://github.com/vllm-project/vllm/pull/32700) | [Quantization][Deprecation] Remove PTPC FP8 | @robertgshaw2-redhat | merged | 2026-01-20 | 2026-03-21 |
| [#34692](https://github.com/vllm-project/vllm/pull/34692) | [ROCm] Enable DeepEP ROCm as all2allbackend for AMD GPUs.  | @lcskrishna | merged | 2026-02-17 | 2026-03-21 |
| [#34709](https://github.com/vllm-project/vllm/pull/34709) | [ROCm] Enable wvSplitK skinny GEMM kernel for RDNA4/gfx1x de... | @laudney | merged | 2026-02-17 | 2026-03-20 |
| [#37634](https://github.com/vllm-project/vllm/pull/37634) | [XPU] Automatically detect target platform as XPU in build. | @ccrhx4 | merged | 2026-03-20 | 2026-03-20 |
| [#36996](https://github.com/vllm-project/vllm/pull/36996) | [CI][BugFix][AMD] Don't set VLLM_ROCM_USE_AITER anymore in t... | @rasmith | merged | 2026-03-13 | 2026-03-19 |
| [#34839](https://github.com/vllm-project/vllm/pull/34839) | [ROCm][CI] Cleaning and restructuring amd-ci legacy pipeline | @AndreasKaratzas | merged | 2026-02-18 | 2026-03-19 |
| [#36720](https://github.com/vllm-project/vllm/pull/36720) | [Bugfix][ROCm] Fix worker startup OOM on ROCm by skipping un... | @JartX | merged | 2026-03-10 | 2026-03-18 |
| [#33077](https://github.com/vllm-project/vllm/pull/33077) | [BUGFIX] Fix hipErrorIllegalState in Qwen3-Omni during start... | @JartX | merged | 2026-01-26 | 2026-03-15 |
| [#31050](https://github.com/vllm-project/vllm/pull/31050) | [MoE Refactor] Split `invoke_fused_moe_kernel` | @zyongye | merged | 2025-12-20 | 2026-03-12 |
| [#36101](https://github.com/vllm-project/vllm/pull/36101) | [ROCm][CI] Fix logprob divergence for TitanML/tiny-mixtral u... | @AndreasKaratzas | merged | 2026-03-05 | 2026-03-09 |
| [#34570](https://github.com/vllm-project/vllm/pull/34570) | [ROCm][AITER] Fix aiter paged_attention_v1 decode for slidin... | @AndreasKaratzas | merged | 2026-02-15 | 2026-02-21 |
| [#32346](https://github.com/vllm-project/vllm/pull/32346) | [ROCm][CI] Fix AITER test flakiness by using explicit attent... | @AndreasKaratzas | merged | 2026-01-14 | 2026-01-22 |
| [#31713](https://github.com/vllm-project/vllm/pull/31713) | [Hardware][AMD][CI][Bugfix] Fix AMD Quantization test group | @mawong-amd | merged | 2026-01-05 | 2026-01-12 |
| [#31551](https://github.com/vllm-project/vllm/pull/31551) | [ROCm][CI] Update MiniCPM model test: MiniCPM3-4B to MiniCPM... | @AndreasKaratzas | merged | 2025-12-30 | 2026-01-05 |
| [#31632](https://github.com/vllm-project/vllm/pull/31632) | [CI] Skip Phi-MoE test due to old API util | @AndreasKaratzas | merged | 2026-01-02 | 2026-01-05 |
| [#31597](https://github.com/vllm-project/vllm/pull/31597) | [ROCm][CI] Fix language generation test accuracy by disablin... | @AndreasKaratzas | merged | 2026-01-01 | 2026-01-05 |

# PR Tracker

All tracked PRs across projects, grouped by project.

## vllm (Upstream Watch)
Repo: `vllm-project/vllm` | Last collected: 2026-04-07T20:47:26Z

| # | Title | Author | Status | Created | Updated |
|---|-------|--------|--------|---------|---------|
| [#38798](https://github.com/vllm-project/vllm/pull/38798) | [vLLM IR] rms_norm_gated | @wxsIcey | open | 2026-04-02 | 2026-04-07 |
| [#39225](https://github.com/vllm-project/vllm/pull/39225) | [Bug] Fix rocm sparse attn indexer issue | @yewentao256 | open | 2026-04-07 | 2026-04-07 |
| [#39074](https://github.com/vllm-project/vllm/pull/39074) | [Feature] KV cache per-token-head Int2/Int4 Quantization | @JartX | open | 2026-04-06 | 2026-04-07 |
| [#39125](https://github.com/vllm-project/vllm/pull/39125) | [Attention][V0 Deprecation] Deprecate accept output buffer | @LucasWilkinson | open | 2026-04-06 | 2026-04-07 |
| [#39224](https://github.com/vllm-project/vllm/pull/39224) | [Bugfix] Cuda Clean up scales Kvcache int8_per_token_head | @JartX | open | 2026-04-07 | 2026-04-07 |
| [#39219](https://github.com/vllm-project/vllm/pull/39219) | [CI] Fix mypy for `vllm/v1/ops` | @yewentao256 | open | 2026-04-07 | 2026-04-07 |
| [#38817](https://github.com/vllm-project/vllm/pull/38817) | [ROCm] Enable fused_silu_mul_block_quant on ROCm | @gshtras | open | 2026-04-02 | 2026-04-07 |
| [#38580](https://github.com/vllm-project/vllm/pull/38580) | [ROCm][CI-Build] Cherry pick triton BUFFER_OPS fix and updat... | @gshtras | open | 2026-03-30 | 2026-04-07 |
| [#39209](https://github.com/vllm-project/vllm/pull/39209) | [ROCm] Fix missing AITER guard on shuffle KV cache and broke... | @Bortlesboat | open | 2026-04-07 | 2026-04-07 |
| [#38833](https://github.com/vllm-project/vllm/pull/38833) | [ROCm] pad intermediate size for certain unquantized moe mod... | @hongxiayang | open | 2026-04-02 | 2026-04-07 |
| [#37352](https://github.com/vllm-project/vllm/pull/37352) | [Kernel][Hardware][AMD] Add TritonW4A16LinearKernel for ROCm | @jatseng-ai | open | 2026-03-17 | 2026-04-07 |
| [#37196](https://github.com/vllm-project/vllm/pull/37196) | [Perf] consolidating, vectorizing and cleaning up CUDA/HIP i... | @GOavi101 | open | 2026-03-16 | 2026-04-07 |
| [#39208](https://github.com/vllm-project/vllm/pull/39208) | [ROCm] Fix UnboundLocalError for prefix_scheduler_metadata i... | @Bortlesboat | open | 2026-04-07 | 2026-04-07 |
| [#37045](https://github.com/vllm-project/vllm/pull/37045) | [Kernel] Porting the TRTLLM minimax_allreduce_rms kernels | @jeejeelee | open | 2026-03-14 | 2026-04-07 |
| [#39136](https://github.com/vllm-project/vllm/pull/39136) | [ROCm][Quantization][2/N] Refactor quark_moe w4a8 w/ oracle  | @BowenBao | open | 2026-04-07 | 2026-04-07 |
| [#39122](https://github.com/vllm-project/vllm/pull/39122) | [ROCm] Remove unnecessary fp8 roundtrip in gather cache NHD ... | @Bortlesboat | open | 2026-04-06 | 2026-04-07 |
| [#37916](https://github.com/vllm-project/vllm/pull/37916) | `tests/v1/e2e/spec_decode`: assert async scheduling is used | @puririshi98 | closed | 2026-03-23 | 2026-04-07 |
| [#38455](https://github.com/vllm-project/vllm/pull/38455) | [ROCm] Add RDNA 3.5/4 device IDs (gfx1150, gfx1151, gfx1201) | @dondetir | open | 2026-03-29 | 2026-04-07 |
| [#38378](https://github.com/vllm-project/vllm/pull/38378) | [Feature] KV cache per-token-head INT8/FP8 quantization | @JartX | merged | 2026-03-27 | 2026-04-07 |
| [#39181](https://github.com/vllm-project/vllm/pull/39181) | [Bugfix]Fix EP precision for Qwen3.5, Qwen3-Next | @USTCKAY | open | 2026-04-07 | 2026-04-07 |
| [#36993](https://github.com/vllm-project/vllm/pull/36993) | [CI][Bugfix][AMD][ Ensure weights created when using emulati... | @rasmith | merged | 2026-03-13 | 2026-04-07 |
| [#39053](https://github.com/vllm-project/vllm/pull/39053) | [ROCm][CI] Fix test repo-root assumptions | @AndreasKaratzas | merged | 2026-04-06 | 2026-04-07 |
| [#36278](https://github.com/vllm-project/vllm/pull/36278) | [Model] [Bugfix] Adding legacy MoE weight format support in ... | @ColinZ22 | open | 2026-03-06 | 2026-04-07 |
| [#35939](https://github.com/vllm-project/vllm/pull/35939) | [ROCm][Quantization] Simplify activation scale passing for t... | @BowenBao | open | 2026-03-04 | 2026-04-07 |
| [#38657](https://github.com/vllm-project/vllm/pull/38657) | [compile] Invoke split FX graph by codegen. | @zhxchen17 | open | 2026-03-31 | 2026-04-07 |
| [#39087](https://github.com/vllm-project/vllm/pull/39087) | [CI][AMD][BugFix][Kernel] Cast induction variable to int64 o... | @rasmith | open | 2026-04-06 | 2026-04-07 |
| [#38109](https://github.com/vllm-project/vllm/pull/38109) | [Bugfix] Fix FP8 MoE support detection on ROCm when amdsmi r... | @nemanjaudovic | open | 2026-03-25 | 2026-04-07 |
| [#38404](https://github.com/vllm-project/vllm/pull/38404) | [Bugfix] Fix platform detection crash when vllm is not insta... | @SandishKumarHN | open | 2026-03-27 | 2026-04-07 |
| [#38922](https://github.com/vllm-project/vllm/pull/38922) | [Bugfix] Fix broken explicit unquantized kv cache dtype supp... | @Isotr0py | open | 2026-04-03 | 2026-04-07 |
| [#33892](https://github.com/vllm-project/vllm/pull/33892) | [W8A8 Block Linear Refactor][2/N] Remove W8A8Fp8BlockLinearO... | @maralbahari | open | 2026-02-05 | 2026-04-07 |
| [#35698](https://github.com/vllm-project/vllm/pull/35698) | [XPU]Enhance environment collection for Intel XPU and optimi... | @1643661061leo | open | 2026-03-02 | 2026-04-07 |
| [#39192](https://github.com/vllm-project/vllm/pull/39192) | [ROCm] Fix shuffled KV-cache writes for hybrid attention lay... | @tuukkjs | draft | 2026-04-07 | 2026-04-07 |
| [#39024](https://github.com/vllm-project/vllm/pull/39024) | Add structure to `requirements/` directory | @hmellor | open | 2026-04-05 | 2026-04-07 |
| [#34644](https://github.com/vllm-project/vllm/pull/34644) | [release 2.11] Update to torch 2.11 | @atalman | open | 2026-02-16 | 2026-04-07 |
| [#36858](https://github.com/vllm-project/vllm/pull/36858) | Support Flashinfer rope+quant+cache update fusion kernel for... | @elvischenv | open | 2026-03-12 | 2026-04-07 |
| [#38371](https://github.com/vllm-project/vllm/pull/38371) | Enable building MoRI with AMD AINIC stack | @ichbinblau | draft | 2026-03-27 | 2026-04-07 |
| [#38871](https://github.com/vllm-project/vllm/pull/38871) | [9/n] Migrate attention and cache kernels to torch stable AB... | @mikaylagawarecki | draft | 2026-04-03 | 2026-04-07 |
| [#38841](https://github.com/vllm-project/vllm/pull/38841) | [8/n] Migrate merge_attn_states, mamba, sampler to torch sta... | @mikaylagawarecki | draft | 2026-04-02 | 2026-04-07 |
| [#36517](https://github.com/vllm-project/vllm/pull/36517) | Add VLLM_USE_MONITORX to use more efficient busy polling | @pschlan-amd | draft | 2026-03-09 | 2026-04-07 |
| [#38795](https://github.com/vllm-project/vllm/pull/38795) | [Bugfix]Fix EP precision for Qwen3.5 | @USTCKAY | closed | 2026-04-02 | 2026-04-07 |
| [#29363](https://github.com/vllm-project/vllm/pull/29363) | [ROCm][fusion] Enable qk_norm mRoPE fusion for Qwen VL model... | @gbyu-amd | closed | 2025-11-25 | 2026-04-07 |
| [#39177](https://github.com/vllm-project/vllm/pull/39177) | [ROCm][Perf] Expose AITER MoE sorting dispatch policy via en... | @nholmber | open | 2026-04-07 | 2026-04-07 |
| [#38205](https://github.com/vllm-project/vllm/pull/38205) | [ZenCPU] Make PT Backport Patch Accessible to vLLM | @amd-lalithnc | open | 2026-03-26 | 2026-04-07 |
| [#38787](https://github.com/vllm-project/vllm/pull/38787) | [GDN] Fused all preprocessing into one kernel for chunked st... | @a-sidorova | open | 2026-04-02 | 2026-04-07 |
| [#33773](https://github.com/vllm-project/vllm/pull/33773) | [ROCm][FEAT] Integrate aiter gemm w8a8 ptpc | @vllmellm | open | 2026-02-04 | 2026-04-07 |
| [#37146](https://github.com/vllm-project/vllm/pull/37146) | Add the option to turn on hipBLASLt online tuning | @hanlin12-AMD | open | 2026-03-16 | 2026-04-07 |
| [#38763](https://github.com/vllm-project/vllm/pull/38763) | only patch runtime_env for torch >= 2.10 | @Rohan138 | merged | 2026-04-01 | 2026-04-07 |
| [#39073](https://github.com/vllm-project/vllm/pull/39073) | Fix RMSNorm hidden_size validation crash for weightless norm... | @Chessing234 | open | 2026-04-06 | 2026-04-07 |
| [#39168](https://github.com/vllm-project/vllm/pull/39168) | [ROCm] Expanded sparse MLA support | @ekuznetsov139 | open | 2026-04-07 | 2026-04-07 |
| [#36127](https://github.com/vllm-project/vllm/pull/36127) | [Model] Add support for moonshotai/Kimi-Audio-7B-Instruct | @tunglinwood | merged | 2026-03-05 | 2026-04-07 |
| [#30156](https://github.com/vllm-project/vllm/pull/30156) | feat: add TxtSlicesDataset to allow sampling slices from txt... | @jdebache | open | 2025-12-05 | 2026-04-07 |
| [#26807](https://github.com/vllm-project/vllm/pull/26807) | [V1][Hybrid] GatedDeltaNet Automatic Prefix Caching (`all`-m... | @simondanielsson | open | 2025-10-14 | 2026-04-07 |
| [#38365](https://github.com/vllm-project/vllm/pull/38365) | [ROCm] patch benchmark_moe  | @big-yellow-duck | open | 2026-03-27 | 2026-04-07 |
| [#39123](https://github.com/vllm-project/vllm/pull/39123) | [ROCm] Remove unused IS_FNUZ parameter from reshape_and_cach... | @Bortlesboat | merged | 2026-04-06 | 2026-04-07 |
| [#35791](https://github.com/vllm-project/vllm/pull/35791) | [Bugfix][RoCM] GPT-OSS + Expert Parallel | @varun-sundar-rabindranath | open | 2026-03-02 | 2026-04-07 |
| [#38504](https://github.com/vllm-project/vllm/pull/38504) | [Kernels][MoE] Fix legacy_routing to use bitmatrix-based rou... | @AndreasKaratzas | merged | 2026-03-30 | 2026-04-07 |
| [#31459](https://github.com/vllm-project/vllm/pull/31459) | Add torch.distributed fallback for all_gatherv when PyNCCL u... | @iseeyuan | open | 2025-12-28 | 2026-04-07 |
| [#35737](https://github.com/vllm-project/vllm/pull/35737) | [NVFP4] Support NVFP4 MOE models on AMD Instinct, Nvidia Amp... | @fxmarty-amd | open | 2026-03-02 | 2026-04-06 |
| [#35733](https://github.com/vllm-project/vllm/pull/35733) | [NVFP4] Support NVFP4 dense models from `modelopt` and `comp... | @fxmarty-amd | merged | 2026-03-02 | 2026-04-06 |
| [#38665](https://github.com/vllm-project/vllm/pull/38665) | [ROCm] Enable dual-stream MoE shared experts, AITER sparse M... | @ChuanLi1101 | open | 2026-03-31 | 2026-04-06 |
| [#39111](https://github.com/vllm-project/vllm/pull/39111) | [ROCm] Set HSA_NO_SCRATCH_RECLAIM=1 in platform init for non... | @Bortlesboat | open | 2026-04-06 | 2026-04-06 |
| [#39086](https://github.com/vllm-project/vllm/pull/39086) | [Bug] Fix mistral version dependency | @yewentao256 | merged | 2026-04-06 | 2026-04-06 |
| [#37110](https://github.com/vllm-project/vllm/pull/37110) | Fuse per-group FP8 dynamic quant onto Triton attention kerne... | @Etelis | open | 2026-03-15 | 2026-04-06 |
| [#39001](https://github.com/vllm-project/vllm/pull/39001) | [ROCm] Support unlimited sequence lengths via multi-pass red... | @ekuznetsov139 | open | 2026-04-04 | 2026-04-06 |
| [#36855](https://github.com/vllm-project/vllm/pull/36855) | [ROCm] Fix AITER sparse MLA crash for num_heads < 16 (e.g. G... | @ChuanLi1101 | open | 2026-03-12 | 2026-04-06 |
| [#38444](https://github.com/vllm-project/vllm/pull/38444) | [ROCm][CI] Add K8s-hardened Python CI runner with JUnit exit... | @AndreasKaratzas | open | 2026-03-28 | 2026-04-06 |
| [#29577](https://github.com/vllm-project/vllm/pull/29577) | [Doc] Add 20251202 vLLM Malaysia Meetup Info | @tjtanaa | open | 2025-11-27 | 2026-04-06 |
| [#38501](https://github.com/vllm-project/vllm/pull/38501) | [ROCm][Quantization] Add asymmetric INT8 quantization suppor... | @AndreasKaratzas | merged | 2026-03-30 | 2026-04-06 |
| [#38184](https://github.com/vllm-project/vllm/pull/38184) | [ROCm][CI] Run Kernels Core Operation Test On MI325 and miti... | @micah-wil | merged | 2026-03-26 | 2026-04-06 |
| [#38937](https://github.com/vllm-project/vllm/pull/38937) | [ROCm][CI] Added back missing common deps | @AndreasKaratzas | merged | 2026-04-03 | 2026-04-06 |
| [#36951](https://github.com/vllm-project/vllm/pull/36951) | [CI] Add persistent cache mounts and fix test download paths | @AndreasKaratzas | open | 2026-03-13 | 2026-04-05 |
| [#36949](https://github.com/vllm-project/vllm/pull/36949) | [ROCm][CI] Optimize ROCm Docker build: registry cache, DeepE... | @AndreasKaratzas | open | 2026-03-13 | 2026-04-05 |
| [#37171](https://github.com/vllm-project/vllm/pull/37171) | [Frontend] feat: add streaming support for token generation ... | @hhk7734 | merged | 2026-03-16 | 2026-04-05 |
| [#38959](https://github.com/vllm-project/vllm/pull/38959) | [ROCm][CI] Fix ROCm Dockerfile conftest generation for older... | @AndreasKaratzas | merged | 2026-04-04 | 2026-04-04 |
| [#38951](https://github.com/vllm-project/vllm/pull/38951) | [ROCm][CI] Minor missing import patch | @AndreasKaratzas | merged | 2026-04-03 | 2026-04-04 |
| [#38961](https://github.com/vllm-project/vllm/pull/38961) | [IR][RmsNorm] pass None if not has_weight | @lk-chen | merged | 2026-04-04 | 2026-04-04 |
| [#38585](https://github.com/vllm-project/vllm/pull/38585) | [ROCm][CI/Build] Fix the pytest hook to properly print out t... | @gshtras | merged | 2026-03-30 | 2026-04-03 |
| [#38272](https://github.com/vllm-project/vllm/pull/38272) | [ROCm][CI] Unsetting arch completely | @AndreasKaratzas | open | 2026-03-26 | 2026-04-03 |
| [#38941](https://github.com/vllm-project/vllm/pull/38941) | [ci] Remove soft fail for AMD image build job | @khluu | merged | 2026-04-03 | 2026-04-03 |
| [#35466](https://github.com/vllm-project/vllm/pull/35466) | [CI/Build] CPU release supports both of AVX2 and AVX512 | @majian4work | merged | 2026-02-27 | 2026-04-03 |
| [#38783](https://github.com/vllm-project/vllm/pull/38783) | [7/n] Migrate pos_encoding and norm kernels to libtorch stab... | @mikaylagawarecki | open | 2026-04-02 | 2026-04-03 |
| [#38757](https://github.com/vllm-project/vllm/pull/38757) | [6/n] Migrate activation kernels, gptq, gguf, non cutlass w8... | @mikaylagawarecki | open | 2026-04-01 | 2026-04-03 |
| [#38238](https://github.com/vllm-project/vllm/pull/38238) | Removed GPU state confirmation and cleanup steps. | @dhonnappa-amd | merged | 2026-03-26 | 2026-04-03 |
| [#38460](https://github.com/vllm-project/vllm/pull/38460) | [Perf] Batch KV cache swap copies via cuMemcpyBatchAsync | @Etelis | merged | 2026-03-29 | 2026-04-03 |
| [#38615](https://github.com/vllm-project/vllm/pull/38615) | [ROCm] Fix aiter persistent mode mla with q/o nhead<16 for k... | @wufann | merged | 2026-03-31 | 2026-04-03 |
| [#37189](https://github.com/vllm-project/vllm/pull/37189) | [ROCm] Add `torch.cuda` fallback for amdsmi-dependent method... | @JoursBleu | open | 2026-03-16 | 2026-04-03 |
| [#38664](https://github.com/vllm-project/vllm/pull/38664) | [CI][ROCm] Add Qwen3.5-35B-A3B-MXFP4 model eval into CI | @BowenBao | merged | 2026-03-31 | 2026-04-03 |
| [#38774](https://github.com/vllm-project/vllm/pull/38774) | [ROCm][Quantization][1/N] Refactor quark_moe w_mxfp4 w/ orac... | @BowenBao | merged | 2026-04-02 | 2026-04-03 |
| [#37566](https://github.com/vllm-project/vllm/pull/37566) | refactor hard coded device string in test files under tests/... | @wincent8 | merged | 2026-03-19 | 2026-04-03 |
| [#38292](https://github.com/vllm-project/vllm/pull/38292) | [CI][ROCm] Add gpt-oss w4a8 in CI | @BowenBao | merged | 2026-03-26 | 2026-04-02 |
| [#38788](https://github.com/vllm-project/vllm/pull/38788) | [Model] Add support for Cheers multimodal model | @bingshuailiu | merged | 2026-04-02 | 2026-04-02 |
| [#38647](https://github.com/vllm-project/vllm/pull/38647) | Add opt-in `--record-power` option to `vllm bench serve` | @fxmarty-amd | open | 2026-03-31 | 2026-04-02 |
| [#34741](https://github.com/vllm-project/vllm/pull/34741) | [ROCm] Enable FP8 KV-cache and relax constraints for RDNA4 c... | @laudney | open | 2026-02-17 | 2026-04-02 |
| [#38086](https://github.com/vllm-project/vllm/pull/38086) | [ROCm] Enable VLLM triton FP8 moe for gfx1201, tuned for Qwe... | @vllmellm | merged | 2026-03-25 | 2026-04-02 |
| [#38750](https://github.com/vllm-project/vllm/pull/38750) | [ROCm][Bugfix] Fix ROCm runtime failure due to missing symbo... | @gshtras | merged | 2026-04-01 | 2026-04-02 |
| [#37228](https://github.com/vllm-project/vllm/pull/37228) | [ROCM][Bugfix] Use correct stride in cp_mha_gather_cache_ker... | @jennyyyyzhen | merged | 2026-03-16 | 2026-04-02 |
| [#36836](https://github.com/vllm-project/vllm/pull/36836) | [Feat][Executor] Introduce RayExecutorV2 | @jeffreywang-anyscale | merged | 2026-03-12 | 2026-04-01 |
| [#32996](https://github.com/vllm-project/vllm/pull/32996) | Feature/silu block quant fusion v1 | @Monishver11 | merged | 2026-01-24 | 2026-04-01 |
| [#17495](https://github.com/vllm-project/vllm/pull/17495) | [Bugfix][ROCm] Fix import error on ROCm | @gshtras | merged | 2025-04-30 | 2026-04-01 |
| [#32914](https://github.com/vllm-project/vllm/pull/32914) | [ROCm][perf] Shuffle KV cache to use paged_attention_common | @samutamm | merged | 2026-01-23 | 2026-04-01 |
| [#38704](https://github.com/vllm-project/vllm/pull/38704) | [ROCm][perf] Use workspace manager for sparse indexer alloca... | @gronsti-amd | draft | 2026-04-01 | 2026-04-01 |
| [#29117](https://github.com/vllm-project/vllm/pull/29117) | [torch.compile] refactor config hashing to compile_factors a... | @vnadathur | open | 2025-11-20 | 2026-04-01 |
| [#33825](https://github.com/vllm-project/vllm/pull/33825) | [vLLM IR] 1/N Implement IR skeleton and rms_norm op | @ProExpertProg | merged | 2026-02-04 | 2026-04-01 |
| [#37887](https://github.com/vllm-project/vllm/pull/37887) | [ROCm][perf] fix Aiter sparse MLA with MTP>1 | @gronsti-amd | merged | 2026-03-23 | 2026-03-31 |
| [#37501](https://github.com/vllm-project/vllm/pull/37501) | fix: clamp dA_cumsum differences to prevent Inf in Mamba2 SS... | @kibitzing | merged | 2026-03-19 | 2026-03-31 |
| [#38165](https://github.com/vllm-project/vllm/pull/38165) | [ROCm][CI] Override PYTORCH_ROCM_ARCH with detected GPU arch... | @AndreasKaratzas | merged | 2026-03-26 | 2026-03-31 |
| [#37841](https://github.com/vllm-project/vllm/pull/37841) | replace cuda_device_count_stateless() to current_platform.de... | @wincent8 | merged | 2026-03-23 | 2026-03-31 |
| [#35787](https://github.com/vllm-project/vllm/pull/35787) | [ROCm] Optimize gfx arch parsing for alpha stepping and guar... | @AndreasKaratzas | open | 2026-03-02 | 2026-03-31 |
| [#35692](https://github.com/vllm-project/vllm/pull/35692) | [Bug] Fix HIP build in Docker: filter offload-arch stderr fr... | @infektyd | open | 2026-03-02 | 2026-03-31 |
| [#38508](https://github.com/vllm-project/vllm/pull/38508) | [ROCm][CI] Fix Whisper translation test attention backend se... | @AndreasKaratzas | merged | 2026-03-30 | 2026-03-31 |
| [#37221](https://github.com/vllm-project/vllm/pull/37221) | [3/n] Migrate cutlass/scaled_mm_entry.cu torch stable ABI  | @mikaylagawarecki | merged | 2026-03-16 | 2026-03-31 |
| [#38381](https://github.com/vllm-project/vllm/pull/38381) | [ROCm][CI] Pin test_hybrid test to TRITON_ATTN on ROCm | @micah-wil | merged | 2026-03-27 | 2026-03-30 |
| [#37698](https://github.com/vllm-project/vllm/pull/37698) | [ROCm][Bugfix] fix exception related to trust_remote_code fo... | @hongxiayang | merged | 2026-03-20 | 2026-03-30 |
| [#37291](https://github.com/vllm-project/vllm/pull/37291) | [Bugfix] Handle ParallelLMHead in compressed-tensors get_qua... | @mgehre-amd | merged | 2026-03-17 | 2026-03-30 |
| [#38255](https://github.com/vllm-project/vllm/pull/38255) | [Bugfix] Remove false-positive format mismatch warnings in F... | @tdoublep | merged | 2026-03-26 | 2026-03-30 |
| [#36965](https://github.com/vllm-project/vllm/pull/36965) | [Model][Quantization] Add GGUF support for MiniMax-M2.1 | @JoursBleu | merged | 2026-03-13 | 2026-03-30 |
| [#38505](https://github.com/vllm-project/vllm/pull/38505) | [ci] Soft fail and disable retry for AMD build image job | @khluu | merged | 2026-03-30 | 2026-03-30 |
| [#38492](https://github.com/vllm-project/vllm/pull/38492) | [CI] Add temperature=0.0, reduce max_tokens, and add debug p... | @AndreasKaratzas | merged | 2026-03-30 | 2026-03-30 |
| [#38317](https://github.com/vllm-project/vllm/pull/38317) | [ROCm][CI] Enable hybrid chunked prefill test | @AndreasKaratzas | merged | 2026-03-27 | 2026-03-30 |
| [#31079](https://github.com/vllm-project/vllm/pull/31079) | Fix ROCm build to respect PYTORCH_ROCM_ARCH for GPU_TARGETS ... | @westers | open | 2025-12-20 | 2026-03-29 |
| [#38434](https://github.com/vllm-project/vllm/pull/38434) | [Fix] Improve ROCm detection in WSL environments | @yiz-liu | open | 2026-03-28 | 2026-03-28 |
| [#38108](https://github.com/vllm-project/vllm/pull/38108) | Fix Device Index for ROCm Ray Workers in MoE Benchmark | @li-liwen | merged | 2026-03-25 | 2026-03-28 |
| [#36702](https://github.com/vllm-project/vllm/pull/36702) | [ROCm] Attention selector reordering | @gshtras | merged | 2026-03-10 | 2026-03-28 |
| [#38337](https://github.com/vllm-project/vllm/pull/38337) | [ROCm][Build] Fix pip install detection when build isolation... | @westers | open | 2026-03-27 | 2026-03-27 |
| [#31062](https://github.com/vllm-project/vllm/pull/31062) | [ROCm][Docker] Add gfx1103 support to Docker builds | @westers | open | 2025-12-20 | 2026-03-27 |
| [#37930](https://github.com/vllm-project/vllm/pull/37930) | [ROCm][CI] Add uv pip compile workflow for rocm-test.txt loc... | @AndreasKaratzas | merged | 2026-03-23 | 2026-03-26 |
| [#36743](https://github.com/vllm-project/vllm/pull/36743) | [ROCm] Optimize concat_mla_q for CDNA3 (MI300X) and CDNA4 (M... | @andyluo7 | open | 2026-03-11 | 2026-03-26 |
| [#36058](https://github.com/vllm-project/vllm/pull/36058) | [2/n] Migrate per_token_group_quant to torch stable ABI | @mikaylagawarecki | merged | 2026-03-04 | 2026-03-25 |
| [#24532](https://github.com/vllm-project/vllm/pull/24532) | [core] add nccl symmetric memory for all reduce | @Amir-19 | merged | 2025-09-09 | 2026-03-24 |
| [#37533](https://github.com/vllm-project/vllm/pull/37533) | [ROCm] fix sleep mode not releasing GPU memory problem on RO... | @aaab8b | merged | 2026-03-19 | 2026-03-23 |
| [#34692](https://github.com/vllm-project/vllm/pull/34692) | [ROCm] Enable DeepEP ROCm as all2allbackend for AMD GPUs.  | @lcskrishna | merged | 2026-02-17 | 2026-03-21 |
| [#34709](https://github.com/vllm-project/vllm/pull/34709) | [ROCm] Enable wvSplitK skinny GEMM kernel for RDNA4/gfx1x de... | @laudney | merged | 2026-02-17 | 2026-03-20 |
| [#37634](https://github.com/vllm-project/vllm/pull/37634) | [XPU] Automatically detect target platform as XPU in build. | @ccrhx4 | merged | 2026-03-20 | 2026-03-20 |
| [#36720](https://github.com/vllm-project/vllm/pull/36720) | [Bugfix][ROCm] Fix worker startup OOM on ROCm by skipping un... | @JartX | merged | 2026-03-10 | 2026-03-18 |
| [#33077](https://github.com/vllm-project/vllm/pull/33077) | [BUGFIX] Fix hipErrorIllegalState in Qwen3-Omni during start... | @JartX | merged | 2026-01-26 | 2026-03-15 |
| [#31050](https://github.com/vllm-project/vllm/pull/31050) | [MoE Refactor] Split `invoke_fused_moe_kernel` | @zyongye | merged | 2025-12-20 | 2026-03-12 |
| [#36499](https://github.com/vllm-project/vllm/pull/36499) | [ROCm][CI/Build] Add gfx1152/gfx1153 (Krackan) to HIP suppor... | @mgehre-amd | merged | 2026-03-09 | 2026-03-11 |
| [#34735](https://github.com/vllm-project/vllm/pull/34735) | [AMD][CI] Fix test_custom_allreduce for A100 testgroup | @rjrock | merged | 2026-02-17 | 2026-03-10 |
| [#35538](https://github.com/vllm-project/vllm/pull/35538) | [docs][torch.compile] Add fusions.md — kernel/operator fusio... | @Copilot | merged | 2026-02-27 | 2026-03-06 |
| [#12087](https://github.com/vllm-project/vllm/pull/12087) | Allow hip sources to be directly included when compiling for... | @tvirolai-amd | merged | 2025-01-15 | 2026-03-06 |
| [#34301](https://github.com/vllm-project/vllm/pull/34301) | [ROCm][Quantization] Add Composable Kernel (CK) backend supp... | @dllehr-amd | merged | 2026-02-11 | 2026-03-03 |
| [#35069](https://github.com/vllm-project/vllm/pull/35069) | [ROCm] Derive device capability from GCN arch string without... | @AndreasKaratzas | merged | 2026-02-23 | 2026-03-02 |
| [#34169](https://github.com/vllm-project/vllm/pull/34169) | [CPU][Distributed] Fix Enable _CPUSHMDistributed only when T... | @charlesashby | merged | 2026-02-09 | 2026-03-02 |
| [#33762](https://github.com/vllm-project/vllm/pull/33762) | Add padding support to wvSplitK solution for skinny GEMMs | @amd-hhashemi | merged | 2026-02-04 | 2026-02-28 |
| [#35105](https://github.com/vllm-project/vllm/pull/35105) | [Refactor][Kernel] Add global helper to deduplicate vectoriz... | @LopezCastroRoberto | merged | 2026-02-23 | 2026-02-28 |
| [#35404](https://github.com/vllm-project/vllm/pull/35404) | [Bugfix][Model] Fix gpt-oss batch invariance | @jzakrzew | merged | 2026-02-26 | 2026-02-27 |
| [#34320](https://github.com/vllm-project/vllm/pull/34320) | [Bugfix] Fix Dynamo unexpected keyword argument  | @samutamm | merged | 2026-02-11 | 2026-02-27 |
| [#30357](https://github.com/vllm-project/vllm/pull/30357) | [ROCm][Quantization] GPT OSS Upstream MoE wmxfp4_afp8 with s... | @maleksan85 | merged | 2025-12-09 | 2026-02-26 |

# Weekly Digest

Week of 2026-04-22 to 2026-04-29

## New Releases

- **vllm**: [v0.20.0](https://github.com/vllm-project/vllm/releases/tag/v0.20.0)

## PRs This Week

### vllm
- Opened: [#40796](https://github.com/vllm-project/vllm/pull/40796) [Bugfix][Gemma 4] Clamp soft-token estimate to max_soft_toke (@hnt2601)
- Opened: [#41175](https://github.com/vllm-project/vllm/pull/41175) [ROCm][Bugfix]: W4A4 MOE using emulation instead of AITER on (@Rohan138)
- Opened: [#40754](https://github.com/vllm-project/vllm/pull/40754) [Bugfix][ROCm] Fix gemm_a4w4 call to use updated AITER API s (@chelnnexy)
- Opened: [#41076](https://github.com/vllm-project/vllm/pull/41076) [CI][AMD][BugFix] Update request URL in test_moriio_connecto (@rasmith)
- Merged: [#38479](https://github.com/vllm-project/vllm/pull/38479) [Attention Backend] TurboQuant: 2-bit KV cache compression w (@vibhavagarwal5)
- Merged: [#39801](https://github.com/vllm-project/vllm/pull/39801) [ROCm][CI] Add missing quantization methods and fix online q (@AndreasKaratzas)
- Merged: [#38371](https://github.com/vllm-project/vllm/pull/38371) Enable building MoRI with AMD AINIC stack (@ichbinblau)

## New Issues This Week

### vllm
- [#40949](https://github.com/vllm-project/vllm/issues/40949) [Bug]: Huggingface Tokenizer "RuntimeError: Already borrowed (@yzong-rh)
- [#40902](https://github.com/vllm-project/vllm/issues/40902) [Roadmap] DeepSeek V4 (@ivanium)
- [#41174](https://github.com/vllm-project/vllm/issues/41174) [Bug]: `sharded_state` load fails for FP8 models: `_filter_s (@mickelliu)
- [#40980](https://github.com/vllm-project/vllm/issues/40980) [Bug]: TP=2 deadlock on dual AMD R9700 (gfx1201/RDNA4) — GPU (@kyuz0)
- [#41153](https://github.com/vllm-project/vllm/issues/41153) [Bug]:[Qwen3.5] V1 KV cache page size unification fails for  (@shanyulu)
- [#40913](https://github.com/vllm-project/vllm/issues/40913) [Bug]: Timeout when using LoRA with Nemotron Super (Nano is  (@danisereb)
- [#40628](https://github.com/vllm-project/vllm/issues/40628) [RFC][vLLM IR]: Batch Invariance Dispatching in vLLM IR (@ProExpertProg)
- [#41027](https://github.com/vllm-project/vllm/issues/41027) [Bug]: can't run deepseek v4 flash (@WangHHY19931001)
- [#41108](https://github.com/vllm-project/vllm/issues/41108) [Bug]: GLM-5.1-NVFP4 RuntimeError: The size of tensor a (307 (@paolovic)
- [#40587](https://github.com/vllm-project/vllm/issues/40587) [Bug]: `+rotary_embedding` error with DeepSeek-V3.2-NVFP4 (@carlyou)
- [#41103](https://github.com/vllm-project/vllm/issues/41103) [Bug]: glibc error when using vllm-0.20.0+cu129-cp38-abi3-ma (@JaheimLee)
- [#41092](https://github.com/vllm-project/vllm/issues/41092) [ROCm][Bug]: Quark MXFP4 `w_mxfp4_a_mxfp4` linear path corru (@AndreasKaratzas)
- [#41071](https://github.com/vllm-project/vllm/issues/41071) [Bug]: KeyError: 'layers.0.mlp.experts.w13_bias' when runnin (@damadei-g)
- [#40972](https://github.com/vllm-project/vllm/issues/40972) [Bug]: [CPU] Qwen3-VL fails at torch.compile warmup on PT 2. (@amd-lalithnc)
- [#40994](https://github.com/vllm-project/vllm/issues/40994) [Bug]: vllm does not expose /v1/audio/transcriptions for goo (@vanbukin)
- [#40675](https://github.com/vllm-project/vllm/issues/40675) [RFC] Support Intel Quantization Toolkit AutoRound on Intel  (@Zhenzhong1)
- [#40966](https://github.com/vllm-project/vllm/issues/40966) [Bug]: Triton MLA decode kernel shape mismatch for Mistral-S (@vllmellm)
- [#40905](https://github.com/vllm-project/vllm/issues/40905) [Bug]: IMA in _causal_conv1d_fwd_kernel for long sequence in (@molly-ting)
- [#40699](https://github.com/vllm-project/vllm/issues/40699) [Bug]: For Qwen3.5 serise, Large benchmark gap (~10 points)  (@Katono5)
- [#40632](https://github.com/vllm-project/vllm/issues/40632) [Feature]: Support DFlash for Kimi K2.5 and Qwen3.5-27B for  (@mdavedcgpu)
- [#40771](https://github.com/vllm-project/vllm/issues/40771) [Bug]: AMD MI250 scheduling bug on Gemma2 (@Concurrensee)
- [#40593](https://github.com/vllm-project/vllm/issues/40593) [Bug][ROCm]: NIXL not available logs when using MoRI connect (@simondanielsson)
- [#40620](https://github.com/vllm-project/vllm/issues/40620) [RFC]: Unified Device Capability Abstraction for Cross-Platf (@jikunshang)

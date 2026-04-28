# Weekly Digest

Week of 2026-04-21 to 2026-04-28

## New Releases

- **vllm**: [v0.20.0](https://github.com/vllm-project/vllm/releases/tag/v0.20.0)

## PRs This Week

### vllm
- Opened: [#40796](https://github.com/vllm-project/vllm/pull/40796) [Bugfix][Gemma 4] Clamp soft-token estimate to max_soft_toke (@hnt2601)
- Opened: [#40871](https://github.com/vllm-project/vllm/pull/40871) [New Model][ROCm] Add AMD support for DeepSeek V4 (@whx-sjtu)
- Opened: [#41101](https://github.com/vllm-project/vllm/pull/41101) [ROCm] Add unified AITER RoPE+KV cache and dual RMSNorm fusi (@khairulkabir1661)
- Opened: [#41100](https://github.com/vllm-project/vllm/pull/41100) [ROCm][CI] Extended Fused MoE and FP8 MoE test support (@AndreasKaratzas)
- Opened: [#40943](https://github.com/vllm-project/vllm/pull/40943) [ROCm][CI] Upgrade ROCm quantized MoE coverage (@AndreasKaratzas)
- Opened: [#40939](https://github.com/vllm-project/vllm/pull/40939) [ROCm][CI] Upgrade quantized FP4 kernels coverage (@AndreasKaratzas)
- Opened: [#41076](https://github.com/vllm-project/vllm/pull/41076) [CI][AMD][BugFix] Update request URL in test_moriio_connecto (@rasmith)
- Opened: [#41099](https://github.com/vllm-project/vllm/pull/41099) [ROCm] Add AITER RoPE+KV cache and dual RMSNorm fusion for M (@khairulkabir1661)
- Opened: [#41095](https://github.com/vllm-project/vllm/pull/41095) [ROCm] Add AITER fused dual RMSNorm for MLA (@khairulkabir1661)
- Opened: [#40686](https://github.com/vllm-project/vllm/pull/40686) fix(rocm): remove workaround causing invalid argument on Qwe (@aaab8b)

## New Issues This Week

### vllm
- [#40902](https://github.com/vllm-project/vllm/issues/40902) [Roadmap] DeepSeek V4 (@ivanium)
- [#41092](https://github.com/vllm-project/vllm/issues/41092) [ROCm][Bug]: Quark MXFP4 `w_mxfp4_a_mxfp4` linear path corru (@AndreasKaratzas)
- [#41027](https://github.com/vllm-project/vllm/issues/41027) [Bug]: can't run deepseek v4 flash (@WangHHY19931001)
- [#40949](https://github.com/vllm-project/vllm/issues/40949) [Bug]: Huggingface Tokenizer "RuntimeError: Already borrowed (@yzong-rh)
- [#41071](https://github.com/vllm-project/vllm/issues/41071) [Bug]: KeyError: 'layers.0.mlp.experts.w13_bias' when runnin (@damadei-g)
- [#40554](https://github.com/vllm-project/vllm/issues/40554) [AMD][CI Failure][Tracker] Static dashboard tracker for curr (@AndreasKaratzas)
- [#40980](https://github.com/vllm-project/vllm/issues/40980) [Bug]: TP=2 deadlock on dual AMD R9700 (gfx1201/RDNA4) — GPU (@kyuz0)
- [#40896](https://github.com/vllm-project/vllm/issues/40896) [Bug]:  vLLM v1 with prefix caching: first request differs f (@Yunzez)
- [#40628](https://github.com/vllm-project/vllm/issues/40628) [RFC][vLLM IR]: Batch Invariance Dispatching in vLLM IR (@ProExpertProg)
- [#40972](https://github.com/vllm-project/vllm/issues/40972) [Bug]: [CPU] Qwen3-VL fails at torch.compile warmup on PT 2. (@amd-lalithnc)
- [#40994](https://github.com/vllm-project/vllm/issues/40994) [Bug]: vllm does not expose /v1/audio/transcriptions for goo (@vanbukin)
- [#40675](https://github.com/vllm-project/vllm/issues/40675) [RFC] Support Intel Quantization Toolkit AutoRound on Intel  (@Zhenzhong1)
- [#40801](https://github.com/vllm-project/vllm/issues/40801) [Bug]: Title: DeepSeek V4 intermittently leaks DSML fragment (@Windswithyou)
- [#40802](https://github.com/vllm-project/vllm/issues/40802) [Feature]: Deepseek V4 cannot run ,Please support SM120 GPU, (@wuwenthink)
- [#40966](https://github.com/vllm-project/vllm/issues/40966) [Bug]: Triton MLA decode kernel shape mismatch for Mistral-S (@vllmellm)
- [#40905](https://github.com/vllm-project/vllm/issues/40905) [Bug]: IMA in _causal_conv1d_fwd_kernel for long sequence in (@molly-ting)
- [#40699](https://github.com/vllm-project/vllm/issues/40699) [Bug]: For Qwen3.5 serise, Large benchmark gap (~10 points)  (@Katono5)
- [#40632](https://github.com/vllm-project/vllm/issues/40632) [Feature]: Support DFlash for Kimi K2.5 and Qwen3.5-27B for  (@mdavedcgpu)
- [#40807](https://github.com/vllm-project/vllm/issues/40807) [Bug]: TurboQuant KV + spec-decode + chunked-prefill crashes (@noonghunna)
- [#40771](https://github.com/vllm-project/vllm/issues/40771) [Bug]: AMD MI250 scheduling bug on Gemma2 (@Concurrensee)
- [#40421](https://github.com/vllm-project/vllm/issues/40421) [Feature]: [parity with CUDA] PD disagg recipes on vllm (@functionstackx)
- [#40593](https://github.com/vllm-project/vllm/issues/40593) [Bug][ROCm]: NIXL not available logs when using MoRI connect (@simondanielsson)
- [#40620](https://github.com/vllm-project/vllm/issues/40620) [RFC]: Unified Device Capability Abstraction for Cross-Platf (@jikunshang)

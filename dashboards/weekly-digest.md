# Weekly Digest

Week of 2026-04-20 to 2026-04-27

## New Releases

- **vllm**: [v0.20.0](https://github.com/vllm-project/vllm/releases/tag/v0.20.0)

## PRs This Week

### vllm
- Opened: [#40344](https://github.com/vllm-project/vllm/pull/40344) [Fix][ROCm] Resolve MoRI connector hangs at high concurrency (@simondanielsson)
- Opened: [#40796](https://github.com/vllm-project/vllm/pull/40796) [Bugfix][Gemma 4] Clamp soft-token estimate to max_soft_toke (@hnt2601)
- Opened: [#40947](https://github.com/vllm-project/vllm/pull/40947) Cherrypick --omni Entrypoint Handling (40744) for v.0.20.0 (@alex-jw-brooks)

## New Issues This Week

### vllm
- [#40350](https://github.com/vllm-project/vllm/issues/40350) [Bug]: Qwen3.5-397B-A17B-NVFP4 engine hangs (Running≥1, 0 to (@arpera)
- [#40994](https://github.com/vllm-project/vllm/issues/40994) [Bug]: vllm does not expose /v1/audio/transcriptions for goo (@vanbukin)
- [#40902](https://github.com/vllm-project/vllm/issues/40902) [Roadmap] DeepSeek V4 (@ivanium)
- [#40675](https://github.com/vllm-project/vllm/issues/40675) [RFC] Support Intel Quantization Toolkit AutoRound on Intel  (@Zhenzhong1)
- [#40801](https://github.com/vllm-project/vllm/issues/40801) [Bug]: Title: DeepSeek V4 intermittently leaks DSML fragment (@Windswithyou)
- [#40802](https://github.com/vllm-project/vllm/issues/40802) [Feature]: Deepseek V4 cannot run ,Please support SM120 GPU, (@wuwenthink)
- [#40863](https://github.com/vllm-project/vllm/issues/40863) [Bug]: Using H200 to deploy DeepSeekV4, after sending a long (@kelliaao)
- [#40980](https://github.com/vllm-project/vllm/issues/40980) [Bug]: TP=2 deadlock on dual AMD R9700 (gfx1201/RDNA4) — GPU (@kyuz0)
- [#40972](https://github.com/vllm-project/vllm/issues/40972) [Bug]: [CPU] Qwen3-VL fails at torch.compile warmup on PT 2. (@amd-lalithnc)
- [#40966](https://github.com/vllm-project/vllm/issues/40966) [Bug]: Triton MLA decode kernel shape mismatch for Mistral-S (@vllmellm)
- [#40949](https://github.com/vllm-project/vllm/issues/40949) [Bug]: Huggingface Tokenizer "RuntimeError: Already borrowed (@yzong-rh)
- [#40554](https://github.com/vllm-project/vllm/issues/40554) [AMD][CI Failure][Tracker] Static dashboard tracker for curr (@AndreasKaratzas)
- [#40919](https://github.com/vllm-project/vllm/issues/40919) [Bug]: RMSNormGated input_guard breaks torch.compile dynamo  (@izhuhaoran)
- [#40913](https://github.com/vllm-project/vllm/issues/40913) [Bug]: Timeout when using LoRA with Nemotron Super (Nano is  (@danisereb)
- [#40905](https://github.com/vllm-project/vllm/issues/40905) [Bug]: IMA in _causal_conv1d_fwd_kernel for long sequence in (@molly-ting)
- [#40885](https://github.com/vllm-project/vllm/issues/40885) [Bug]: Qwen3-VL-MoE NVFP4 checkpoint (un-BMM'd per-expert fo (@Code4me2)
- [#40699](https://github.com/vllm-project/vllm/issues/40699) [Bug]: For Qwen3.5 serise, Large benchmark gap (~10 points)  (@Katono5)
- [#40632](https://github.com/vllm-project/vllm/issues/40632) [Feature]: Support DFlash for Kimi K2.5 and Qwen3.5-27B for  (@mdavedcgpu)
- [#40807](https://github.com/vllm-project/vllm/issues/40807) [Bug]: TurboQuant KV + spec-decode + chunked-prefill crashes (@noonghunna)
- [#40728](https://github.com/vllm-project/vllm/issues/40728) [CI Failure]: mi355_1: Kernels MoE Test %N (@AndreasKaratzas)
- [#40677](https://github.com/vllm-project/vllm/issues/40677) [Bug]: Gemma-4 fails when forcing FLASHINFER attention backe (@dhayanesh)
- [#40816](https://github.com/vllm-project/vllm/issues/40816) [Bug]: Qwen3.6 streaming chat completions emit final answer  (@xy3xy3)
- [#40771](https://github.com/vllm-project/vllm/issues/40771) [Bug]: AMD MI250 scheduling bug on Gemma2 (@Concurrensee)
- [#40628](https://github.com/vllm-project/vllm/issues/40628) [RFC][vLLM IR]: Batch Invariance Dispatching in vLLM IR (@ProExpertProg)
- [#40716](https://github.com/vllm-project/vllm/issues/40716) [Bug]: The size of tensor a (34) must match the size of tens (@ir1ka)
- [#40421](https://github.com/vllm-project/vllm/issues/40421) [Feature]: [parity with CUDA] PD disagg recipes on vllm (@functionstackx)
- [#40593](https://github.com/vllm-project/vllm/issues/40593) [Bug][ROCm]: NIXL not available logs when using MoRI connect (@simondanielsson)
- [#40620](https://github.com/vllm-project/vllm/issues/40620) [RFC]: Unified Device Capability Abstraction for Cross-Platf (@jikunshang)
- [#40397](https://github.com/vllm-project/vllm/issues/40397) [Feature]: Add ROCm support for simple offload connector (@cquil11)
- [#40340](https://github.com/vllm-project/vllm/issues/40340) [Bug]: MoRI Connector hangs at >=128 concurrency (@simondanielsson)

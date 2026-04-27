# Weekly Digest

Week of 2026-04-20 to 2026-04-27

## New Releases

_No new releases this week._

## PRs This Week

### vllm
- Opened: [#40939](https://github.com/vllm-project/vllm/pull/40939) [ROCm][CI] Upgrade quantized FP4 kernels coverage (@AndreasKaratzas)
- Opened: [#40848](https://github.com/vllm-project/vllm/pull/40848) [Frontend][RFC] Rust front-end integration (@njhill)
- Opened: [#40963](https://github.com/vllm-project/vllm/pull/40963) fix(rocm): detect AMD APU and fix VRAM reporting for unified (@hephaex)
- Opened: [#40931](https://github.com/vllm-project/vllm/pull/40931) [ROCm] [DeepSeekV4] Preliminary Enablement of DeepSeekV4 on  (@tjtanaavllm)
- Opened: [#40947](https://github.com/vllm-project/vllm/pull/40947) Cherrypick --omni Entrypoint Handling (40744) for v.0.20.0 (@alex-jw-brooks)
- Opened: [#40338](https://github.com/vllm-project/vllm/pull/40338) [LoRA] MoE LoRA Refactor (@jeejeelee)

## New Issues This Week

### vllm
- [#40966](https://github.com/vllm-project/vllm/issues/40966) [Bug]: Triton MLA decode kernel shape mismatch for Mistral-S (@vllmellm)
- [#40902](https://github.com/vllm-project/vllm/issues/40902) [Roadmap] DeepSeek V4 (@ivanium)
- [#40949](https://github.com/vllm-project/vllm/issues/40949) [Bug]: Huggingface Tokenizer "RuntimeError: Already borrowed (@yzong-rh)
- [#40863](https://github.com/vllm-project/vllm/issues/40863) [Bug]: Using H200 to deploy DeepSeekV4, after sending a long (@kelliaao)
- [#40554](https://github.com/vllm-project/vllm/issues/40554) [AMD][CI Failure][Tracker] Static dashboard tracker for curr (@AndreasKaratzas)
- [#40919](https://github.com/vllm-project/vllm/issues/40919) [Bug]: RMSNormGated input_guard breaks torch.compile dynamo  (@izhuhaoran)
- [#40913](https://github.com/vllm-project/vllm/issues/40913) [Bug]: Timeout when using LoRA with Nemotron Super (Nano is  (@danisereb)
- [#40778](https://github.com/vllm-project/vllm/issues/40778) [Feature]: deepseek v4 support (@liudonghua123)
- [#40905](https://github.com/vllm-project/vllm/issues/40905) [Bug]: IMA in _causal_conv1d_fwd_kernel for long sequence in (@molly-ting)
- [#40885](https://github.com/vllm-project/vllm/issues/40885) [Bug]: Qwen3-VL-MoE NVFP4 checkpoint (un-BMM'd per-expert fo (@Code4me2)
- [#40699](https://github.com/vllm-project/vllm/issues/40699) [Bug]: For Qwen3.5 serise, Large benchmark gap (~10 points)  (@Katono5)
- [#40632](https://github.com/vllm-project/vllm/issues/40632) [Feature]: Support DFlash for Kimi K2.5 and Qwen3.5-27B for  (@mdavedcgpu)
- [#40807](https://github.com/vllm-project/vllm/issues/40807) [Bug]: TurboQuant KV + spec-decode + chunked-prefill crashes (@noonghunna)
- [#40802](https://github.com/vllm-project/vllm/issues/40802) [Feature]: Deepseek V4 cannot run ,Please support SM120 GPU, (@wuwenthink)
- [#40728](https://github.com/vllm-project/vllm/issues/40728) [CI Failure]: mi355_1: Kernels MoE Test %N (@AndreasKaratzas)
- [#40677](https://github.com/vllm-project/vllm/issues/40677) [Bug]: Gemma-4 fails when forcing FLASHINFER attention backe (@dhayanesh)
- [#40816](https://github.com/vllm-project/vllm/issues/40816) [Bug]: Qwen3.6 streaming chat completions emit final answer  (@xy3xy3)
- [#40801](https://github.com/vllm-project/vllm/issues/40801) [Bug]: Title: DeepSeek V4 intermittently leaks DSML fragment (@Windswithyou)
- [#40791](https://github.com/vllm-project/vllm/issues/40791) [Bug]: Workspace allocation failure when combining Decode Co (@BenWongCityuCS)
- [#40771](https://github.com/vllm-project/vllm/issues/40771) [Bug]: AMD MI250 scheduling bug on Gemma2 (@Concurrensee)
- [#40765](https://github.com/vllm-project/vllm/issues/40765) [Bug]: runai_streamer loads both Ministral consolidated and  (@dhayanesh)
- [#40675](https://github.com/vllm-project/vllm/issues/40675) [RFC] Support Intel ARK Quantization Toolkit for AutoRound o (@Zhenzhong1)
- [#40628](https://github.com/vllm-project/vllm/issues/40628) [RFC][vLLM IR]: Batch Invariance Dispatching in vLLM IR (@ProExpertProg)
- [#40716](https://github.com/vllm-project/vllm/issues/40716) [Bug]: The size of tensor a (34) must match the size of tens (@ir1ka)
- [#40696](https://github.com/vllm-project/vllm/issues/40696) [Feature]: Prefix caching completely ineffective for Mamba-h (@Gaodzlearn)
- [#40421](https://github.com/vllm-project/vllm/issues/40421) [Feature]: [parity with CUDA] PD disagg recipes on vllm (@functionstackx)
- [#40593](https://github.com/vllm-project/vllm/issues/40593) [Bug][ROCm]: NIXL not available logs when using MoRI connect (@simondanielsson)
- [#40620](https://github.com/vllm-project/vllm/issues/40620) [RFC]: Unified Device Capability Abstraction for Cross-Platf (@jikunshang)
- [#40397](https://github.com/vllm-project/vllm/issues/40397) [Feature]: Add ROCm support for simple offload connector (@cquil11)
- [#40340](https://github.com/vllm-project/vllm/issues/40340) [Bug]: MoRI Connector hangs at >=128 concurrency (@simondanielsson)

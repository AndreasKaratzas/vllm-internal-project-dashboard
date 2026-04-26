# Weekly Digest

Week of 2026-04-19 to 2026-04-26

## New Releases

- **vllm**: [v0.20.0](https://github.com/vllm-project/vllm/releases/tag/v0.20.0)

## PRs This Week

### vllm
- Opened: [#40909](https://github.com/vllm-project/vllm/pull/40909) [ROCm][DSv4] Share AITER decode dequant + fp8-cast buffers a (@ChuanLi1101)
- Opened: [#40892](https://github.com/vllm-project/vllm/pull/40892) [ROCm][DSv4] Make AITER sparse MLA decode cudagraph-clean (f (@ChuanLi1101)
- Opened: [#40889](https://github.com/vllm-project/vllm/pull/40889) [ROCm] Add AITER-accelerated MLA decode for DeepSeek V4 on M (@ChuanLi1101)
- Opened: [#40338](https://github.com/vllm-project/vllm/pull/40338) [LoRA] MoE LoRA Refactor (@jeejeelee)
- Opened: [#40767](https://github.com/vllm-project/vllm/pull/40767) [CI][AMD]BugFix] Fix deadlock occuring in test_moe_layer (@rasmith)
- Opened: [#40864](https://github.com/vllm-project/vllm/pull/40864) [New Model][ROCm] Add AMD support for DeepSeek V4 (@whx-sjtu)
- Opened: [#40306](https://github.com/vllm-project/vllm/pull/40306) [ROCm][CI] Fix `trust_remote_code` AttributeError in EAGLE3  (@AndreasKaratzas)
- Merged: [#38503](https://github.com/vllm-project/vllm/pull/38503) [ROCm][Engine] Fix GPU memory leaks in engine shutdown and t (@AndreasKaratzas)
- Merged: [#39799](https://github.com/vllm-project/vllm/pull/39799) [ROCm][CI] Fix TestSiluMulGroupFp8QuantModel after W8A8 bloc (@AndreasKaratzas)

## New Issues This Week

### vllm
- [#40778](https://github.com/vllm-project/vllm/issues/40778) [Feature]: deepseek v4 support (@liudonghua123)
- [#40902](https://github.com/vllm-project/vllm/issues/40902) [Roadmap] DeepSeek V4 (@ivanium)
- [#40905](https://github.com/vllm-project/vllm/issues/40905) [Bug]: IMA in _causal_conv1d_fwd_kernel for long sequence in (@molly-ting)
- [#40554](https://github.com/vllm-project/vllm/issues/40554) [AMD][CI Failure][Tracker] Static dashboard tracker for curr (@AndreasKaratzas)
- [#40885](https://github.com/vllm-project/vllm/issues/40885) [Bug]: Qwen3-VL-MoE NVFP4 checkpoint (un-BMM'd per-expert fo (@Code4me2)
- [#40863](https://github.com/vllm-project/vllm/issues/40863) [Bug]: Using H200 to deploy DeepSeekV4, after sending a long (@kelliaao)
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
- [#40755](https://github.com/vllm-project/vllm/issues/40755) [Model Runner V2][Bug]: The _gumbel_sample_kernel exhibits p (@lio1226)
- [#40628](https://github.com/vllm-project/vllm/issues/40628) [RFC][vLLM IR]: Batch Invariance Dispatching in vLLM IR (@ProExpertProg)
- [#40740](https://github.com/vllm-project/vllm/issues/40740) [Bug]: assert is_mixture_of_experts fails on vllm serve with (@deveringham)
- [#40716](https://github.com/vllm-project/vllm/issues/40716) [Bug]: The size of tensor a (34) must match the size of tens (@ir1ka)
- [#40696](https://github.com/vllm-project/vllm/issues/40696) [Feature]: Prefix caching completely ineffective for Mamba-h (@Gaodzlearn)
- [#40301](https://github.com/vllm-project/vllm/issues/40301) [Bug]: Triton MXFP4 MoE device capability check < (11, 0) br (@kyuz0)
- [#40421](https://github.com/vllm-project/vllm/issues/40421) [Feature]: [parity with CUDA] PD disagg recipes on vllm (@functionstackx)
- [#40593](https://github.com/vllm-project/vllm/issues/40593) [Bug][ROCm]: NIXL not available logs when using MoRI connect (@simondanielsson)
- [#40620](https://github.com/vllm-project/vllm/issues/40620) [RFC]: Unified Device Capability Abstraction for Cross-Platf (@jikunshang)
- [#40397](https://github.com/vllm-project/vllm/issues/40397) [Feature]: Add ROCm support for simple offload connector (@cquil11)
- [#40340](https://github.com/vllm-project/vllm/issues/40340) [Bug]: MoRI Connector hangs at >=128 concurrency (@simondanielsson)

# Weekly Digest

Week of 2026-03-31 to 2026-04-07

## New Releases

- **vllm**: [v0.19.0](https://github.com/vllm-project/vllm/releases/tag/v0.19.0)
- **vllm**: [v0.18.1](https://github.com/vllm-project/vllm/releases/tag/v0.18.1)

## PRs This Week

### vllm
- Opened: [#39149](https://github.com/vllm-project/vllm/issues/39149) [Bug]: Segfault in Triton LLVM (MachineCSE / translateLLVMIR (@1220856302)
- Opened: [#39118](https://github.com/vllm-project/vllm/pull/39118) [ROCm] Fix UnboundLocalError for prefix_scheduler_metadata i (@Bortlesboat)
- Opened: [#39128](https://github.com/vllm-project/vllm/pull/39128) [ROCm] Remove false ENCODER_DECODER support from unified att (@Bortlesboat)
- Opened: [#39077](https://github.com/vllm-project/vllm/issues/39077) [Bug]: qwen 3.5 crash with mtp (@ZJY0516)
- Opened: [#39117](https://github.com/vllm-project/vllm/pull/39117) [ROCm] Fix AWQ env var scope, shuffle KV cache flag, sparse_ (@Bortlesboat)
- Opened: [#39119](https://github.com/vllm-project/vllm/pull/39119) [ROCm] Align AiterFlashAttentionImpl attn_type check with ba (@Bortlesboat)
- Opened: [#39120](https://github.com/vllm-project/vllm/pull/39120) [ROCm] Fix cu_seqlens_q off-by-one in AITER FA speculative d (@Bortlesboat)
- Opened: [#39122](https://github.com/vllm-project/vllm/pull/39122) [ROCm] Remove unnecessary fp8 roundtrip in gather cache NHD  (@Bortlesboat)
- Opened: [#39121](https://github.com/vllm-project/vllm/pull/39121) [ROCm] Use quant_dtype in per_token_quant instead of hardcod (@Bortlesboat)
- Opened: [#39146](https://github.com/vllm-project/vllm/issues/39146) [Bug]: KV block corruption in base scheduler, Non-determinis (@Yunzez)
- Opened: [#39089](https://github.com/vllm-project/vllm/issues/39089) [Bug]: gemma4 tool-call-parser corrupts boolean values in to (@simingy)
- Opened: [#39104](https://github.com/vllm-project/vllm/issues/39104) [Usage]: The qwen3.5 model generates a random stream of word (@nagashik)
- Opened: [#39071](https://github.com/vllm-project/vllm/issues/39071) [Bug]: Gemma 4 31B Structured Outputs weird behaviour / char (@NilsHellwig)
- Opened: [#39043](https://github.com/vllm-project/vllm/issues/39043) [Bug]: Vllm + Gemma 4 + claude code: tool calling problems (@drrros)
- Opened: [#38656](https://github.com/vllm-project/vllm/issues/38656) [Bug]: qwen 3.5 model launch get stuck for quite a long time (@yanan1116)
- Opened: [#39025](https://github.com/vllm-project/vllm/issues/39025) [Bug]: CUDA illegal memory access with CUDA graphs enabled u (@vibhavagarwal5)
- Opened: [#38884](https://github.com/vllm-project/vllm/issues/38884) [Bug]: Gemma 4 torch._dynamo.exc.TorchRuntimeError: Dynamo f (@NilsHellwig)
- Opened: [#39068](https://github.com/vllm-project/vllm/issues/39068) [Bug]: Duplicate parameter name in convert_vertical_slash_in (@ohsono)
- Opened: [#39057](https://github.com/vllm-project/vllm/issues/39057) [Bug]: Deepseek v3.2 RuntimeError: Worker failed with error  (@jxdn)
- Opened: [#38936](https://github.com/vllm-project/vllm/issues/38936) [Bug]: NVIDIA-Nemotron-Nano-12B-v2-VL-BF16 offline execution (@shilpa-ananth)
- Opened: [#38994](https://github.com/vllm-project/vllm/issues/38994) Qwen-3.5 9B often producing repetitive/garbled output with I (@AlexanderValentini)
- Opened: [#39049](https://github.com/vllm-project/vllm/issues/39049) [Bug]: Gemma 4 FP8 dynamic quantization = gibberish output (@frenzybiscuit)
- Opened: [#39048](https://github.com/vllm-project/vllm/issues/39048) [Bug]:  NVML_SUCCESS == r INTERNAL ASSERT FAILED and OOM (@littlechicks)
- Opened: [#39010](https://github.com/vllm-project/vllm/issues/39010) [Bug]: Hang During CUDA Graph Capture on ROCM in 0.19 (@depuhitv)
- Opened: [#38979](https://github.com/vllm-project/vllm/issues/38979) [Bug]: Regression in vllm 0.19.0 - The page size of the laye (@outermeasure)
- Opened: [#38972](https://github.com/vllm-project/vllm/issues/38972) [Bug]: Mistral Small 4 (119B MoE) fails to start on ROCm MI3 (@maincodeMax)
- Opened: [#38924](https://github.com/vllm-project/vllm/issues/38924) [Bug][ROCm] GLM-5 MXFP4 sparse MLA decode crash on MI355x (@ChuanLi1101)
- Opened: [#38692](https://github.com/vllm-project/vllm/issues/38692) [Bug]: parity with CUDA & parity with rocm sglang: vLLM rout (@functionstackx)
- Opened: [#38851](https://github.com/vllm-project/vllm/issues/38851) [Feature]: ROCm Kimi K2.5 EAGLE3 MTP heads (@functionstackx)
- Merged: [#38504](https://github.com/vllm-project/vllm/pull/38504) [Kernels][MoE] Fix legacy_routing to use bitmatrix-based rou (@AndreasKaratzas)
- Merged: [#35733](https://github.com/vllm-project/vllm/pull/35733) [NVFP4] Support NVFP4 dense models from `modelopt` and `comp (@fxmarty-amd)

## New Issues This Week

### vllm
- [#39149](https://github.com/vllm-project/vllm/issues/39149) [Bug]: Segfault in Triton LLVM (MachineCSE / translateLLVMIR (@1220856302)
- [#39077](https://github.com/vllm-project/vllm/issues/39077) [Bug]: qwen 3.5 crash with mtp (@ZJY0516)
- [#39146](https://github.com/vllm-project/vllm/issues/39146) [Bug]: KV block corruption in base scheduler, Non-determinis (@Yunzez)
- [#39089](https://github.com/vllm-project/vllm/issues/39089) [Bug]: gemma4 tool-call-parser corrupts boolean values in to (@simingy)
- [#39104](https://github.com/vllm-project/vllm/issues/39104) [Usage]: The qwen3.5 model generates a random stream of word (@nagashik)
- [#39071](https://github.com/vllm-project/vllm/issues/39071) [Bug]: Gemma 4 31B Structured Outputs weird behaviour / char (@NilsHellwig)
- [#39043](https://github.com/vllm-project/vllm/issues/39043) [Bug]: Vllm + Gemma 4 + claude code: tool calling problems (@drrros)
- [#38656](https://github.com/vllm-project/vllm/issues/38656) [Bug]: qwen 3.5 model launch get stuck for quite a long time (@yanan1116)
- [#39025](https://github.com/vllm-project/vllm/issues/39025) [Bug]: CUDA illegal memory access with CUDA graphs enabled u (@vibhavagarwal5)
- [#38884](https://github.com/vllm-project/vllm/issues/38884) [Bug]: Gemma 4 torch._dynamo.exc.TorchRuntimeError: Dynamo f (@NilsHellwig)
- [#39068](https://github.com/vllm-project/vllm/issues/39068) [Bug]: Duplicate parameter name in convert_vertical_slash_in (@ohsono)
- [#39057](https://github.com/vllm-project/vllm/issues/39057) [Bug]: Deepseek v3.2 RuntimeError: Worker failed with error  (@jxdn)
- [#38936](https://github.com/vllm-project/vllm/issues/38936) [Bug]: NVIDIA-Nemotron-Nano-12B-v2-VL-BF16 offline execution (@shilpa-ananth)
- [#38994](https://github.com/vllm-project/vllm/issues/38994) Qwen-3.5 9B often producing repetitive/garbled output with I (@AlexanderValentini)
- [#39049](https://github.com/vllm-project/vllm/issues/39049) [Bug]: Gemma 4 FP8 dynamic quantization = gibberish output (@frenzybiscuit)
- [#39048](https://github.com/vllm-project/vllm/issues/39048) [Bug]:  NVML_SUCCESS == r INTERNAL ASSERT FAILED and OOM (@littlechicks)
- [#39010](https://github.com/vllm-project/vllm/issues/39010) [Bug]: Hang During CUDA Graph Capture on ROCM in 0.19 (@depuhitv)
- [#38979](https://github.com/vllm-project/vllm/issues/38979) [Bug]: Regression in vllm 0.19.0 - The page size of the laye (@outermeasure)
- [#38972](https://github.com/vllm-project/vllm/issues/38972) [Bug]: Mistral Small 4 (119B MoE) fails to start on ROCm MI3 (@maincodeMax)
- [#38924](https://github.com/vllm-project/vllm/issues/38924) [Bug][ROCm] GLM-5 MXFP4 sparse MLA decode crash on MI355x (@ChuanLi1101)
- [#38692](https://github.com/vllm-project/vllm/issues/38692) [Bug]: parity with CUDA & parity with rocm sglang: vLLM rout (@functionstackx)
- [#38851](https://github.com/vllm-project/vllm/issues/38851) [Feature]: ROCm Kimi K2.5 EAGLE3 MTP heads (@functionstackx)
- [#38693](https://github.com/vllm-project/vllm/issues/38693) [Feature]: Parity with CUDA: vLLM router should have ROCm CI (@functionstackx)
- [#38687](https://github.com/vllm-project/vllm/issues/38687) [Bug]: parity with CUDA: ROCm nightly & release docker image (@functionstackx)

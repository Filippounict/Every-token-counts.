# Literature notes and SOTA baselines

My working notes from the four baseline papers. I pulled the exact numbers, hardware quirks, and open gaps I need for the poster and Q&A.

I used SOTA as State-Of-The_Art

## 1. Samsi et al. (2023) - "From Words to Watts" (`arXiv:2310.03003`)
Setup: LLaMA 7B, 13B, and 65B on MIT SuperCloud (V100 32GB and A100 80GB), metered with `nvidia-smi` (100ms) and DCGM across 4,096 prompts from `Alpaca` and `GSM8K`.

Generating a single output token on LLaMA 65B across 8 V100 GPUs costs 3 to 4 Joules (about 0.83 to 1.11 mWh per token). Sharding the model across more GPUs drives the total energy per token even higher.

Task structure changes how the hardware behaves. `GSM8K` math problems and `Alpaca` instructions produce very different prompt and output lengths, and moving from V100 to A100 gives a much smaller speedup on `GSM8K` than on `Alpaca`.

Two hardware findings stood out to me:
1. Lowering the A100 power limit by 30% (250 W down to 175 W) only slows inference down by 6.7%, but cuts total energy consumption by 23.21%.
2. At batch size 64, GPU compute cores (SMs) sit at 94% to 98% utilization while A100 VRAM sits mostly idle at 23% to 27%.

The biggest takeaway that I found for us: Section III-C: the authors explicitly note that they did not check answer accuracy or control input/output complexity, leaving the energy-quality trade-off for future work


## 2. UNESCO & UCL (2025) - "Smarter, Smaller, Stronger"
Setup: LLaMA 3.1 8B Instruct and small models (61M to 570M) on RTX 3090 Ti + i9-12900K, metered with CodeCarbon across 1,000 prompts per task.

This report has the cleanest reference numbers for my RQ1 and RQ2 comparisons:

- Halving the input prompt from 400 to 200 words cuts energy by only 5% (from 1.031 to 0.980 kWh per 1,000 queries).
- Halving the generated output from 400 to 200 words cuts energy by 54% (down to 0.476 kWh per 1,000 queries).
- Capping output at 100 words cuts energy by 76% (down to 0.248 kWh per 1,000 queries). Output length hurts about 10x more than input length.

On LLaMA 3.1 8B, 4-bit quantization reduces energy by 22% with BNBQ, 35% with GPTQ, and 44% with AWQ. AWQ actually nudges summarization BERTScore slightly higher than the unquantized model (71.2% vs. 70.5%).

Smaller task-specific models (61M to 570M parameters) use 15x to 50x less energy than the 8B model (up to 90% savings, e.g., 0.008 vs. 0.122 kWh per 1,000 summaries) and score higher on in-domain data, though they lose accuracy on out-of-distribution inputs. At scale (350 million queries a day), combining quantization with a 150-word output cap instead of 300 words drops daily energy by 75%, from 278.5 MWh down to 65.4 MWh.

---

## 3. Fernandez et al. (2025, ACL) - "Energy Considerations of LLM Inference"
Setup: LLaMA 3.1 8B, OLMo-1B/7B, OLMoE-1B-7B, and DeepSeek-R1-Distill-Qwen-32B on A100 and RTX A6000/Ada, metered via NVML and CodeCarbon.

This paper explains the hardware physics behind the input/output asymmetry I see in RQ1. Prompt reading (prefill) processes tokens in parallel and is compute-bound, so at `batch_size = 1` (like my local Ollama runs) energy stays almost flat across short and medium prompts. Token generation (decode) is autoregressive and memory-bandwidth-bound because weights have to be fetched for every single step. That is why energy grows linearly with output tokens starting right at `batch_size = 1`.

A few other results I want to keep handy:
- Software stack optimization matters more than people think. Switching from plain PyTorch to `vLLM` (PagedAttention + serialized CUDA Graphs with `eager=False`) cuts energy on real traffic traces (`BurstGPT`, `Azure Conv`) by 72% to 73%, getting within 26.59% of the theoretical hardware minimum on `Azure Code`.
- Sparse Mixture-of-Experts (`OLMoE-1B-7B`) uses up to 54.24% more energy than a dense model with the same active parameter count (`OLMo-1B`) because fused expert kernels run slower.
- Splitting an 8B model across 2 or 4 GPUs (Tensor Parallelism) at `batch_size = 1` lowers latency, but increases total energy by 29.3% to 55.23%.
- Speculative decoding saves 29.14% energy at small batches (`BS <= 16`, including `BS = 1`), but burns 25.65% more energy at `BS = 128` due to verification overhead.

---

## 4. Zadenoori et al. (2025) - "Does Model Size Matter?" (`arXiv:2510.21443`)
Setup: 5 local SLMs (7B-8B: `Qwen2-7B`, `Falcon3-7B`, `Llama-3-8B`, etc. on RTX 4090) vs. 3 cloud LLMs (`GPT-5`, `Claude-4`, `Grok-4` at 1-2T parameters) using `temperature = 0` and CoT + few-shot prompting.

This paper is my justification for testing a local SLM instead of paying for giant cloud APIs:

- Across requirements classification tasks, 1-2T cloud models beat 7B-8B local models by only 2% average F1 (0.818 vs. 0.793). In a Scheirer-Ray-Hare test, that difference is not statistically significant ($p = 0.296$, tiny effect size $\eta_H^2 = 0.04$).
- The dataset itself drives 15x more variance than model size ($p < 0.001$, $\eta_H^2 = 0.63$), and there is no interaction between model class and dataset ($p = 0.790$). Hard datasets punish small and giant models the same way.
- On `PROMISE Reclass`, local `Qwen2-7B` and `Falcon3-7B` hit 0.96 recall, beating all three cloud models (0.82 to 0.90).

In Section 4 (Conclusion and Roadmap), the authors point out two missing pieces: testing generated reasoning/explanations rather than bare labels, and measuring the actual energy cost of local SLMs against accuracy gains.ś

## 5. Five high-return extensions so actual project

Ordered by how much scientific value they add relative to coding and runtime cost:

### 1. Split energy into prefill vs. decode from Ollama telemetry
Right now ours CSV logs one combined `energy_wh` and `latency_sec` per query. Ollama's JSON response already returns `prompt_eval_duration` (prefill time in ns) and `eval_duration` (decode time in ns). If I log `prefill_sec` and `decode_sec` in `run_experiment.py` and `analyze_results.py`, I can estimate the prefill vs. decode split directly on real benchmark queries and show on the poster that `think: on` spends 90% to 98% of its time and energy in memory-bound decoding. To be checked 

### 2. "Thinking budget" Pareto curve for RQ3
Current RQ3 treats thinking as a binary switch (`think: off` vs. uncapped `think: on`), while RQ2 only caps tokens when thinking is off. In practice, `Qwen3` often falls into overthinking inside `<think>` blocks, repeating steps and burning Watt-hours after it already found the answer. Adding intermediate budgets (`64`, `128`, `256`, `512` thinking tokens or word caps in the system prompt) lets me run Kneedle on the reasoning trace itself to find how many thinking tokens capture 80% of the accuracy gain at 30% of the energy cost.

### 3. Quantization x thinking mode (`Q4_K_M` vs. `Q8_0` vs. `FP16`)
UNESCO (2025) only tested quantization on simple non-reasoning tasks. Since long `<think>` traces are bottlenecked by memory bandwidth (Fernandez et al.), dropping weights from `FP16`/`Q8_0` to `Q4_K_M` cuts memory transfers per token. Pulling `qwen3:1.7b-q4_K_M`, `qwen3:1.7b-q8_0`, and `qwen3:1.7b-fp16` in Ollama and running 30 `GSM8K` prompts (`think: on` and `off`) lets me check via McNemar's test whether 4-bit quantization hurts math reasoning and plot the `Precision x Thinking` Pareto curve.


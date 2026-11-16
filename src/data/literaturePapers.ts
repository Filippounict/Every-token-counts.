export interface LiteraturePaper {
  id: string;
  shortCite: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  hardwareAndTool: string;
  modelsAndDatasets: string;
  keyEmpiricalFindings: string[];
  connectionToOurRQs: string;
  bibtex: string;
}

export const LITERATURE_PAPERS: LiteraturePaper[] = [
  {
    id: 'samsi2023',
    shortCite: 'Samsi et al. (2023)',
    title: 'From Words to Watts: Benchmarking the Energy Costs of Large Language Model Inference',
    authors: 'Siddharth Samsi, Dan Zhao, Joseph McDonald, Baolin Li, Adam Michaleas, Michael Jones, William Bergeron, Jeremy Kepner, Devesh Tiwari, Vijay Gadepally',
    venue: 'IEEE High Performance Extreme Computing Conference (HPEC) · arXiv:2310.03003v1',
    year: 2023,
    hardwareAndTool: 'MIT SuperCloud (NVIDIA V100 32GB & A100 80GB GPUs), nvidia-smi (100ms) & NVIDIA DCGM',
    modelsAndDatasets: 'LLaMA 7B, 13B, 65B · Alpaca (52k instructions) & GSM8K (8.5k math problems), 4,096 sampled prompts',
    keyEmpiricalFindings: [
      'LLaMA 65B inference consumes ~3–4 Joules per decoded output token and ~300 W to 1 kW across 8–32 V100 shards.',
      'Dataset complexity changes token lengths and throughput: GSM8K math prompts produce different decoded token dynamics than Alpaca instruction prompts.',
      'Capping A100 GPU power from 250 W to 175 W (-30%) reduces total inference energy by 23.21% with only a 6.7% latency increase.',
      'GPU memory utilization during sharded 65B inference remains low (23%–27% on A100s) even at 95%–98% SM utilization.',
    ],
    connectionToOurRQs:
      'Establishes energy-per-token and energy-per-response metrics, proves task type (GSM8K math vs. general text) drives token count and energy, and motivates hardware-efficient local inference.',
    bibtex: `@inproceedings{samsi2023words,
  title={From Words to Watts: Benchmarking the Energy Costs of Large Language Model Inference},
  author={Samsi, Siddharth and Zhao, Dan and McDonald, Joseph and Li, Baolin and Michaleas, Adam and Jones, Michael and Bergeron, William and Kepner, Jeremy and Tiwari, Devesh and Gadepally, Vijay},
  booktitle={2023 IEEE High Performance Extreme Computing Conference (HPEC)},
  pages={1--9},
  year={2023}
}`,
  },
  {
    id: 'zadenoori2025',
    shortCite: 'Zadenoori et al. (2025)',
    title: 'Does Model Size Matter? A Comparison of Small and Large Language Models for Requirements Classification',
    authors: 'Mohammad Amin Zadenoori, Vincenzo De Martino, Jacek Dabrowski, Xavier Franch, Alessio Ferrari',
    venue: 'arXiv:2510.21443v1 [cs.SE]',
    year: 2025,
    hardwareAndTool: 'Local server (Intel i9-13900K, 128 GB RAM, RTX 4090) for SLMs vs. commercial APIs for LLMs; Scheirer-Ray-Hare & Mann-Whitney U tests',
    modelsAndDatasets: '5 SLMs (7B–8B: Qwen2-7B, Falcon3-7B, Granite-3.2-8B, Ministral-8B, Llama-3-8B) vs. 3 LLMs (GPT-5, Grok-4, Claude-4) · PROMISE, PROMISE Reclass, SecReq',
    keyEmpiricalFindings: [
      'Proprietary LLMs lead SLMs by only 2% average F1 (0.818 vs. 0.793), a difference that is NOT statistically significant (Scheirer-Ray-Hare H = 1.09, p = 0.296).',
      'Dataset characteristics have a large, statistically significant effect on accuracy (H = 17.53, p < 0.001, η²_H = 0.63) — task difficulty matters far more than model size.',
      'SLMs can outperform 100–300× larger LLMs on specific metrics (e.g., Qwen2-7B & Falcon3-7B reach 0.96 recall on PROMISE Reclass).',
      'Local SLMs eliminate cloud data-sharing risks and lower operational costs while enabling reproducible controlled runs (temperature = 0, 3-run majority voting).',
    ],
    connectionToOurRQs:
      'Justifies studying a small, locally deployable SLM (Qwen3-1.7B via Ollama) rather than cloud LLMs, and demonstrates pairing non-parametric significance testing with task-difficulty stratification.',
    bibtex: `@article{zadenoori2025does,
  title={Does Model Size Matter? A Comparison of Small and Large Language Models for Requirements Classification},
  author={Zadenoori, Mohammad Amin and De Martino, Vincenzo and D{\\k{a}}browski, Jacek and Franch, Xavier and Ferrari, Alessio},
  journal={arXiv preprint arXiv:2510.21443},
  year={2025}
}`,
  },
  {
    id: 'unesco2025',
    shortCite: 'UNESCO & UCL (2025)',
    title: 'Smarter, Smaller, Stronger: Resource-Efficient Generative AI & the Future of Digital Transformation',
    authors: 'Leona Verdadero, Ivana Drobnjak, Hristijan Bosilkovski, Zekun Wu, Emma Fischer, Maria Perez-Ortiz',
    venue: 'UNESCO / University College London Policy & Empirical Report (CI/DIT/2025/ER/01 Rev.)',
    year: 2025,
    hardwareAndTool: 'RTX 3090 Ti (24 GB) & Intel i9-12900K · CodeCarbon for energy/CO₂ + BERTScore for semantic quality',
    modelsAndDatasets: 'Llama-3.1-8B-Instruct (Unquantized, BNBQ, GPTQ, AWQ) & task-specific SLMs · XSum, SamSum, Opus, Flores, SciQ, SQuAD',
    keyEmpiricalFindings: [
      'Strategy 2 ("Say more with less"): Halving input prompt length (400 → 200 words) cuts energy by only 5% (1.031 → 0.980 kWh / 1,000 queries), whereas halving output response length (400 → 200 words) cuts energy by 54% (1.031 → 0.476 kWh).',
      'Reducing output from 400 to 100 words cuts energy by 76% (1.031 → 0.248 kWh / 1,000 queries) because each output token attends to all prior tokens.',
      'Quantization reduces inference energy by 22% (BNBQ), 35% (GPTQ), and 44% (AWQ) while maintaining accuracy (~70.5% to 71.2% on summarization).',
      'Task-specific SLMs consume 15–50× less energy (up to 90% savings) than general-purpose 8B models on targeted tasks.',
    ],
    connectionToOurRQs:
      'Directly motivates RQ1 (comparing input vs. output length impact using CodeCarbon) and RQ2 (testing concise output limits and `"answer in N words"` instructions without degrading accuracy).',
    bibtex: `@techreport{unesco2025smarter,
  title={Smarter, Smaller, Stronger: Resource-Efficient Generative AI \\& the Future of Digital Transformation},
  author={Verdadero, Leona and Drobnjak, Ivana and Bosilkovski, Hristijan and Wu, Zekun and Fischer, Emma and P{\\'e}rez-Ortiz, Mar{\\'\\i}a},
  institution={UNESCO and University College London},
  number={CI/DIT/2025/ER/01 Rev.},
  year={2025}
}`,
  },
  {
    id: 'fernandez2025',
    shortCite: 'Fernandez et al. (2025)',
    title: 'Energy Considerations of Large Language Model Inference and Efficiency Optimizations',
    authors: 'Jared Fernandez, Clara Na, Vashisth Tiwari, Yonatan Bisk, Sasha Luccioni, Emma Strubell',
    venue: 'Proceedings of ACL 2025 (Volume 1: Long Papers), pp. 32556–32569',
    year: 2025,
    hardwareAndTool: 'NVIDIA A100 80GB, RTX A6000 & A6000 Ada · NVML via CodeCarbon (mean of 3 runs after warmup)',
    modelsAndDatasets: 'Llama-3.1-8B, Qwen-1.5-32B, OLMo-1B/7B, OLMoE-1B-7B, DeepSeek-R1-Distill-Qwen-32B · IMDB, WMT-14, CNN-DM, Wikitext-2, BurstGPT, Azure Chat/Code',
    keyEmpiricalFindings: [
      'Prefill (input processing) is parallel and compute-bound, scaling sub-linearly at small sequence lengths.',
      'Autoregressive Decoding (output generation) is sequential and memory-bound, scaling linearly with output token length even at batch size 1 and short outputs.',
      'Output generation dominates total workload energy except for short-output tasks like 1-token classification.',
      'Using an input×output token binning strategy + vLLM CUDA graphs + continuous batching cuts energy up to 73.0% on BurstGPT and 72.18% on Azure Conversation.',
    ],
    connectionToOurRQs:
      'Provides the mechanistic prefill vs. decode physics for RQ1, the 2D input×output binning heatmap methodology, and the CodeCarbon 3-run + warmup protocol.',
    bibtex: `@inproceedings{fernandez2025energy,
  title={Energy Considerations of Large Language Model Inference and Efficiency Optimizations},
  author={Fernandez, Jared and Na, Clara and Tiwari, Vashisth and Bisk, Yonatan and Luccioni, Sasha and Strubell, Emma},
  booktitle={Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics (ACL)},
  pages={32556--32569},
  year={2025}
}`,
  },
];

export const RESEARCH_QUESTIONS = [
  {
    id: 'Overarching RQ',
    question:
      'How do input and output length affect the energy and quality of LLM responses, and where is the point beyond which extra tokens add energy but no quality?',
    source: 'Project Overarching Question (TU Berlin ISE)',
  },
  {
    id: 'RQ1',
    question:
      'How does energy grow with input length and with output length for a small local model, and which of the two matters more?',
    hypothesis:
      'H1: Energy scales significantly steeper per output token than per input token because prefill runs in parallel (compute-bound) while autoregressive decoding runs sequentially (memory-bound).',
  },
  {
    id: 'RQ2',
    question:
      'How do output limits (max_tokens / num_predict, "answer in N words") affect accuracy on a task with verifiable answers?',
    hypothesis:
      'H2: Accuracy rises sharply with output budget up to a task-specific saturation knee (~128–256 tokens), after which extra tokens increase Wh/query with negligible accuracy gain.',
  },
  {
    id: 'RQ3',
    question:
      'How much energy does reasoning ("thinking") mode add compared with a direct answer, and how much accuracy does it buy per extra Wh?',
    hypothesis:
      'H3: Thinking mode multiplies energy by 3–6×; it yields statistically significant McNemar accuracy gains on multi-step math (GSM8K / MATH-500 L2–L4) but wastes energy on simple factual recall (TriviaQA).',
  },
];

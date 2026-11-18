export interface LiteraturePaper {
  id: string;
  shortCite: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  topicTag: 'Energy' | 'Input Length & Quality' | 'Model Size & Quality';
  hardwareAndTool: string;
  modelsAndDatasets: string;
  keyFindings: string[];
  whyItMattersForUs: string;
  bibtex: string;
}

export const LITERATURE_PAPERS: LiteraturePaper[] = [
  {
    id: 'unesco2025',
    shortCite: 'UNESCO & UCL (2025)',
    title: 'Smarter, Smaller, Stronger: Resource-Efficient Generative AI & the Future of Digital Transformation',
    authors: 'Leona Verdadero, Ivana Drobnjak, Hristijan Bosilkovski, Zekun Wu, Emma Fischer, Maria Perez-Ortiz',
    venue: 'UNESCO / University College London Policy & Empirical Report (CI/DIT/2025/ER/01 Rev.)',
    year: 2025,
    topicTag: 'Energy',
    hardwareAndTool: 'RTX 3090 Ti & Intel i9-12900K · CodeCarbon for energy/CO₂',
    modelsAndDatasets: 'Llama-3.1-8B & small task-specific models · XSum, SamSum, SciQ, SQuAD',
    keyFindings: [
      'Cutting input prompt length in half (400 → 200 words) saved only 5% energy.',
      'Cutting output answer length in half (400 → 200 words) saved 54% energy; cutting to 100 words saved 76%.',
      'Smaller task-specific models used 15–50× less energy than larger general models.',
    ],
    whyItMattersForUs:
      'Directly motivates RQ1 (output length dominates energy far more than input length) and RQ2a (asking for concise answers with token or word caps).',
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
    topicTag: 'Energy',
    hardwareAndTool: 'NVIDIA A100 & A6000 GPUs · CodeCarbon (averaged over 3 runs after warmup)',
    modelsAndDatasets: 'Llama-3.1-8B, Qwen-1.5-32B, OLMo-1B/7B · BurstGPT, Azure Chat, WMT-14',
    keyFindings: [
      'Reading the input prompt happens all at once (in parallel), so each input token is relatively cheap.',
      'Writing the output happens one token at a time, so energy grows steadily and quickly with every extra output token.',
      'Across real chat workloads, output length is the main driver of total query energy.',
    ],
    whyItMattersForUs:
      'Explains in simple hardware terms why output tokens cost more energy than input tokens (RQ1) and gives us the warmup + grid sweep method.',
    bibtex: `@inproceedings{fernandez2025energy,
  title={Energy Considerations of Large Language Model Inference and Efficiency Optimizations},
  author={Fernandez, Jared and Na, Clara and Tiwari, Vashisth and Bisk, Yonatan and Luccioni, Sasha and Strubell, Emma},
  booktitle={Proceedings of the 63rd Annual Meeting of the Association for Computational Linguistics (ACL)},
  pages={32556--32569},
  year={2025}
}`,
  },
  {
    id: 'levy2024',
    shortCite: 'Levy et al. (ACL 2024)',
    title: 'Same Task, More Tokens: the Impact of Input Length on the Reasoning Performance of Large Language Models',
    authors: 'Mosh Levy, Alon Jacoby, Yoav Goldberg',
    venue: 'Proceedings of ACL 2024 (Outstanding Paper Award)',
    year: 2024,
    topicTag: 'Input Length & Quality',
    hardwareAndTool: 'FLenQA flexible-length reasoning benchmark (250 to 3,000+ input tokens)',
    modelsAndDatasets: 'Multiple LLMs tested on the exact same reasoning task padded with extra text',
    keyFindings: [
      'Even when the actual question stays 100% identical, adding extra text to the input makes reasoning accuracy drop steadily.',
      'Accuracy drops long before the model hits its advertised maximum context window (often well before 3,000 tokens).',
      'This drop happens no matter what kind of padding is added or where the real facts are placed.',
    ],
    whyItMattersForUs:
      'Directly motivates RQ2b: long input prompts do NOT just waste energy — they can actively hurt answer quality on the exact same task.',
    bibtex: `@inproceedings{levy2024same,
  title={Same Task, More Tokens: the Impact of Input Length on the Reasoning Performance of Large Language Models},
  author={Levy, Mosh and Jacoby, Alon and Goldberg, Yoav},
  booktitle={Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (ACL)},
  year={2024}
}`,
  },
  {
    id: 'liu2024',
    shortCite: 'Liu et al. (TACL 2024)',
    title: 'Lost in the Middle: How Language Models Use Long Contexts',
    authors: 'Nelson F. Liu, Kevin Lin, John Hewitt, Ashwin Paranjape, Michele Bevilacqua, Fabio Petroni, Percy Liang',
    venue: 'Transactions of the Association for Computational Linguistics (TACL), Vol. 12, 2024',
    year: 2024,
    topicTag: 'Input Length & Quality',
    hardwareAndTool: 'Multi-document question answering & key-value lookup across long prompts',
    modelsAndDatasets: 'Open and closed long-context models tested with relevant facts at start, middle, or end',
    keyFindings: [
      'Models answer best when the key information is at the very beginning or very end of a prompt, and worst when it sits in the middle.',
      'As total input length grows, overall answer accuracy drops across the board — even for models advertised as "long-context".',
      'Stuffing unnecessary context into a prompt increases errors and hallucinations while adding extra compute work.',
    ],
    whyItMattersForUs:
      'Reinforces RQ2b: keeping prompts short and focused improves BOTH energy efficiency and answer quality.',
    bibtex: `@article{liu2024lost,
  title={Lost in the Middle: How Language Models Use Long Contexts},
  author={Liu, Nelson F. and Lin, Kevin and Hewitt, John and Paranjape, Ashwin and Bevilacqua, Michele and Petroni, Fabio and Liang, Percy},
  journal={Transactions of the Association for Computational Linguistics},
  volume={12},
  pages={157--173},
  year={2024}
}`,
  },
  {
    id: 'samsi2023',
    shortCite: 'Samsi et al. (2023)',
    title: 'From Words to Watts: Benchmarking the Energy Costs of Large Language Model Inference',
    authors: 'Siddharth Samsi, Dan Zhao, Joseph McDonald, Baolin Li, Adam Michaleas, Michael Jones, William Bergeron, Jeremy Kepner, Devesh Tiwari, Vijay Gadepally',
    venue: 'IEEE High Performance Extreme Computing Conference (HPEC) · arXiv:2310.03003',
    year: 2023,
    topicTag: 'Model Size & Quality',
    hardwareAndTool: 'NVIDIA V100 & A100 GPUs · nvidia-smi & NVIDIA DCGM',
    modelsAndDatasets: 'LLaMA 7B, 13B, 65B · Alpaca & GSM8K math problems',
    keyFindings: [
      'Larger models consume much more energy per token (3–4 Joules/token on 65B) than smaller models.',
      'The type of task (e.g., GSM8K math vs. open chat) changes both how many tokens the model writes and how much energy it uses.',
      'Establishes energy per token and energy per answer as core ways to measure LLM footprint.',
    ],
    whyItMattersForUs:
      'Supports using GSM8K math problems as a verifiable task and motivates measuring energy per output token and energy per correct answer when thinking mode generates extra reasoning tokens (RQ3).',
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
    venue: 'arXiv:2510.21443 [cs.SE]',
    year: 2025,
    topicTag: 'Model Size & Quality',
    hardwareAndTool: 'Local workstation (SLMs) vs. commercial cloud APIs (LLMs)',
    modelsAndDatasets: '5 Small Language Models (7B–8B) vs. 3 Large Cloud Models on classification tasks',
    keyFindings: [
      'Large cloud models beat small local models by only ~2% on average — a small gap compared to the huge difference in size.',
      'The specific task and dataset had a much bigger impact on accuracy than model size alone.',
      'Running small models locally is private, reproducible (temperature = 0), and much cheaper in energy and cost.',
    ],
    whyItMattersForUs:
      'Justifies running a compact local model (qwen3:1.7b via Ollama) with fixed temperature = 0 so we can fairly test how much accuracy reasoning ("thinking") mode buys per extra Wh.',
    bibtex: `@article{zadenoori2025does,
  title={Does Model Size Matter? A Comparison of Small and Large Language Models for Requirements Classification},
  author={Zadenoori, Mohammad Amin and De Martino, Vincenzo and D{\\k{a}}browski, Jacek and Franch, Xavier and Ferrari, Alessio},
  journal={arXiv preprint arXiv:2510.21443},
  year={2025}
}`,
  },
];

export const RESEARCH_QUESTIONS = [
  {
    id: 'Main Question',
    question:
      'How do input length, output length, and reasoning (“thinking”) mode affect the energy and answer quality of a small local LLM — and where do extra tokens stop helping?',
    source: 'Every Token Counts · Course Project Scope',
  },
  {
    id: 'RQ1 · Energy',
    question:
      'How does energy grow with input length vs. output length, and which one costs more per token?',
    expectation:
      'Output tokens should cost much more energy per token than input tokens, because reading input runs in parallel while writing output happens one token at a time (UNESCO & UCL 2025; Fernandez et al. 2025).',
  },
  {
    id: 'RQ2 · Quality',
    question:
      'How do output caps (num_predict, word limits) AND longer input prompts affect accuracy — and what is the sweet spot?',
    expectation:
      'Very short output caps cut off answers and hurt accuracy until a plateau ("sweet spot"), while stuffing extra text into the input raises energy AND can lower accuracy (Levy et al. 2024; Liu et al. 2024).',
  },
  {
    id: 'RQ3 · Thinking Mode',
    question:
      'How much energy does reasoning (“thinking”) mode add compared with a direct answer, and how much accuracy does it buy per extra Wh?',
    expectation:
      'Turning thinking mode on (think=True in qwen3:1.7b) writes hidden reasoning tokens before the final answer, multiplying energy use. On multi-step math (GSM8K) it can buy real accuracy gains per extra Wh, whereas on simple facts (TriviaQA) it adds extra energy with little or no accuracy gain.',
  },
];

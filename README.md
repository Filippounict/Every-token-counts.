# Every Token Counts: Local LLM Inference Energy & Accuracy Poster Lab

An empirical research project and interactive scientific conference poster studying how **input length**, **output length**, **output limits**, and **reasoning ("thinking") mode** affect the energy consumption (in Watt-hours / milliwatt-hours) and accuracy of a small local Large Language Model (**Qwen3-1.7B**) running on **Ollama** and metered with **CodeCarbon**.

---

## 1. Research Questions

- **Overarching Research Question:**  
  *How do input and output length affect the energy and quality of LLM responses, and where is the point beyond which extra tokens add energy but no quality?*

- **RQ1 (Input vs. Output Token Scaling):**  
  How does energy grow with input length and with output length for a small local model (`qwen3:1.7b`), and which of the two matters more?

- **RQ2 (Output Limits & Saturation Knee):**  
  How do output limits (`num_predict`, `"answer in N words"`) affect accuracy on tasks with verifiable answers (`GSM8K`, `MATH-500`, `TriviaQA`), and where is the diminishing-returns elbow?

- **RQ3 (Reasoning / Thinking Mode Cost-Effectiveness):**  
  How much energy does reasoning (`think: true`) mode add compared with a direct answer (`think: false`), and how much accuracy does it buy per extra Wh (measured via `Wh / correct answer` and a paired **McNemar test**)?

---

## 2. Grounding in Prior Literature

1. **Samsi et al. (2023)** — *"From Words to Watts: Benchmarking the Energy Costs of Large Language Model Inference"*, IEEE HPEC (`arXiv:2310.03003`).  
   Demonstrates ~3–4 J/token on LLaMA 7B–65B and shows that dataset/task structure (e.g., `GSM8K` vs. `Alpaca`) strongly changes generated token count and total energy.
2. **Zadenoori et al. (2025)** — *"Does Model Size Matter? A Comparison of Small and Large Language Models for Requirements Classification"* (`arXiv:2510.21443`).  
   Compares 5 Small Language Models against 3 Large Language Models at `temperature=0`, finding SLMs trail LLMs by only ~2% F1 ($p = 0.296$) while running locally with far lower resource cost.
3. **UNESCO & UCL (2025)** — *"Smarter, Smaller, Stronger: Resource-Efficient Generative AI & the Future of Digital Transformation"*.  
   Shows on Llama-8B with CodeCarbon that halving input length saves ~5% energy, whereas halving output length saves ~54% energy.
4. **Fernandez et al. (2025)** — *"Energy Considerations of Large Language Model Inference and Efficiency Optimizations"*, ACL 2025, pp. 32556–32569.  
   Explains why parallel prompt prefill is compute-bound while autoregressive token decoding is sequential and memory-bandwidth-bound, driving higher per-token energy on output tokens.

Detailed working notes, exact SOTA baselines, and the 5 planned extensions are in [`docs/SOTA_NOTES.md`](docs/SOTA_NOTES.md).

---

## 3. Repository Structure

```text
├── public/
│   └── kit/
│       ├── run_experiment.py      # Ollama + CodeCarbon benchmark runner (RQ1, RQ2, RQ3)
│       ├── analyze_results.py     # OLS regression, Kneedle elbow, McNemar test, 300-DPI plots
│       ├── requirements.txt       # Python dependencies (codecarbon, pandas, scipy, matplotlib, datasets)
│       └── sample_results.csv     # Valid 28-row sample CSV for testing the analyzer and poster upload
├── src/
│   ├── components/
│   │   ├── charts/                # Interactive vector SVG charts (Pipeline, RQ1, Heatmap, RQ2, RQ3)
│   │   ├── Header.tsx             # Navigation & A3 PDF print trigger
│   │   ├── PosterToolbar.tsx      # Dataset filter, CSV import, Sample CSV download, metadata editor
│   │   ├── PosterView.tsx         # 3-column printable scientific conference poster
│   │   ├── MethodGuideView.tsx    # Step-by-step local experiment guide & downloadable Python kit
│   │   └── LiteratureStatsView.tsx# 4-paper comparison matrix, BibTeX & live McNemar calculator
│   ├── data/
│   │   ├── literaturePapers.ts    # Verified findings and BibTeX from the 4 grounding papers
│   │   └── pilotBaselineData.ts   # Literature-calibrated pilot baseline (2,100 rows)
│   ├── utils/
│   │   ├── statistics.ts          # OLS, exact binomial & Edwards chi-square McNemar, Kneedle, CSV parser
│   │   ├── statistics.test.ts     # Node unit tests (`node:test`)
│   │   └── svgExport.ts           # One-click vector SVG export for poster figures
│   ├── App.tsx
│   └── index.css                  # Typography, tabular numerals & A3 landscape @media print rules
├── package.json
└── README.md
```

---

## 4. Part A: Running the Experiment Locally (Ollama + CodeCarbon)

Follow these steps on your own computer (Linux, macOS, or Windows with 16 GB RAM; no dedicated GPU required) to collect real hardware energy measurements.

### Step 1 — Install Ollama and Pull Qwen3-1.7B

Install Ollama from [https://ollama.com](https://ollama.com), then pull the model:

```bash
ollama pull qwen3:1.7b
ollama list
```

### Step 2 — Set Up Python & CodeCarbon

Copy the files from `public/kit/` (`run_experiment.py`, `analyze_results.py`, `requirements.txt`, `sample_results.csv`) into a local working directory (or download them directly inside the app's **Method & Python Kit** tab), then create a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Optional (Linux CPU RAPL permissions):** To allow CodeCarbon to read exact Intel/AMD hardware energy counters instead of falling back to TDP estimates:

```bash
sudo chmod -R a+r /sys/class/powercap/intel-rapl
```

### Step 3 — Verify Offline & Run Smoke Test

1. **Dry-run (no Ollama required)** to confirm CSV output formatting:
   ```bash
   python run_experiment.py --dry-run --quick --offline --out dry_test.csv
   ```
2. **Quick smoke test (~1–2 minutes)** against your running Ollama server:
   ```bash
   python run_experiment.py --quick --offline --out quick_results.csv
   ```

### Step 4 — Run the Full Scientific Benchmark

Plug your laptop into AC power, close heavy background apps (browsers/video), and run the full experiment (`temperature=0`, `seed=42`, 2 warmup runs, `0.5s` cooldowns between requests):

```bash
python run_experiment.py --samples 30 --country DEU --out experiment_results.csv
```

Useful options in `run_experiment.py`:
- `--model qwen3:1.7b` — Ollama model tag to evaluate.
- `--samples 30` — Number of prompts per benchmark (`GSM8K`, `MATH-500`, `TriviaQA`).
- `--country DEU` — ISO-3 country code for `OfflineEmissionsTracker`.
- `--cooldown 0.5` — Pause in seconds between inferences to limit thermal throttling.
- `--offline` — Use built-in benchmark prompts if HuggingFace `datasets` cannot be downloaded.

### Step 5 — Generate Statistics & 300-DPI Figures

```bash
python analyze_results.py --csv experiment_results.csv --out-dir figures
```

This generates:
- `figures/summary_stats.json` (OLS slopes, $R^2$, decode/prefill ratio, Kneedle saturation limit, McNemar $p$-values)
- `figures/fig1_token_scaling.png`
- `figures/fig2_heatmap.png`
- `figures/fig3_pareto_knee.png`

Use `--skip-plots` if you only want `summary_stats.json` without rendering Matplotlib PNGs.

---

## 5. Part B: Running & Exporting the Scientific Poster Web App

### Start the Web App Locally

Requires Node.js 18+:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Replace Pilot Baseline with Your Real Measurements

1. In the **Scientific Poster** tab, click **Import Local CSV** in the toolbar and choose your `experiment_results.csv` (or test with `public/kit/sample_results.csv`).
2. All KPI cards, OLS slopes, heatmap cells, the RQ2 Pareto knee, the RQ3 thinking comparison, and the McNemar paired test table recalculate immediately in your browser.
3. Click **Edit Poster Info** to enter your name, research group, affiliation, and laptop hardware details.
4. Export figures individually via the **SVG** button on any chart card, or click **Export Poster PDF** and select **A3 · Landscape** in your browser's print dialog.

### Development Checks & Unit Tests

```bash
# Run pure statistics & CSV parser tests (6/6 tests)
npx --yes tsx --test src/utils/statistics.test.ts

# TypeScript check
npm run lint

# Production build
npm run build
```

---

## 6. CSV Schema

Both `run_experiment.py` and the Poster Web App expect the following 15 columns:

| Column | Type | Description |
| :--- | :--- | :--- |
| `run_id` | string | Unique identifier (e.g., `rq1_1`, `rq3_42`) |
| `phase` | string | `rq1_sweep`, `rq2_limits`, or `rq3_thinking` |
| `dataset` | string | `SyntheticSweep`, `GSM8K`, `MATH-500`, or `TriviaQA` |
| `difficulty` | integer | `0` for synthetic sweep, `1`–`5` for benchmark difficulty |
| `prompt_id` | string | Prompt identifier (used to pair Thinking OFF vs. ON for McNemar) |
| `thinking_mode` | string | `off` or `on` |
| `limit_type` | string | `num_predict`, `word_limit`, or `unlimited` |
| `max_tokens_limit` | integer | Token or word cap applied |
| `input_tokens` | integer | Prompt tokens reported by Ollama (`prompt_eval_count`) |
| `output_tokens` | integer | Generated tokens reported by Ollama (`eval_count`) |
| `thinking_tokens` | integer | Reasoning tokens inside thinking output |
| `answer_tokens` | integer | Final answer tokens |
| `latency_sec` | float | Wall-clock request duration in seconds |
| `energy_wh` | float | Inference energy in Watt-hours (`emissions_data.energy_consumed * 1000`) |
| `correct` | `0` or `1` | Verifiable answer correctness (`1` = correct, `0` = incorrect) |

---

## 7. Data Transparency & Threats to Validity

- **Default Pilot Baseline:** Until you upload your own `experiment_results.csv`, the web app displays a clearly labeled **Pilot Calibration Baseline (Literature-Grounded)** (`2,100` modeled rows calibrated for `Qwen3-1.7B` on a 16 GB laptop). Replace it with your local CSV before submitting empirical findings.
- **Measurement Scope:** CodeCarbon estimates CPU/GPU/RAM energy via hardware RAPL/NVML counters (or TDP fallback when RAPL is locked), which can differ slightly from a wall-plug power meter.
- **Thermal Stability:** Laptop CPU/GPU clock frequencies can throttle under sustained load; keep the `0.5s` cooldowns and 2 unmeasured warmup iterations active during local runs.

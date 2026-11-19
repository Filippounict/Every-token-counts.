# Every Token Counts — Local LLM Energy, Quality & Model Study

A clean, simple scientific poster workspace and fast local Python experiment kit built around **Ollama** and **CodeCarbon**, adapted directly from the course tutorial scripts (`idle_test.py`, `llm_test.py`, `llm_test_comparison.py`, `cpu_test_regions.py`).

No black-box algorithms or complicated statistics — every metric is easy to verify and explain in plain English.

---

## Research Questions

- **Main Question:** How do input length, output length, and model choice affect the energy and answer quality of small local LLMs — and where do extra tokens stop helping?
- **RQ1 (Energy — Input vs. Output):** Does energy grow faster with longer inputs or longer outputs, and which costs more per token?
- **RQ2a (Quality — Output Caps & Sweet Spot):** How do output limits (`num_predict` caps and `"Answer in N words"`) affect accuracy, and what is the smallest cap that reaches top accuracy before extra tokens only waste energy?
- **RQ2b (Quality — Longer Inputs):** When we put the **exact same question** inside longer background notes (Short → Medium → Long), does accuracy drop while energy rises?
- **RQ3 (Model Choice):** Does switching between two small local models (e.g., `qwen2.5:0.5b` vs. `qwen2.5:3b`) change energy, answer length, and accuracy?

---

## Grounded in Six Verified Studies

1. **UNESCO & UCL (2025)** — *Smarter, Smaller, Stronger*: Cutting input length in half saves 5% energy; cutting output length in half saves 54%.
2. **Fernandez et al. (ACL 2025)** — *Energy Considerations of LLM Inference*: Reading input runs in parallel (cheaper per token); writing output runs one token at a time (dominates energy).
3. **Levy, Jacoby, & Goldberg (ACL 2024, Outstanding Paper)** — *Same Task, More Tokens*: Adding extra text to the exact same reasoning task steadily reduces accuracy long before the max context window.
4. **Liu et al. (TACL 2024)** — *Lost in the Middle*: Facts buried in the middle of long inputs are often missed, and accuracy declines as prompts grow longer.
5. **Samsi et al. (IEEE HPEC 2023)** — *From Words to Watts*: Larger models consume more energy per token; task type changes output length.
6. **Zadenoori et al. (arXiv 2025)** — *Does Model Size Matter?*: Small local models stay within ~2% of huge cloud models on focused tasks while running privately and reproducibly.

Detailed working notes, exact SOTA baselines, and the 5 planned extensions are in [`docs/SOTA_NOTES.md`](docs/SOTA_NOTES.md).

---

## Fast Preliminary Run (~3–5 Minutes on Your Laptop)

### Step 1 — Check Python 3.10+, Install Packages & Pull Two Small Models

```bash
python3 --version
# On Apple Silicon Macs (M1/M2/M3+), confirm this prints arm64 (not x86_64 under Rosetta):
python3 -c "import platform; print(platform.machine())"

python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r public/kit/requirements.txt

ollama pull qwen2.5:0.5b
ollama pull qwen2.5:3b
```

### Step 2 — Run `codecarbon detect` First

Check what CodeCarbon **measures** (hardware counters) vs. **estimates** (RAM is always a constant wattage estimate):

```bash
codecarbon detect
# Linux: allow reading Intel/AMD RAPL energy counters:
sudo chmod a+r /sys/class/powercap/*/energy_uj
```

### Step 3 — Run Fast Preliminary Results (~3–5 Minutes)

Close browsers/video apps and plug into AC power (CodeCarbon runs in `tracking_mode="machine"` so it captures the separate `ollama serve` process).

```bash
# 0. Instant offline check without Ollama (<1 sec, fake numbers just to verify Python):
python public/kit/run_experiment.py --preliminary --dry-run --out-dir dry_check

# 1. REAL Fast Preliminary Run (~3-5 min total, 75 short calls -> poster-ready!):
python public/kit/run_experiment.py --preliminary --country DEU --out-dir results_prelim

# 2. Optional Larger Run (~15-25 min, 12 questions & 2 repeats in RQ1):
python public/kit/run_experiment.py --full --country DEU --out-dir results_full
```

Want to compare a different model (e.g., `qwen3:1.7b` or `llama3.2:3b`)? Pass `--model` and `--compare-model`:

```bash
python public/kit/run_experiment.py --preliminary --model qwen3:1.7b --compare-model qwen2.5:0.5b --out-dir results_prelim
```

### Step 4 — Inspect Proof-of-Work & Generate 300-DPI Charts

Every real run automatically creates a **Proof-of-Work bundle** inside `results_prelim/`:

1. **`experiment_results.csv`** — 20-column table containing timestamps, model names, exact token counts, latency, CPU/GPU/RAM Wh, CO₂, expected answers, Pass/Fail (`1`/`0`), and the first 140 characters of every real model answer (`response_preview`).
2. **`emissions_raw.csv`** — CodeCarbon's untouched raw hardware log.
3. **`proof_of_work.json`** — Run receipt with UTC start/end timestamps, OS/CPU/architecture info, SHA-256 checksums of both CSVs, and verified sample Q&As.

Run the analyzer to print the plain-English summary (including Sweden `SWE`, Germany `DEU`, and India `IND` carbon sensitivity) and save 4 poster figures:

```bash
python public/kit/analyze_results.py --csv results_prelim/experiment_results.csv --out-dir figures
```

### Step 5 — Load Into the Scientific Poster Web App

1. Start the web app (`npm install && npm run dev`) and open `http://localhost:3000`.
2. Click **Import Local CSV** and select `results_prelim/experiment_results.csv`.
3. Optionally click **Attach Proof JSON** and select `results_prelim/proof_of_work.json` to show your machine metadata and SHA-256 checksum right on the poster and in **Literature & Proof**.
4. Click **Edit Poster Info** to enter your names, then **Export Poster PDF** to print/save.

---

## Project Layout

```text
├── public/kit/
│   ├── run_experiment.py      # Fast Ollama + CodeCarbon runner with Proof-of-Work
│   ├── analyze_results.py     # Plain-English summary, SWE/DEU/IND CO2 & 4 PNG charts
│   ├── requirements.txt       # codecarbon, ollama, pandas, numpy, matplotlib
│   └── sample_results.csv     # Valid 20-column sample CSV for testing import
└── src/
    ├── components/            # PosterView, MethodGuideView, LiteratureStatsView & SVG charts
    ├── data/                  # 6 verified literature papers & example preview generator
    ├── types/experiment.ts    # TypeScript interfaces for CSV & Proof-of-Work JSON
    └── utils/statistics.ts    # Linear trend, plain-English sweet spot, CSV parser & tests
```

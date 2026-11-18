#!/usr/bin/env python3
"""
Every Token Counts — Fast Local LLM Energy & Quality Benchmark
==============================================================
Adapted directly from the course CodeCarbon + Ollama scripts
(`idle_test.py`, `llm_test.py`, `llm_test_reasoning.py`, `cpu_test_regions.py`).

What this script tests:
  - Phase 0: 5s idle baseline (separates measured CPU/GPU from constant RAM estimate)
  - RQ1:     Input length vs. Output length energy scaling (mWh per token)
  - RQ2a:    Output limits (`num_predict` & "Answer in N words") -> Sweet Spot
  - RQ2b:    Longer input prompts (Short / Medium / Long) -> Accuracy & Energy
             (checks Levy et al. ACL 2024 & Liu et al. TACL 2024)
  - RQ3:     Reasoning ("thinking") mode (`think=True`) vs. Direct answer (`think=False`)
             on `qwen3:1.7b` -> Extra energy added & accuracy bought per extra Wh

Automatic Proof-of-Work saved in `--out-dir`:
  1. experiment_results.csv  (every run with timestamp, thinking_mode, tokens, Wh, saved answer)
  2. emissions_raw.csv       (CodeCarbon's untouched raw hardware log)
  3. proof_of_work.json      (run timestamps, OS/CPU info, SHA-256 file hashes, sample Q&As)

Fast preliminary run (~3-5 minutes on a laptop CPU):
  python run_experiment.py --preliminary --country DEU

Instant offline check (no Ollama needed):
  python run_experiment.py --dry-run --out-dir dry_check
"""

import argparse
import csv
import datetime
import hashlib
import json
import math
import os
import platform
import re
import time

try:
    import ollama
except ImportError:
    ollama = None

try:
    from codecarbon import OfflineEmissionsTracker
except ImportError:
    OfflineEmissionsTracker = None

# ---------------------------------------------------------------------------
# Default settings (matching course `llm_test_reasoning.py`)
# ---------------------------------------------------------------------------
DEFAULT_MODEL = "qwen3:1.7b"  # Qwen3 supports turning `think=True/False` on and off
COUNTRY_ISO = "DEU"
TEMPERATURE = 0
SEED = 42

CSV_HEADERS = [
    "run_id",
    "timestamp",
    "model",
    "phase",
    "dataset",
    "prompt_id",
    "context_level",
    "thinking_mode",
    "limit_type",
    "max_tokens_limit",
    "input_tokens",
    "output_tokens",
    "latency_sec",
    "energy_wh",
    "correct",
    "cpu_energy_wh",
    "gpu_energy_wh",
    "ram_energy_wh",
    "emissions_gco2eq",
    "expected_answer",
    "response_preview",
]

# Built-in verifiable questions (6 used in --preliminary, all 12 used in --full)
BENCHMARK_ITEMS = [
    # GSM8K-style grade-school math (exact numeric answer)
    {
        "dataset": "GSM8K",
        "prompt_id": "gsm_1",
        "question": "Janet's ducks lay 16 eggs per day. She eats 3 for breakfast and uses 4 to bake muffins. She sells the rest at the market for $2 per egg. How many dollars does she make per day?",
        "answer": "18",
    },
    {
        "dataset": "GSM8K",
        "prompt_id": "gsm_2",
        "question": "A robe takes 2 bolts of blue fiber and half that much white fiber. How many bolts of fiber does it take in total?",
        "answer": "3",
    },
    {
        "dataset": "GSM8K",
        "prompt_id": "gsm_3",
        "question": "Josh buys a house for $80,000 and puts in $50,000 in repairs. This increases the value of the house by 150% over the purchase price. How much profit did he make in dollars?",
        "answer": "70000",
    },
    # TriviaQA-style short factual recall (exact alias match)
    {
        "dataset": "TriviaQA",
        "prompt_id": "triv_1",
        "question": "What is the chemical symbol for gold?",
        "answer": "au|gold",
    },
    {
        "dataset": "TriviaQA",
        "prompt_id": "triv_2",
        "question": "Which planet in our solar system is known as the Red Planet?",
        "answer": "mars",
    },
    {
        "dataset": "TriviaQA",
        "prompt_id": "triv_3",
        "question": "What is the capital city of Australia?",
        "answer": "canberra",
    },
    # Additional 6 questions used in --full mode
    {
        "dataset": "GSM8K",
        "prompt_id": "gsm_4",
        "question": "James runs 3 sprints 3 times a week. Each sprint is 60 meters. How many total meters does he run in a week?",
        "answer": "540",
    },
    {
        "dataset": "GSM8K",
        "prompt_id": "gsm_5",
        "question": "Wendi feeds each of her 20 chickens 3 cups of feed per day. In the morning she gives 15 cups and in the afternoon 25 cups. How many cups does she need for the final meal?",
        "answer": "20",
    },
    {
        "dataset": "GSM8K",
        "prompt_id": "gsm_6",
        "question": "A train travels at 60 km per hour for 2 hours, then at 90 km per hour for 1 hour. What is the total distance traveled in km?",
        "answer": "210",
    },
    {
        "dataset": "TriviaQA",
        "prompt_id": "triv_4",
        "question": "Who wrote the novel '1984'?",
        "answer": "george orwell|orwell",
    },
    {
        "dataset": "TriviaQA",
        "prompt_id": "triv_5",
        "question": "In what year did Apollo 11 first land humans on the Moon?",
        "answer": "1969",
    },
    {
        "dataset": "TriviaQA",
        "prompt_id": "triv_6",
        "question": "Which gas makes up about 78% of Earth's atmosphere?",
        "answer": "nitrogen|n2",
    },
]

# Neutral filler sentences used in RQ1 and RQ2b (no answers inside, only extra context)
FILLER_SENTENCES = [
    "Office note: Server room temperature stayed near 21 degrees Celsius during Tuesday morning.",
    "Archive memo: The library catalog lists 480 historical shipping records from northern ports.",
    "Weather log: Light wind and scattered clouds were recorded along the coast after noon.",
    "Inventory log: Warehouse shelf B holds 120 standard cardboard boxes and 35 plastic bins.",
    "Schedule note: Weekly team check-ins moved from Monday at 9:00 to Wednesday at 10:30.",
    "Maintenance log: All backup batteries passed routine voltage inspection without warnings.",
]


# ---------------------------------------------------------------------------
# Simple helper functions
# ---------------------------------------------------------------------------
def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def clean_preview(text, max_len=140):
    compact = re.sub(r"\s+", " ", (text or "")).strip()
    return compact[:max_len] + ("..." if len(compact) > max_len else "")


def sha256_file(path):
    if not os.path.exists(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def normalize_text(text):
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s\.\-/]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_last_number(text):
    nums = re.findall(r"[-+]?\d[\d,]*\.?\d*", text)
    return nums[-1].replace(",", "").strip() if nums else None


def check_answer(dataset, prediction, gold_answer):
    """Returns 1 if the model's answer matches the known answer, else 0."""
    if not prediction:
        return 0
    if dataset == "GSM8K":
        pred_num = extract_last_number(prediction)
        gold_num = extract_last_number(gold_answer) or gold_answer.replace(",", "").strip()
        if pred_num is None:
            return int(normalize_text(gold_answer) in normalize_text(prediction))
        try:
            return int(math.isclose(float(pred_num), float(gold_num), rel_tol=1e-4, abs_tol=1e-4))
        except ValueError:
            return int(normalize_text(pred_num) == normalize_text(gold_num))

    norm_pred = normalize_text(prediction)
    aliases = [normalize_text(a) for a in gold_answer.split("|") if a.strip()]
    return int(any(alias and alias in norm_pred for alias in aliases))


def make_filler_block(approx_tokens):
    if approx_tokens <= 0:
        return ""
    target_words = max(10, int(approx_tokens / 1.35))
    words = []
    idx = 0
    while len(words) < target_words:
        words.extend(FILLER_SENTENCES[idx % len(FILLER_SENTENCES)].split())
        idx += 1
    return " ".join(words[:target_words])


def build_rq1_prompt(target_input_tokens):
    header = "Read these short notes and write a detailed explanation of every point without stopping early. "
    body = make_filler_block(max(24, target_input_tokens - 20))
    return header + body


def build_context_prompt(question, context_level):
    """
    Wraps the EXACT same question with Short (0 extra), Medium (~260 extra tokens),
    or Long (~920 extra tokens) background notes placed before and after the question
    (directly testing Levy et al. ACL 2024 & Liu et al. TACL 2024).
    """
    if context_level == "short":
        return f"Answer clearly and give the final answer at the end.\nQuestion: {question}"

    extra_tokens = 260 if context_level == "medium" else 920
    half = extra_tokens // 2
    before = make_filler_block(half)
    after = make_filler_block(half)
    return (
        "You are given background notes and one question inside them. Ignore unrelated notes and answer the question clearly.\n\n"
        f"Notes (Part 1): {before}\n\n"
        f"Question: {question}\n\n"
        f"Notes (Part 2): {after}\n\n"
        "Give the final answer clearly at the end."
    )


# ---------------------------------------------------------------------------
# CodeCarbon + Ollama wrappers (mirroring course `llm_test_reasoning.py`)
# ---------------------------------------------------------------------------
def make_tracker(project_name, country_iso, raw_csv_path, force_ram_power=None):
    if OfflineEmissionsTracker is None:
        raise RuntimeError("codecarbon is not installed. Run: pip install -r requirements.txt")

    kwargs = {
        "country_iso_code": country_iso,
        "project_name": project_name,
        "output_dir": os.path.dirname(raw_csv_path) or ".",
        "output_file": os.path.basename(raw_csv_path),
        "tracking_mode": "machine",  # Needed because Ollama runs in a separate process
        "measure_power_secs": 1,
        "log_level": "error",
    }
    if force_ram_power is not None:
        kwargs["force_ram_power"] = force_ram_power

    return OfflineEmissionsTracker(**kwargs)


def read_energy_components(tracker):
    data = tracker.final_emissions_data
    total_wh = float(getattr(data, "energy_consumed", 0.0) or 0.0) * 1000.0
    cpu_wh = float(getattr(data, "cpu_energy", 0.0) or 0.0) * 1000.0
    gpu_wh = float(getattr(data, "gpu_energy", 0.0) or 0.0) * 1000.0
    ram_wh = float(getattr(data, "ram_energy", 0.0) or 0.0) * 1000.0
    emissions_g = float(getattr(data, "emissions", 0.0) or 0.0) * 1000.0
    return total_wh, cpu_wh, gpu_wh, ram_wh, emissions_g


def measure_idle_baseline(seconds, country_iso, raw_csv_path, force_ram_power, dry_run):
    if dry_run:
        ram_w = force_ram_power if force_ram_power is not None else 6.0
        cpu_wh = round((2.5 * seconds) / 3600.0, 6)
        ram_wh = round((ram_w * seconds) / 3600.0, 6)
        total_wh = round(cpu_wh + ram_wh, 6)
        return {
            "latency_sec": float(seconds),
            "energy_wh": total_wh,
            "cpu_energy_wh": cpu_wh,
            "gpu_energy_wh": 0.0,
            "ram_energy_wh": ram_wh,
            "emissions_gco2eq": round(total_wh * 0.38, 6),
        }

    tracker = make_tracker("idle_baseline", country_iso, raw_csv_path, force_ram_power)
    tracker.start()
    t0 = time.perf_counter()
    time.sleep(seconds)
    elapsed = time.perf_counter() - t0
    tracker.stop()

    total_wh, cpu_wh, gpu_wh, ram_wh, emissions_g = read_energy_components(tracker)
    return {
        "latency_sec": round(elapsed, 3),
        "energy_wh": round(total_wh, 6),
        "cpu_energy_wh": round(cpu_wh, 6),
        "gpu_energy_wh": round(gpu_wh, 6),
        "ram_energy_wh": round(ram_wh, 6),
        "emissions_gco2eq": round(emissions_g, 6),
    }


def run_prompt(
    model,
    prompt,
    num_predict,
    think,
    project_name,
    country_iso,
    raw_csv_path,
    force_ram_power,
    dry_run,
    gold_hint="18",
):
    if dry_run:
        in_tok = max(20, int(len(prompt.split()) * 1.35))
        if think:
            out_tok = min(num_predict, 280 if gold_hint.isdigit() else 140)
            think_chars = out_tok * 3
        else:
            out_tok = min(num_predict, 256 if "detailed explanation" in prompt else (84 if gold_hint.isdigit() else 22))
            think_chars = 0
        latency = round(0.18 + in_tok / 190.0 + out_tok / 26.0, 3)
        ram_w = force_ram_power if force_ram_power is not None else 6.0
        ram_wh = round((ram_w * latency) / 3600.0, 6)
        compute_wh = round(0.0014 + in_tok * 0.000039 + out_tok * 0.000285, 6)
        total_wh = round(compute_wh + ram_wh, 6)
        fake_answer = f"[DRY-RUN] Final answer: {gold_hint.split('|')[0]}"
        preview = (
            f"[think: {think_chars} chars] {fake_answer}"
            if think
            else fake_answer
        )
        return {
            "input_tokens": in_tok,
            "output_tokens": out_tok,
            "latency_sec": latency,
            "energy_wh": total_wh,
            "cpu_energy_wh": compute_wh,
            "gpu_energy_wh": 0.0,
            "ram_energy_wh": ram_wh,
            "emissions_gco2eq": round(total_wh * 0.38, 6),
            "answer_text": fake_answer,
            "preview_text": preview,
        }

    if ollama is None:
        raise RuntimeError("ollama Python client is not installed. Run: pip install -r requirements.txt")

    tracker = make_tracker(project_name, country_iso, raw_csv_path, force_ram_power)
    tracker.start()
    t0 = time.perf_counter()
    try:
        response = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            think=think,  # Exact switch from course `llm_test_reasoning.py` (True vs False)
            options={
                "temperature": TEMPERATURE,
                "seed": SEED,
                "num_predict": num_predict,
            },
        )
    finally:
        elapsed = time.perf_counter() - t0
        tracker.stop()

    total_wh, cpu_wh, gpu_wh, ram_wh, emissions_g = read_energy_components(tracker)
    answer_text = response["message"]["content"] or ""
    thinking_text = getattr(response.message, "thinking", None) or ""
    in_tokens = int(getattr(response, "prompt_eval_count", None) or max(1, int(len(prompt.split()) * 1.3)))
    out_tokens = int(getattr(response, "eval_count", None) or max(1, int(len((thinking_text + " " + answer_text).split()) * 1.3)))
    preview_text = (
        f"[think: {len(thinking_text)} chars] {answer_text}"
        if think and thinking_text
        else answer_text
    )

    return {
        "input_tokens": in_tokens,
        "output_tokens": out_tokens,
        "latency_sec": round(elapsed, 3),
        "energy_wh": round(total_wh, 6),
        "cpu_energy_wh": round(cpu_wh, 6),
        "gpu_energy_wh": round(gpu_wh, 6),
        "ram_energy_wh": round(ram_wh, 6),
        "emissions_gco2eq": round(emissions_g, 6),
        "answer_text": answer_text,
        "preview_text": preview_text,
    }


def warmup_model(model, dry_run):
    if dry_run:
        return
    if ollama is None:
        raise RuntimeError("ollama Python client is not installed. Run: pip install -r requirements.txt")
    print(f"[WARMUP] Loading {model} into memory (unmeasured)...")
    ollama.chat(
        model=model,
        messages=[{"role": "user", "content": "What is 2 + 2?"}],
        think=False,
        options={"temperature": TEMPERATURE, "seed": SEED, "num_predict": 12},
    )
    time.sleep(1.5)


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------
def main(args):
    os.makedirs(args.out_dir, exist_ok=True)
    results_csv = os.path.join(args.out_dir, "experiment_results.csv")
    raw_csv = os.path.join(args.out_dir, "emissions_raw.csv")
    proof_json = os.path.join(args.out_dir, "proof_of_work.json")

    mode = "full" if args.full else "preliminary"
    items = BENCHMARK_ITEMS if args.full else BENCHMARK_ITEMS[:6]
    start_utc = utc_now()
    t_start = time.perf_counter()

    print(
        f"[START] Mode={mode} | Model={args.model} | Questions={len(items)} | "
        f"Country={args.country} | DryRun={args.dry_run}"
    )

    rows = []
    run_idx = 1

    # PHASE 0: Idle Baseline
    idle_secs = 2 if args.dry_run else args.idle_seconds
    print(f"[PHASE 0] Measuring {idle_secs}s idle baseline...")
    idle = measure_idle_baseline(idle_secs, args.country, raw_csv, args.force_ram_power, args.dry_run)
    rows.append({
        "run_id": "idle_0",
        "timestamp": utc_now(),
        "model": "idle",
        "phase": "idle_baseline",
        "dataset": "IdleBaseline",
        "prompt_id": f"idle_{idle_secs}s",
        "context_level": "none",
        "thinking_mode": "off",
        "limit_type": "unlimited",
        "max_tokens_limit": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "latency_sec": idle["latency_sec"],
        "energy_wh": idle["energy_wh"],
        "correct": 1,
        "cpu_energy_wh": idle["cpu_energy_wh"],
        "gpu_energy_wh": idle["gpu_energy_wh"],
        "ram_energy_wh": idle["ram_energy_wh"],
        "emissions_gco2eq": idle["emissions_gco2eq"],
        "expected_answer": "n/a",
        "response_preview": "Idle sleep baseline (no model running)",
    })

    # Warmup model once (unmeasured)
    warmup_model(args.model, args.dry_run)

    # PHASE 1 (RQ1): Input vs. Output Energy Grid (think=False for clean token sweep)
    in_lengths = [64, 256, 512, 1024] if args.full else [64, 256, 1024]
    out_lengths = [32, 64, 128, 256] if args.full else [32, 128, 256]
    repeats = 2 if args.full else 1
    print(f"[PHASE 1 / RQ1] Running Input x Output energy grid ({len(in_lengths)}x{len(out_lengths)}x{repeats})...")
    for in_len in in_lengths:
        prompt = build_rq1_prompt(in_len)
        for out_len in out_lengths:
            for rep in range(repeats):
                m = run_prompt(
                    model=args.model,
                    prompt=prompt,
                    num_predict=out_len,
                    think=False,
                    project_name=f"{args.model}_rq1_in{in_len}_out{out_len}",
                    country_iso=args.country,
                    raw_csv_path=raw_csv,
                    force_ram_power=args.force_ram_power,
                    dry_run=args.dry_run,
                    gold_hint="n/a",
                )
                rows.append({
                    "run_id": f"rq1_{run_idx}",
                    "timestamp": utc_now(),
                    "model": args.model,
                    "phase": "rq1_sweep",
                    "dataset": "SyntheticSweep",
                    "prompt_id": f"sweep_{in_len}_{out_len}_r{rep + 1}",
                    "context_level": "none",
                    "thinking_mode": "off",
                    "limit_type": "num_predict",
                    "max_tokens_limit": out_len,
                    "input_tokens": m["input_tokens"],
                    "output_tokens": m["output_tokens"],
                    "latency_sec": m["latency_sec"],
                    "energy_wh": m["energy_wh"],
                    "correct": 1,
                    "cpu_energy_wh": m["cpu_energy_wh"],
                    "gpu_energy_wh": m["gpu_energy_wh"],
                    "ram_energy_wh": m["ram_energy_wh"],
                    "emissions_gco2eq": m["emissions_gco2eq"],
                    "expected_answer": "n/a",
                    "response_preview": clean_preview(m["preview_text"]),
                })
                run_idx += 1
                if not args.dry_run and args.cooldown > 0:
                    time.sleep(args.cooldown)

    # PHASE 2a (RQ2a): Output Limits (num_predict caps & "Answer in N words", think=False)
    tok_caps = [32, 64, 128, 256]
    word_caps = [15, 60]
    print(f"[PHASE 2a / RQ2a] Testing output caps {tok_caps} and word limits {word_caps} on {len(items)} questions...")
    for item in items:
        for cap in tok_caps:
            prompt = f"Solve and give the final answer clearly.\nQuestion: {item['question']}"
            m = run_prompt(
                model=args.model,
                prompt=prompt,
                num_predict=cap,
                think=False,
                project_name=f"{args.model}_rq2a_tok{cap}",
                country_iso=args.country,
                raw_csv_path=raw_csv,
                force_ram_power=args.force_ram_power,
                dry_run=args.dry_run,
                gold_hint=item["answer"],
            )
            rows.append({
                "run_id": f"rq2a_{run_idx}",
                "timestamp": utc_now(),
                "model": args.model,
                "phase": "rq2_output_limits",
                "dataset": item["dataset"],
                "prompt_id": item["prompt_id"],
                "context_level": "short",
                "thinking_mode": "off",
                "limit_type": "num_predict",
                "max_tokens_limit": cap,
                "input_tokens": m["input_tokens"],
                "output_tokens": m["output_tokens"],
                "latency_sec": m["latency_sec"],
                "energy_wh": m["energy_wh"],
                "correct": check_answer(item["dataset"], m["answer_text"], item["answer"]),
                "cpu_energy_wh": m["cpu_energy_wh"],
                "gpu_energy_wh": m["gpu_energy_wh"],
                "ram_energy_wh": m["ram_energy_wh"],
                "emissions_gco2eq": m["emissions_gco2eq"],
                "expected_answer": item["answer"].split("|")[0],
                "response_preview": clean_preview(m["preview_text"]),
            })
            run_idx += 1

        for wcap in word_caps:
            prompt = f"Answer in at most {wcap} words and give the final answer clearly.\nQuestion: {item['question']}"
            m = run_prompt(
                model=args.model,
                prompt=prompt,
                num_predict=256,
                think=False,
                project_name=f"{args.model}_rq2a_words{wcap}",
                country_iso=args.country,
                raw_csv_path=raw_csv,
                force_ram_power=args.force_ram_power,
                dry_run=args.dry_run,
                gold_hint=item["answer"],
            )
            rows.append({
                "run_id": f"rq2w_{run_idx}",
                "timestamp": utc_now(),
                "model": args.model,
                "phase": "rq2_output_limits",
                "dataset": item["dataset"],
                "prompt_id": item["prompt_id"],
                "context_level": "short",
                "thinking_mode": "off",
                "limit_type": "word_limit",
                "max_tokens_limit": wcap,
                "input_tokens": m["input_tokens"],
                "output_tokens": m["output_tokens"],
                "latency_sec": m["latency_sec"],
                "energy_wh": m["energy_wh"],
                "correct": check_answer(item["dataset"], m["answer_text"], item["answer"]),
                "cpu_energy_wh": m["cpu_energy_wh"],
                "gpu_energy_wh": m["gpu_energy_wh"],
                "ram_energy_wh": m["ram_energy_wh"],
                "emissions_gco2eq": m["emissions_gco2eq"],
                "expected_answer": item["answer"].split("|")[0],
                "response_preview": clean_preview(m["preview_text"]),
            })
            run_idx += 1

    # PHASE 2b (RQ2b): Input Length vs. Output Quality (Short, Medium, Long, think=False)
    print(f"[PHASE 2b / RQ2b] Testing Short / Medium / Long inputs on the same {len(items)} questions...")
    for item in items:
        for level in ["short", "medium", "long"]:
            prompt = build_context_prompt(item["question"], level)
            m = run_prompt(
                model=args.model,
                prompt=prompt,
                num_predict=256,
                think=False,
                project_name=f"{args.model}_rq2b_{level}",
                country_iso=args.country,
                raw_csv_path=raw_csv,
                force_ram_power=args.force_ram_power,
                dry_run=args.dry_run,
                gold_hint=item["answer"],
            )
            rows.append({
                "run_id": f"rq2in_{run_idx}",
                "timestamp": utc_now(),
                "model": args.model,
                "phase": "rq2_input_quality",
                "dataset": item["dataset"],
                "prompt_id": item["prompt_id"],
                "context_level": level,
                "thinking_mode": "off",
                "limit_type": "num_predict",
                "max_tokens_limit": 256,
                "input_tokens": m["input_tokens"],
                "output_tokens": m["output_tokens"],
                "latency_sec": m["latency_sec"],
                "energy_wh": m["energy_wh"],
                "correct": check_answer(item["dataset"], m["answer_text"], item["answer"]),
                "cpu_energy_wh": m["cpu_energy_wh"],
                "gpu_energy_wh": m["gpu_energy_wh"],
                "ram_energy_wh": m["ram_energy_wh"],
                "emissions_gco2eq": m["emissions_gco2eq"],
                "expected_answer": item["answer"].split("|")[0],
                "response_preview": clean_preview(m["preview_text"]),
            })
            run_idx += 1

    # PHASE 3 (RQ3): Reasoning ("Thinking") Mode vs. Direct Answer (think=False vs. think=True)
    # Follows `llm_test_reasoning.py`: thinking tokens count toward num_predict, so use 512+ when think=True
    print(f"[PHASE 3 / RQ3] Comparing Direct (think=False) vs. Thinking (think=True) on the same {len(items)} questions...")
    for think_flag in [False, True]:
        mode_tag = "on" if think_flag else "off"
        cap = args.thinking_cap if think_flag else 256
        proj_suffix = " (reasoning)" if think_flag else " (direct)"
        for item in items:
            prompt = f"Solve and give the final answer clearly.\nQuestion: {item['question']}"
            m = run_prompt(
                model=args.model,
                prompt=prompt,
                num_predict=cap,
                think=think_flag,
                project_name=f"{args.model}{proj_suffix}",
                country_iso=args.country,
                raw_csv_path=raw_csv,
                force_ram_power=args.force_ram_power,
                dry_run=args.dry_run,
                gold_hint=item["answer"],
            )
            rows.append({
                "run_id": f"rq3_{run_idx}",
                "timestamp": utc_now(),
                "model": args.model,
                "phase": "rq3_thinking",
                "dataset": item["dataset"],
                "prompt_id": item["prompt_id"],
                "context_level": "short",
                "thinking_mode": mode_tag,
                "limit_type": "num_predict",
                "max_tokens_limit": cap,
                "input_tokens": m["input_tokens"],
                "output_tokens": m["output_tokens"],
                "latency_sec": m["latency_sec"],
                "energy_wh": m["energy_wh"],
                "correct": check_answer(item["dataset"], m["answer_text"], item["answer"]),
                "cpu_energy_wh": m["cpu_energy_wh"],
                "gpu_energy_wh": m["gpu_energy_wh"],
                "ram_energy_wh": m["ram_energy_wh"],
                "emissions_gco2eq": m["emissions_gco2eq"],
                "expected_answer": item["answer"].split("|")[0],
                "response_preview": clean_preview(m["preview_text"]),
            })
            run_idx += 1

    # Save main CSV
    with open(results_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerows(rows)

    # Save Proof-of-Work receipt (hardware info + timestamps + SHA-256 hashes + sample Q&As)
    total_duration = round(time.perf_counter() - t_start, 2)
    sample_qa = [
        {
            "run_id": r["run_id"],
            "timestamp": r["timestamp"],
            "model": r["model"],
            "phase": r["phase"],
            "thinking_mode": r["thinking_mode"],
            "prompt_id": r["prompt_id"],
            "expected_answer": r["expected_answer"],
            "response_preview": r["response_preview"],
            "correct": bool(r["correct"]),
            "energy_mwh": round(r["energy_wh"] * 1000.0, 2),
        }
        for r in rows
        if r["phase"] in ("rq3_thinking", "rq2_output_limits", "rq2_input_quality")
    ][:8]

    proof = {
        "created_at_utc": start_utc,
        "finished_at_utc": utc_now(),
        "duration_sec": total_duration,
        "mode": mode,
        "dry_run": bool(args.dry_run),
        "model": args.model,
        "country_iso": args.country,
        "total_inferences": len(rows) - 1,
        "hardware": {
            "os": f"{platform.system()} {platform.release()}",
            "machine": platform.machine(),
            "processor": platform.processor() or "unknown",
            "python_version": platform.python_version(),
        },
        "files": {
            "results_csv": os.path.basename(results_csv),
            "results_csv_sha256": sha256_file(results_csv),
            "raw_codecarbon_csv": os.path.basename(raw_csv),
            "raw_codecarbon_csv_sha256": sha256_file(raw_csv),
        },
        "sample_verified_outputs": sample_qa,
    }
    with open(proof_json, "w", encoding="utf-8") as f:
        json.dump(proof, f, indent=2)

    print(
        f"[DONE] Saved {len(rows) - 1} inferences + 1 idle baseline in {total_duration}s\n"
        f"  -> Results CSV:   {results_csv}\n"
        f"  -> Proof-of-Work: {proof_json}\n"
        f"  -> Raw Log:       {raw_csv} ({'skipped in dry-run' if args.dry_run else 'written by CodeCarbon'})"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fast Ollama + CodeCarbon study with Proof-of-Work.")
    parser.add_argument("--preliminary", action="store_true", help="Fast ~3-5 min run for poster results (default)")
    parser.add_argument("--full", action="store_true", help="Larger ~15-25 min run with 12 questions & 2 RQ1 repeats")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Local Ollama reasoning model (default: {DEFAULT_MODEL})")
    parser.add_argument("--thinking-cap", type=int, default=512, help="Token budget when think=True (default: 512)")
    parser.add_argument("--country", default=COUNTRY_ISO, help="ISO-3 country code for CO2 intensity (e.g. DEU, ITA, SWE, IND)")
    parser.add_argument("--idle-seconds", type=int, default=5, help="Idle baseline sleep seconds (default: 5)")
    parser.add_argument("--cooldown", type=float, default=0.3, help="Pause in seconds between RQ1 calls (default: 0.3)")
    parser.add_argument("--force-ram-power", type=float, default=None, help="Optional RAM watts override (omit for auto)")
    parser.add_argument("--out-dir", default="results_prelim", help="Folder for CSV, emissions_raw.csv, and proof_of_work.json")
    parser.add_argument("--dry-run", action="store_true", help="Test script pipeline offline without calling Ollama")
    main(parser.parse_args())

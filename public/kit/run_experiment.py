#!/usr/bin/env python3
"""
Local LLM Inference Energy & Accuracy Experiment Runner
=======================================================
Measures energy (Wh) via CodeCarbon and accuracy on verifiable tasks
using a local Ollama model (default: qwen3:1.7b).

Covers:
  - RQ1: Controlled input length vs. output length sweep
  - RQ2: Output limits (num_predict and "answer in N words") Pareto trade-off
  - RQ3: Thinking ON vs. Thinking OFF paired comparison (for McNemar test)

Usage:
  1. Start Ollama and pull model: `ollama pull qwen3:1.7b`
  2. Quick smoke test (runs in ~1-2 min): `python run_experiment.py --quick`
  3. Full benchmark: `python run_experiment.py --samples 50`
  4. Offline pipeline check (no Ollama needed): `python run_experiment.py --dry-run`
"""

import argparse
import csv
import json
import math
import os
import re
import time
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

# Optional CodeCarbon import with graceful fallback message for dry-run checks
try:
    from codecarbon import EmissionsTracker, OfflineEmissionsTracker
    HAS_CODECARBON = True
except ImportError:
    HAS_CODECARBON = False

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
DEFAULT_MODEL = "qwen3:1.7b"

CSV_HEADERS = [
    "run_id",
    "phase",
    "dataset",
    "difficulty",
    "prompt_id",
    "thinking_mode",
    "limit_type",
    "max_tokens_limit",
    "input_tokens",
    "output_tokens",
    "thinking_tokens",
    "answer_tokens",
    "latency_sec",
    "energy_wh",
    "correct",
]

# Built-in verified mini-benchmark (used automatically if HuggingFace datasets is unavailable or --quick)
FALLBACK_ITEMS = [
    # GSM8K-style grade school math
    {"dataset": "GSM8K", "difficulty": 2, "prompt_id": "gsm_1", "question": "Janet's ducks lay 16 eggs per day. She eats three for breakfast every morning and bakes muffins for her friends every day with four. She sells the remainder at the farmers' market daily for $2 per fresh duck egg. How much in dollars does she make every day at the farmers' market?", "answer": "18"},
    {"dataset": "GSM8K", "difficulty": 2, "prompt_id": "gsm_2", "question": "A robe takes 2 bolts of blue fiber and half that much white fiber. How many bolts in total does it take?", "answer": "3"},
    {"dataset": "GSM8K", "difficulty": 2, "prompt_id": "gsm_3", "question": "Josh decides to try flipping a house. He buys a house for $80,000 and then puts in $50,000 in repairs. This increased the value of the house by 150%. How much profit did he make?", "answer": "70000"},
    {"dataset": "GSM8K", "difficulty": 2, "prompt_id": "gsm_4", "question": "James decides to run 3 sprints 3 times a week. He runs 60 meters each sprint. How many total meters does he run a week?", "answer": "540"},
    {"dataset": "GSM8K", "difficulty": 2, "prompt_id": "gsm_5", "question": "Every day, Wendi feeds each of her chickens three cups of mixed chicken feed, containing seeds, mealworms and vegetables to help keep them healthy. She gives the chickens their feed in three separate meals. In the morning, she gives her flock of chickens 15 cups of feed. In the afternoon, she gives her chickens another 25 cups of feed. How many cups of feed does she need to give her chickens in the final meal of the day if the size of Wendi's flock is 20 chickens?", "answer": "20"},
    # MATH-500 style levels 1-5
    {"dataset": "MATH-500", "difficulty": 1, "prompt_id": "math_l1_1", "question": "Solve for x: 3x + 7 = 22.", "answer": "5"},
    {"dataset": "MATH-500", "difficulty": 2, "prompt_id": "math_l2_1", "question": "What is the greatest common divisor of 84 and 126?", "answer": "42"},
    {"dataset": "MATH-500", "difficulty": 3, "prompt_id": "math_l3_1", "question": "How many positive integers less than 100 are divisible by both 3 and 4?", "answer": "8"},
    {"dataset": "MATH-500", "difficulty": 4, "prompt_id": "math_l4_1", "question": "Find the sum of all integer solutions to x^2 - 5x - 14 <= 0.", "answer": "25"},
    {"dataset": "MATH-500", "difficulty": 5, "prompt_id": "math_l5_1", "question": "What is the remainder when 2^100 is divided by 7?", "answer": "2"},
    # TriviaQA factual recall
    {"dataset": "TriviaQA", "difficulty": 1, "prompt_id": "triv_1", "question": "What is the chemical symbol for gold?", "answer": "au|gold"},
    {"dataset": "TriviaQA", "difficulty": 1, "prompt_id": "triv_2", "question": "Which planet in our solar system is known as the Red Planet?", "answer": "mars"},
    {"dataset": "TriviaQA", "difficulty": 1, "prompt_id": "triv_3", "question": "Who wrote the novel '1984'?", "answer": "george orwell|orwell"},
    {"dataset": "TriviaQA", "difficulty": 1, "prompt_id": "triv_4", "question": "In what year did the Apollo 11 mission first land humans on the Moon?", "answer": "1969"},
    {"dataset": "TriviaQA", "difficulty": 1, "prompt_id": "triv_5", "question": "What is the capital city of Australia?", "answer": "canberra"},
]


def load_datasets_items(samples_per_dataset: int, use_hf: bool) -> List[Dict[str, Any]]:
    if not use_hf:
        return FALLBACK_ITEMS

    items: List[Dict[str, Any]] = []
    try:
        from datasets import load_dataset

        # 1. GSM8K
        gsm = load_dataset("openai/gsm8k", "main", split=f"test[:{samples_per_dataset}]")
        for idx, row in enumerate(gsm):
            gold = row["answer"].split("####")[-1].strip()
            items.append({
                "dataset": "GSM8K",
                "difficulty": 2,
                "prompt_id": f"gsm8k_{idx+1}",
                "question": row["question"],
                "answer": gold,
            })

        # 2. MATH-500
        math500 = load_dataset("HuggingFaceH4/MATH-500", split=f"test[:{samples_per_dataset}]")
        for idx, row in enumerate(math500):
            items.append({
                "dataset": "MATH-500",
                "difficulty": int(row.get("level", 3)),
                "prompt_id": f"math500_{idx+1}",
                "question": row["problem"],
                "answer": str(row["answer"]).strip(),
            })

        # 3. TriviaQA
        trivia = load_dataset("trivia_qa", "rc.nocontext", split=f"validation[:{samples_per_dataset}]")
        for idx, row in enumerate(trivia):
            aliases = row["answer"].get("aliases", [])
            val = row["answer"].get("value", "")
            all_ans = "|".join([val] + aliases)
            items.append({
                "dataset": "TriviaQA",
                "difficulty": 1,
                "prompt_id": f"trivia_{idx+1}",
                "question": row["question"],
                "answer": all_ans,
            })
        return items
    except Exception as exc:
        print(f"[WARN] Could not load HuggingFace datasets ({exc}). Using built-in fallback items.")
        return FALLBACK_ITEMS


def normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s\.\-/]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_last_number(text: str) -> Optional[str]:
    boxed = re.findall(r"\\boxed\{([^}]+)\}", text)
    if boxed:
        return boxed[-1].replace(",", "").strip()
    hash_match = re.findall(r"####\s*([-+]?\d[\d,]*\.?\d*)", text)
    if hash_match:
        return hash_match[-1].replace(",", "").strip()
    nums = re.findall(r"[-+]?\d[\d,]*\.?\d*", text)
    if nums:
        return nums[-1].replace(",", "").strip()
    return None


def verify_answer(dataset: str, prediction: str, gold_answer: str) -> bool:
    if not prediction:
        return False
    if dataset in ("GSM8K", "MATH-500"):
        pred_num = extract_last_number(prediction)
        gold_num = extract_last_number(gold_answer) or gold_answer.replace(",", "").strip()
        if pred_num is None:
            return normalize_text(gold_answer) in normalize_text(prediction)
        try:
            return math.isclose(float(pred_num), float(gold_num), rel_tol=1e-4, abs_tol=1e-4)
        except ValueError:
            return normalize_text(pred_num) == normalize_text(gold_num)
    else:
        norm_pred = normalize_text(prediction)
        aliases = [normalize_text(a) for a in gold_answer.split("|") if a.strip()]
        return any(alias and alias in norm_pred for alias in aliases)


@dataclass
class InferenceMeasurement:
    input_tokens: int
    output_tokens: int
    thinking_tokens: int
    answer_tokens: int
    latency_sec: float
    energy_wh: float
    response_text: str


class EnergySession:
    """Wraps CodeCarbon tracking around a single Ollama request or dry-run."""

    def __init__(self, country_iso: str = "DEU", dry_run: bool = False):
        self.country_iso = country_iso
        self.dry_run = dry_run

    def run_ollama(
        self,
        model: str,
        prompt: str,
        think: bool,
        num_predict: int,
    ) -> InferenceMeasurement:
        if self.dry_run:
            # Deterministic offline check mode (no Ollama daemon required)
            in_tok = max(16, int(len(prompt.split()) * 1.35))
            if think:
                out_tok = min(num_predict, 360)
                think_tok = int(out_tok * 0.72)
            else:
                out_tok = min(num_predict, 512 if "comprehensive" in prompt else 120)
                think_tok = 0
            ans_tok = out_tok - think_tok
            energy_wh = round(0.0018 + in_tok * 0.000046 + out_tok * 0.000345, 6)
            return InferenceMeasurement(
                input_tokens=in_tok,
                output_tokens=out_tok,
                thinking_tokens=think_tok,
                answer_tokens=ans_tok,
                latency_sec=round(0.2 + in_tok / 160 + out_tok / 22, 3),
                energy_wh=energy_wh,
                response_text="18",
            )

        if not HAS_CODECARBON:
            raise RuntimeError("codecarbon is not installed. Run: pip install -r requirements.txt")

        # Use OfflineEmissionsTracker so no external API calls interfere with measurement
        tracker = OfflineEmissionsTracker(
            country_iso_code=self.country_iso,
            measure_power_secs=1,
            save_to_file=False,
            log_level="error",
        )

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "think": think,
            "options": {
                "temperature": 0,
                "seed": 42,
                "num_predict": num_predict,
            },
        }

        req = urllib.request.Request(
            OLLAMA_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        tracker.start()
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        finally:
            latency = time.perf_counter() - t0
            tracker.stop()

        # CodeCarbon stores total energy in kWh inside final_emissions_data.energy_consumed
        energy_kwh = getattr(tracker.final_emissions_data, "energy_consumed", 0.0) or 0.0
        energy_wh = float(energy_kwh) * 1000.0

        msg = data.get("message", {})
        content = msg.get("content", "")
        thinking_text = msg.get("thinking", "")

        in_tokens = int(data.get("prompt_eval_count", max(1, int(len(prompt.split()) * 1.3))))
        out_tokens = int(data.get("eval_count", max(1, int(len(content.split()) * 1.3))))

        # Estimate thinking vs answer token split proportionally by character count if separate
        if thinking_text:
            total_chars = max(1, len(thinking_text) + len(content))
            think_tok = int(round(out_tokens * (len(thinking_text) / total_chars)))
            ans_tok = max(0, out_tokens - think_tok)
        else:
            think_tok = 0
            ans_tok = out_tokens

        return InferenceMeasurement(
            input_tokens=in_tokens,
            output_tokens=out_tokens,
            thinking_tokens=think_tok,
            answer_tokens=ans_tok,
            latency_sec=round(latency, 3),
            energy_wh=round(energy_wh, 6),
            response_text=content,
        )


def build_synthetic_prompt(target_tokens: int) -> str:
    """Creates a neutral context prompt of controlled approximate token length."""
    base = (
        "Read the following technical notes and write a comprehensive, detailed analysis "
        "explaining every point thoroughly without stopping early. "
    )
    approx_words = max(12, int(target_tokens / 1.35) - len(base.split()))
    sentence = "System telemetry tracks CPU package power, memory bandwidth, and token latency accurately."
    repeats = max(2, (approx_words // len(sentence.split())) + 2)
    words = " ".join([sentence] * repeats).split()
    return base + " ".join(words[:approx_words])


def run_benchmark(args: argparse.Namespace) -> None:
    session = EnergySession(country_iso=args.country, dry_run=args.dry_run)
    items = load_datasets_items(samples_per_dataset=args.samples, use_hf=not args.offline)

    if args.quick:
        items = items[:6]

    print(f"[INFO] Model={args.model} | Items={len(items)} | DryRun={args.dry_run}")

    # Warmup (excluded from CSV, following Fernandez et al. 2025 §2)
    if not args.dry_run:
        print("[INFO] Running 2 warmup requests to stabilize CPU frequency and model cache...")
        for _ in range(2):
            session.run_ollama(args.model, "What is 2 + 2?", think=False, num_predict=16)
        time.sleep(2)

    rows: List[Dict[str, Any]] = []
    run_id = 1

    # ------------------------------------------------------------------
    # PHASE 1 (RQ1): Input Length x Output Length Controlled Sweep
    # ------------------------------------------------------------------
    in_lengths = [64, 256, 1024] if args.quick else [64, 128, 256, 512, 1024, 2048]
    out_lengths = [32, 128, 256] if args.quick else [32, 64, 128, 256, 512]
    repeats = 1 if args.quick else 3

    print("[PHASE 1] Running RQ1 Input x Output sweep...")
    for in_len in in_lengths:
        prompt = build_synthetic_prompt(in_len)
        for out_len in out_lengths:
            for rep in range(repeats):
                m = session.run_ollama(args.model, prompt, think=False, num_predict=out_len)
                rows.append({
                    "run_id": f"rq1_{run_id}",
                    "phase": "rq1_sweep",
                    "dataset": "SyntheticSweep",
                    "difficulty": 0,
                    "prompt_id": f"sweep_{in_len}_{out_len}_{rep}",
                    "thinking_mode": "off",
                    "limit_type": "num_predict",
                    "max_tokens_limit": out_len,
                    "input_tokens": m.input_tokens,
                    "output_tokens": m.output_tokens,
                    "thinking_tokens": m.thinking_tokens,
                    "answer_tokens": m.answer_tokens,
                    "latency_sec": m.latency_sec,
                    "energy_wh": m.energy_wh,
                    "correct": 1,
                })
                run_id += 1
                if not args.dry_run and args.cooldown > 0:
                    time.sleep(args.cooldown)

    # ------------------------------------------------------------------
    # PHASE 2 (RQ2): Output Limits (`num_predict` and "answer in N words")
    # ------------------------------------------------------------------
    tok_limits = [32, 64, 128, 256, 512] if args.quick else [32, 64, 128, 256, 512, 1024]
    word_limits = [10, 50, 100] if args.quick else [10, 25, 50, 100, 200]

    print("[PHASE 2] Running RQ2 Output Limit Pareto experiments...")
    for item in items:
        for lim in tok_limits:
            prompt = f"Solve and give the final answer clearly.\nQuestion: {item['question']}"
            m = session.run_ollama(args.model, prompt, think=False, num_predict=lim)
            ok = int(verify_answer(item["dataset"], m.response_text, item["answer"]))
            rows.append({
                "run_id": f"rq2_{run_id}",
                "phase": "rq2_limits",
                "dataset": item["dataset"],
                "difficulty": item["difficulty"],
                "prompt_id": item["prompt_id"],
                "thinking_mode": "off",
                "limit_type": "num_predict",
                "max_tokens_limit": lim,
                "input_tokens": m.input_tokens,
                "output_tokens": m.output_tokens,
                "thinking_tokens": 0,
                "answer_tokens": m.output_tokens,
                "latency_sec": m.latency_sec,
                "energy_wh": m.energy_wh,
                "correct": ok,
            })
            run_id += 1

        for wlim in word_limits:
            prompt = f"Answer in at most {wlim} words. Give the final answer clearly.\nQuestion: {item['question']}"
            m = session.run_ollama(args.model, prompt, think=False, num_predict=512)
            ok = int(verify_answer(item["dataset"], m.response_text, item["answer"]))
            rows.append({
                "run_id": f"rq2w_{run_id}",
                "phase": "rq2_limits",
                "dataset": item["dataset"],
                "difficulty": item["difficulty"],
                "prompt_id": item["prompt_id"],
                "thinking_mode": "off",
                "limit_type": "word_limit",
                "max_tokens_limit": wlim,
                "input_tokens": m.input_tokens,
                "output_tokens": m.output_tokens,
                "thinking_tokens": 0,
                "answer_tokens": m.output_tokens,
                "latency_sec": m.latency_sec,
                "energy_wh": m.energy_wh,
                "correct": ok,
            })
            run_id += 1

    # ------------------------------------------------------------------
    # PHASE 3 (RQ3): Paired Thinking OFF vs. Thinking ON
    # ------------------------------------------------------------------
    print("[PHASE 3] Running RQ3 Paired Thinking OFF vs. ON comparison...")
    for item in items:
        prompt = f"Solve carefully and provide the final answer.\nQuestion: {item['question']}"
        for mode_str, think_flag in [("off", False), ("on", True)]:
            m = session.run_ollama(args.model, prompt, think=think_flag, num_predict=1536)
            ok = int(verify_answer(item["dataset"], m.response_text, item["answer"]))
            rows.append({
                "run_id": f"rq3_{run_id}",
                "phase": "rq3_thinking",
                "dataset": item["dataset"],
                "difficulty": item["difficulty"],
                "prompt_id": item["prompt_id"],
                "thinking_mode": mode_str,
                "limit_type": "unlimited",
                "max_tokens_limit": 1536,
                "input_tokens": m.input_tokens,
                "output_tokens": m.output_tokens,
                "thinking_tokens": m.thinking_tokens,
                "answer_tokens": m.answer_tokens,
                "latency_sec": m.latency_sec,
                "energy_wh": m.energy_wh,
                "correct": ok,
            })
            run_id += 1

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[DONE] Wrote {len(rows)} experiment rows to {args.out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run local Ollama + CodeCarbon LLM inference energy study.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Ollama model tag (default: qwen3:1.7b)")
    parser.add_argument("--samples", type=int, default=30, help="Prompts per dataset (GSM8K, MATH-500, TriviaQA)")
    parser.add_argument("--country", default="DEU", help="ISO-3 country code for CodeCarbon OfflineEmissionsTracker")
    parser.add_argument("--cooldown", type=float, default=0.5, help="Cooldown seconds between requests to reduce thermal drift")
    parser.add_argument("--out", default="experiment_results.csv", help="Output CSV filename")
    parser.add_argument("--offline", action="store_true", help="Use built-in benchmark items without downloading HuggingFace datasets")
    parser.add_argument("--quick", action="store_true", help="Run a fast pilot sweep (~1-2 minutes)")
    parser.add_argument("--dry-run", action="store_true", help="Verify script logic offline without calling Ollama")
    run_benchmark(parser.parse_args())

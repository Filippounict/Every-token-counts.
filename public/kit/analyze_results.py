#!/usr/bin/env python3
"""
Every Token Counts — Simple Results Analyzer & Poster Chart Generator
=====================================================================
Plain-English summary (no black-box statistics) matching the course pandas scripts:
  - Phase 0: Idle power & measured CPU/GPU vs. constant RAM share
  - RQ1:     Average mWh per input token vs. output token + 2D grid
  - RQ2a:    Output limits & Sweet Spot (smallest cap within 2% of best accuracy)
  - RQ2b:    Input length vs. output quality (Short vs. Medium vs. Long input)
  - RQ3:     Model comparison (Accuracy %, Avg Output Tokens, Avg mWh, mWh/Correct)
  - Regions: Carbon sensitivity across Sweden (SWE), Germany (DEU), and India (IND)

Usage:
  python analyze_results.py --csv results_prelim/experiment_results.csv --out-dir figures
"""

import argparse
import json
import os
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

REGION_CARBON_G_PER_KWH = {
    "SWE": 36.0,
    "DEU": 380.0,
    "IND": 710.0,
}


def linear_slope(x, y):
    if len(x) < 2:
        return 0.0
    slope, _ = np.polyfit(x, y, 1)
    return float(slope)


def find_sweet_spot(cap_df, tolerance_pct=2.0):
    if cap_df.empty:
        return None
    ordered = cap_df.sort_values("max_tokens_limit")
    best_acc = ordered["accuracy_pct"].max()
    hits = ordered[ordered["accuracy_pct"] >= best_acc - tolerance_pct]
    chosen = hits.iloc[0] if not hits.empty else ordered.iloc[-1]
    return {
        "limit": int(chosen["max_tokens_limit"]),
        "accuracy_pct": round(float(chosen["accuracy_pct"]), 1),
        "avg_mwh": round(float(chosen["energy_wh"] * 1000.0), 2),
    }


def main(args):
    os.makedirs(args.out_dir, exist_ok=True)
    df = pd.read_csv(args.csv)
    df["correct"] = df["correct"].astype(int)

    idle_df = df[df["phase"] == "idle_baseline"]
    inf_df = df[df["phase"] != "idle_baseline"]

    summary = {"total_inferences": int(len(inf_df))}

    # 1. Idle baseline & CPU/GPU vs. constant RAM split
    if not idle_df.empty:
        idle_w = float((idle_df["energy_wh"].sum() * 3600.0) / max(1e-6, idle_df["latency_sec"].sum()))
        inf_w = float((inf_df["energy_wh"].sum() * 3600.0) / max(1e-6, inf_df["latency_sec"].sum()))
        summary["idle_power_w"] = round(idle_w, 2)
        summary["active_power_w"] = round(inf_w, 2)
        print(f"[IDLE vs ACTIVE] Idle: {idle_w:.1f} W | Active inference: {inf_w:.1f} W")

    if {"cpu_energy_wh", "gpu_energy_wh", "ram_energy_wh"}.issubset(inf_df.columns):
        tot = float(inf_df["energy_wh"].sum())
        if tot > 0:
            comp_pct = float((inf_df["cpu_energy_wh"].sum() + inf_df["gpu_energy_wh"].sum()) / tot * 100.0)
            ram_pct = float(inf_df["ram_energy_wh"].sum() / tot * 100.0)
            summary["measured_compute_share_pct"] = round(comp_pct, 1)
            summary["estimated_ram_share_pct"] = round(ram_pct, 1)
            print(f"[HARDWARE SPLIT] Measured CPU/GPU: {comp_pct:.1f}% | Estimated RAM: {ram_pct:.1f}%")

    # 2. RQ1: Input vs. Output energy
    rq1 = inf_df[inf_df["phase"] == "rq1_sweep"]
    if not rq1.empty:
        min_out = rq1["max_tokens_limit"].min()
        min_in = rq1["input_tokens"].min()
        in_curve = rq1[rq1["max_tokens_limit"] == min_out].groupby("input_tokens", as_index=False)["energy_wh"].mean()
        out_curve = rq1[rq1["input_tokens"] <= min_in + 40].groupby("output_tokens", as_index=False)["energy_wh"].mean()

        in_mwh_per_tok = linear_slope(in_curve["input_tokens"].values, in_curve["energy_wh"].values * 1000.0)
        out_mwh_per_tok = linear_slope(out_curve["output_tokens"].values, out_curve["energy_wh"].values * 1000.0)
        ratio = out_mwh_per_tok / in_mwh_per_tok if in_mwh_per_tok > 1e-6 else 0.0
        summary["rq1"] = {
            "input_mwh_per_token": round(in_mwh_per_tok, 4),
            "output_mwh_per_token": round(out_mwh_per_tok, 4),
            "output_to_input_ratio": round(ratio, 2),
        }
        print(
            f"[RQ1 ENERGY] Input: {in_mwh_per_tok:.4f} mWh/tok | Output: {out_mwh_per_tok:.4f} mWh/tok "
            f"-> Output costs {ratio:.1f}x more per token"
        )

        # Fig 1: Input vs Output Scaling
        plt.figure(figsize=(6.5, 4.0), dpi=300)
        plt.plot(in_curve["input_tokens"], in_curve["energy_wh"] * 1000, "o-", label=f"Input ({in_mwh_per_tok:.3f} mWh/tok)")
        plt.plot(out_curve["output_tokens"], out_curve["energy_wh"] * 1000, "s-", color="#B91C1C", label=f"Output ({out_mwh_per_tok:.3f} mWh/tok)")
        plt.xlabel("Number of Tokens")
        plt.ylabel("Energy (mWh / query)")
        plt.title(f"RQ1: Output Costs {ratio:.1f}x More Energy per Token")
        plt.grid(True, alpha=0.3)
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(args.out_dir, "fig1_input_vs_output_energy.png"))
        plt.close()

        # Fig 2: Input x Output Grid
        piv = rq1.pivot_table(index="max_tokens_limit", columns="input_tokens", values="energy_wh", aggfunc="mean") * 1000.0
        piv = piv.sort_index(ascending=False)
        plt.figure(figsize=(6.5, 4.0), dpi=300)
        plt.imshow(piv.values, aspect="auto", cmap="YlOrRd")
        plt.xticks(range(len(piv.columns)), [str(int(c)) for c in piv.columns])
        plt.yticks(range(len(piv.index)), [str(int(r)) for r in piv.index])
        for r_i in range(len(piv.index)):
            for c_i in range(len(piv.columns)):
                val = piv.values[r_i, c_i]
                if not np.isnan(val):
                    plt.text(c_i, r_i, f"{val:.0f}", ha="center", va="center", color="black", fontsize=9)
        plt.xlabel("Input Tokens")
        plt.ylabel("Output Cap (tokens)")
        plt.title("RQ1: Energy Grid (mWh per query)")
        plt.colorbar(label="mWh")
        plt.tight_layout()
        plt.savefig(os.path.join(args.out_dir, "fig2_energy_grid.png"))
        plt.close()

    # 3. RQ2a: Output Limits & Sweet Spot
    rq2a = inf_df[(inf_df["phase"] == "rq2_output_limits") & (inf_df["limit_type"] == "num_predict")]
    if not rq2a.empty:
        cap_df = rq2a.groupby("max_tokens_limit", as_index=False).agg(
            accuracy_pct=("correct", lambda s: s.mean() * 100.0),
            energy_wh=("energy_wh", "mean"),
        )
        sweet = find_sweet_spot(cap_df)
        summary["rq2a_sweet_spot"] = sweet
        print(f"[RQ2a SWEET SPOT] Smallest cap within 2% of best accuracy: {sweet}")

        plt.figure(figsize=(6.5, 4.0), dpi=300)
        plt.plot(cap_df["energy_wh"] * 1000, cap_df["accuracy_pct"], "o-", color="#0F766E")
        for _, row in cap_df.iterrows():
            plt.annotate(f"{int(row['max_tokens_limit'])} tok", (row["energy_wh"] * 1000, row["accuracy_pct"] + 2), fontsize=8)
        plt.xlabel("Average Energy per Query (mWh)")
        plt.ylabel("Accuracy (%)")
        plt.ylim(0, 110)
        plt.title("RQ2a: Output Cap vs. Accuracy & Energy (Sweet Spot)")
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(os.path.join(args.out_dir, "fig3_output_sweet_spot.png"))
        plt.close()

    # 4. RQ2b: Input Length vs. Output Quality
    rq2b = inf_df[inf_df["phase"] == "rq2_input_quality"]
    if not rq2b.empty:
        order = ["short", "medium", "long"]
        in_qual = []
        print("\n[RQ2b INPUT LENGTH vs. QUALITY (Levy 2024 / Liu 2024)]")
        for lvl in order:
            sub = rq2b[rq2b["context_level"] == lvl]
            if sub.empty:
                continue
            row_info = {
                "context_level": lvl,
                "avg_input_tokens": round(float(sub["input_tokens"].mean()), 1),
                "accuracy_pct": round(float(sub["correct"].mean() * 100.0), 1),
                "avg_mwh": round(float(sub["energy_wh"].mean() * 1000.0), 2),
            }
            in_qual.append(row_info)
            print(f"  {lvl:6s} (~{row_info['avg_input_tokens']:5.0f} tok): Acc={row_info['accuracy_pct']:5.1f}% | Energy={row_info['avg_mwh']:6.2f} mWh")
        summary["rq2b_input_quality"] = in_qual

        fig, ax1 = plt.subplots(figsize=(6.5, 4.0), dpi=300)
        labels = [r["context_level"].title() for r in in_qual]
        accs = [r["accuracy_pct"] for r in in_qual]
        mwhs = [r["avg_mwh"] for r in in_qual]
        ax1.bar(labels, accs, color=["#0F766E", "#0284C7", "#64748B"], width=0.45)
        ax1.set_ylabel("Accuracy (%)")
        ax1.set_ylim(0, 110)
        ax2 = ax1.twinx()
        ax2.plot(labels, mwhs, "D--", color="#B91C1C", label="Energy (mWh)")
        ax2.set_ylabel("Average Energy (mWh)", color="#B91C1C")
        plt.title("RQ2b: Longer Input Raises Energy & Can Lower Accuracy")
        plt.tight_layout()
        plt.savefig(os.path.join(args.out_dir, "fig4_input_length_quality.png"))
        plt.close()

    # 5. RQ3: Model Comparison
    rq3 = inf_df[inf_df["phase"] == "rq3_model_compare"]
    if not rq3.empty:
        print("\n[RQ3 MODEL COMPARISON]")
        model_rows = []
        for model_name, grp in rq3.groupby("model"):
            acc = float(grp["correct"].mean() * 100.0)
            avg_mwh = float(grp["energy_wh"].mean() * 1000.0)
            avg_out = float(grp["output_tokens"].mean())
            n_corr = int(grp["correct"].sum())
            mwh_per_corr = round(float(grp["energy_wh"].sum() * 1000.0 / n_corr), 2) if n_corr > 0 else None
            info = {
                "model": model_name,
                "accuracy_pct": round(acc, 1),
                "correct": n_corr,
                "total": int(len(grp)),
                "avg_output_tokens": round(avg_out, 1),
                "avg_mwh": round(avg_mwh, 2),
                "mwh_per_correct": mwh_per_corr,
            }
            model_rows.append(info)
            print(
                f"  {model_name:14s}: Acc={acc:5.1f}% ({n_corr}/{len(grp)}) | "
                f"Avg Out={avg_out:5.1f} tok | Avg={avg_mwh:6.2f} mWh | mWh/Correct={mwh_per_corr}"
            )
        summary["rq3_models"] = model_rows

    # 6. Regional Carbon Grid Sensitivity (mirrors cpu_test_regions.py)
    total_kwh = float(inf_df["energy_wh"].sum()) / 1000.0
    print(f"\n[REGIONAL CO2 CHECK] Same measured electricity ({total_kwh * 1000:.2f} Wh total):")
    regions = {}
    for code, intensity in REGION_CARBON_G_PER_KWH.items():
        g_co2 = round(total_kwh * intensity, 4)
        regions[code] = g_co2
        print(f"  {code} ({intensity:3.0f} gCO2/kWh): {g_co2:.4f} gCO2eq")
    summary["regional_co2_gco2eq"] = regions

    with open(os.path.join(args.out_dir, "summary_stats.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"\n[DONE] Saved charts and summary_stats.json into {args.out_dir}/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze local LLM experiment CSV and generate poster charts.")
    parser.add_argument("--csv", default="results_prelim/experiment_results.csv", help="Path to experiment_results.csv")
    parser.add_argument("--out-dir", default="figures", help="Folder for PNG charts and summary_stats.json")
    main(parser.parse_args())

import type { ExperimentRow } from '../types/experiment';

/**
 * Generates a small, transparent example preview dataset shaped identically to
 * `python run_experiment.py --preliminary` (1 idle check + 75 inferences)
 * using `qwen3:1.7b` (the course reasoning model from `llm_test_reasoning.py`).
 *
 * Clearly labeled in the UI as "Example Preview" until you run `--preliminary`
 * (~3-5 min) on your own laptop and import your real `experiment_results.csv`.
 */
export function buildPilotCalibrationRows(): ExperimentRow[] {
  const rows: ExperimentRow[] = [];
  let runCounter = 1;

  // Deterministic RNG so preview numbers stay stable on page reload
  let seed = 20260410;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const makeTime = (offsetSec: number) => {
    const base = Date.UTC(2026, 4, 10, 10, 0, 0) + offsetSec * 1000;
    return new Date(base).toISOString().replace('.000Z', 'Z');
  };

  const MODEL = 'qwen3:1.7b';

  // Physics-consistent laptop CPU model for qwen3:1.7b (~23W active; ~6W constant RAM estimate)
  const calcMetrics = (inTok: number, outTok: number) => {
    const prefillWh = 0.0014 + inTok * 0.000039;
    const decodeWh = outTok * 0.000285;
    const noise = 1 + (rand() - 0.5) * 0.04;
    const energyWh = Number(((prefillWh + decodeWh) * noise).toFixed(6));
    const latencySec = Number((0.18 + inTok / 190 + outTok / 26).toFixed(2));
    const ramWh = Number(Math.min(energyWh * 0.42, (6.0 * latencySec) / 3600).toFixed(6));
    const cpuWh = Number(Math.max(0, energyWh - ramWh).toFixed(6));
    const emissionsG = Number((energyWh * 0.38).toFixed(6));
    return { energyWh, latencySec, cpuWh, ramWh, emissionsG };
  };

  let elapsedSec = 0;

  // PHASE 0: 5s Idle Baseline (matches course `idle_test.py`)
  rows.push({
    runId: 'idle_0',
    timestamp: makeTime(elapsedSec),
    model: 'idle',
    phase: 'idle_baseline',
    dataset: 'IdleBaseline',
    promptId: 'idle_5s',
    contextLevel: 'none',
    thinkingMode: 'off',
    limitType: 'unlimited',
    maxTokensLimit: 0,
    inputTokens: 0,
    outputTokens: 0,
    latencySec: 5.0,
    energyWh: 0.011806,
    correct: true,
    cpuEnergyWh: 0.003472,
    gpuEnergyWh: 0,
    ramEnergyWh: 0.008333,
    emissionsGco2eq: 0.004486,
    expectedAnswer: '—',
    responsePreview: 'Idle sleep baseline (no model running)',
  });
  elapsedSec += 6;

  // PHASE 1 (RQ1): Input x Output Energy Grid (3x3 = 9 runs, think=False)
  const inBins = [64, 256, 1024];
  const outBins = [32, 128, 256];
  for (const inTok of inBins) {
    for (const outTok of outBins) {
      const m = calcMetrics(inTok, outTok);
      rows.push({
        runId: `rq1_${runCounter++}`,
        timestamp: makeTime(elapsedSec),
        model: MODEL,
        phase: 'rq1_sweep',
        dataset: 'SyntheticSweep',
        promptId: `sweep_${inTok}_${outTok}`,
        contextLevel: 'none',
        thinkingMode: 'off',
        limitType: 'num_predict',
        maxTokensLimit: outTok,
        inputTokens: inTok,
        outputTokens: outTok,
        latencySec: m.latencySec,
        energyWh: m.energyWh,
        correct: true,
        cpuEnergyWh: m.cpuWh,
        gpuEnergyWh: 0,
        ramEnergyWh: m.ramWh,
        emissionsGco2eq: m.emissionsG,
        expectedAnswer: 'n/a',
        responsePreview: 'System power grows steadily as more output tokens are written...',
      });
      elapsedSec += Math.ceil(m.latencySec) + 1;
    }
  }

  // Verifiable questions (3 GSM8K math + 3 TriviaQA facts)
  const questions = [
    {
      dataset: 'GSM8K' as const,
      id: 'gsm_1',
      gold: '18',
      reqTok: 88,
      baseIn: 68,
      okPreview: '16 - 3 - 4 = 9 eggs left. 9 x $2 = $18.',
      cutPreview: 'Janet starts with 16 eggs and eats 3 for...',
      longFailPreview: 'Using the 16 eggs and the 42 note entries, she makes $24.',
      directRq3Ok: false,
      directRq3Out: 78,
      directRq3Preview: '16 eggs minus 3 = 13 eggs. Selling at $2 gives $26.',
      thinkRq3Ok: true,
      thinkRq3Out: 274,
      thinkRq3Preview: '[think: 640 chars] 16 - 3 - 4 = 9 eggs left. 9 x $2 = $18.',
    },
    {
      dataset: 'GSM8K' as const,
      id: 'gsm_2',
      gold: '3',
      reqTok: 46,
      baseIn: 48,
      okPreview: 'Blue = 2 bolts, white = 1 bolt. Total = 3 bolts.',
      cutPreview: 'A robe uses 2 bolts of blue fiber and...',
      longFailPreview: 'Total fiber is 2 + 1 = 3 bolts.',
      directRq3Ok: true,
      directRq3Out: 52,
      directRq3Preview: 'Blue = 2 bolts, white = 1 bolt. Total = 3 bolts.',
      thinkRq3Ok: true,
      thinkRq3Out: 196,
      thinkRq3Preview: '[think: 420 chars] Half of 2 is 1. 2 + 1 = 3 bolts in total.',
    },
    {
      dataset: 'GSM8K' as const,
      id: 'gsm_3',
      gold: '70000',
      reqTok: 118,
      baseIn: 64,
      okPreview: 'Cost = $130,000. New value = $200,000. Profit = $70,000.',
      cutPreview: 'He buys the house for $80,000 and spends $50,000...',
      longFailPreview: 'Profit is 150% of $130,000 = $195,000.',
      directRq3Ok: false,
      directRq3Out: 92,
      directRq3Preview: 'Total cost $130,000, 150% increase gives $65,000 profit.',
      thinkRq3Ok: true,
      thinkRq3Out: 348,
      thinkRq3Preview: '[think: 890 chars] Cost $130,000; new value $80k x 2.5 = $200,000; profit = $70,000.',
    },
    {
      dataset: 'TriviaQA' as const,
      id: 'triv_1',
      gold: 'Au',
      reqTok: 18,
      baseIn: 28,
      okPreview: 'The chemical symbol for gold is Au.',
      cutPreview: 'Au',
      longFailPreview: 'The chemical symbol for gold is Au.',
      directRq3Ok: true,
      directRq3Out: 16,
      directRq3Preview: 'The chemical symbol for gold is Au.',
      thinkRq3Ok: true,
      thinkRq3Out: 128,
      thinkRq3Preview: '[think: 310 chars] The chemical symbol for gold is Au.',
    },
    {
      dataset: 'TriviaQA' as const,
      id: 'triv_2',
      gold: 'Mars',
      reqTok: 18,
      baseIn: 30,
      okPreview: 'Mars is known as the Red Planet.',
      cutPreview: 'Mars',
      longFailPreview: 'Mars is the Red Planet.',
      directRq3Ok: true,
      directRq3Out: 18,
      directRq3Preview: 'Mars is known as the Red Planet.',
      thinkRq3Ok: true,
      thinkRq3Out: 134,
      thinkRq3Preview: '[think: 340 chars] Mars is known as the Red Planet.',
    },
    {
      dataset: 'TriviaQA' as const,
      id: 'triv_3',
      gold: 'Canberra',
      reqTok: 22,
      baseIn: 30,
      okPreview: 'The capital city of Australia is Canberra.',
      cutPreview: 'Canberra',
      longFailPreview: 'Based on the notes, the capital city of Australia is Sydney.',
      directRq3Ok: true,
      directRq3Out: 20,
      directRq3Preview: 'The capital city of Australia is Canberra.',
      thinkRq3Ok: true,
      thinkRq3Out: 152,
      thinkRq3Preview: '[think: 390 chars] The capital city of Australia is Canberra.',
    },
  ];

  // PHASE 2a (RQ2a): Output Caps (32, 64, 128, 256 tokens + 15, 60 words = 36 runs, think=False)
  const capLimits = [32, 64, 128, 256];
  const wordLimits = [15, 60];

  for (const q of questions) {
    for (const lim of capLimits) {
      const naturalOut = q.dataset === 'TriviaQA' ? 24 : Math.max(q.reqTok + 20, 140);
      const actualOut = Math.min(lim, naturalOut);
      const ok = lim >= q.reqTok;
      const m = calcMetrics(q.baseIn, actualOut);
      rows.push({
        runId: `rq2a_${runCounter++}`,
        timestamp: makeTime(elapsedSec),
        model: MODEL,
        phase: 'rq2_output_limits',
        dataset: q.dataset,
        promptId: q.id,
        contextLevel: 'short',
        thinkingMode: 'off',
        limitType: 'num_predict',
        maxTokensLimit: lim,
        inputTokens: q.baseIn,
        outputTokens: actualOut,
        latencySec: m.latencySec,
        energyWh: m.energyWh,
        correct: ok,
        cpuEnergyWh: m.cpuWh,
        gpuEnergyWh: 0,
        ramEnergyWh: m.ramWh,
        emissionsGco2eq: m.emissionsG,
        expectedAnswer: q.gold,
        responsePreview: ok ? q.okPreview : q.cutPreview,
      });
      elapsedSec += Math.ceil(m.latencySec);
    }

    for (const wlim of wordLimits) {
      const approxOut = Math.min(Math.round(wlim * 1.4), q.dataset === 'TriviaQA' ? 22 : 120);
      const ok = wlim * 1.45 >= q.reqTok;
      const m = calcMetrics(q.baseIn + 8, approxOut);
      rows.push({
        runId: `rq2w_${runCounter++}`,
        timestamp: makeTime(elapsedSec),
        model: MODEL,
        phase: 'rq2_output_limits',
        dataset: q.dataset,
        promptId: q.id,
        contextLevel: 'short',
        thinkingMode: 'off',
        limitType: 'word_limit',
        maxTokensLimit: wlim,
        inputTokens: q.baseIn + 8,
        outputTokens: approxOut,
        latencySec: m.latencySec,
        energyWh: m.energyWh,
        correct: ok,
        cpuEnergyWh: m.cpuWh,
        gpuEnergyWh: 0,
        ramEnergyWh: m.ramWh,
        emissionsGco2eq: m.emissionsG,
        expectedAnswer: q.gold,
        responsePreview: ok ? q.okPreview : q.cutPreview,
      });
      elapsedSec += Math.ceil(m.latencySec);
    }
  }

  // PHASE 2b (RQ2b): Input Length vs. Output Quality (Short, Medium, Long = 18 runs, think=False)
  // Mirrors Levy et al. (ACL 2024) & Liu et al. (TACL 2024): same question + extra distractor notes
  const ctxLevels: Array<{ level: 'short' | 'medium' | 'long'; extraIn: number }> = [
    { level: 'short', extraIn: 0 },
    { level: 'medium', extraIn: 260 },
    { level: 'long', extraIn: 940 },
  ];

  for (const q of questions) {
    for (const ctx of ctxLevels) {
      const inTok = q.baseIn + ctx.extraIn;
      const outTok = q.dataset === 'TriviaQA' ? 26 : 128;
      let ok = true;
      if (ctx.level === 'medium' && q.id === 'gsm_3') ok = false;
      if (ctx.level === 'long' && (q.id === 'gsm_1' || q.id === 'gsm_3' || q.id === 'triv_3')) {
        ok = false;
      }
      const m = calcMetrics(inTok, outTok);
      rows.push({
        runId: `rq2in_${runCounter++}`,
        timestamp: makeTime(elapsedSec),
        model: MODEL,
        phase: 'rq2_input_quality',
        dataset: q.dataset,
        promptId: q.id,
        contextLevel: ctx.level,
        thinkingMode: 'off',
        limitType: 'num_predict',
        maxTokensLimit: 256,
        inputTokens: inTok,
        outputTokens: outTok,
        latencySec: m.latencySec,
        energyWh: m.energyWh,
        correct: ok,
        cpuEnergyWh: m.cpuWh,
        gpuEnergyWh: 0,
        ramEnergyWh: m.ramWh,
        emissionsGco2eq: m.emissionsG,
        expectedAnswer: q.gold,
        responsePreview: ok ? q.okPreview : q.longFailPreview,
      });
      elapsedSec += Math.ceil(m.latencySec);
    }
  }

  // PHASE 3 (RQ3): Reasoning ("Thinking") Mode vs. Direct Answer (think=False vs. think=True = 12 runs)
  const modes: Array<'off' | 'on'> = ['off', 'on'];
  for (const mode of modes) {
    for (const q of questions) {
      const isThink = mode === 'on';
      const outTok = isThink ? q.thinkRq3Out : q.directRq3Out;
      const ok = isThink ? q.thinkRq3Ok : q.directRq3Ok;
      const m = calcMetrics(q.baseIn, outTok);
      rows.push({
        runId: `rq3_${runCounter++}`,
        timestamp: makeTime(elapsedSec),
        model: MODEL,
        phase: 'rq3_thinking',
        dataset: q.dataset,
        promptId: q.id,
        contextLevel: 'short',
        thinkingMode: mode,
        limitType: 'num_predict',
        maxTokensLimit: isThink ? 512 : 256,
        inputTokens: q.baseIn,
        outputTokens: outTok,
        latencySec: m.latencySec,
        energyWh: m.energyWh,
        correct: ok,
        cpuEnergyWh: m.cpuWh,
        gpuEnergyWh: 0,
        ramEnergyWh: m.ramWh,
        emissionsGco2eq: m.emissionsG,
        expectedAnswer: q.gold,
        responsePreview: isThink ? q.thinkRq3Preview : q.directRq3Preview,
      });
      elapsedSec += Math.ceil(m.latencySec);
    }
  }

  return rows;
}

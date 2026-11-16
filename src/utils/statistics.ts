import type {
  AggregatedPosterData,
  DatasetName,
  ExperimentPhase,
  ExperimentRow,
  HeatmapCell,
  LimitType,
  LinearRegressionResult,
  McNemarResult,
  ParetoPoint,
  ScalingPoint,
  ThinkingMode,
  ThinkingTaskSummary,
} from '../types/experiment';

export function computeLinearRegression(
  points: Array<{ x: number; y: number }>
): LinearRegressionResult {
  if (points.length < 2) {
    return { slope: 0, intercept: points[0]?.y ?? 0, rSquared: 0 };
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXX = 0;
  let ssYY = 0;
  let ssXY = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    ssXX += dx * dx;
    ssYY += dy * dy;
    ssXY += dx * dy;
  }

  if (ssXX === 0) {
    return { slope: 0, intercept: meanY, rSquared: 0 };
  }

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const rSquared = ssYY === 0 ? 1 : Math.min(1, Math.max(0, (ssXY * ssXY) / (ssXX * ssYY)));

  return { slope, intercept, rSquared };
}

function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function chi2SurvivalOneDof(x: number): number {
  if (x <= 0) return 1;
  // For df=1, survival function P(chi2_1 >= x) = erfc(sqrt(x/2))
  return erfcApprox(Math.sqrt(x / 2));
}

function erfcApprox(x: number): number {
  // Abramowitz and Stegun 7.1.26 approximation (max error 1.5e-7)
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const res = poly * Math.exp(-x * x);
  return x >= 0 ? res : 2 - res;
}

function logFactorial(n: number): number {
  if (n <= 1) return 0;
  return logGamma(n + 1);
}

export function exactBinomialTwoSidedP(k: number, n: number): number {
  if (n === 0) return 1;
  const halfN = Math.floor(n / 2);
  const kMin = Math.min(k, n - k);
  let cdf = 0;
  const logHalfPow = -n * Math.LN2;
  const logNfact = logFactorial(n);
  for (let i = 0; i <= kMin; i++) {
    const logBinom = logNfact - logFactorial(i) - logFactorial(n - i);
    cdf += Math.exp(logBinom + logHalfPow);
  }
  if (kMin === halfN && n % 2 === 0) {
    return Math.min(1, 2 * cdf - Math.exp(logNfact - 2 * logFactorial(halfN) + logHalfPow));
  }
  return Math.min(1, 2 * cdf);
}

export function computeMcNemarFromCounts(
  n11: number,
  n10: number,
  n01: number,
  n00: number
): McNemarResult {
  const totalPairs = n11 + n10 + n01 + n00;
  const discordantTotal = n10 + n01;

  const accOffPct = totalPairs > 0 ? ((n11 + n10) / totalPairs) * 100 : 0;
  const accOnPct = totalPairs > 0 ? ((n11 + n01) / totalPairs) * 100 : 0;
  const deltaAccPct = accOnPct - accOffPct;

  let method: 'exact_binomial' | 'chi2_edwards' = 'chi2_edwards';
  let chiSquare: number | null = null;
  let pValue = 1;

  if (discordantTotal === 0) {
    method = 'exact_binomial';
    pValue = 1;
  } else if (discordantTotal < 25) {
    method = 'exact_binomial';
    pValue = exactBinomialTwoSidedP(Math.min(n10, n01), discordantTotal);
  } else {
    method = 'chi2_edwards';
    const numerator = Math.max(0, Math.abs(n10 - n01) - 1);
    chiSquare = (numerator * numerator) / discordantTotal;
    pValue = chi2SurvivalOneDof(chiSquare);
  }

  const oddsRatio = n10 > 0 ? n01 / n10 : n01 > 0 ? Infinity : null;
  const cohensG = discordantTotal > 0 ? Math.max(n01, n10) / discordantTotal - 0.5 : 0;

  return {
    n11,
    n10,
    n01,
    n00,
    totalPairs,
    discordantTotal,
    method,
    chiSquare,
    pValue,
    significantAt05: pValue < 0.05,
    oddsRatio,
    cohensG,
    accOffPct,
    accOnPct,
    deltaAccPct,
  };
}

export function computeMcNemar(
  pairs: Array<{ offCorrect: boolean; onCorrect: boolean }>
): McNemarResult {
  let n11 = 0;
  let n10 = 0;
  let n01 = 0;
  let n00 = 0;

  for (const pair of pairs) {
    if (pair.offCorrect && pair.onCorrect) n11++;
    else if (pair.offCorrect && !pair.onCorrect) n10++;
    else if (!pair.offCorrect && pair.onCorrect) n01++;
    else n00++;
  }

  return computeMcNemarFromCounts(n11, n10, n01, n00);
}

export function detectParetoKnee(
  points: Array<{
    limit: number;
    label: string;
    limitType: LimitType;
    energyWh: number;
    accuracyPct: number;
    tokensGenerated: number;
    whPerCorrect: number;
  }>
): ParetoPoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.energyWh - b.energyWh);

  const enriched: ParetoPoint[] = sorted.map((pt, idx) => {
    let marginal: number | null = null;
    if (idx > 0) {
      const prev = sorted[idx - 1];
      const dE = pt.energyWh - prev.energyWh;
      const dAcc = pt.accuracyPct - prev.accuracyPct;
      marginal = dE > 1e-9 ? dAcc / dE : null;
    }
    return {
      ...pt,
      isKnee: false,
      marginalGainAccPerWh: marginal,
    };
  });

  if (enriched.length < 3) {
    if (enriched.length > 0) enriched[enriched.length - 1].isKnee = true;
    return enriched;
  }

  // Normalize (energyWh, accuracyPct) to [0, 1] x [0, 1] and find max perpendicular distance
  // above the chord connecting first and last points (standard Kneedle elbow method)
  const minE = enriched[0].energyWh;
  const maxE = enriched[enriched.length - 1].energyWh;
  const minA = Math.min(...enriched.map((p) => p.accuracyPct));
  const maxA = Math.max(...enriched.map((p) => p.accuracyPct));

  const spanE = Math.max(1e-9, maxE - minE);
  const spanA = Math.max(1e-9, maxA - minA);

  const x1 = (enriched[0].energyWh - minE) / spanE;
  const y1 = (enriched[0].accuracyPct - minA) / spanA;
  const x2 = (enriched[enriched.length - 1].energyWh - minE) / spanE;
  const y2 = (enriched[enriched.length - 1].accuracyPct - minA) / spanA;

  const chordLen = Math.hypot(x2 - x1, y2 - y1) || 1;

  let bestIdx = 0;
  let bestDist = -Infinity;

  for (let i = 1; i < enriched.length - 1; i++) {
    const xi = (enriched[i].energyWh - minE) / spanE;
    const yi = (enriched[i].accuracyPct - minA) / spanA;
    // Signed perpendicular distance above the chord
    const signedDist = ((x2 - x1) * (yi - y1) - (y2 - y1) * (xi - x1)) / chordLen;
    if (signedDist > bestDist) {
      bestDist = signedDist;
      bestIdx = i;
    }
  }

  enriched[bestIdx].isKnee = true;
  return enriched;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseExperimentCsv(csvText: string): ExperimentRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.');
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const required = ['phase', 'dataset', 'prompt_id', 'thinking_mode', 'input_tokens', 'output_tokens', 'energy_wh', 'correct'];
  for (const col of required) {
    if (idx(col) === -1) {
      throw new Error(`Missing required CSV column: "${col}"`);
    }
  }

  const rows: ExperimentRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < headers.length) continue;

    const rawDataset = cols[idx('dataset')];
    const dataset: DatasetName =
      rawDataset === 'GSM8K' || rawDataset === 'MATH-500' || rawDataset === 'TriviaQA' || rawDataset === 'SyntheticSweep'
        ? rawDataset
        : 'GSM8K';

    const rawPhase = cols[idx('phase')];
    const phase: ExperimentPhase =
      rawPhase === 'rq1_sweep' || rawPhase === 'rq2_limits' || rawPhase === 'rq3_thinking'
        ? rawPhase
        : 'rq3_thinking';

    const rawMode = cols[idx('thinking_mode')].toLowerCase();
    const thinkingMode: ThinkingMode = rawMode === 'on' || rawMode === 'true' || rawMode === '1' ? 'on' : 'off';

    const rawLimitType = idx('limit_type') !== -1 ? cols[idx('limit_type')] : 'num_predict';
    const limitType: LimitType =
      rawLimitType === 'word_limit' || rawLimitType === 'unlimited' ? rawLimitType : 'num_predict';

    const parseNum = (colName: string, fallback = 0) => {
      const colIdx = idx(colName);
      if (colIdx === -1) return fallback;
      const val = Number(cols[colIdx]);
      return Number.isFinite(val) ? val : fallback;
    };

    const rawCorrect = cols[idx('correct')].toLowerCase();
    const correct = rawCorrect === '1' || rawCorrect === 'true' || rawCorrect === 'yes';

    rows.push({
      runId: idx('run_id') !== -1 ? cols[idx('run_id')] : `row_${i}`,
      phase,
      dataset,
      difficulty: parseNum('difficulty', 1),
      promptId: cols[idx('prompt_id')],
      thinkingMode,
      limitType,
      maxTokensLimit: parseNum('max_tokens_limit', 512),
      inputTokens: parseNum('input_tokens', 0),
      outputTokens: parseNum('output_tokens', 0),
      thinkingTokens: parseNum('thinking_tokens', 0),
      answerTokens: parseNum('answer_tokens', parseNum('output_tokens', 0)),
      latencySec: parseNum('latency_sec', 0),
      energyWh: parseNum('energy_wh', 0),
      correct,
    });
  }

  if (rows.length === 0) {
    throw new Error('No valid experiment rows parsed from CSV.');
  }

  return rows;
}

function summarizeThinkingGroup(label: string, rows: ExperimentRow[]): ThinkingTaskSummary {
  const offRows = rows.filter((r) => r.thinkingMode === 'off');
  const onRows = rows.filter((r) => r.thinkingMode === 'on');

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const offCorrect = offRows.filter((r) => r.correct).length;
  const onCorrect = onRows.filter((r) => r.correct).length;

  const accOffPct = offRows.length ? (offCorrect / offRows.length) * 100 : 0;
  const accOnPct = onRows.length ? (onCorrect / onRows.length) * 100 : 0;

  const totalEnergyOff = offRows.reduce((s, r) => s + r.energyWh, 0);
  const totalEnergyOn = onRows.reduce((s, r) => s + r.energyWh, 0);

  const energyOffWh = avg(offRows.map((r) => r.energyWh));
  const energyOnWh = avg(onRows.map((r) => r.energyWh));

  const whPerCorrectOff = offCorrect > 0 ? totalEnergyOff / offCorrect : null;
  const whPerCorrectOn = onCorrect > 0 ? totalEnergyOn / onCorrect : null;

  const deltaEnergy = energyOnWh - energyOffWh;
  const deltaAcc = accOnPct - accOffPct;
  const extraAccPerExtraWh = deltaEnergy > 1e-6 ? deltaAcc / deltaEnergy : null;

  return {
    label,
    count: Math.max(offRows.length, onRows.length),
    accOffPct,
    accOnPct,
    energyOffWh,
    energyOnWh,
    whPerCorrectOff,
    whPerCorrectOn,
    extraAccPerExtraWh,
    avgTokensOff: avg(offRows.map((r) => r.outputTokens)),
    avgTokensOn: avg(onRows.map((r) => r.outputTokens)),
  };
}

function pairThinkingRows(rows: ExperimentRow[]): Array<{ offCorrect: boolean; onCorrect: boolean }> {
  const byKey = new Map<string, { off?: boolean; on?: boolean }>();
  for (const r of rows) {
    const key = `${r.dataset}::${r.promptId}`;
    const existing = byKey.get(key) ?? {};
    if (r.thinkingMode === 'off') existing.off = r.correct;
    else existing.on = r.correct;
    byKey.set(key, existing);
  }
  const pairs: Array<{ offCorrect: boolean; onCorrect: boolean }> = [];
  for (const entry of byKey.values()) {
    if (typeof entry.off === 'boolean' && typeof entry.on === 'boolean') {
      pairs.push({ offCorrect: entry.off, onCorrect: entry.on });
    }
  }
  return pairs;
}

export function aggregateExperimentData(
  rows: ExperimentRow[],
  datasetFilter: string = 'ALL',
  modelName: string = 'Qwen3-1.7B (Ollama Q4_K_M)'
): AggregatedPosterData {
  // RQ1 Sweep (uses rq1_sweep rows; falls back to all rows if no dedicated sweep exists)
  const sweepRows = rows.filter((r) => r.phase === 'rq1_sweep');

  // Group input sweep (where output is held around baseline <= 128 or lowest output bin)
  const minOutInSweep = sweepRows.length
    ? Math.min(...sweepRows.map((r) => r.maxTokensLimit))
    : 64;

  const inputSweepMap = new Map<number, { energySum: number; latSum: number; count: number }>();
  const outputSweepMap = new Map<number, { energySum: number; latSum: number; count: number }>();

  const minInInSweep = sweepRows.length
    ? Math.min(...sweepRows.map((r) => r.inputTokens))
    : 64;

  for (const r of sweepRows) {
    if (r.maxTokensLimit === minOutInSweep || r.outputTokens <= minOutInSweep + 16) {
      const bucket = r.inputTokens;
      const cur = inputSweepMap.get(bucket) ?? { energySum: 0, latSum: 0, count: 0 };
      cur.energySum += r.energyWh;
      cur.latSum += r.latencySec;
      cur.count += 1;
      inputSweepMap.set(bucket, cur);
    }
    if (r.inputTokens <= minInInSweep + 32) {
      const bucket = r.outputTokens;
      const cur = outputSweepMap.get(bucket) ?? { energySum: 0, latSum: 0, count: 0 };
      cur.energySum += r.energyWh;
      cur.latSum += r.latencySec;
      cur.count += 1;
      outputSweepMap.set(bucket, cur);
    }
  }

  const rq1InputCurve: ScalingPoint[] = [...inputSweepMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tokens, v]) => ({
      tokens,
      energyWh: v.energySum / v.count,
      latencySec: v.latSum / v.count,
      count: v.count,
    }));

  const rq1OutputCurve: ScalingPoint[] = [...outputSweepMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tokens, v]) => ({
      tokens,
      energyWh: v.energySum / v.count,
      latencySec: v.latSum / v.count,
      count: v.count,
    }));

  const rq1InputRegression = computeLinearRegression(
    rq1InputCurve.map((p) => ({ x: p.tokens, y: p.energyWh }))
  );
  const rq1OutputRegression = computeLinearRegression(
    rq1OutputCurve.map((p) => ({ x: p.tokens, y: p.energyWh }))
  );

  const outputToInputSlopeRatio =
    rq1InputRegression.slope > 1e-9
      ? rq1OutputRegression.slope / rq1InputRegression.slope
      : 0;

  // Heatmap from rq1_sweep (discrete input bins x output bins)
  const inputBinSet = new Set<number>();
  const outputBinSet = new Set<number>();
  const heatmapBucket = new Map<string, { energySum: number; correctSum: number; count: number; inBin: number; outBin: number }>();

  const nearestPow2Bin = (val: number, bins: number[]) => {
    for (const b of bins) {
      if (val <= b * 1.15) return b;
    }
    return bins[bins.length - 1];
  };

  const stdInBins = [64, 128, 256, 512, 1024, 2048];
  const stdOutBins = [32, 64, 128, 256, 512];

  for (const r of sweepRows) {
    const inBin = nearestPow2Bin(r.inputTokens, stdInBins);
    const outBin = nearestPow2Bin(r.outputTokens, stdOutBins);
    inputBinSet.add(inBin);
    outputBinSet.add(outBin);
    const key = `${inBin}x${outBin}`;
    const cur = heatmapBucket.get(key) ?? {
      energySum: 0,
      correctSum: 0,
      count: 0,
      inBin,
      outBin,
    };
    cur.energySum += r.energyWh;
    cur.correctSum += r.correct ? 1 : 0;
    cur.count += 1;
    heatmapBucket.set(key, cur);
  }

  const heatmapInputBins = [...inputBinSet].sort((a, b) => a - b);
  const heatmapOutputBins = [...outputBinSet].sort((a, b) => a - b);
  const heatmapCells: HeatmapCell[] = [...heatmapBucket.values()].map((v) => ({
    inputBin: v.inBin,
    outputBin: v.outBin,
    energyWh: v.energySum / v.count,
    accuracyPct: (v.correctSum / v.count) * 100,
    count: v.count,
  }));

  // RQ2 Output Limits (filtered by dataset if selected)
  const rq2Rows = rows.filter(
    (r) =>
      r.phase === 'rq2_limits' &&
      (datasetFilter === 'ALL' || r.dataset === datasetFilter)
  );

  const buildPareto = (subset: ExperimentRow[], lType: LimitType) => {
    const map = new Map<number, ExperimentRow[]>();
    for (const r of subset.filter((x) => x.limitType === lType)) {
      const arr = map.get(r.maxTokensLimit) ?? [];
      arr.push(r);
      map.set(r.maxTokensLimit, arr);
    }
    const rawPts = [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([limit, list]) => {
        const totalE = list.reduce((s, x) => s + x.energyWh, 0);
        const totalCorrect = list.filter((x) => x.correct).length;
        const avgE = totalE / list.length;
        const accPct = (totalCorrect / list.length) * 100;
        const avgTok = list.reduce((s, x) => s + x.outputTokens, 0) / list.length;
        const whPerCorrect = totalCorrect > 0 ? totalE / totalCorrect : avgE * list.length;
        return {
          limit,
          label: lType === 'word_limit' ? `${limit} words` : `${limit} tok`,
          limitType: lType,
          energyWh: avgE,
          accuracyPct: accPct,
          tokensGenerated: avgTok,
          whPerCorrect,
        };
      });
    return detectParetoKnee(rawPts);
  };

  const rq2ParetoCurve = buildPareto(rq2Rows, 'num_predict');
  const rq2WordLimitCurve = buildPareto(rq2Rows, 'word_limit');
  const kneePoint = rq2ParetoCurve.find((p) => p.isKnee) ?? null;

  // RQ3 Thinking ON vs OFF
  const rq3Rows = rows.filter(
    (r) =>
      r.phase === 'rq3_thinking' &&
      (datasetFilter === 'ALL' || r.dataset === datasetFilter)
  );

  const datasetsPresent = (['TriviaQA', 'GSM8K', 'MATH-500'] as const).filter((d) =>
    rq3Rows.some((r) => r.dataset === d)
  );
  const rq3ByDataset = datasetsPresent.map((d) =>
    summarizeThinkingGroup(d, rq3Rows.filter((r) => r.dataset === d))
  );

  const mathRows = rq3Rows.filter((r) => r.dataset === 'MATH-500');
  const rq3ByDifficulty = [1, 2, 3, 4, 5]
    .filter((lvl) => mathRows.some((r) => r.difficulty === lvl))
    .map((lvl) =>
      summarizeThinkingGroup(`Level ${lvl}`, mathRows.filter((r) => r.difficulty === lvl))
    );

  const mcNemarOverall = computeMcNemar(pairThinkingRows(rq3Rows));
  const mcNemarByDataset: Record<string, McNemarResult> = {};
  for (const d of datasetsPresent) {
    mcNemarByDataset[d] = computeMcNemar(
      pairThinkingRows(rq3Rows.filter((r) => r.dataset === d))
    );
  }

  return {
    totalRuns: rows.length,
    modelName,
    rq1InputCurve,
    rq1OutputCurve,
    rq1InputRegression,
    rq1OutputRegression,
    outputToInputSlopeRatio,
    heatmapInputBins,
    heatmapOutputBins,
    heatmapCells,
    rq2ParetoCurve,
    rq2WordLimitCurve,
    kneePoint,
    rq3ByDataset,
    rq3ByDifficulty,
    mcNemarOverall,
    mcNemarByDataset,
  };
}

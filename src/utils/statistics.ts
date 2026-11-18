import type {
  AggregatedPosterData,
  ContextLevel,
  DatasetName,
  ExperimentPhase,
  ExperimentRow,
  HardwareEnergyBreakdown,
  HeatmapCell,
  InputQualitySummary,
  LimitType,
  LinearTrendResult,
  OutputCapPoint,
  ProofTraceSample,
  ScalingPoint,
  ThinkingArmSummary,
  ThinkingComparisonSummary,
  ThinkingDatasetBreakdown,
  ThinkingMode,
} from '../types/experiment';

/**
 * Computes a simple straight-line trend (slope = extra Wh per extra token).
 */
export function computeLinearTrend(
  points: Array<{ x: number; y: number }>
): LinearTrendResult {
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

/**
 * Plain-English sweet spot rule:
 * Finds the smallest output cap that is already within `tolerancePct` (default 2%)
 * of the highest accuracy observed. Beyond this cap, extra tokens cost more energy
 * without improving accuracy meaningfully.
 */
export function findAccuracySweetSpot(
  points: Array<{
    limit: number;
    label: string;
    limitType: LimitType;
    energyWh: number;
    accuracyPct: number;
    tokensGenerated: number;
    whPerCorrect: number | null;
  }>,
  tolerancePct: number = 2.0
): OutputCapPoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.limit - b.limit);
  const maxAcc = Math.max(...sorted.map((p) => p.accuracyPct));

  let sweetIdx = sorted.findIndex((p) => p.accuracyPct >= maxAcc - tolerancePct);
  if (sweetIdx === -1) sweetIdx = sorted.length - 1;

  return sorted.map((pt, idx) => ({
    ...pt,
    isSweetSpot: idx === sweetIdx,
  }));
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

function mapPhase(rawPhase: string): ExperimentPhase {
  switch (rawPhase) {
    case 'idle_baseline':
      return 'idle_baseline';
    case 'rq1_sweep':
      return 'rq1_sweep';
    case 'rq2_output_limits':
    case 'rq2_limits':
      return 'rq2_output_limits';
    case 'rq2_input_quality':
      return 'rq2_input_quality';
    case 'rq3_thinking':
    case 'rq3_model_compare':
      return 'rq3_thinking';
    default:
      return 'rq2_output_limits';
  }
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

  const required = ['phase', 'dataset', 'prompt_id', 'input_tokens', 'output_tokens', 'energy_wh', 'correct'];
  for (const col of required) {
    if (idx(col) === -1) {
      throw new Error(`Missing required CSV column: "${col}"`);
    }
  }

  const rows: ExperimentRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < Math.min(headers.length, required.length)) continue;

    const getStr = (colName: string, fallback = '') => {
      const colIdx = idx(colName);
      return colIdx !== -1 && colIdx < cols.length ? cols[colIdx] : fallback;
    };

    const parseNum = (colName: string, fallback = 0) => {
      const raw = getStr(colName, '');
      if (raw === '') return fallback;
      const val = Number(raw);
      return Number.isFinite(val) ? val : fallback;
    };

    const parseOptionalNum = (colName: string): number | undefined => {
      const raw = getStr(colName, '');
      if (raw === '') return undefined;
      const val = Number(raw);
      return Number.isFinite(val) ? val : undefined;
    };

    const rawDataset = getStr('dataset', 'GSM8K');
    const dataset: DatasetName =
      rawDataset === 'GSM8K' ||
      rawDataset === 'MATH-500' ||
      rawDataset === 'TriviaQA' ||
      rawDataset === 'SyntheticSweep' ||
      rawDataset === 'IdleBaseline'
        ? rawDataset
        : 'GSM8K';

    const phase = mapPhase(getStr('phase', ''));

    const rawContext = getStr('context_level', 'none').toLowerCase();
    const contextLevel: ContextLevel =
      rawContext === 'short' || rawContext === 'medium' || rawContext === 'long'
        ? rawContext
        : 'none';

    const rawThinking = getStr('thinking_mode', 'off').toLowerCase();
    const thinkingMode: ThinkingMode =
      rawThinking === 'on' ||
      rawThinking === 'true' ||
      rawThinking === '1' ||
      rawThinking === 'thinking' ||
      rawThinking === 'reasoning'
        ? 'on'
        : 'off';

    const rawLimitType = getStr('limit_type', 'num_predict');
    const limitType: LimitType =
      rawLimitType === 'word_limit' || rawLimitType === 'unlimited' ? rawLimitType : 'num_predict';

    const rawCorrect = getStr('correct', '0').toLowerCase();
    const correct = rawCorrect === '1' || rawCorrect === 'true' || rawCorrect === 'yes';

    const model = getStr('model', '') || 'qwen3:1.7b';

    rows.push({
      runId: getStr('run_id', `row_${i}`),
      timestamp: getStr('timestamp', '') || undefined,
      model,
      phase,
      dataset,
      promptId: getStr('prompt_id', `p_${i}`),
      contextLevel,
      thinkingMode,
      limitType,
      maxTokensLimit: parseNum('max_tokens_limit', 256),
      inputTokens: parseNum('input_tokens', 0),
      outputTokens: parseNum('output_tokens', 0),
      latencySec: parseNum('latency_sec', 0),
      energyWh: parseNum('energy_wh', 0),
      correct,
      cpuEnergyWh: parseOptionalNum('cpu_energy_wh'),
      gpuEnergyWh: parseOptionalNum('gpu_energy_wh'),
      ramEnergyWh: parseOptionalNum('ram_energy_wh'),
      emissionsGco2eq: parseOptionalNum('emissions_gco2eq'),
      expectedAnswer: getStr('expected_answer', '') || undefined,
      responsePreview: getStr('response_preview', '') || undefined,
    });
  }

  if (rows.length === 0) {
    throw new Error('No valid experiment rows parsed from CSV.');
  }

  return rows;
}

function summarizeThinkingArm(mode: ThinkingMode, list: ExperimentRow[]): ThinkingArmSummary | null {
  if (list.length === 0) return null;
  const correctCount = list.filter((r) => r.correct).length;
  const totalEnergyWh = list.reduce((s, r) => s + r.energyWh, 0);
  return {
    mode,
    label: mode === 'on' ? 'Thinking (think=True)' : 'Direct (think=False)',
    count: list.length,
    correctCount,
    accuracyPct: (correctCount / list.length) * 100,
    avgInputTokens: list.reduce((s, r) => s + r.inputTokens, 0) / list.length,
    avgOutputTokens: list.reduce((s, r) => s + r.outputTokens, 0) / list.length,
    avgEnergyWh: totalEnergyWh / list.length,
    totalEnergyWh,
    whPerCorrect: correctCount > 0 ? totalEnergyWh / correctCount : null,
    avgLatencySec: list.reduce((s, r) => s + r.latencySec, 0) / list.length,
  };
}

export function aggregateExperimentData(
  rows: ExperimentRow[],
  datasetFilter: string = 'ALL',
  defaultModelName: string = 'qwen3:1.7b'
): AggregatedPosterData {
  const idleRows = rows.filter((r) => r.phase === 'idle_baseline');
  const inferenceRows = rows.filter((r) => r.phase !== 'idle_baseline');

  const modelsTested = [...new Set(inferenceRows.map((r) => r.model).filter(Boolean))];
  const primaryModel = modelsTested[0] ?? defaultModelName;

  // ------------------------------------------------------------------
  // RQ1: Input Length vs. Output Length Energy Scaling
  // ------------------------------------------------------------------
  const sweepRows = inferenceRows.filter((r) => r.phase === 'rq1_sweep');

  const minOutInSweep = sweepRows.length
    ? Math.min(...sweepRows.map((r) => r.maxTokensLimit))
    : 32;
  const minInInSweep = sweepRows.length
    ? Math.min(...sweepRows.map((r) => r.inputTokens))
    : 64;

  const inputSweepMap = new Map<number, { energySum: number; latSum: number; count: number }>();
  const outputSweepMap = new Map<number, { energySum: number; latSum: number; count: number }>();

  const nearestBin = (val: number, bins: number[]) => {
    for (const b of bins) {
      if (val <= b * 1.2) return b;
    }
    return bins[bins.length - 1];
  };

  const stdInBins = [64, 128, 256, 512, 1024, 2048];
  const stdOutBins = [32, 64, 128, 256, 512];

  for (const r of sweepRows) {
    if (r.maxTokensLimit === minOutInSweep || r.outputTokens <= minOutInSweep + 16) {
      const bucket = nearestBin(r.inputTokens, stdInBins);
      const cur = inputSweepMap.get(bucket) ?? { energySum: 0, latSum: 0, count: 0 };
      cur.energySum += r.energyWh;
      cur.latSum += r.latencySec;
      cur.count += 1;
      inputSweepMap.set(bucket, cur);
    }
    if (r.inputTokens <= minInInSweep + 40) {
      const bucket = nearestBin(r.outputTokens, stdOutBins);
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

  const rq1InputTrend = computeLinearTrend(
    rq1InputCurve.map((p) => ({ x: p.tokens, y: p.energyWh }))
  );
  const rq1OutputTrend = computeLinearTrend(
    rq1OutputCurve.map((p) => ({ x: p.tokens, y: p.energyWh }))
  );

  const outputToInputSlopeRatio =
    rq1InputTrend.slope > 1e-9 ? rq1OutputTrend.slope / rq1InputTrend.slope : 0;

  // 2D Input x Output Heatmap
  const inputBinSet = new Set<number>();
  const outputBinSet = new Set<number>();
  const heatmapBucket = new Map<
    string,
    { energySum: number; correctSum: number; count: number; inBin: number; outBin: number }
  >();

  for (const r of sweepRows) {
    const inBin = nearestBin(r.inputTokens, stdInBins);
    const outBin = nearestBin(r.outputTokens, stdOutBins);
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

  // ------------------------------------------------------------------
  // RQ2a: Output Limits & Sweet Spot
  // ------------------------------------------------------------------
  const rq2OutRows = inferenceRows.filter(
    (r) =>
      r.phase === 'rq2_output_limits' &&
      (datasetFilter === 'ALL' || r.dataset === datasetFilter)
  );

  const buildOutputCurve = (subset: ExperimentRow[], lType: LimitType) => {
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
        const whPerCorrect = totalCorrect > 0 ? totalE / totalCorrect : null;
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
    return findAccuracySweetSpot(rawPts);
  };

  const rq2OutputCapCurve = buildOutputCurve(rq2OutRows, 'num_predict');
  const rq2WordLimitCurve = buildOutputCurve(rq2OutRows, 'word_limit');
  const sweetSpot = rq2OutputCapCurve.find((p) => p.isSweetSpot) ?? null;

  // ------------------------------------------------------------------
  // RQ2b: Input Length vs. Output Quality (Short vs. Medium vs. Long)
  // ------------------------------------------------------------------
  const rq2InRows = inferenceRows.filter(
    (r) =>
      r.phase === 'rq2_input_quality' &&
      (datasetFilter === 'ALL' || r.dataset === datasetFilter)
  );

  const levelMeta: Array<{ level: 'short' | 'medium' | 'long'; label: string }> = [
    { level: 'short', label: 'Short (~60 tok)' },
    { level: 'medium', label: 'Medium (~300 tok)' },
    { level: 'long', label: 'Long (~1000 tok)' },
  ];

  const rq2InputQuality: InputQualitySummary[] = levelMeta
    .map(({ level, label }) => {
      const list = rq2InRows.filter((r) => r.contextLevel === level);
      if (list.length === 0) return null;
      const correctCount = list.filter((r) => r.correct).length;
      const totalE = list.reduce((s, r) => s + r.energyWh, 0);
      return {
        level,
        label,
        count: list.length,
        avgInputTokens: list.reduce((s, r) => s + r.inputTokens, 0) / list.length,
        avgOutputTokens: list.reduce((s, r) => s + r.outputTokens, 0) / list.length,
        accuracyPct: (correctCount / list.length) * 100,
        correctCount,
        avgEnergyWh: totalE / list.length,
        whPerCorrect: correctCount > 0 ? totalE / correctCount : null,
        avgLatencySec: list.reduce((s, r) => s + r.latencySec, 0) / list.length,
      };
    })
    .filter((x): x is InputQualitySummary => x !== null);

  const shortRow = rq2InputQuality.find((x) => x.level === 'short');
  const longRow = rq2InputQuality.find((x) => x.level === 'long');
  const inputQualityDropPct =
    shortRow && longRow ? shortRow.accuracyPct - longRow.accuracyPct : 0;

  // ------------------------------------------------------------------
  // RQ3: Reasoning ("Thinking") Mode vs. Direct Answer
  // ------------------------------------------------------------------
  const rq3Rows = inferenceRows.filter(
    (r) =>
      r.phase === 'rq3_thinking' &&
      (datasetFilter === 'ALL' || r.dataset === datasetFilter)
  );

  const directRows = rq3Rows.filter((r) => r.thinkingMode === 'off');
  const thinkingRows = rq3Rows.filter((r) => r.thinkingMode === 'on');

  const direct = summarizeThinkingArm('off', directRows);
  const thinking = summarizeThinkingArm('on', thinkingRows);
  const hasBothModes = Boolean(direct && thinking);

  const extraEnergyWh =
    direct && thinking ? thinking.avgEnergyWh - direct.avgEnergyWh : 0;
  const extraEnergyMwh = extraEnergyWh * 1000;
  const energyMultiplier =
    direct && thinking && direct.avgEnergyWh > 0
      ? thinking.avgEnergyWh / direct.avgEnergyWh
      : 0;
  const extraOutputTokens =
    direct && thinking ? thinking.avgOutputTokens - direct.avgOutputTokens : 0;
  const accuracyGainPct =
    direct && thinking ? thinking.accuracyPct - direct.accuracyPct : 0;
  const extraCorrectCount =
    direct && thinking ? thinking.correctCount - direct.correctCount : 0;
  const accuracyGainPerExtraWh =
    hasBothModes && extraEnergyWh > 1e-9
      ? accuracyGainPct / extraEnergyWh
      : null;
  const mwhPerExtraCorrect =
    direct &&
    thinking &&
    extraCorrectCount > 0 &&
    thinking.totalEnergyWh > direct.totalEnergyWh
      ? ((thinking.totalEnergyWh - direct.totalEnergyWh) * 1000) / extraCorrectCount
      : null;

  // Task breakdown (e.g., GSM8K Math vs. TriviaQA Facts)
  const rq3Datasets = [...new Set(rq3Rows.map((r) => r.dataset))];
  const byDataset: ThinkingDatasetBreakdown[] = rq3Datasets
    .map((ds) => {
      const dArm = summarizeThinkingArm(
        'off',
        directRows.filter((r) => r.dataset === ds)
      );
      const tArm = summarizeThinkingArm(
        'on',
        thinkingRows.filter((r) => r.dataset === ds)
      );
      if (!dArm || !tArm) return null;
      const dExtraWh = tArm.avgEnergyWh - dArm.avgEnergyWh;
      const dGain = tArm.accuracyPct - dArm.accuracyPct;
      return {
        dataset: ds,
        directAccPct: dArm.accuracyPct,
        thinkingAccPct: tArm.accuracyPct,
        accGainPct: dGain,
        directAvgMwh: dArm.avgEnergyWh * 1000,
        thinkingAvgMwh: tArm.avgEnergyWh * 1000,
        extraMwh: dExtraWh * 1000,
        energyMultiplier:
          dArm.avgEnergyWh > 0 ? tArm.avgEnergyWh / dArm.avgEnergyWh : 0,
        accGainPerExtraWh: dExtraWh > 1e-9 ? dGain / dExtraWh : null,
      };
    })
    .filter((x): x is ThinkingDatasetBreakdown => x !== null);

  const rq3Thinking: ThinkingComparisonSummary = {
    hasBothModes,
    direct,
    thinking,
    extraEnergyWh,
    extraEnergyMwh,
    energyMultiplier,
    extraOutputTokens,
    accuracyGainPct,
    extraCorrectCount,
    accuracyGainPerExtraWh,
    mwhPerExtraCorrect,
    byDataset,
  };

  // ------------------------------------------------------------------
  // Hardware Breakdown (Idle Baseline + CPU/GPU vs. Constant RAM)
  // ------------------------------------------------------------------
  const componentRows = inferenceRows.filter(
    (r) => typeof r.cpuEnergyWh === 'number' && typeof r.ramEnergyWh === 'number'
  );
  const hasComponents = componentRows.length > 0;

  let measuredComputeSharePct = 0;
  let estimatedRamSharePct = 0;
  if (hasComponents) {
    const totalCompWh = componentRows.reduce((s, r) => s + r.energyWh, 0);
    const computeWh = componentRows.reduce(
      (s, r) => s + (r.cpuEnergyWh ?? 0) + (r.gpuEnergyWh ?? 0),
      0
    );
    const ramWh = componentRows.reduce((s, r) => s + (r.ramEnergyWh ?? 0), 0);
    if (totalCompWh > 0) {
      measuredComputeSharePct = (computeWh / totalCompWh) * 100;
      estimatedRamSharePct = (ramWh / totalCompWh) * 100;
    }
  }

  const infSec = inferenceRows.reduce((s, r) => s + r.latencySec, 0);
  const infWh = inferenceRows.reduce((s, r) => s + r.energyWh, 0);
  const inferencePowerW = infSec > 0 ? (infWh * 3600) / infSec : 0;

  let idlePowerW: number | null = null;
  let idleRamPowerW: number | null = null;
  if (idleRows.length > 0) {
    const idleSec = idleRows.reduce((s, r) => s + r.latencySec, 0);
    const idleWh = idleRows.reduce((s, r) => s + r.energyWh, 0);
    if (idleSec > 0) {
      idlePowerW = (idleWh * 3600) / idleSec;
      const idleRamWh = idleRows.reduce((s, r) => s + (r.ramEnergyWh ?? 0), 0);
      if (idleRows.some((r) => typeof r.ramEnergyWh === 'number')) {
        idleRamPowerW = (idleRamWh * 3600) / idleSec;
      }
    }
  }

  const hardwareBreakdown: HardwareEnergyBreakdown = {
    hasComponents,
    measuredComputeSharePct,
    estimatedRamSharePct,
    idlePowerW,
    idleRamPowerW,
    inferencePowerW,
  };

  // ------------------------------------------------------------------
  // Proof-of-Work Sample Traces (mix of RQ3 thinking + RQ2 verifiable Q&As)
  // ------------------------------------------------------------------
  const rq3ProofRows = inferenceRows.filter(
    (r) =>
      r.phase === 'rq3_thinking' &&
      (datasetFilter === 'ALL' || r.dataset === datasetFilter)
  );
  const rq2ProofRows = inferenceRows.filter(
    (r) =>
      (r.phase === 'rq2_output_limits' || r.phase === 'rq2_input_quality') &&
      (datasetFilter === 'ALL' || r.dataset === datasetFilter)
  );

  // Put a balanced mix at the front so Poster Section 08 shows both Thinking vs. Direct and RQ2 rows
  const orderedProofRows = [
    ...rq3ProofRows.filter((r) => r.thinkingMode === 'off').slice(0, 1),
    ...rq3ProofRows.filter((r) => r.thinkingMode === 'on').slice(0, 1),
    ...rq2ProofRows.slice(0, 2),
    ...rq3ProofRows.slice(2),
    ...rq2ProofRows.slice(2),
  ];

  const seenRunIds = new Set<string>();
  const uniqueProofRows: ExperimentRow[] = [];
  for (const r of orderedProofRows) {
    if (!seenRunIds.has(r.runId)) {
      seenRunIds.add(r.runId);
      uniqueProofRows.push(r);
    }
  }

  const proofTraces: ProofTraceSample[] = uniqueProofRows.slice(0, 24).map((r) => {
    let conditionLabel = `${r.maxTokensLimit} tok cap`;
    if (r.phase === 'rq2_input_quality') {
      conditionLabel = `${r.contextLevel} input`;
    } else if (r.phase === 'rq3_thinking') {
      conditionLabel = r.thinkingMode === 'on' ? 'think=True' : 'think=False';
    } else if (r.limitType === 'word_limit') {
      conditionLabel = `max ${r.maxTokensLimit} words`;
    }
    return {
      runId: r.runId,
      timestamp: r.timestamp ?? '—',
      model: r.model,
      phase: r.phase,
      dataset: r.dataset,
      promptId: r.promptId,
      conditionLabel,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      energyMwh: r.energyWh * 1000,
      expectedAnswer: r.expectedAnswer ?? '—',
      responsePreview: r.responsePreview ?? '(run locally to capture raw model answer)',
      correct: r.correct,
    };
  });

  const timestamps = rows
    .map((r) => r.timestamp)
    .filter((t): t is string => Boolean(t))
    .sort();

  return {
    totalRuns: inferenceRows.length,
    modelsTested,
    primaryModel,
    hardwareBreakdown,
    rq1InputCurve,
    rq1OutputCurve,
    rq1InputTrend,
    rq1OutputTrend,
    outputToInputSlopeRatio,
    heatmapInputBins,
    heatmapOutputBins,
    heatmapCells,
    rq2OutputCapCurve,
    rq2WordLimitCurve,
    sweetSpot,
    rq2InputQuality,
    inputQualityDropPct,
    rq3Thinking,
    proofTraces,
    firstTimestamp: timestamps[0] ?? null,
    lastTimestamp: timestamps[timestamps.length - 1] ?? null,
  };
}

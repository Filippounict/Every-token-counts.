export type DatasetName = 'GSM8K' | 'MATH-500' | 'TriviaQA' | 'SyntheticSweep';

export type ThinkingMode = 'off' | 'on';

export type LimitType = 'num_predict' | 'word_limit' | 'unlimited';

export type ExperimentPhase = 'rq1_sweep' | 'rq2_limits' | 'rq3_thinking';

export interface ExperimentRow {
  runId: string;
  phase: ExperimentPhase;
  dataset: DatasetName;
  difficulty: number; // 1-5 for MATH-500, 1 for TriviaQA, 2 for GSM8K, 0 for Synthetic
  promptId: string;
  thinkingMode: ThinkingMode;
  limitType: LimitType;
  maxTokensLimit: number; // e.g., 32, 64, 128, 256, 512, 1024
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  answerTokens: number;
  latencySec: number;
  energyWh: number;
  correct: boolean;
}

export interface LinearRegressionResult {
  slope: number; // Wh per token
  intercept: number; // Wh
  rSquared: number;
}

export interface ScalingPoint {
  tokens: number;
  energyWh: number;
  latencySec: number;
  count: number;
}

export interface HeatmapCell {
  inputBin: number;
  outputBin: number;
  energyWh: number;
  accuracyPct: number;
  count: number;
}

export interface ParetoPoint {
  limit: number;
  label: string;
  limitType: LimitType;
  energyWh: number;
  accuracyPct: number;
  tokensGenerated: number;
  whPerCorrect: number;
  isKnee: boolean;
  marginalGainAccPerWh: number | null;
}

export interface McNemarResult {
  n11: number; // Both OFF and ON correct
  n10: number; // OFF correct, ON wrong
  n01: number; // OFF wrong, ON correct
  n00: number; // Both wrong
  totalPairs: number;
  discordantTotal: number;
  method: 'exact_binomial' | 'chi2_edwards';
  chiSquare: number | null;
  pValue: number;
  significantAt05: boolean;
  oddsRatio: number | null;
  cohensG: number;
  accOffPct: number;
  accOnPct: number;
  deltaAccPct: number;
}

export interface ThinkingTaskSummary {
  label: string;
  count: number;
  accOffPct: number;
  accOnPct: number;
  energyOffWh: number;
  energyOnWh: number;
  whPerCorrectOff: number | null;
  whPerCorrectOn: number | null;
  extraAccPerExtraWh: number | null;
  avgTokensOff: number;
  avgTokensOn: number;
}

export interface AggregatedPosterData {
  totalRuns: number;
  modelName: string;
  rq1InputCurve: ScalingPoint[];
  rq1OutputCurve: ScalingPoint[];
  rq1InputRegression: LinearRegressionResult;
  rq1OutputRegression: LinearRegressionResult;
  outputToInputSlopeRatio: number;
  heatmapInputBins: number[];
  heatmapOutputBins: number[];
  heatmapCells: HeatmapCell[];
  rq2ParetoCurve: ParetoPoint[];
  rq2WordLimitCurve: ParetoPoint[];
  kneePoint: ParetoPoint | null;
  rq3ByDataset: ThinkingTaskSummary[];
  rq3ByDifficulty: ThinkingTaskSummary[];
  mcNemarOverall: McNemarResult;
  mcNemarByDataset: Record<string, McNemarResult>;
}

export interface PosterMetadata {
  title: string;
  subtitle: string;
  authors: string;
  affiliation: string;
  courseContext: string;
  hardwareLabel: string;
  modelLabel: string;
}

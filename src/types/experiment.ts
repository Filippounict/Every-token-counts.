export type DatasetName = 'GSM8K' | 'TriviaQA' | 'MATH-500' | 'SyntheticSweep' | 'IdleBaseline';

export type LimitType = 'num_predict' | 'word_limit' | 'unlimited';

export type ContextLevel = 'short' | 'medium' | 'long' | 'none';

export type ExperimentPhase =
  | 'idle_baseline'
  | 'rq1_sweep'
  | 'rq2_output_limits'
  | 'rq2_input_quality'
  | 'rq3_model_compare';

export interface ExperimentRow {
  runId: string;
  timestamp?: string;
  model: string;
  phase: ExperimentPhase;
  dataset: DatasetName;
  promptId: string;
  contextLevel: ContextLevel;
  limitType: LimitType;
  maxTokensLimit: number; // e.g., 32, 64, 128, 256, or word count for word_limit
  inputTokens: number;
  outputTokens: number;
  latencySec: number;
  energyWh: number;
  correct: boolean;
  cpuEnergyWh?: number;
  gpuEnergyWh?: number;
  ramEnergyWh?: number;
  emissionsGco2eq?: number;
  expectedAnswer?: string;
  responsePreview?: string;
}

export interface ProofOfWorkManifest {
  created_at_utc?: string;
  duration_sec?: number;
  mode?: string;
  dry_run?: boolean;
  primary_model?: string;
  compare_model?: string;
  country_iso?: string;
  total_inferences?: number;
  hardware?: {
    os?: string;
    machine?: string;
    processor?: string;
    python_version?: string;
  };
  files?: {
    results_csv?: string;
    results_csv_sha256?: string;
    raw_codecarbon_csv?: string;
    raw_codecarbon_csv_sha256?: string | null;
  };
}

export interface HardwareEnergyBreakdown {
  hasComponents: boolean;
  measuredComputeSharePct: number; // (CPU + GPU) / Total during inference
  estimatedRamSharePct: number; // Constant RAM model / Total during inference
  idlePowerW: number | null;
  idleRamPowerW: number | null;
  inferencePowerW: number;
}

export interface LinearTrendResult {
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

export interface OutputCapPoint {
  limit: number;
  label: string;
  limitType: LimitType;
  energyWh: number;
  accuracyPct: number;
  tokensGenerated: number;
  whPerCorrect: number | null;
  isSweetSpot: boolean;
}

export interface InputQualitySummary {
  level: 'short' | 'medium' | 'long';
  label: string;
  count: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  accuracyPct: number;
  correctCount: number;
  avgEnergyWh: number;
  whPerCorrect: number | null;
  avgLatencySec: number;
}

export interface ModelComparisonSummary {
  model: string;
  count: number;
  correctCount: number;
  accuracyPct: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgEnergyWh: number;
  whPerCorrect: number | null;
  avgLatencySec: number;
}

export interface ProofTraceSample {
  runId: string;
  timestamp: string;
  model: string;
  phase: ExperimentPhase;
  dataset: DatasetName;
  promptId: string;
  conditionLabel: string;
  inputTokens: number;
  outputTokens: number;
  energyMwh: number;
  expectedAnswer: string;
  responsePreview: string;
  correct: boolean;
}

export interface AggregatedPosterData {
  totalRuns: number;
  modelsTested: string[];
  primaryModel: string;
  hardwareBreakdown: HardwareEnergyBreakdown;
  rq1InputCurve: ScalingPoint[];
  rq1OutputCurve: ScalingPoint[];
  rq1InputTrend: LinearTrendResult;
  rq1OutputTrend: LinearTrendResult;
  outputToInputSlopeRatio: number;
  heatmapInputBins: number[];
  heatmapOutputBins: number[];
  heatmapCells: HeatmapCell[];
  rq2OutputCapCurve: OutputCapPoint[];
  rq2WordLimitCurve: OutputCapPoint[];
  sweetSpot: OutputCapPoint | null;
  rq2InputQuality: InputQualitySummary[];
  inputQualityDropPct: number; // short accuracy - long accuracy
  rq3ModelComparison: ModelComparisonSummary[];
  proofTraces: ProofTraceSample[];
  firstTimestamp: string | null;
  lastTimestamp: string | null;
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

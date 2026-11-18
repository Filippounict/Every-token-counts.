import React from 'react';
import { Download } from 'lucide-react';
import type { AggregatedPosterData, PosterMetadata, ProofOfWorkManifest } from '../types/experiment';
import { downloadSvgById } from '../utils/svgExport';
import { PipelineDiagramSvg } from './charts/PipelineDiagramSvg';
import { TokenScalingChart } from './charts/TokenScalingChart';
import { EnergyHeatmapChart } from './charts/EnergyHeatmapChart';
import { ParetoKneeChart } from './charts/ParetoKneeChart';
import { InputQualityChart } from './charts/InputQualityChart';

interface PosterViewProps {
  data: AggregatedPosterData;
  metadata: PosterMetadata;
  isCustomData: boolean;
  datasetFilter: string;
  proofManifest: ProofOfWorkManifest | null;
}

export const PosterView: React.FC<PosterViewProps> = ({
  data,
  metadata,
  isCustomData,
  datasetFilter,
  proofManifest,
}) => {
  const models = data.rq3ModelComparison;
  const smallModel = models[0] ?? null;
  const largerModel = models[models.length - 1] ?? null;
  const hasTwoModels = models.length >= 2 && smallModel && largerModel;

  const modelEnergyRatio =
    hasTwoModels && smallModel.avgEnergyWh > 0
      ? largerModel.avgEnergyWh / smallModel.avgEnergyWh
      : 0;
  const modelAccDiff = hasTwoModels
    ? largerModel.accuracyPct - smallModel.accuracyPct
    : 0;

  // Compact Proof-of-Work sample (show up to 4 varied verified Q&A rows right on the poster)
  const posterProofRows = data.proofTraces.slice(0, 4);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      <article
        className="poster-print-sheet bg-white border border-slate-300 shadow-sm rounded-lg overflow-hidden"
        aria-label="Scientific Conference Poster"
      >
        {/* POSTER HEADER BANNER */}
        <header className="bg-slate-900 text-white px-6 py-5 border-b-4 border-teal-600">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <p className="text-xs font-mono tracking-wider uppercase text-teal-300">
                {metadata.courseContext} · {isCustomData ? 'Real Local Measurement' : 'Example Preliminary Preview'}
                {datasetFilter !== 'ALL' ? ` · Task: ${datasetFilter}` : ''}
              </p>
              <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-balance">
                {metadata.title}
              </h1>
              <p className="mt-1.5 text-sm text-slate-300 max-w-3xl">
                {metadata.subtitle}
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-300 space-y-1 shrink-0">
              <p className="font-semibold text-white text-sm">{metadata.authors}</p>
              <p>{metadata.affiliation}</p>
              <p className="font-mono text-teal-300">
                {data.modelsTested.length > 0 ? data.modelsTested.join(' vs. ') : metadata.modelLabel}
              </p>
              <p className="font-mono text-slate-400">
                {proofManifest?.hardware?.os
                  ? `${proofManifest.hardware.os} (${proofManifest.hardware.machine ?? ''}) · CodeCarbon`
                  : metadata.hardwareLabel}
              </p>
            </div>
          </div>

          {/* 4-Column Plain-English Key Findings Strip */}
          <div className="mt-4 pt-4 border-t border-slate-700/80 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 border border-slate-700 rounded px-3 py-2">
              <div className="text-[11px] text-slate-300">Output vs. Input Cost (RQ1)</div>
              <div className="mt-0.5 font-mono tabular-nums text-lg font-bold text-white">
                {data.outputToInputSlopeRatio > 0 ? `${data.outputToInputSlopeRatio.toFixed(1)}×` : '—'}
                <span className="ml-1.5 text-xs font-normal text-slate-300">more per output token</span>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded px-3 py-2">
              <div className="text-[11px] text-slate-300">Output Sweet Spot (RQ2a)</div>
              <div className="mt-0.5 font-mono tabular-nums text-lg font-bold text-teal-300">
                {data.sweetSpot ? `${data.sweetSpot.limit} tokens` : '—'}
                <span className="ml-1.5 text-xs font-normal text-slate-300">
                  {data.sweetSpot ? `(${data.sweetSpot.accuracyPct.toFixed(0)}% acc)` : ''}
                </span>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded px-3 py-2">
              <div className="text-[11px] text-slate-300">Long Input Effect (RQ2b)</div>
              <div className="mt-0.5 font-mono tabular-nums text-lg font-bold text-amber-300">
                {data.rq2InputQuality.length >= 2
                  ? `${data.inputQualityDropPct > 0 ? '-' : '+'}${Math.abs(data.inputQualityDropPct).toFixed(0)}%`
                  : '—'}
                <span className="ml-1.5 text-xs font-normal text-slate-300">acc (Short → Long)</span>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded px-3 py-2">
              <div className="text-[11px] text-slate-300">Model Effect (RQ3)</div>
              <div className="mt-0.5 font-mono tabular-nums text-lg font-bold text-white">
                {hasTwoModels
                  ? `${modelAccDiff >= 0 ? '+' : ''}${modelAccDiff.toFixed(0)}% acc`
                  : '—'}
                <span className="ml-1.5 text-xs font-normal text-teal-300">
                  {modelEnergyRatio > 0 ? `(${modelEnergyRatio.toFixed(1)}× energy)` : ''}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* DATA PROVENANCE NOTICE */}
        {!isCustomData && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Example Preview Active:</strong> Run{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">python run_experiment.py --preliminary</code>{' '}
              on your laptop (~3–5 min) to generate your own real results + Proof-of-Work, then click{' '}
              <strong>Import Local CSV</strong> above.
            </span>
          </div>
        )}

        {/* 3-COLUMN ACADEMIC POSTER BODY */}
        <div className="poster-grid-3col grid grid-cols-1 lg:grid-cols-3 gap-5 p-5 bg-slate-50/70">
          {/* ==================== COLUMN 1 ==================== */}
          <div className="space-y-4">
            {/* Section 1: Motivation & Research Questions */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 pb-2 border-b border-slate-200">
                01. Motivation &amp; Research Questions
              </h2>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-700">
                Every token sent to or written by a language model uses electricity [1, 2]. Longer prompts and longer answers do not only raise energy use — extra prompt text can also distract the model and lower answer quality [3, 4], while choosing a different local model changes both speed and accuracy [5, 6].
              </p>
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded p-2.5">
                <p className="text-[11px] font-semibold text-teal-800 uppercase tracking-wide">
                  Main Research Question
                </p>
                <p className="mt-1 text-xs font-medium text-slate-900 leading-snug">
                  How do input length, output length, and model choice affect energy and answer quality, and where do extra tokens stop helping?
                </p>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="font-bold text-slate-900">RQ1 (Input vs. Output Energy):</dt>
                  <dd className="text-slate-700">Does energy grow faster with input length or output length, and which matters more?</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-900">RQ2 (Length vs. Answer Quality):</dt>
                  <dd className="text-slate-700">How do output caps (<code className="font-mono text-[11px]">num_predict</code>, word limits) and longer inputs affect accuracy, and where is the sweet spot?</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-900">RQ3 (Model Choice):</dt>
                  <dd className="text-slate-700">Does switching between two small local models change energy, answer length, and accuracy on the same questions?</dd>
                </div>
              </dl>
            </section>

            {/* Section 2: Literature Foundation (6 Verified Papers) */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 pb-2 border-b border-slate-200">
                02. What Prior Studies Found
              </h2>
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-1.5 pr-2 font-semibold">Study</th>
                      <th className="py-1.5 pr-2 font-semibold">Focus</th>
                      <th className="py-1.5 font-semibold">Main Finding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">UNESCO &amp; UCL [1]</td>
                      <td className="py-1.5 pr-2">Energy</td>
                      <td className="py-1.5">Halving input saves 5% energy; halving output saves 54%.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">Fernandez et al. [2]</td>
                      <td className="py-1.5 pr-2">Energy</td>
                      <td className="py-1.5">Reading input runs in parallel; writing output runs token-by-token.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">Levy et al. [3]</td>
                      <td className="py-1.5 pr-2">Input quality</td>
                      <td className="py-1.5">Adding extra text to the same task lowers reasoning accuracy.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">Liu et al. [4]</td>
                      <td className="py-1.5 pr-2">Input quality</td>
                      <td className="py-1.5">Facts placed in the middle of long inputs are often missed.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">Samsi et al. [5]</td>
                      <td className="py-1.5 pr-2">Model size</td>
                      <td className="py-1.5">Larger models use more energy per token; tasks change output length.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">Zadenoori et al. [6]</td>
                      <td className="py-1.5 pr-2">Model size</td>
                      <td className="py-1.5">Small local models stay within ~2% of huge cloud models on focused tasks.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3: Experimental Setup & Pipeline */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  03. How We Run &amp; Measure It
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig-pipeline-svg', 'fig0_experiment_steps.svg')}
                  className="no-print inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Pipeline Diagram SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-3">
                <PipelineDiagramSvg id="fig-pipeline-svg" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] border-t border-slate-100 pt-2.5">
                <div><span className="text-slate-500">Models:</span> <strong className="font-mono text-slate-900">{data.modelsTested.join(', ') || 'qwen2.5:3b, 0.5b'}</strong></div>
                <div><span className="text-slate-500">Runtime:</span> <strong className="text-slate-900">Ollama Python client</strong></div>
                <div><span className="text-slate-500">Settings:</span> <strong className="font-mono text-slate-900">temp=0, seed=42</strong></div>
                <div><span className="text-slate-500">Meter:</span> <strong className="text-slate-900">CodeCarbon (machine mode)</strong></div>
                <div><span className="text-slate-500">Tasks:</span> <strong className="text-slate-900">GSM8K math, TriviaQA facts</strong></div>
                <div><span className="text-slate-500">Controls:</span> <strong className="text-slate-900">5s idle, warmup, AC power</strong></div>
                {data.hardwareBreakdown.hasComponents && (
                  <div className="col-span-2 pt-1 border-t border-slate-100 text-[10.5px] text-slate-600 font-mono tabular-nums">
                    Split: <strong className="text-slate-900">{data.hardwareBreakdown.measuredComputeSharePct.toFixed(0)}% CPU/GPU</strong> vs. <strong className="text-slate-700">{data.hardwareBreakdown.estimatedRamSharePct.toFixed(0)}% est. RAM</strong>
                    {data.hardwareBreakdown.idlePowerW !== null && (
                      <span> · Idle: {data.hardwareBreakdown.idlePowerW.toFixed(1)} W vs. Active: {data.hardwareBreakdown.inferencePowerW.toFixed(1)} W</span>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ==================== COLUMN 2 ==================== */}
          <div className="space-y-4">
            {/* Section 4: RQ1 Scaling Chart */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  04. RQ1: Input vs. Output Energy
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig1-token-scaling-svg', 'fig1_input_vs_output_energy.svg')}
                  className="no-print inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Figure 1 SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-2.5">
                <TokenScalingChart
                  id="fig1-token-scaling-svg"
                  inputCurve={data.rq1InputCurve}
                  outputCurve={data.rq1OutputCurve}
                  inputTrend={data.rq1InputTrend}
                  outputTrend={data.rq1OutputTrend}
                  slopeRatio={data.outputToInputSlopeRatio}
                />
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                <strong>Fig. 1 Finding:</strong> Writing output tokens costs{' '}
                <span className="font-mono font-semibold text-red-700">
                  {data.outputToInputSlopeRatio > 0 ? `${data.outputToInputSlopeRatio.toFixed(1)}×` : 'much'}
                </span>{' '}
                more energy per token than reading input tokens. The model reads the whole prompt in parallel, but writes each output token one by one [1, 2].
              </p>
            </section>

            {/* Section 5: 2D Input x Output Heatmap */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  05. RQ1: Input × Output Energy Grid
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig2-heatmap-svg', 'fig2_energy_grid.svg')}
                  className="no-print inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Figure 2 SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-2.5">
                <EnergyHeatmapChart
                  id="fig2-heatmap-svg"
                  inputBins={data.heatmapInputBins}
                  outputBins={data.heatmapOutputBins}
                  cells={data.heatmapCells}
                />
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                <strong>Fig. 2 Finding:</strong> Moving upward (longer answers) raises energy much faster than moving right (longer prompts), showing that output length is the main driver of energy.
              </p>
            </section>

            {/* Section 6: RQ2a Output Limits & Sweet Spot */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  06. RQ2a: Output Limits &amp; Sweet Spot
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig3-output-caps-svg', 'fig3_output_sweet_spot.svg')}
                  className="no-print inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Figure 3 SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-2.5">
                <ParetoKneeChart
                  id="fig3-output-caps-svg"
                  tokenLimitCurve={data.rq2OutputCapCurve}
                  wordLimitCurve={data.rq2WordLimitCurve}
                  sweetSpot={data.sweetSpot}
                />
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                <strong>Fig. 3 Finding:</strong> Very small caps (<code className="font-mono text-[11px]">32–64</code> tokens) cut off math steps and hurt accuracy. Accuracy reaches its <strong>sweet spot</strong> at{' '}
                <span className="font-mono font-semibold text-red-700">
                  {data.sweetSpot ? `${data.sweetSpot.limit} tokens` : '—'}
                </span>{' '}
                (smallest cap within 2% of top accuracy); larger limits spend extra energy with no quality gain.
              </p>
            </section>
          </div>

          {/* ==================== COLUMN 3 ==================== */}
          <div className="space-y-4">
            {/* Section 7: RQ2b Input Length vs. Output Quality */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  07. RQ2b: Does Longer Input Hurt Quality?
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig4-input-quality-svg', 'fig4_input_length_quality.svg')}
                  className="no-print inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Figure 4 SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-2.5">
                <InputQualityChart id="fig4-input-quality-svg" rows={data.rq2InputQuality} />
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                <strong>Fig. 4 Finding:</strong> Asking the <em>exact same questions</em> inside longer background text raises energy AND causes accuracy to drop — matching <strong>Levy et al. [3]</strong> and <strong>Liu et al. [4]</strong>. Keeping prompts short helps both energy and quality.
              </p>
            </section>

            {/* Section 8: RQ3 Model Comparison + Proof-of-Work Evidence */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 pb-2 border-b border-slate-200">
                08. RQ3: Model Choice &amp; Proof-of-Work Log
              </h2>
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full text-[11px] font-mono tabular-nums border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 font-sans">
                      <th className="py-1.5 pr-2 font-semibold">Local Model</th>
                      <th className="py-1.5 pr-2 font-semibold text-right">Acc</th>
                      <th className="py-1.5 pr-2 font-semibold text-right">Avg Out</th>
                      <th className="py-1.5 pr-2 font-semibold text-right">Avg mWh</th>
                      <th className="py-1.5 font-semibold text-right">mWh/Corr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {models.map((m) => (
                      <tr key={m.model}>
                        <td className="py-1.5 pr-2 font-semibold text-slate-900">{m.model}</td>
                        <td className="py-1.5 pr-2 text-right text-teal-700 font-semibold">
                          {m.accuracyPct.toFixed(0)}% ({m.correctCount}/{m.count})
                        </td>
                        <td className="py-1.5 pr-2 text-right text-slate-600">{Math.round(m.avgOutputTokens)} tok</td>
                        <td className="py-1.5 pr-2 text-right">{(m.avgEnergyWh * 1000).toFixed(1)}</td>
                        <td className="py-1.5 text-right font-semibold text-slate-900">
                          {m.whPerCorrect !== null ? (m.whPerCorrect * 1000).toFixed(1) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-600 leading-snug">
                Model choice changes both answer length and accuracy: smaller models are much cheaper per query, while larger local models get more math answers right [5, 6].
              </p>

              {/* Proof-of-Work Verification Snippet */}
              <div className="mt-3 pt-2.5 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>Proof-of-Work · Sample Logged Outputs</span>
                  {proofManifest?.files?.results_csv_sha256 && (
                    <span className="font-mono text-[10px] text-teal-700">
                      SHA256: {proofManifest.files.results_csv_sha256.slice(0, 10)}…
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {posterProofRows.map((tr) => (
                    <div
                      key={tr.runId}
                      className="text-[10.5px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 leading-snug"
                    >
                      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-slate-600">
                        <span>
                          <strong className="text-slate-900">{tr.promptId}</strong> · {tr.model} · {tr.conditionLabel}
                        </span>
                        <span className={tr.correct ? 'text-teal-700 font-bold' : 'text-red-700 font-bold'}>
                          {tr.correct ? 'PASS' : 'FAIL'} · {tr.energyMwh.toFixed(1)} mWh
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-700 truncate" title={tr.responsePreview}>
                        Out: "{tr.responsePreview}" <span className="text-slate-500">(Expected: {tr.expectedAnswer})</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 9: Takeaways, Limits & References */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 pb-2 border-b border-slate-200">
                09. Takeaways, Limits &amp; References
              </h2>
              <ul className="mt-2 text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Cap Output Near the Sweet Spot:</strong> Output tokens drive energy most; setting a sensible limit saves energy with zero accuracy loss.</li>
                <li><strong>Keep Inputs Short &amp; Clean:</strong> Extra prompt text adds energy AND can hurt accuracy on the exact same question [3, 4].</li>
                <li><strong>Match Model Size to Task:</strong> Tiny models handle easy facts cheaply; step up to a larger local model only when needed for math.</li>
                <li><strong>Measurement Limits:</strong> CodeCarbon runs in <code className="font-mono text-[11px]">machine</code> mode to track Ollama (background apps closed). CPU/GPU use hardware counters while RAM is a constant estimate (checked via our idle baseline). CodeCarbon only measures local hardware (cloud APIs need estimators like EcoLogits), and CO₂ depends strongly on local grid electricity (SWE vs. DEU vs. IND).</li>
              </ul>

              <div className="mt-3 pt-2.5 border-t border-slate-200">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">References</h3>
                <ol className="mt-1.5 space-y-0.5 text-[10px] leading-snug text-slate-600 list-decimal pl-4">
                  <li>UNESCO &amp; UCL, "Smarter, Smaller, Stronger: Resource-Efficient Generative AI," 2025.</li>
                  <li>Fernandez et al., "Energy Considerations of LLM Inference," ACL, 2025.</li>
                  <li>Levy, Jacoby &amp; Goldberg, "Same Task, More Tokens: Impact of Input Length on Reasoning," ACL, 2024.</li>
                  <li>Liu et al., "Lost in the Middle: How Language Models Use Long Contexts," TACL, 2024.</li>
                  <li>Samsi et al., "From Words to Watts: Energy Costs of LLM Inference," IEEE HPEC, 2023.</li>
                  <li>Zadenoori et al., "Does Model Size Matter? Small vs. Large LMs," arXiv:2510.21443, 2025.</li>
                </ol>
              </div>
            </section>
          </div>
        </div>
      </article>
    </div>
  );
};

import React from 'react';
import { Download } from 'lucide-react';
import type { AggregatedPosterData, PosterMetadata } from '../types/experiment';
import { downloadSvgById } from '../utils/svgExport';
import { PipelineDiagramSvg } from './charts/PipelineDiagramSvg';
import { TokenScalingChart } from './charts/TokenScalingChart';
import { EnergyHeatmapChart } from './charts/EnergyHeatmapChart';
import { ParetoKneeChart } from './charts/ParetoKneeChart';
import { ThinkingModeChart } from './charts/ThinkingModeChart';

interface PosterViewProps {
  data: AggregatedPosterData;
  metadata: PosterMetadata;
  isCustomData: boolean;
  datasetFilter: string;
}

export const PosterView: React.FC<PosterViewProps> = ({
  data,
  metadata,
  isCustomData,
  datasetFilter,
}) => {
  const overallMc = data.mcNemarOverall;

  // Compute overall RQ3 average energy ratio (Thinking ON / Thinking OFF)
  const totalOffWh = data.rq3ByDataset.reduce((s, r) => s + r.energyOffWh, 0);
  const totalOnWh = data.rq3ByDataset.reduce((s, r) => s + r.energyOnWh, 0);
  const thinkingEnergyRatio = totalOffWh > 0 ? totalOnWh / totalOffWh : 0;

  const formatP = (p: number) => (p < 0.0001 ? '< 0.0001' : p.toFixed(4));

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
                {metadata.courseContext} · {isCustomData ? 'Empirical Local Measurement' : 'Literature-Calibrated Pilot Baseline'}
                {datasetFilter !== 'ALL' ? ` · Filter: ${datasetFilter}` : ''}
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
              <p className="font-mono text-teal-300">{metadata.modelLabel}</p>
              <p className="font-mono text-slate-400">{metadata.hardwareLabel}</p>
            </div>
          </div>

          {/* 4-Column Key Empirical Metrics Strip */}
          <div className="mt-4 pt-4 border-t border-slate-700/80 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 border border-slate-700 rounded px-3 py-2">
              <div className="text-[11px] text-slate-300">Decode vs. Prefill Slope (RQ1)</div>
              <div className="mt-0.5 font-mono tabular-nums text-lg font-bold text-white">
                {data.outputToInputSlopeRatio > 0 ? `${data.outputToInputSlopeRatio.toFixed(1)}×` : '—'}
                <span className="ml-1.5 text-xs font-normal text-slate-300">per output token</span>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded px-3 py-2">
              <div className="text-[11px] text-slate-300">Saturation Knee Point (RQ2)</div>
              <div className="mt-0.5 font-mono tabular-nums text-lg font-bold text-teal-300">
                {data.kneePoint ? `${data.kneePoint.limit} tokens` : '—'}
                <span className="ml-1.5 text-xs font-normal text-slate-300">
                  {data.kneePoint ? `(${data.kneePoint.accuracyPct.toFixed(1)}% acc)` : ''}
                </span>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded px-3 py-2">
              <div className="text-[11px] text-slate-300">Thinking Mode Energy Overhead (RQ3)</div>
              <div className="mt-0.5 font-mono tabular-nums text-lg font-bold text-amber-300">
                {thinkingEnergyRatio > 0 ? `${thinkingEnergyRatio.toFixed(1)}×` : '—'}
                <span className="ml-1.5 text-xs font-normal text-slate-300">
                  ({overallMc.deltaAccPct >= 0 ? '+' : ''}{overallMc.deltaAccPct.toFixed(1)}% acc)
                </span>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded px-3 py-2">
              <div className="text-[11px] text-slate-300">McNemar Paired Test (Overall)</div>
              <div className="mt-0.5 font-mono tabular-nums text-lg font-bold text-white">
                p {formatP(overallMc.pValue)}
                <span className="ml-1.5 text-xs font-normal text-teal-300">
                  {overallMc.significantAt05 ? 'Significant (α=0.05)' : 'Not sig. (α=0.05)'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* DATA PROVENANCE NOTICE */}
        {!isCustomData && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Calibration Baseline Active:</strong> Showing literature-grounded pilot data modeled for Qwen3-1.7B on a 16 GB laptop. Run <code className="font-mono bg-amber-100 px-1 rounded">run_experiment.py</code> locally and click <strong>Import Local CSV</strong> above to populate the poster with your hardware measurements.
            </span>
          </div>
        )}

        {/* 3-COLUMN ACADEMIC POSTER BODY */}
        <div className="poster-grid-3col grid grid-cols-1 lg:grid-cols-3 gap-5 p-5 bg-slate-50/70">
          {/* ==================== COLUMN 1 ==================== */}
          <div className="space-y-4">
            {/* Section 1: Research Questions & Motivation */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 pb-2 border-b border-slate-200">
                01. Motivation & Research Questions
              </h2>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-700">
                While training large language models (LLMs) receives broad attention, real-world <strong>inference</strong> accounts for 60%–90% of AI energy demand once deployed [1, 4]. Small Language Models (SLMs) run privately on local laptops with competitive accuracy [2], yet every input and output token consumes measurable energy [3].
              </p>
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded p-2.5">
                <p className="text-[11px] font-semibold text-teal-800 uppercase tracking-wide">
                  Overarching Research Question
                </p>
                <p className="mt-1 text-xs font-medium text-slate-900 leading-snug">
                  How do input and output length affect the energy and quality of LLM responses, and where is the point beyond which extra tokens add energy but no quality?
                </p>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="font-bold text-slate-900">RQ1 (Token Scaling):</dt>
                  <dd className="text-slate-700">How does energy grow with input length vs. output length for a small local model, and which matters more?</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-900">RQ2 (Output Caps & Knee):</dt>
                  <dd className="text-slate-700">How do output limits (<code className="font-mono text-[11px]">num_predict</code>, "answer in N words") affect accuracy on verifiable tasks?</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-900">RQ3 (Reasoning Cost):</dt>
                  <dd className="text-slate-700">How much energy does reasoning ("thinking") mode add vs. a direct answer, and how much accuracy does it buy per extra Wh?</dd>
                </div>
              </dl>
            </section>

            {/* Section 2: Literature Foundation */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 pb-2 border-b border-slate-200">
                02. Grounding in Prior Literature
              </h2>
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-1.5 pr-2 font-semibold">Study</th>
                      <th className="py-1.5 pr-2 font-semibold">Tool / Scope</th>
                      <th className="py-1.5 font-semibold">Key Finding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">Samsi et al. [1]</td>
                      <td className="py-1.5 pr-2">DCGM · LLaMA 7–65B</td>
                      <td className="py-1.5">3–4 J/token; task type (GSM8K vs. Alpaca) alters energy & tokens.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">Zadenoori et al. [2]</td>
                      <td className="py-1.5 pr-2">5 SLMs vs. 3 LLMs</td>
                      <td className="py-1.5">SLMs trail LLMs by only 2% F1 (p=0.296); dataset drives accuracy.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">UNESCO & UCL [3]</td>
                      <td className="py-1.5 pr-2">CodeCarbon · Llama-8B</td>
                      <td className="py-1.5">Halving input saves 5% energy; halving output saves 54%.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap">Fernandez et al. [4]</td>
                      <td className="py-1.5 pr-2">CodeCarbon · ACL '25</td>
                      <td className="py-1.5">Parallel prefill is compute-bound; sequential decode scales linearly.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3: Experimental Setup & Pipeline */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  03. Experimental Pipeline & Setup
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig-pipeline-svg', 'fig0_experimental_pipeline.svg')}
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
                <div><span className="text-slate-500">Model:</span> <strong className="font-mono text-slate-900">qwen3:1.7b</strong></div>
                <div><span className="text-slate-500">Serving:</span> <strong className="text-slate-900">Ollama Local API</strong></div>
                <div><span className="text-slate-500">Sampling:</span> <strong className="font-mono text-slate-900">temp=0, seed=42</strong></div>
                <div><span className="text-slate-500">Metering:</span> <strong className="text-slate-900">CodeCarbon Offline</strong></div>
                <div><span className="text-slate-500">Benchmarks:</span> <strong className="text-slate-900">GSM8K, MATH-500, TriviaQA</strong></div>
                <div><span className="text-slate-500">Controls:</span> <strong className="text-slate-900">2 warmup, 0.5s cooldown</strong></div>
              </div>
            </section>
          </div>

          {/* ==================== COLUMN 2 ==================== */}
          <div className="space-y-4">
            {/* Section 4: RQ1 Scaling Chart */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  04. RQ1: Input vs. Output Energy Scaling
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig1-token-scaling-svg', 'fig1_rq1_token_scaling.svg')}
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
                  inputRegression={data.rq1InputRegression}
                  outputRegression={data.rq1OutputRegression}
                  slopeRatio={data.outputToInputSlopeRatio}
                />
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                <strong>Fig. 1 Finding:</strong> Output generation costs{' '}
                <span className="font-mono font-semibold text-red-700">
                  {data.outputToInputSlopeRatio > 0 ? `${data.outputToInputSlopeRatio.toFixed(1)}×` : 'substantially'}
                </span>{' '}
                more energy per token than input prompt processing. Prompt prefill evaluates tokens in parallel, whereas autoregressive decoding reads model weights and the KV-cache sequentially for every generated token [3, 4].
              </p>
            </section>

            {/* Section 5: 2D Input x Output Heatmap */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  05. Energy Matrix (Input × Output Tokens)
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig2-heatmap-svg', 'fig2_energy_heatmap.svg')}
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
                <strong>Fig. 2 Finding:</strong> Moving vertically along the output axis increases mWh far faster than moving horizontally along the input axis, confirming that output length dominates total query energy.
              </p>
            </section>

            {/* Section 6: RQ2 Output Limits & Saturation Knee */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  06. RQ2: Output Limits & Saturation Knee
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig3-pareto-knee-svg', 'fig3_rq2_pareto_knee.svg')}
                  className="no-print inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Figure 3 SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-2.5">
                <ParetoKneeChart
                  id="fig3-pareto-knee-svg"
                  tokenLimitCurve={data.rq2ParetoCurve}
                  wordLimitCurve={data.rq2WordLimitCurve}
                  kneePoint={data.kneePoint}
                />
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                <strong>Fig. 3 Finding:</strong> Truncating too early (<code className="font-mono text-[11px]">32–64</code> tokens) cuts off math steps and hurts accuracy. Accuracy saturates at the <strong>Kneedle elbow</strong> (
                <span className="font-mono font-semibold text-red-700">
                  {data.kneePoint ? `${data.kneePoint.limit} tokens` : '—'}
                </span>
                ); higher limits spend extra Wh with zero accuracy gain.
              </p>
            </section>
          </div>

          {/* ==================== COLUMN 3 ==================== */}
          <div className="space-y-4">
            {/* Section 7: RQ3 Thinking Mode */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
                  07. RQ3: Thinking Mode vs. Direct Answer
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig4-thinking-mode-svg', 'fig4_rq3_thinking_mode.svg')}
                  className="no-print inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Figure 4 SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-2.5">
                <ThinkingModeChart
                  id="fig4-thinking-mode-svg"
                  byDataset={data.rq3ByDataset}
                  byDifficulty={data.rq3ByDifficulty}
                />
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                <strong>Fig. 4 Finding:</strong> Enabling reasoning (<code className="font-mono text-[11px]">think=true</code>) improves accuracy on multi-step math (GSM8K & MATH-500 L2–L4), but multiplies energy per correct answer on simple factual lookups (TriviaQA) where direct answers already succeed.
              </p>
            </section>

            {/* Section 8: McNemar Paired Test Table */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 pb-2 border-b border-slate-200">
                08. McNemar Paired Test & Efficiency Table
              </h2>
              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full text-[11px] font-mono tabular-nums border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 font-sans">
                      <th className="py-1.5 pr-2 font-semibold">Dataset</th>
                      <th className="py-1.5 pr-2 font-semibold text-right">Off%</th>
                      <th className="py-1.5 pr-2 font-semibold text-right">On%</th>
                      <th className="py-1.5 pr-2 font-semibold text-right">n₀₁ / n₁₀</th>
                      <th className="py-1.5 pr-2 font-semibold text-right">p-value</th>
                      <th className="py-1.5 font-semibold text-right">Sig.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(data.mcNemarByDataset).map(([ds, res]) => (
                      <tr key={ds}>
                        <td className="py-1.5 pr-2 font-sans font-semibold text-slate-900">{ds}</td>
                        <td className="py-1.5 pr-2 text-right">{res.accOffPct.toFixed(1)}</td>
                        <td className="py-1.5 pr-2 text-right text-teal-700 font-semibold">{res.accOnPct.toFixed(1)}</td>
                        <td className="py-1.5 pr-2 text-right text-slate-600">{res.n01} / {res.n10}</td>
                        <td className="py-1.5 pr-2 text-right">{formatP(res.pValue)}</td>
                        <td className={`py-1.5 text-right font-sans font-semibold ${res.significantAt05 ? 'text-teal-700' : 'text-slate-500'}`}>
                          {res.significantAt05 ? 'Yes*' : 'No'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold border-t border-slate-300">
                      <td className="py-1.5 pr-2 font-sans text-slate-900">Overall</td>
                      <td className="py-1.5 pr-2 text-right">{overallMc.accOffPct.toFixed(1)}</td>
                      <td className="py-1.5 pr-2 text-right text-teal-700">{overallMc.accOnPct.toFixed(1)}</td>
                      <td className="py-1.5 pr-2 text-right">{overallMc.n01} / {overallMc.n10}</td>
                      <td className="py-1.5 pr-2 text-right">{formatP(overallMc.pValue)}</td>
                      <td className={`py-1.5 text-right font-sans ${overallMc.significantAt05 ? 'text-teal-700' : 'text-slate-600'}`}>
                        {overallMc.significantAt05 ? 'Yes*' : 'No'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-slate-600 leading-snug">
                <em>n₀₁</em> = wrong in Direct, fixed by Thinking; <em>n₁₀</em> = right in Direct, broken by Thinking. Exact binomial test used when discordant pairs &lt; 25, Edwards continuity-corrected χ² otherwise (*α = 0.05).
              </p>
            </section>

            {/* Section 9: Conclusions, Validity & References */}
            <section className="bg-white border border-slate-200 rounded-md p-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900 pb-2 border-b border-slate-200">
                09. Conclusions, Threats to Validity & References
              </h2>
              <ul className="mt-2 text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                <li><strong>Control Output Length First:</strong> Because decode energy per token is far higher than prefill, capping output near the saturation knee saves energy without losing accuracy.</li>
                <li><strong>Route Thinking by Difficulty:</strong> Use Direct mode for factual queries (TriviaQA) and reserve Thinking mode for medium/hard reasoning (GSM8K, MATH-500).</li>
                <li><strong>Threats to Validity:</strong> CodeCarbon estimates package energy via TDP/RAPL rather than a wall-plug power meter; laptop thermal throttling is mitigated via 0.5s cooldowns and warmup exclusions; tested on 1 model family (Qwen3-1.7B).</li>
              </ul>

              <div className="mt-3 pt-2.5 border-t border-slate-200">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">References</h3>
                <ol className="mt-1.5 space-y-1 text-[10.5px] leading-snug text-slate-600 list-decimal pl-4">
                  <li>Samsi et al., "From Words to Watts: Benchmarking the Energy Costs of LLM Inference," IEEE HPEC, 2023.</li>
                  <li>Zadenoori et al., "Does Model Size Matter? A Comparison of Small and Large Language Models for Requirements Classification," arXiv:2510.21443, 2025.</li>
                  <li>UNESCO & UCL, "Smarter, Smaller, Stronger: Resource-Efficient Generative AI & the Future of Digital Transformation," 2025.</li>
                  <li>Fernandez et al., "Energy Considerations of Large Language Model Inference and Efficiency Optimizations," ACL, pp. 32556–32569, 2025.</li>
                </ol>
              </div>
            </section>
          </div>
        </div>
      </article>
    </div>
  );
};

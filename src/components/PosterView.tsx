import React, { useState } from 'react';
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
  const [sheetView, setSheetView] = useState<'readable' | 'compact'>('readable');

  const rq3 = data.rq3Thinking;
  const rq3Arms = [rq3.direct, rq3.thinking].filter(
    (arm): arm is NonNullable<typeof arm> => arm !== null
  );

  const posterProofRows = data.proofTraces.slice(0, 4);

  const sheetWidthClass =
    sheetView === 'compact' ? 'max-w-[840px]' : 'max-w-[1200px]';

  return (
    <div className="poster-stage-outer bg-slate-200/70 min-h-full px-4 sm:px-6 py-5">
      {/* Quiet non-printing ISO A0 sheet specification strip */}
      <div
        className={`no-print mx-auto ${sheetWidthClass} mb-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 transition-all`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">ISO A0 Portrait Sheet</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">841 × 1189 mm (84.1 × 118.9 cm)</span>
          <span aria-hidden="true">·</span>
          <span>Aspect Ratio 1 : √2</span>
          <span aria-hidden="true">·</span>
          <span>2-Column Academic Grid</span>
        </div>

        <div
          role="group"
          aria-label="Poster preview zoom scale"
          className="flex items-center gap-1 p-0.5 bg-slate-300/60 rounded-md border border-slate-300"
        >
          <button
            type="button"
            onClick={() => setSheetView('readable')}
            aria-pressed={sheetView === 'readable'}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              sheetView === 'readable'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Readable (100%)
          </button>
          <button
            type="button"
            onClick={() => setSheetView('compact')}
            aria-pressed={sheetView === 'compact'}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              sheetView === 'compact'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            A0 Overview (70%)
          </button>
        </div>
      </div>

      {/* Non-printing preview notice sits cleanly above the pure A0 sheet */}
      {!isCustomData && (
        <div
          className={`no-print mx-auto ${sheetWidthClass} mb-3 bg-amber-50 border border-amber-200 rounded-md px-4 py-2 text-xs text-amber-950`}
        >
          <strong>Example Preview Active:</strong> Run{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">python run_experiment.py --preliminary</code>{' '}
          on your laptop (~3–5 min) for real results + Proof-of-Work, then click{' '}
          <strong>Import Local CSV</strong> and export to <strong>A0 PDF</strong> or <strong>A0 PowerPoint (.pptx)</strong>.
        </div>
      )}

      {/* TRUE ISO A0 PORTRAIT SHEET (exact 1 : sqrt(2) = 1200 × 1697 px -> 841 × 1189 mm) */}
      <article
        className={`poster-print-sheet mx-auto w-full ${sheetWidthClass} md:min-h-[1697px] flex flex-col bg-white border border-slate-300 shadow-md overflow-hidden`}
        aria-label="ISO A0 Portrait Scientific Conference Poster"
      >
        {/* ==================== POSTER HEADER BANNER ==================== */}
        <header className="bg-slate-900 text-white px-6 py-4 border-b-4 border-teal-600 shrink-0">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-mono tracking-wider uppercase text-teal-300">
                {metadata.courseContext} · ISO A0 Portrait ·{' '}
                {isCustomData ? 'Real Local Measurement' : 'Example Preliminary Preview'}
                {datasetFilter !== 'ALL' ? ` · Task: ${datasetFilter}` : ''}
              </p>
              <h1 className="mt-1 font-display text-2xl sm:text-[26px] font-bold tracking-tight leading-[1.16] text-balance">
                {metadata.title}
              </h1>
              <p className="mt-1 text-[12px] leading-snug text-slate-300 max-w-3xl">
                {metadata.subtitle}
              </p>
            </div>
            <div className="text-left md:text-right text-[11px] text-slate-300 space-y-0.5 shrink-0 md:max-w-[270px]">
              <p className="font-semibold text-white text-[13.5px]">{metadata.authors}</p>
              <p>{metadata.affiliation}</p>
              <p className="font-mono text-teal-300">
                {data.modelsTested.length > 0 ? data.modelsTested.join(' vs. ') : metadata.modelLabel}
              </p>
              <p className="font-mono text-[10px] text-slate-400">
                {proofManifest?.hardware?.os
                  ? `${proofManifest.hardware.os} (${proofManifest.hardware.machine ?? ''}) · CodeCarbon`
                  : metadata.hardwareLabel}
              </p>
            </div>
          </div>

          {/* 4-Column Plain-English Key Findings Strip */}
          <div className="mt-3 pt-3 border-t border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-800/85 border border-slate-700 rounded px-3 py-1.5">
              <div className="text-[10.5px] text-slate-300">Output vs. Input Cost (RQ1)</div>
              <div className="mt-0.5 font-mono tabular-nums text-[17px] font-bold text-white leading-tight">
                {data.outputToInputSlopeRatio > 0 ? `${data.outputToInputSlopeRatio.toFixed(1)}×` : '—'}
                <span className="ml-1.5 text-[11px] font-sans font-normal text-slate-300">
                  more / output tok
                </span>
              </div>
            </div>
            <div className="bg-slate-800/85 border border-slate-700 rounded px-3 py-1.5">
              <div className="text-[10.5px] text-slate-300">Output Sweet Spot (RQ2a)</div>
              <div className="mt-0.5 font-mono tabular-nums text-[17px] font-bold text-teal-300 leading-tight">
                {data.sweetSpot ? `${data.sweetSpot.limit} tok` : '—'}
                <span className="ml-1.5 text-[11px] font-sans font-normal text-slate-300">
                  {data.sweetSpot ? `(${data.sweetSpot.accuracyPct.toFixed(0)}% acc)` : ''}
                </span>
              </div>
            </div>
            <div className="bg-slate-800/85 border border-slate-700 rounded px-3 py-1.5">
              <div className="text-[10.5px] text-slate-300">Long Input Effect (RQ2b)</div>
              <div className="mt-0.5 font-mono tabular-nums text-[17px] font-bold text-amber-300 leading-tight">
                {data.rq2InputQuality.length >= 2
                  ? `${data.inputQualityDropPct > 0 ? '-' : '+'}${Math.abs(data.inputQualityDropPct).toFixed(0)}%`
                  : '—'}
                <span className="ml-1.5 text-[11px] font-sans font-normal text-slate-300">
                  acc (Short → Long)
                </span>
              </div>
            </div>
            <div className="bg-slate-800/85 border border-slate-700 rounded px-3 py-1.5">
              <div className="text-[10.5px] text-slate-300">Thinking Mode (RQ3)</div>
              <div className="mt-0.5 font-mono tabular-nums text-[17px] font-bold text-white leading-tight">
                {rq3.hasBothModes && rq3.energyMultiplier > 0
                  ? `${rq3.energyMultiplier.toFixed(1)}×`
                  : '—'}
                <span className="ml-1.5 text-[11px] font-sans font-normal text-teal-300">
                  {rq3.hasBothModes
                    ? `energy (${rq3.accuracyGainPct >= 0 ? '+' : ''}${rq3.accuracyGainPct.toFixed(0)}% acc)`
                    : ''}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ==================== 2-COLUMN A0 PORTRAIT BODY ==================== */}
        <div className="poster-grid-a0 flex-1 grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 bg-slate-100/80 items-stretch">
          {/* ==================== LEFT COLUMN (01 – 05) ==================== */}
          <div className="flex flex-col gap-3">
            {/* 01. Motivation & Research Questions */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3">
              <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900 pb-1 border-b border-slate-200">
                01. Motivation &amp; Research Questions
              </h2>
              <p className="mt-1.5 text-[11px] leading-snug text-slate-700">
                Every token sent to or written by a language model uses electricity [1, 2]. Longer prompts and longer answers do not only raise energy use — extra prompt text can also distract the model and lower answer quality [3, 4], while turning on reasoning (“thinking”) mode adds hidden tokens whose extra energy must be weighed against real accuracy gains [5, 6].
              </p>
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                <p className="text-[10px] font-semibold text-teal-800 tracking-wide">
                  Main Research Question
                </p>
                <p className="mt-0.5 text-[11.5px] font-semibold text-slate-900 leading-snug">
                  How do input length, output length, and reasoning (“thinking”) mode affect energy and answer quality, and where do extra tokens stop helping?
                </p>
              </div>
              <dl className="mt-2 space-y-1 text-[11px] leading-snug">
                <div>
                  <dt className="inline font-bold text-slate-900">RQ1 (Input vs. Output Energy): </dt>
                  <dd className="inline text-slate-700">
                    Does energy grow faster with input length or output length, and which matters more?
                  </dd>
                </div>
                <div>
                  <dt className="inline font-bold text-slate-900">RQ2 (Length vs. Answer Quality): </dt>
                  <dd className="inline text-slate-700">
                    How do output caps (<code className="font-mono text-[10px]">num_predict</code>, word limits) and longer inputs affect accuracy, and where is the sweet spot?
                  </dd>
                </div>
                <div>
                  <dt className="inline font-bold text-slate-900">RQ3 (Reasoning / Thinking Mode): </dt>
                  <dd className="inline text-slate-700">
                    How much energy does reasoning (“thinking”) mode add compared with a direct answer, and how much accuracy does it buy per extra Wh?
                  </dd>
                </div>
              </dl>
            </section>

            {/* 02. What Prior Studies Found */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3">
              <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900 pb-1 border-b border-slate-200">
                02. What Prior Studies Found
              </h2>
              <div className="mt-1.5 overflow-x-auto">
                <table className="w-full text-[10.5px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-1 pr-2 font-semibold">Study</th>
                      <th className="py-1 pr-2 font-semibold">Focus</th>
                      <th className="py-1 font-semibold">Main Finding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-1 pr-2 font-semibold text-slate-900 whitespace-nowrap">UNESCO &amp; UCL [1]</td>
                      <td className="py-1 pr-2 whitespace-nowrap">Energy</td>
                      <td className="py-1">Halving input saves 5% energy; halving output saves 54%.</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold text-slate-900 whitespace-nowrap">Fernandez et al. [2]</td>
                      <td className="py-1 pr-2 whitespace-nowrap">Energy</td>
                      <td className="py-1">Reading input runs in parallel; writing output runs token-by-token.</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold text-slate-900 whitespace-nowrap">Levy et al. [3]</td>
                      <td className="py-1 pr-2 whitespace-nowrap">Input quality</td>
                      <td className="py-1">Adding extra text to the same task lowers reasoning accuracy.</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold text-slate-900 whitespace-nowrap">Liu et al. [4]</td>
                      <td className="py-1 pr-2 whitespace-nowrap">Input quality</td>
                      <td className="py-1">Facts placed in the middle of long inputs are often missed.</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold text-slate-900 whitespace-nowrap">Samsi et al. [5]</td>
                      <td className="py-1 pr-2 whitespace-nowrap">Model size</td>
                      <td className="py-1">Larger models use more energy per token; tasks change output length.</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold text-slate-900 whitespace-nowrap">Zadenoori et al. [6]</td>
                      <td className="py-1 pr-2 whitespace-nowrap">Model size</td>
                      <td className="py-1">Small local models stay within ~2% of huge cloud models on focused tasks.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 03. Experimental Setup & Pipeline */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200">
                <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900">
                  03. How We Run &amp; Measure It
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig-pipeline-svg', 'fig0_experiment_steps.svg')}
                  className="no-print inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Pipeline Diagram SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-2 max-w-[490px] mx-auto">
                <PipelineDiagramSvg id="fig-pipeline-svg" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10.5px] border-t border-slate-100 pt-1.5">
                <div>
                  <span className="text-slate-500">Model:</span>{' '}
                  <strong className="font-mono text-slate-900">{data.modelsTested.join(', ') || 'qwen3:1.7b'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Runtime:</span>{' '}
                  <strong className="text-slate-900">Ollama Python client</strong>
                </div>
                <div>
                  <span className="text-slate-500">Settings:</span>{' '}
                  <strong className="font-mono text-slate-900">temp=0, seed=42</strong>
                </div>
                <div>
                  <span className="text-slate-500">Meter:</span>{' '}
                  <strong className="text-slate-900">CodeCarbon (machine mode)</strong>
                </div>
                <div>
                  <span className="text-slate-500">Tasks:</span>{' '}
                  <strong className="text-slate-900">GSM8K math, TriviaQA facts</strong>
                </div>
                <div>
                  <span className="text-slate-500">Controls:</span>{' '}
                  <strong className="text-slate-900">5s idle, warmup, AC power</strong>
                </div>
                {data.hardwareBreakdown.hasComponents && (
                  <div className="col-span-2 pt-1 border-t border-slate-100 text-[10px] text-slate-600 font-mono tabular-nums">
                    Split:{' '}
                    <strong className="text-slate-900">
                      {data.hardwareBreakdown.measuredComputeSharePct.toFixed(0)}% CPU/GPU
                    </strong>{' '}
                    vs.{' '}
                    <strong className="text-slate-700">
                      {data.hardwareBreakdown.estimatedRamSharePct.toFixed(0)}% est. RAM
                    </strong>
                    {data.hardwareBreakdown.idlePowerW !== null && (
                      <span>
                        {' '}
                        · Idle: {data.hardwareBreakdown.idlePowerW.toFixed(1)} W vs. Active:{' '}
                        {data.hardwareBreakdown.inferencePowerW.toFixed(1)} W
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* 04. RQ1 Scaling Chart */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200">
                <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900">
                  04. RQ1: Input vs. Output Energy
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig1-token-scaling-svg', 'fig1_input_vs_output_energy.svg')}
                  className="no-print inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Figure 1 SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-1.5 max-w-[395px] mx-auto">
                <TokenScalingChart
                  id="fig1-token-scaling-svg"
                  inputCurve={data.rq1InputCurve}
                  outputCurve={data.rq1OutputCurve}
                  inputTrend={data.rq1InputTrend}
                  outputTrend={data.rq1OutputTrend}
                  slopeRatio={data.outputToInputSlopeRatio}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-700 leading-snug">
                <strong>Fig. 1 Finding:</strong> Writing output tokens costs{' '}
                <span className="font-mono font-semibold text-red-700">
                  {data.outputToInputSlopeRatio > 0 ? `${data.outputToInputSlopeRatio.toFixed(1)}×` : 'much'}
                </span>{' '}
                more energy per token than reading input tokens. The model reads the whole prompt in parallel, but writes each output token one by one [1, 2].
              </p>
            </section>

            {/* 05. RQ1 Input x Output Energy Heatmap */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200">
                  <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900">
                    05. RQ1: Input × Output Energy Grid
                  </h2>
                  <button
                    type="button"
                    onClick={() => downloadSvgById('fig2-heatmap-svg', 'fig2_energy_grid.svg')}
                    className="no-print inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    title="Download Figure 2 SVG"
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    <span>SVG</span>
                  </button>
                </div>
                <div className="mt-1.5 max-w-[405px] mx-auto">
                  <EnergyHeatmapChart
                    id="fig2-heatmap-svg"
                    inputBins={data.heatmapInputBins}
                    outputBins={data.heatmapOutputBins}
                    cells={data.heatmapCells}
                  />
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-700 leading-snug">
                <strong>Fig. 2 Finding:</strong> Moving upward (longer answers) raises energy much faster than moving right (longer prompts), confirming that output length is the main driver of energy.
              </p>
            </section>
          </div>

          {/* ==================== RIGHT COLUMN (06 – 10) ==================== */}
          <div className="flex flex-col gap-3">
            {/* 06. RQ2a Output Limits & Sweet Spot */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200">
                <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900">
                  06. RQ2a: Output Limits &amp; Sweet Spot
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig3-output-caps-svg', 'fig3_output_sweet_spot.svg')}
                  className="no-print inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Figure 3 SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-1.5 max-w-[395px] mx-auto">
                <ParetoKneeChart
                  id="fig3-output-caps-svg"
                  tokenLimitCurve={data.rq2OutputCapCurve}
                  wordLimitCurve={data.rq2WordLimitCurve}
                  sweetSpot={data.sweetSpot}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-700 leading-snug">
                <strong>Fig. 3 Finding:</strong> Very small caps (<code className="font-mono text-[10px]">32–64</code> tokens) cut off math steps and hurt accuracy. Accuracy reaches its <strong>sweet spot</strong> at{' '}
                <span className="font-mono font-semibold text-red-700">
                  {data.sweetSpot ? `${data.sweetSpot.limit} tokens` : '—'}
                </span>{' '}
                (smallest cap within 2% of top accuracy); larger limits spend extra energy with no quality gain.
              </p>
            </section>

            {/* 07. RQ2b Input Length vs. Output Quality */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200">
                <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900">
                  07. RQ2b: Does Longer Input Hurt Quality?
                </h2>
                <button
                  type="button"
                  onClick={() => downloadSvgById('fig4-input-quality-svg', 'fig4_input_length_quality.svg')}
                  className="no-print inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Download Figure 4 SVG"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>SVG</span>
                </button>
              </div>
              <div className="mt-1.5 max-w-[395px] mx-auto">
                <InputQualityChart id="fig4-input-quality-svg" rows={data.rq2InputQuality} />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-700 leading-snug">
                <strong>Fig. 4 Finding:</strong> Asking the <em>exact same questions</em> inside longer background text raises energy AND causes accuracy to drop — matching <strong>Levy et al. [3]</strong> and <strong>Liu et al. [4]</strong>. Keeping prompts short helps both energy and quality.
              </p>
            </section>

            {/* 08. RQ3 Reasoning ("Thinking") Mode vs. Direct */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3">
              <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900 pb-1 border-b border-slate-200">
                08. RQ3: Thinking Mode vs. Direct
              </h2>
              <div className="mt-1.5 overflow-x-auto">
                <table className="w-full text-[11px] font-mono tabular-nums border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 font-sans">
                      <th className="py-1 pr-2 font-semibold">Answer Mode</th>
                      <th className="py-1 pr-2 font-semibold text-right">Acc</th>
                      <th className="py-1 pr-2 font-semibold text-right">Avg Out</th>
                      <th className="py-1 pr-2 font-semibold text-right">Avg mWh</th>
                      <th className="py-1 font-semibold text-right">mWh/Corr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rq3Arms.map((arm) => (
                      <tr key={arm.mode}>
                        <td className="py-1 pr-2 font-semibold text-slate-900">{arm.label}</td>
                        <td className="py-1 pr-2 text-right text-teal-700 font-semibold">
                          {arm.accuracyPct.toFixed(0)}% ({arm.correctCount}/{arm.count})
                        </td>
                        <td className="py-1 pr-2 text-right text-slate-600">
                          {Math.round(arm.avgOutputTokens)} tok
                        </td>
                        <td className="py-1 pr-2 text-right">{(arm.avgEnergyWh * 1000).toFixed(1)}</td>
                        <td className="py-1 text-right font-semibold text-slate-900">
                          {arm.whPerCorrect !== null ? (arm.whPerCorrect * 1000).toFixed(1) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rq3.hasBothModes && (
                <div className="mt-2 grid grid-cols-2 gap-2.5 text-[11px]">
                  <div className="bg-red-50/70 border border-red-200/80 rounded px-2.5 py-1.5">
                    <div className="text-[10px] text-red-900/80 font-medium">Extra Energy Added</div>
                    <div className="font-mono font-bold text-[13.5px] text-red-800 tabular-nums">
                      +{rq3.extraEnergyMwh.toFixed(1)} mWh ({rq3.energyMultiplier.toFixed(1)}×)
                    </div>
                  </div>
                  <div className="bg-teal-50/80 border border-teal-200/80 rounded px-2.5 py-1.5">
                    <div className="text-[10px] text-teal-900/80 font-medium">Acc Bought / Extra Wh</div>
                    <div className="font-mono font-bold text-[13.5px] text-teal-800 tabular-nums">
                      {rq3.accuracyGainPerExtraWh !== null
                        ? `${rq3.accuracyGainPerExtraWh >= 0 ? '+' : ''}${rq3.accuracyGainPerExtraWh.toFixed(0)}% / Wh`
                        : '—'}
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-1.5 text-[10.5px] text-slate-700 leading-snug">
                {rq3.byDataset.length >= 2
                  ? rq3.byDataset
                      .map(
                        (d) =>
                          `${d.dataset}: ${d.accGainPct >= 0 ? '+' : ''}${d.accGainPct.toFixed(0)}% acc (+${d.extraMwh.toFixed(0)} mWh, ${d.energyMultiplier.toFixed(1)}×)`
                      )
                      .join(' · ') + ' — thinking pays off on multi-step math, not simple facts.'
                  : 'Reasoning mode writes hidden thinking tokens before the final answer, adding energy that pays off only when direct answers fail [5, 6].'}
              </p>
            </section>

            {/* 09. Proof-of-Work: Sample Logged Runs */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200">
                <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900">
                  09. Proof-of-Work: Sample Logged Runs
                </h2>
                {proofManifest?.files?.results_csv_sha256 ? (
                  <span className="font-mono text-[10px] text-teal-700">
                    SHA256: {proofManifest.files.results_csv_sha256.slice(0, 10)}…
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-slate-500">
                    CSV + emissions_raw + SHA-256
                  </span>
                )}
              </div>
              <div className="mt-1.5 space-y-1">
                {posterProofRows.map((tr) => (
                  <div
                    key={tr.runId}
                    className="text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 leading-snug"
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[9.5px] text-slate-600">
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
            </section>

            {/* 10. Takeaways & Measurement Limits */}
            <section className="bg-white border border-slate-200 rounded-md px-3.5 py-3 flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-display text-[13px] font-bold tracking-wide text-slate-900 pb-1 border-b border-slate-200">
                  10. Key Takeaways &amp; Measurement Limits
                </h2>
                <ul className="mt-1.5 text-[11px] text-slate-700 space-y-1 list-disc pl-4 leading-snug">
                  <li>
                    <strong>Cap Output Near the Sweet Spot:</strong> Output tokens drive energy most; setting a sensible limit saves energy with zero accuracy loss.
                  </li>
                  <li>
                    <strong>Keep Inputs Short &amp; Clean:</strong> Extra prompt text adds energy AND can hurt accuracy on the exact same question [3, 4].
                  </li>
                  <li>
                    <strong>Turn Thinking On Only When Needed:</strong> Reasoning mode multiplies energy use; it buys accuracy per extra Wh on multi-step math, but wastes energy on simple factual recall.
                  </li>
                  <li>
                    <strong>Measurement Limits:</strong> CodeCarbon runs in{' '}
                    <code className="font-mono text-[10px]">machine</code> mode to track Ollama (background apps closed). CPU/GPU use hardware counters while RAM is a constant estimate (checked via our 5s idle baseline). Local measurements only (cloud APIs need EcoLogits), and CO₂ depends strongly on local grid electricity (SWE vs. DEU vs. IND).
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>

        {/* ==================== FULL-WIDTH REFERENCES FOOTER ==================== */}
        <footer className="bg-white border-t border-slate-200 px-6 py-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
            <h3 className="text-[10.5px] font-bold tracking-wide text-slate-700">References</h3>
            <span className="text-[10px] font-mono text-slate-500">
              ISO A0 Portrait (841 × 1189 mm) · Reproducible Local Kit: Ollama (qwen3:1.7b) + CodeCarbon
            </span>
          </div>
          <ol className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5 text-[9.5px] leading-snug text-slate-600 list-decimal pl-4">
            <li>UNESCO &amp; UCL, "Smarter, Smaller, Stronger: Resource-Efficient Generative AI," 2025.</li>
            <li>Fernandez et al., "Energy Considerations of LLM Inference," ACL, 2025.</li>
            <li>Levy, Jacoby &amp; Goldberg, "Same Task, More Tokens: Impact of Input Length on Reasoning," ACL, 2024.</li>
            <li>Liu et al., "Lost in the Middle: How Language Models Use Long Contexts," TACL, 2024.</li>
            <li>Samsi et al., "From Words to Watts: Energy Costs of LLM Inference," IEEE HPEC, 2023.</li>
            <li>Zadenoori et al., "Does Model Size Matter? Small vs. Large LMs," arXiv:2510.21443, 2025.</li>
          </ol>
        </footer>
      </article>
    </div>
  );
};

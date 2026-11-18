import React, { useState } from 'react';
import { Copy, Check, Calculator, BookOpen, ShieldCheck } from 'lucide-react';
import { LITERATURE_PAPERS, RESEARCH_QUESTIONS } from '../data/literaturePapers';
import type { AggregatedPosterData, ProofOfWorkManifest } from '../types/experiment';

interface LiteratureStatsViewProps {
  data: AggregatedPosterData;
  isCustomData: boolean;
  proofManifest: ProofOfWorkManifest | null;
}

const REGION_INTENSITY_G_PER_KWH = [
  { code: 'SWE', name: 'Sweden (low-carbon hydro/nuclear)', gPerKwh: 36 },
  { code: 'DEU', name: 'Germany (mixed grid)', gPerKwh: 380 },
  { code: 'IND', name: 'India (coal-heavy grid)', gPerKwh: 710 },
];

export const LiteratureStatsView: React.FC<LiteratureStatsViewProps> = ({
  data,
  isCustomData,
  proofManifest,
}) => {
  const [copiedBib, setCopiedBib] = useState<string | null>(null);

  // Simple Cost-per-Correct & Regional CO2 Calculator (mirrors course cpu_test_regions.py)
  const [avgEnergyMwh, setAvgEnergyMwh] = useState<number>(48);
  const [correctCount, setCorrectCount] = useState<number>(5);
  const [totalQuestions, setTotalQuestions] = useState<number>(6);

  const safeTotal = Math.max(1, totalQuestions);
  const safeCorrect = Math.min(safeTotal, Math.max(0, correctCount));
  const accuracyPct = (safeCorrect / safeTotal) * 100;
  const totalEnergyMwh = avgEnergyMwh * safeTotal;
  const mwhPerCorrect = safeCorrect > 0 ? totalEnergyMwh / safeCorrect : null;
  const kwhPer1000Queries = avgEnergyMwh / 1000;

  const handleCopyBib = (id: string, bib: string) => {
    navigator.clipboard.writeText(bib);
    setCopiedBib(id);
    setTimeout(() => setCopiedBib(null), 1800);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Research Question Synthesis */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-teal-800 text-xs font-mono uppercase tracking-wider font-semibold">
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          <span>Research Questions in Plain English</span>
        </div>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-900">
          How Six Studies Ground Energy, Input Quality, and Model Choice
        </h1>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {RESEARCH_QUESTIONS.map((rq) => (
            <div key={rq.id} className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <div className="text-xs font-mono font-bold text-teal-800">{rq.id}</div>
              <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug">{rq.question}</p>
              {'expectation' in rq && rq.expectation && (
                <p className="mt-2 text-xs text-slate-700 leading-relaxed">{rq.expectation}</p>
              )}
              {'source' in rq && rq.source && (
                <p className="mt-2 text-xs text-slate-500">{rq.source}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Proof-of-Work & Verifiable Q&A Log */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-display text-lg font-bold">
              <ShieldCheck className="w-5 h-5 text-teal-700" aria-hidden="true" />
              <h2>Proof-of-Work: Verifiable Run Log &amp; Saved Answers</h2>
            </div>
            <p className="mt-1 text-xs text-slate-600 max-w-3xl">
              To prove results come from real local runs, <code className="font-mono">run_experiment.py</code> logs timestamps, exact token counts, actual model outputs, and CodeCarbon's raw <code className="font-mono">emissions_raw.csv</code> alongside a <code className="font-mono">proof_of_work.json</code> receipt with SHA-256 file hashes.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded text-xs font-semibold ${
              isCustomData
                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            {isCustomData ? 'Showing Your Imported Local Run' : 'Example Preview (Import Local CSV to Verify)'}
          </span>
        </div>

        {/* Hardware & Hash Summary */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded p-3">
            <div className="text-slate-500">Models Logged</div>
            <div className="mt-0.5 font-mono font-semibold text-slate-900">
              {data.modelsTested.join(', ') || '—'}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-3">
            <div className="text-slate-500">Run Window (UTC)</div>
            <div className="mt-0.5 font-mono text-[11px] font-semibold text-slate-900">
              {data.firstTimestamp ? `${data.firstTimestamp.slice(0, 19)}` : 'No timestamps in CSV'}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-3">
            <div className="text-slate-500">Hardware (Proof JSON)</div>
            <div className="mt-0.5 font-mono text-[11px] font-semibold text-slate-900">
              {proofManifest?.hardware?.os
                ? `${proofManifest.hardware.os} · ${proofManifest.hardware.machine ?? ''}`
                : 'Attach proof_of_work.json'}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-3">
            <div className="text-slate-500">CSV SHA-256 Checksum</div>
            <div className="mt-0.5 font-mono text-[11px] font-semibold text-teal-800 truncate">
              {proofManifest?.files?.results_csv_sha256
                ? proofManifest.files.results_csv_sha256
                : 'Generated automatically on local run'}
            </div>
          </div>
        </div>

        {/* Saved Q&A Sample Table */}
        <div className="mt-4 overflow-x-auto border border-slate-200 rounded">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600">
                <th className="py-2 px-3 font-semibold">Run / Prompt</th>
                <th className="py-2 px-3 font-semibold">Model &amp; Test</th>
                <th className="py-2 px-3 font-semibold">Saved Model Output</th>
                <th className="py-2 px-3 font-semibold">Expected</th>
                <th className="py-2 px-3 font-semibold text-right">Tokens (In/Out)</th>
                <th className="py-2 px-3 font-semibold text-right">Energy</th>
                <th className="py-2 px-3 font-semibold text-right">Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.proofTraces.slice(0, 10).map((tr) => (
                <tr key={tr.runId} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-mono whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{tr.promptId}</div>
                    <div className="text-[10px] text-slate-500">{tr.dataset}</div>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="font-mono text-slate-900">{tr.model}</div>
                    <div className="text-[10px] text-slate-500">{tr.conditionLabel}</div>
                  </td>
                  <td className="py-2 px-3 max-w-xs text-slate-700">
                    <span className="line-clamp-2">{tr.responsePreview}</span>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-800 whitespace-nowrap">{tr.expectedAnswer}</td>
                  <td className="py-2 px-3 font-mono text-right text-slate-700 whitespace-nowrap">
                    {tr.inputTokens} / {tr.outputTokens}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-900 whitespace-nowrap">
                    {tr.energyMwh.toFixed(1)} mWh
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        tr.correct ? 'text-teal-700' : 'text-red-700'
                      }`}
                    >
                      {tr.correct ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Simple Cost-per-Correct & Regional Grid CO2 Calculator */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-slate-900 font-display text-lg font-bold">
          <Calculator className="w-5 h-5 text-teal-700" aria-hidden="true" />
          <h2>Simple Energy-per-Correct &amp; Grid Carbon Calculator</h2>
        </div>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl">
          Plug in numbers from your local run to compute <strong>mWh per correct answer</strong> and see how the exact same measured electricity produces very different CO₂ across Sweden, Germany, and India (matching <code className="font-mono">cpu_test_regions.py</code>).
        </p>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3">
            <label className="block bg-slate-50 border border-slate-200 rounded p-3 text-xs">
              <span className="font-semibold text-slate-900">Average Energy per Query (mWh)</span>
              <input
                type="number"
                step="1"
                min={0}
                value={avgEnergyMwh}
                onChange={(e) => setAvgEnergyMwh(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                <span className="font-semibold text-slate-900">Correct Answers</span>
                <input
                  type="number"
                  min={0}
                  value={correctCount}
                  onChange={(e) => setCorrectCount(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1.5 w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded"
                />
              </label>
              <label className="block bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                <span className="font-semibold text-slate-900">Total Questions</span>
                <input
                  type="number"
                  min={1}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1.5 w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded"
                />
              </label>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900 text-white rounded-lg p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3 border-b border-slate-700 pb-3 font-mono tabular-nums">
              <div>
                <div className="text-xs text-slate-400 font-sans">Accuracy</div>
                <div className="text-xl font-bold text-teal-300">{accuracyPct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-sans">mWh / Correct Answer</div>
                <div className="text-xl font-bold text-white">
                  {mwhPerCorrect !== null ? `${mwhPerCorrect.toFixed(1)}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-sans">kWh / 1,000 Queries</div>
                <div className="text-xl font-bold text-amber-300">{kwhPer1000Queries.toFixed(3)}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-slate-300 font-semibold">
                Same electricity ({kwhPer1000Queries.toFixed(3)} kWh / 1,000 queries) in different grids:
              </div>
              {REGION_INTENSITY_G_PER_KWH.map((reg) => {
                const gCo2Per1000 = kwhPer1000Queries * reg.gPerKwh;
                return (
                  <div
                    key={reg.code}
                    className="flex items-center justify-between gap-2 bg-slate-800/80 rounded px-3 py-1.5 font-mono tabular-nums"
                  >
                    <span className="font-sans text-slate-200">
                      <strong className="font-mono text-teal-300">{reg.code}</strong> · {reg.name}
                    </span>
                    <span className="font-bold text-white">{gCo2Per1000.toFixed(1)} gCO₂eq</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Detailed 6-Paper Matrix */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">
          Verified Findings from the Six Reference Studies
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LITERATURE_PAPERS.map((paper) => (
            <article key={paper.id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-teal-800">{paper.shortCite}</span>
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
                      {paper.topicTag}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyBib(paper.id, paper.bibtex)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer shrink-0"
                  >
                    {copiedBib === paper.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                        <span>BibTeX Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copy BibTeX</span>
                      </>
                    )}
                  </button>
                </div>
                <h3 className="mt-1.5 font-display text-base font-bold text-slate-900 leading-snug">
                  {paper.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{paper.venue}</p>

                <dl className="mt-3 space-y-1.5 text-xs">
                  <div>
                    <dt className="font-semibold text-slate-800 inline">Setup: </dt>
                    <dd className="text-slate-700 inline">{paper.hardwareAndTool}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800 inline">Models &amp; Tasks: </dt>
                    <dd className="text-slate-700 inline">{paper.modelsAndDatasets}</dd>
                  </div>
                </dl>

                <ul className="mt-3 space-y-1.5 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
                  {paper.keyFindings.map((finding, idx) => (
                    <li key={idx}>{finding}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-800">
                <strong className="text-teal-800">How we use it:</strong> {paper.whyItMattersForUs}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

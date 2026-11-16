import React, { useState } from 'react';
import { Copy, Check, Calculator, BookOpen } from 'lucide-react';
import { LITERATURE_PAPERS, RESEARCH_QUESTIONS } from '../data/literaturePapers';
import { computeMcNemarFromCounts } from '../utils/statistics';

export const LiteratureStatsView: React.FC = () => {
  const [copiedBib, setCopiedBib] = useState<string | null>(null);

  // Interactive McNemar & Energy-per-Correct Calculator state
  const [n11, setN11] = useState<number>(38);
  const [n10, setN10] = useState<number>(2);
  const [n01, setN01] = useState<number>(11);
  const [n00, setN00] = useState<number>(9);
  const [meanOffWh, setMeanOffWh] = useState<number>(0.052);
  const [meanOnWh, setMeanOnWh] = useState<number>(0.178);

  const mcResult = computeMcNemarFromCounts(
    Math.max(0, n11),
    Math.max(0, n10),
    Math.max(0, n01),
    Math.max(0, n00)
  );

  const totalItems = Math.max(1, mcResult.totalPairs);
  const totalOffCorrect = n11 + n10;
  const totalOnCorrect = n11 + n01;
  const whPerCorrectOff = totalOffCorrect > 0 ? (totalItems * meanOffWh) / totalOffCorrect : null;
  const whPerCorrectOn = totalOnCorrect > 0 ? (totalItems * meanOnWh) / totalOnCorrect : null;
  const extraAccPct = mcResult.deltaAccPct;
  const extraWh = meanOnWh - meanOffWh;
  const accPerExtraWh = extraWh > 1e-6 ? extraAccPct / extraWh : null;

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
          <span>Research Framework & Hypotheses</span>
        </div>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-900">
          How the Four Papers Ground Every Research Question
        </h1>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {RESEARCH_QUESTIONS.map((rq) => (
            <div key={rq.id} className="bg-slate-50 border border-slate-200 rounded-md p-4">
              <div className="text-xs font-mono font-bold text-teal-800">{rq.id}</div>
              <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug">{rq.question}</p>
              {rq.hypothesis && (
                <p className="mt-2 text-xs text-slate-700 leading-relaxed">{rq.hypothesis}</p>
              )}
              {rq.source && (
                <p className="mt-2 text-xs text-slate-500">{rq.source}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Interactive McNemar & Energy-per-Correct Calculator */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-slate-900 font-display text-lg font-bold">
          <Calculator className="w-5 h-5 text-teal-700" aria-hidden="true" />
          <h2>Interactive McNemar Paired Test & Cost-Effectiveness Calculator</h2>
        </div>
        <p className="mt-1 text-xs text-slate-600 max-w-3xl">
          Verify your RQ3 paired comparison between <strong>Thinking OFF (Direct)</strong> and <strong>Thinking ON (Reasoning)</strong> on the exact same prompts. When discordant pairs (<code className="font-mono">n₁₀ + n₀₁</code>) &lt; 25, this tool automatically switches to the exact two-sided binomial test; otherwise it applies Edwards continuity-corrected χ².
        </p>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Inputs: 2x2 Contingency + Mean Energy */}
          <div className="lg:col-span-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                <span className="font-semibold text-slate-900">n₁₁ · Both Correct</span>
                <input
                  type="number"
                  min={0}
                  value={n11}
                  onChange={(e) => setN11(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded"
                />
              </label>
              <label className="block bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                <span className="font-semibold text-red-800">n₁₀ · Direct OK, Thinking Wrong</span>
                <input
                  type="number"
                  min={0}
                  value={n10}
                  onChange={(e) => setN10(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded"
                />
              </label>
              <label className="block bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                <span className="font-semibold text-teal-800">n₀₁ · Direct Wrong, Thinking OK</span>
                <input
                  type="number"
                  min={0}
                  value={n01}
                  onChange={(e) => setN01(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded"
                />
              </label>
              <label className="block bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                <span className="font-semibold text-slate-900">n₀₀ · Both Wrong</span>
                <input
                  type="number"
                  min={0}
                  value={n00}
                  onChange={(e) => setN00(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                <span className="font-semibold text-slate-900">Mean Energy Direct (Wh/query)</span>
                <input
                  type="number"
                  step="0.001"
                  min={0}
                  value={meanOffWh}
                  onChange={(e) => setMeanOffWh(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded"
                />
              </label>
              <label className="block bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                <span className="font-semibold text-slate-900">Mean Energy Thinking (Wh/query)</span>
                <input
                  type="number"
                  step="0.001"
                  min={0}
                  value={meanOnWh}
                  onChange={(e) => setMeanOnWh(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded"
                />
              </label>
            </div>
          </div>

          {/* Computed Statistical Readout */}
          <div className="lg:col-span-6 bg-slate-900 text-white rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <div className="text-xs text-slate-400">McNemar Test Result ({mcResult.method === 'exact_binomial' ? 'Exact Binomial' : 'Edwards χ²'})</div>
                <div className="mt-0.5 font-mono tabular-nums text-2xl font-bold">
                  p = {mcResult.pValue < 0.0001 ? '< 0.0001' : mcResult.pValue.toFixed(5)}
                </div>
              </div>
              <div className={`px-3 py-1 rounded text-xs font-semibold ${mcResult.significantAt05 ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                {mcResult.significantAt05 ? 'Statistically Significant (p < 0.05)' : 'Not Significant (p ≥ 0.05)'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-400 font-sans">Direct Accuracy</div>
                <div className="text-base font-bold">{mcResult.accOffPct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-slate-400 font-sans">Thinking Accuracy</div>
                <div className="text-base font-bold text-teal-300">{mcResult.accOnPct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-slate-400 font-sans">Δ Accuracy</div>
                <div className="text-base font-bold">{extraAccPct >= 0 ? '+' : ''}{extraAccPct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-slate-400 font-sans">Wh / Correct (Off)</div>
                <div className="text-base font-bold">{whPerCorrectOff !== null ? `${(whPerCorrectOff * 1000).toFixed(1)} mWh` : '—'}</div>
              </div>
              <div>
                <div className="text-slate-400 font-sans">Wh / Correct (On)</div>
                <div className="text-base font-bold text-amber-300">{whPerCorrectOn !== null ? `${(whPerCorrectOn * 1000).toFixed(1)} mWh` : '—'}</div>
              </div>
              <div>
                <div className="text-slate-400 font-sans">Acc Gain / +100 mWh</div>
                <div className="text-base font-bold text-teal-300">
                  {accPerExtraWh !== null ? `+${(accPerExtraWh / 10).toFixed(2)}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed 4-Paper Matrix */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">
          Verified Findings from the Four Reference Papers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LITERATURE_PAPERS.map((paper) => (
            <article key={paper.id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-teal-800">{paper.shortCite}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyBib(paper.id, paper.bibtex)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
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
                <h3 className="mt-1 font-display text-base font-bold text-slate-900 leading-snug">
                  {paper.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{paper.venue}</p>

                <dl className="mt-3 space-y-1.5 text-xs">
                  <div>
                    <dt className="font-semibold text-slate-800 inline">Metering & Hardware: </dt>
                    <dd className="text-slate-700 inline">{paper.hardwareAndTool}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800 inline">Models & Data: </dt>
                    <dd className="text-slate-700 inline">{paper.modelsAndDatasets}</dd>
                  </div>
                </dl>

                <ul className="mt-3 space-y-1.5 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
                  {paper.keyEmpiricalFindings.map((finding, idx) => (
                    <li key={idx}>{finding}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-800">
                <strong className="text-teal-800">Role in Our Study:</strong> {paper.connectionToOurRQs}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

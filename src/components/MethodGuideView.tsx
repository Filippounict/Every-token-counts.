import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Terminal, Cpu, ShieldCheck, FlaskConical } from 'lucide-react';

interface KitFile {
  name: string;
  path: string;
  description: string;
}

const KIT_FILES: KitFile[] = [
  {
    name: 'run_experiment.py',
    path: '/kit/run_experiment.py',
    description: 'Fast Ollama + CodeCarbon script (--preliminary takes ~3–5 min) testing RQ1 energy, RQ2 output caps & input length quality, RQ3 model comparison, and writing Proof-of-Work files.',
  },
  {
    name: 'analyze_results.py',
    path: '/kit/analyze_results.py',
    description: 'Simple pandas + matplotlib script: prints idle vs. active power, input vs. output mWh/token, sweet spot, input length accuracy drop, model table, SWE/DEU/IND CO₂, and 4 charts.',
  },
  {
    name: 'requirements.txt',
    path: '/kit/requirements.txt',
    description: 'Python 3.10+ packages: codecarbon>=3.0.0, ollama, pandas, numpy, matplotlib.',
  },
  {
    name: 'sample_results.csv',
    path: '/kit/sample_results.csv',
    description: 'Example CSV matching `--preliminary` output (idle row + 75 runs with model, timestamp, expected answer, and answer preview) to test Poster import.',
  },
];

export const MethodGuideView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<KitFile>(KIT_FILES[0]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingFile, setLoadingFile] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (fileContents[selectedFile.name]) return;
    let active = true;
    setLoadingFile(true);
    fetch(selectedFile.path)
      .then((res) => res.text())
      .then((txt) => {
        if (active) {
          setFileContents((prev) => ({ ...prev, [selectedFile.name]: txt }));
          setLoadingFile(false);
        }
      })
      .catch(() => {
        if (active) setLoadingFile(false);
      });
    return () => {
      active = false;
    };
  }, [selectedFile, fileContents]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const activeText = fileContents[selectedFile.name] ?? '';

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Intro Hero */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <p className="text-xs font-mono uppercase tracking-wider text-teal-700 font-semibold">
          Fast Preliminary Run (~3–5 Min) · Course Ollama + CodeCarbon Setup
        </p>
        <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
          Simple Step-by-Step Guide to Get Real Results &amp; Proof-of-Work
        </h1>
        <p className="mt-2 text-sm text-slate-700 max-w-3xl leading-relaxed">
          Built directly from the course scripts (<code className="font-mono">idle_test.py</code>, <code className="font-mono">llm_test_comparison.py</code>, <code className="font-mono">cpu_test_regions.py</code>). Run <code className="font-mono">python run_experiment.py --preliminary</code> on your laptop to collect real poster-ready data in <strong>~3–5 minutes</strong> (not 2 hours), plus an automatic <strong>Proof-of-Work</strong> bundle (<code className="font-mono">experiment_results.csv</code>, <code className="font-mono">emissions_raw.csv</code>, and <code className="font-mono">proof_of_work.json</code>).
        </p>
      </section>

      {/* 4-Step Execution Guide */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-base">
            <Terminal className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Step 1 · Python 3.10+ &amp; Pull Two Small Models</span>
          </div>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            CodeCarbon 3.x requires Python 3.10+. On Apple Silicon Macs, confirm Python prints <code className="font-mono">arm64</code> (not <code className="font-mono">x86_64</code> under Rosetta, which overstates RAM power). Pull the same two small models from the course comparison script.
          </p>
          <div className="mt-3 bg-slate-900 text-slate-100 rounded p-3 text-xs font-mono relative">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  'step1',
                  'python3 --version\npython3 -c "import platform; print(platform.machine())"\npython3 -m venv venv && source venv/bin/activate\npip install --upgrade pip && pip install -r requirements.txt\nollama pull qwen2.5:0.5b\nollama pull qwen2.5:3b'
                )
              }
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Copy Step 1 commands"
            >
              {copiedKey === 'step1' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="overflow-x-auto pr-8">{`python3 --version
python3 -c "import platform; print(platform.machine())"
python3 -m venv venv && source venv/bin/activate
pip install --upgrade pip && pip install -r requirements.txt
ollama pull qwen2.5:0.5b
ollama pull qwen2.5:3b`}</pre>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-base">
            <Cpu className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Step 2 · Run <code className="font-mono">codecarbon detect</code> First</span>
          </div>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            Check what CodeCarbon actually <strong>measures</strong> on your machine (Linux RAPL, Apple Silicon <code className="font-mono">PowerMetrics</code>, Windows 11 EMI, NVIDIA NVML) versus what it <strong>estimates</strong> (RAM power is always a constant estimate).
          </p>
          <div className="mt-3 bg-slate-900 text-slate-100 rounded p-3 text-xs font-mono relative">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  'step2',
                  'codecarbon detect\n# Linux: enable CPU RAPL energy counters:\nsudo chmod a+r /sys/class/powercap/*/energy_uj\n# macOS Apple Silicon (optional, removes sudo password prompt):\n# sudo visudo -> youruser ALL = (root) NOPASSWD: /usr/bin/powermetrics'
                )
              }
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Copy Step 2 commands"
            >
              {copiedKey === 'step2' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="overflow-x-auto pr-8">{`codecarbon detect
# Linux: enable CPU RAPL energy counters:
sudo chmod a+r /sys/class/powercap/*/energy_uj
# macOS Apple Silicon (optional visudo for powermetrics):
# youruser ALL = (root) NOPASSWD: /usr/bin/powermetrics`}</pre>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-base">
            <ShieldCheck className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Step 3 · Clean Controls &amp; Proof-of-Work Bundle</span>
          </div>
          <ul className="mt-2 text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li><strong>Machine Mode + Clean Laptop:</strong> Close browsers/videos and plug in AC power. <code className="font-mono">tracking_mode="machine"</code> is needed because Ollama runs in a separate background service.</li>
            <li><strong>Automatic Proof-of-Work:</strong> Every run saves <code className="font-mono">experiment_results.csv</code> (with timestamps and actual saved answers), CodeCarbon's raw <code className="font-mono">emissions_raw.csv</code>, and <code className="font-mono">proof_of_work.json</code> (hardware info + SHA-256 hashes).</li>
            <li><strong>Fair Settings:</strong> Fixed <code className="font-mono">temperature=0</code>, <code className="font-mono">seed=42</code>, 5s idle baseline, and 1 warmup call per model before logging.</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-base">
            <FlaskConical className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Step 4 · Fast Preliminary Run (~3–5 Min) &amp; Charts</span>
          </div>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            Start with <code className="font-mono">--preliminary</code> to get real poster numbers in minutes. Later, run <code className="font-mono">--full</code> (~15–25 min) if you want more questions per chart.
          </p>
          <div className="mt-3 bg-slate-900 text-slate-100 rounded p-3 text-[11px] font-mono relative">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  'step4',
                  '# 0. Instant check without Ollama (<1 sec):\npython run_experiment.py --dry-run --out-dir dry_check\n# 1. Fast REAL Preliminary Run (~3-5 min, poster-ready!):\npython run_experiment.py --preliminary --country DEU\n# 2. Optional Larger Run (~15-25 min, all 12 built-in questions):\npython run_experiment.py --full --country DEU --out-dir results_full\n# 3. Print plain-English summary & export 4 charts:\npython analyze_results.py --csv results_prelim/experiment_results.csv'
                )
              }
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Copy Step 4 commands"
            >
              {copiedKey === 'step4' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="overflow-x-auto pr-8 leading-relaxed">{`# 0. Instant check without Ollama (<1 sec):
python run_experiment.py --dry-run --out-dir dry_check
# 1. Fast REAL Preliminary Run (~3-5 min, poster-ready!):
python run_experiment.py --preliminary --country DEU
# 2. Optional Larger Run (~15-25 min, 12 built-in questions):
python run_experiment.py --full --country DEU --out-dir results_full
# 3. Print plain-English summary & export 4 charts:
python analyze_results.py --csv results_prelim/experiment_results.csv`}</pre>
          </div>
        </div>
      </section>

      {/* Experimental Matrix Table */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="font-display text-lg font-bold text-slate-900">
          What Each Phase Tests (Fast Preliminary vs. Full Mode)
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3 font-semibold">Phase</th>
                <th className="py-2 pr-3 font-semibold">What Changes</th>
                <th className="py-2 pr-3 font-semibold">Preliminary Calls (~3–5m)</th>
                <th className="py-2 pr-3 font-semibold">What We Measure</th>
                <th className="py-2 font-semibold">Simple Question Answered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">Phase 0: Idle</td>
                <td className="py-2.5 pr-3">Laptop sits idle for 5s</td>
                <td className="py-2.5 pr-3 font-mono">1 row (5s)</td>
                <td className="py-2.5 pr-3">Idle CPU/GPU/RAM watts</td>
                <td className="py-2.5">Separates constant RAM estimate from active work</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">RQ1: Energy Grid</td>
                <td className="py-2.5 pr-3">Input (64–1024) × Output (32–256)</td>
                <td className="py-2.5 pr-3 font-mono">9 calls</td>
                <td className="py-2.5 pr-3">mWh per token, latency (s)</td>
                <td className="py-2.5">Does input or output length cost more energy?</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">RQ2a: Output Caps</td>
                <td className="py-2.5 pr-3"><code className="font-mono">num_predict</code> (32–256) &amp; word limits</td>
                <td className="py-2.5 pr-3 font-mono">36 calls (6 Qs)</td>
                <td className="py-2.5 pr-3">Accuracy (%), mWh, sweet spot</td>
                <td className="py-2.5">Where do extra output tokens stop improving accuracy?</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">RQ2b: Input Length</td>
                <td className="py-2.5 pr-3">Same Q + Short / Med / Long notes</td>
                <td className="py-2.5 pr-3 font-mono">18 calls (6 Qs)</td>
                <td className="py-2.5 pr-3">Accuracy drop (%), extra mWh</td>
                <td className="py-2.5">Does adding extra input text hurt answer quality?</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">RQ3: Model Effect</td>
                <td className="py-2.5 pr-3"><code className="font-mono">qwen2.5:0.5b</code> vs. <code className="font-mono">qwen2.5:3b</code></td>
                <td className="py-2.5 pr-3 font-mono">12 calls (6 Qs)</td>
                <td className="py-2.5 pr-3">Acc %, avg out tokens, mWh/correct</td>
                <td className="py-2.5">Does switching local models change output &amp; energy?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 9-Box Experimental Design Canvas (Plain English) */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            9-Box Experimental Design Canvas (Plain English)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Clean, easy-to-defend summary ready for supervisor Q&amp;A (green cards highlight energy measurement &amp; validity controls).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs leading-relaxed">
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
            <h3 className="font-display font-bold text-slate-900 text-sm mb-2">1. Research question</h3>
            <p className="text-slate-700 mb-1.5">
              How do input length, output length, and model choice affect energy and answer quality, and where do extra tokens stop helping?
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li><strong>RQ1:</strong> Input vs. output energy per token.</li>
              <li><strong>RQ2:</strong> Output caps (sweet spot) &amp; longer inputs on accuracy.</li>
              <li><strong>RQ3:</strong> Small vs. larger local model on accuracy &amp; energy.</li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
            <h3 className="font-display font-bold text-slate-900 text-sm mb-2">2. System under test</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li><strong>Models:</strong> <code className="font-mono">qwen2.5:3b</code> &amp; <code className="font-mono">qwen2.5:0.5b</code> (configurable via flags).</li>
              <li><strong>Serving:</strong> Local <strong>Ollama</strong> called with the official Python <code className="font-mono">ollama.chat()</code> client.</li>
              <li><strong>Machine:</strong> Local laptop on AC power with background apps closed.</li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
            <h3 className="font-display font-bold text-slate-900 text-sm mb-2">3. Workload or input set</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li><strong>RQ1:</strong> Neutral prompts sized to 64–1024 input tokens × 32–256 output caps.</li>
              <li><strong>RQ2 &amp; RQ3:</strong> Verifiable math (<code className="font-mono">GSM8K</code>) &amp; factual (<code className="font-mono">TriviaQA</code>) questions — clean or padded with extra context notes.</li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
            <h3 className="font-display font-bold text-slate-900 text-sm mb-2">4. Energy metric and further quality</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li><strong>Energy:</strong> Total <code className="font-mono">Wh</code> split into CPU, GPU, and RAM, plus <code className="font-mono">mWh/token</code>, <strong>mWh/correct answer</strong>, and <code className="font-mono">gCO₂eq</code>.</li>
              <li><strong>Quality:</strong> Simple Pass/Fail accuracy (%) against exact known answers, with every output saved as Proof-of-Work.</li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
            <h3 className="font-display font-bold text-slate-900 text-sm mb-2">5. Varied and fixed parameters</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li><strong>Varied:</strong> Input length, output cap (<code className="font-mono">num_predict</code> &amp; word limits), context padding (Short/Med/Long), and model size.</li>
              <li><strong>Fixed:</strong> <code className="font-mono">temperature=0</code>, <code className="font-mono">seed=42</code>, same prompts across conditions, <code className="font-mono">country="DEU"</code>.</li>
            </ul>
          </div>

          <div className="bg-lime-50/70 border border-lime-300/90 rounded-lg p-4">
            <h3 className="font-display font-bold text-slate-900 text-sm mb-2">6. Source of energy data</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li><strong>Tool:</strong> CodeCarbon 3.x <code className="font-mono">OfflineEmissionsTracker</code> in <code className="font-mono">tracking_mode="machine"</code>, checked via <code className="font-mono">codecarbon detect</code>.</li>
              <li><strong>Evidence:</strong> Untouched <code className="font-mono">emissions_raw.csv</code> + <code className="font-mono">proof_of_work.json</code> with SHA-256 hashes &amp; Ollama token counts.</li>
            </ul>
          </div>

          <div className="bg-lime-50/70 border border-lime-300/90 rounded-lg p-4">
            <h3 className="font-display font-bold text-slate-900 text-sm mb-2">7. Repetitions and run order</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li><strong>Setup:</strong> 5s idle check → 1 unmeasured warmup prompt per model so weights are already in RAM.</li>
              <li><strong>Modes:</strong> Fast <code className="font-mono">--preliminary</code> (75 calls, ~3–5 min) for poster milestones; <code className="font-mono">--full</code> (2 repeats in RQ1 + 12 questions) for final depth.</li>
            </ul>
          </div>

          <div className="bg-lime-50/70 border border-lime-300/90 rounded-lg p-4">
            <h3 className="font-display font-bold text-slate-900 text-sm mb-2">8. Threats to validity</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li><strong>Constant RAM Model:</strong> CodeCarbon estimates RAM as a fixed wattage; we log RAM separately and measure idle power first.</li>
              <li><strong>Small Sample in Preliminary Run:</strong> 6 questions give fast directional results; <code className="font-mono">--full</code> expands sample size.</li>
              <li><strong>Scope:</strong> Local models only (cloud APIs need EcoLogits); CO₂ varies widely by electricity grid (SWE/DEU/IND).</li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
            <h3 className="font-display font-bold text-slate-900 text-sm mb-2">9. Applicable concepts and tools from today</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li><strong>Course Concepts:</strong> Measured vs. estimated power, machine vs. process tracking, idle baseline, regional CO₂ intensity, CodeCarbon vs. EcoLogits.</li>
              <li><strong>Simple Metrics:</strong> Averages, mWh/token straight-line trend, sweet spot plateau, mWh/correct answer, Proof-of-Work audit trail.</li>
              <li><strong>Stack:</strong> <code className="font-mono">ollama</code>, <code className="font-mono">codecarbon</code>, <code className="font-mono">pandas</code>, <code className="font-mono">matplotlib</code>.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Downloadable & Viewable Code Kit */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Downloadable Python Kit (Simple &amp; Fast)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Download all 4 files into one folder on your laptop and run Step 4 for real preliminary results in ~3–5 minutes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {KIT_FILES.map((file) => (
              <a
                key={file.name}
                href={file.path}
                download={file.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                <span>{file.name}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-2">
            {KIT_FILES.map((file) => {
              const active = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  type="button"
                  onClick={() => setSelectedFile(file)}
                  className={`px-3 py-2 text-xs font-mono font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'border-teal-700 text-slate-900 bg-white rounded-t'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {file.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => handleCopy('code-viewer', activeText)}
            disabled={!activeText}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            {copiedKey === 'code-viewer' ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy File</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-slate-950 text-slate-100">
          <p className="text-xs text-slate-400 mb-2 font-sans">{selectedFile.description}</p>
          {loadingFile ? (
            <div className="py-12 text-center text-xs font-mono text-slate-400">Loading {selectedFile.name}...</div>
          ) : (
            <pre className="text-xs font-mono leading-relaxed overflow-x-auto max-h-[460px]">
              <code>{activeText}</code>
            </pre>
          )}
        </div>
      </section>
    </div>
  );
};

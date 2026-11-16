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
    description: 'Main Ollama + CodeCarbon experiment runner for RQ1, RQ2, and RQ3.',
  },
  {
    name: 'analyze_results.py',
    path: '/kit/analyze_results.py',
    description: 'Computes OLS slopes, Kneedle knee point, McNemar test, and 300-DPI plots.',
  },
  {
    name: 'requirements.txt',
    path: '/kit/requirements.txt',
    description: 'Exact Python packages (codecarbon, pandas, scipy, matplotlib, datasets).',
  },
  {
    name: 'sample_results.csv',
    path: '/kit/sample_results.csv',
    description: 'Valid sample output file to test analyze_results.py and Poster CSV import.',
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
          Reproducible Local Protocol · Ollama + CodeCarbon
        </p>
        <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
          Step-by-Step Scientific Method for Your Local Computer
        </h1>
        <p className="mt-2 text-sm text-slate-700 max-w-3xl leading-relaxed">
          Follow this protocol on your own laptop (Linux, macOS, or Windows with 16 GB RAM — no dedicated GPU required) to measure real energy consumption in Watt-hours (Wh) with <strong>CodeCarbon</strong> and local inference with <strong>Ollama (<code className="font-mono">qwen3:1.7b</code>)</strong>. Once complete, upload <code className="font-mono">experiment_results.csv</code> into the <strong>Scientific Poster</strong> tab to replace the pilot baseline with your own hardware data.
        </p>
      </section>

      {/* 4-Step Execution Guide */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-base">
            <Terminal className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Step 1 · Install Ollama & Pull Qwen3-1.7B</span>
          </div>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            Ollama runs quantized local models on CPU or GPU and exposes exact prompt and generation token counts (<code className="font-mono">prompt_eval_count</code>, <code className="font-mono">eval_count</code>) plus a native <code className="font-mono">think: true/false</code> toggle for Qwen3.
          </p>
          <div className="mt-3 bg-slate-900 text-slate-100 rounded p-3 text-xs font-mono relative">
            <button
              type="button"
              onClick={() => handleCopy('step1', 'ollama pull qwen3:1.7b\nollama list')}
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Copy Step 1 commands"
            >
              {copiedKey === 'step1' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="overflow-x-auto pr-8">{`# 1. Install Ollama from https://ollama.com\nollama pull qwen3:1.7b\nollama list`}</pre>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-base">
            <Cpu className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Step 2 · Python Environment & CodeCarbon RAPL</span>
          </div>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            CodeCarbon reads Intel/AMD CPU RAPL energy counters (or falls back to TDP-weighted CPU load if locked) and NVIDIA NVML if a GPU is present. On Linux laptops, grant read access to RAPL so energy is measured directly from hardware counters instead of TDP estimates.
          </p>
          <div className="mt-3 bg-slate-900 text-slate-100 rounded p-3 text-xs font-mono relative">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  'step2',
                  'python3 -m venv venv && source venv/bin/activate\npip install -r requirements.txt\n# Linux only (optional, enables hardware RAPL reading):\nsudo chmod -R a+r /sys/class/powercap/intel-rapl'
                )
              }
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Copy Step 2 commands"
            >
              {copiedKey === 'step2' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="overflow-x-auto pr-8">{`python3 -m venv venv && source venv/bin/activate\npip install -r requirements.txt\n# Linux optional (enables exact hardware RAPL):\nsudo chmod -R a+r /sys/class/powercap/intel-rapl`}</pre>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-base">
            <ShieldCheck className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Step 3 · Experimental Controls (Scientific Rigor)</span>
          </div>
          <ul className="mt-2 text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li><strong>Determinism:</strong> Fix <code className="font-mono">temperature=0</code> and <code className="font-mono">seed=42</code> (matching Zadenoori et al. [2]) so accuracy differences come from token limits or thinking mode, not random sampling.</li>
            <li><strong>Warmup & Thermal Stability:</strong> Run 2 unmeasured warmup prompts first (Fernandez et al. [4]) and keep a <code className="font-mono">0.5s</code> cooldown between sweeps. Plug laptop into AC power and close browsers/background video.</li>
            <li><strong>Offline Metering:</strong> Use <code className="font-mono">OfflineEmissionsTracker(country_iso_code="DEU")</code> so CodeCarbon never wastes network time polling external APIs mid-request.</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-base">
            <FlaskConical className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Step 4 · Execute Smoke Test, Full Run & Analysis</span>
          </div>
          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            Always run a 1-minute <code className="font-mono">--quick</code> check first, verify your CSV rows, then run the full benchmark (<code className="font-mono">--samples 30</code> or <code className="font-mono">50</code> per dataset) and generate figures.
          </p>
          <div className="mt-3 bg-slate-900 text-slate-100 rounded p-3 text-xs font-mono relative">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  'step4',
                  'python run_experiment.py --dry-run --quick --offline\npython run_experiment.py --quick --offline\npython run_experiment.py --samples 30 --country DEU\npython analyze_results.py --csv experiment_results.csv --out-dir figures'
                )
              }
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Copy Step 4 commands"
            >
              {copiedKey === 'step4' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="overflow-x-auto pr-8">{`# 0. Verify Python script offline:\npython run_experiment.py --dry-run --quick --offline\n# 1. Fast 1-2 min smoke test with real Ollama:\npython run_experiment.py --quick --offline\n# 2. Full benchmark (GSM8K, MATH-500, TriviaQA):\npython run_experiment.py --samples 30 --country DEU\n# 3. Generate stats & 300-DPI charts:\npython analyze_results.py --csv experiment_results.csv`}</pre>
          </div>
        </div>
      </section>

      {/* Experimental Matrix Table */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="font-display text-lg font-bold text-slate-900">
          Experimental Design Matrix (Mapped to RQ1, RQ2 & RQ3)
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3 font-semibold">Phase</th>
                <th className="py-2 pr-3 font-semibold">Independent Variables</th>
                <th className="py-2 pr-3 font-semibold">Controlled Variables</th>
                <th className="py-2 pr-3 font-semibold">Dependent Metrics</th>
                <th className="py-2 font-semibold">Statistical Analysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">RQ1: Token Scaling</td>
                <td className="py-2.5 pr-3">Input ∈ &#123;64..2048&#125;, Output ∈ &#123;32..512&#125;</td>
                <td className="py-2.5 pr-3 font-mono">think=off, temp=0, 3 repeats</td>
                <td className="py-2.5 pr-3">Energy (Wh), Latency (s), mWh/token</td>
                <td className="py-2.5">OLS linear slopes + Input×Output 2D Heatmap</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">RQ2: Output Limits</td>
                <td className="py-2.5 pr-3"><code className="font-mono">num_predict</code> ∈ &#123;32..1024&#125; &amp; "in N words"</td>
                <td className="py-2.5 pr-3 font-mono">think=off, GSM8K / MATH-500 / TriviaQA</td>
                <td className="py-2.5 pr-3">Accuracy (%), Mean Wh, Wh/Correct</td>
                <td className="py-2.5">Pareto Frontier + Kneedle Elbow Knee Detection</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">RQ3: Thinking Mode</td>
                <td className="py-2.5 pr-3"><code className="font-mono">think=false</code> vs. <code className="font-mono">think=true</code></td>
                <td className="py-2.5 pr-3 font-mono">Same prompts (paired), max=1536 tok</td>
                <td className="py-2.5 pr-3">Thinking tokens, Wh/Correct, ΔAcc/ΔWh</td>
                <td className="py-2.5">Paired McNemar Test (Exact Binomial / χ²)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Downloadable & Viewable Code Kit */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Complete Local Experiment Code Kit
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Download all 4 files into a single folder on your laptop and run the commands in Step 4.
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

        {/* File selector tabs */}
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

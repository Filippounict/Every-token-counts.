import React from 'react';

export const PipelineDiagramSvg: React.FC<{ id?: string }> = ({ id = 'fig-pipeline-svg' }) => {
  return (
    <svg
      id={id}
      viewBox="0 0 640 164"
      className="w-full h-auto block"
      role="img"
      aria-label="Experimental pipeline: Benchmarks feed into local Ollama Qwen3-1.7B, tracked by CodeCarbon, evaluated by Answer Verifier and McNemar Test"
    >
      <defs>
        <marker
          id="arrowHead"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
        </marker>
      </defs>

      <rect x="0" y="0" width="640" height="164" fill="#F8FAFC" rx="6" />

      {/* Stage 1: Benchmarks */}
      <rect x="12" y="20" width="136" height="124" rx="5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
      <rect x="12" y="20" width="136" height="24" rx="5" fill="#0F172A" />
      <rect x="12" y="36" width="136" height="8" fill="#0F172A" />
      <text x="80" y="36" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="Public Sans, sans-serif">
        1. PROMPT SUITE
      </text>
      <text x="22" y="64" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="Public Sans, sans-serif">
        • GSM8K (Math)
      </text>
      <text x="22" y="82" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="Public Sans, sans-serif">
        • MATH-500 (L1–L5)
      </text>
      <text x="22" y="100" fill="#0F172A" fontSize="10" fontWeight="600" fontFamily="Public Sans, sans-serif">
        • TriviaQA (Facts)
      </text>
      <text x="22" y="122" fill="#475569" fontSize="9" fontFamily="IBM Plex Mono, monospace">
        + Synthetic Sweep
      </text>
      <text x="22" y="135" fill="#475569" fontSize="9" fontFamily="IBM Plex Mono, monospace">
        (64–2048 tokens)
      </text>

      <line x1="148" y1="82" x2="170" y2="82" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowHead)" />

      {/* Stage 2: Local Ollama Serving */}
      <rect x="174" y="20" width="144" height="124" rx="5" fill="#FFFFFF" stroke="#0F766E" strokeWidth="1.4" />
      <rect x="174" y="20" width="144" height="24" rx="5" fill="#0F766E" />
      <rect x="174" y="36" width="144" height="8" fill="#0F766E" />
      <text x="246" y="36" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="Public Sans, sans-serif">
        2. OLLAMA LOCAL
      </text>
      <text x="184" y="64" fill="#0F172A" fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">
        qwen3:1.7b
      </text>
      <text x="184" y="82" fill="#334155" fontSize="9.5" fontFamily="Public Sans, sans-serif">
        temp=0 · seed=42
      </text>
      <text x="184" y="100" fill="#1D4ED8" fontSize="9.5" fontWeight="600" fontFamily="IBM Plex Mono, monospace">
        think: false vs true
      </text>
      <text x="184" y="118" fill="#B45309" fontSize="9.5" fontWeight="600" fontFamily="IBM Plex Mono, monospace">
        num_predict: 32–1024
      </text>
      <text x="184" y="135" fill="#475569" fontSize="9" fontFamily="Public Sans, sans-serif">
        Prompt & eval tokens
      </text>

      <line x1="318" y1="82" x2="340" y2="82" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowHead)" />

      {/* Stage 3: CodeCarbon Energy Tracker */}
      <rect x="344" y="20" width="136" height="124" rx="5" fill="#FFFFFF" stroke="#B91C1C" strokeWidth="1.4" />
      <rect x="344" y="20" width="136" height="24" rx="5" fill="#B91C1C" />
      <rect x="344" y="36" width="136" height="8" fill="#B91C1C" />
      <text x="412" y="36" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="Public Sans, sans-serif">
        3. CODECARBON
      </text>
      <text x="354" y="64" fill="#0F172A" fontSize="9.5" fontWeight="600" fontFamily="Public Sans, sans-serif">
        Offline Tracker
      </text>
      <text x="354" y="82" fill="#334155" fontSize="9.5" fontFamily="Public Sans, sans-serif">
        • CPU RAPL / Power
      </text>
      <text x="354" y="99" fill="#334155" fontSize="9.5" fontFamily="Public Sans, sans-serif">
        • GPU NVML (if any)
      </text>
      <text x="354" y="116" fill="#334155" fontSize="9.5" fontFamily="Public Sans, sans-serif">
        • RAM Energy (Wh)
      </text>
      <text x="354" y="135" fill="#B91C1C" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono, monospace">
        mWh/tok · Wh/query
      </text>

      <line x1="480" y1="82" x2="502" y2="82" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowHead)" />

      {/* Stage 4: Evaluation & Stats */}
      <rect x="506" y="20" width="122" height="124" rx="5" fill="#FFFFFF" stroke="#1D4ED8" strokeWidth="1.4" />
      <rect x="506" y="20" width="122" height="24" rx="5" fill="#1D4ED8" />
      <rect x="506" y="36" width="122" height="8" fill="#1D4ED8" />
      <text x="567" y="36" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="Public Sans, sans-serif">
        4. ANALYSIS
      </text>
      <text x="515" y="64" fill="#0F172A" fontSize="9.5" fontWeight="600" fontFamily="Public Sans, sans-serif">
        Exact / Boxed Match
      </text>
      <text x="515" y="82" fill="#334155" fontSize="9.5" fontFamily="Public Sans, sans-serif">
        • Wh / Correct Ans
      </text>
      <text x="515" y="99" fill="#334155" fontSize="9.5" fontFamily="Public Sans, sans-serif">
        • Kneedle Elbow
      </text>
      <text x="515" y="116" fill="#334155" fontSize="9.5" fontFamily="Public Sans, sans-serif">
        • McNemar Paired
      </text>
      <text x="515" y="135" fill="#1D4ED8" fontSize="9" fontWeight="600" fontFamily="IBM Plex Mono, monospace">
        OLS + Heatmap
      </text>
    </svg>
  );
};

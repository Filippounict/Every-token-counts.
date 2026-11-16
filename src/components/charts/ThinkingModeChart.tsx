import React, { useState } from 'react';
import type { ThinkingTaskSummary } from '../../types/experiment';

interface ThinkingModeChartProps {
  id?: string;
  byDataset: ThinkingTaskSummary[];
  byDifficulty: ThinkingTaskSummary[];
}

export const ThinkingModeChart: React.FC<ThinkingModeChartProps> = ({
  id = 'fig4-thinking-mode-svg',
  byDataset,
  byDifficulty,
}) => {
  const [viewMode, setViewMode] = useState<'dataset' | 'difficulty'>('dataset');
  const [hoveredRow, setHoveredRow] = useState<ThinkingTaskSummary | null>(null);

  const activeRows = viewMode === 'difficulty' && byDifficulty.length > 0 ? byDifficulty : byDataset;

  const width = 460;
  const height = 252;
  const pad = { top: 34, right: 52, bottom: 44, left: 46 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxWhPerCorrectMwh = Math.max(
    40,
    ...activeRows.flatMap((r) => [
      (r.whPerCorrectOff ?? 0) * 1000,
      (r.whPerCorrectOn ?? 0) * 1000,
    ])
  ) * 1.15;

  const groupW = activeRows.length > 0 ? plotW / activeRows.length : plotW;
  const barW = Math.min(24, groupW * 0.28);

  const yAcc = (pct: number) => pad.top + plotH - (pct / 100) * plotH;
  const yCost = (mwh: number) => pad.top + plotH - (mwh / maxWhPerCorrectMwh) * plotH;

  return (
    <div>
      {byDifficulty.length > 0 && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-600">
            Accuracy (bars) & Cost per Correct Answer (markers)
          </span>
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('dataset')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded whitespace-nowrap cursor-pointer transition-colors ${
                viewMode === 'dataset' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Task
            </button>
            <button
              type="button"
              onClick={() => setViewMode('difficulty')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded whitespace-nowrap cursor-pointer transition-colors ${
                viewMode === 'difficulty' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MATH L1–L5
            </button>
          </div>
        </div>
      )}

      <svg
        id={id}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        role="img"
        aria-label="RQ3 Grouped chart comparing Thinking OFF versus Thinking ON accuracy and milliwatt-hours per correct answer"
      >
        <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />

        {/* Left Axis Grid (Accuracy %) */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = yAcc(pct);
          return (
            <g key={pct}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text
                x={pad.left - 7}
                y={y + 3}
                textAnchor="end"
                fill="#475569"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Right Axis Ticks (mWh per Correct Answer) */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
          const val = frac * maxWhPerCorrectMwh;
          const y = yCost(val);
          return (
            <text
              key={idx}
              x={width - pad.right + 7}
              y={y + 3}
              textAnchor="start"
              fill="#B91C1C"
              fontSize="9"
              fontFamily="IBM Plex Mono, monospace"
            >
              {val.toFixed(0)}
            </text>
          );
        })}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="#94A3B8" strokeWidth="1.2" />
        <line x1={width - pad.right} y1={pad.top} x2={width - pad.right} y2={pad.top + plotH} stroke="#FCA5A5" strokeWidth="1.2" />
        <line x1={pad.left} y1={pad.top + plotH} x2={width - pad.right} y2={pad.top + plotH} stroke="#94A3B8" strokeWidth="1.2" />

        {/* Axis Titles */}
        <text
          x={13}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          fill="#0F172A"
          fontSize="9.5"
          fontWeight="600"
          fontFamily="Public Sans, sans-serif"
          transform={`rotate(-90 13 ${pad.top + plotH / 2})`}
        >
          Accuracy (%)
        </text>
        <text
          x={width - 11}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          fill="#B91C1C"
          fontSize="9.5"
          fontWeight="600"
          fontFamily="Public Sans, sans-serif"
          transform={`rotate(90 ${width - 11} ${pad.top + plotH / 2})`}
        >
          mWh / Correct
        </text>

        {/* Groups */}
        {activeRows.map((row, idx) => {
          const cx = pad.left + idx * groupW + groupW / 2;
          const offBarX = cx - barW - 2;
          const onBarX = cx + 2;

          const offBarY = yAcc(row.accOffPct);
          const onBarY = yAcc(row.accOnPct);

          const offCostMwh = (row.whPerCorrectOff ?? 0) * 1000;
          const onCostMwh = (row.whPerCorrectOn ?? 0) * 1000;

          return (
            <g
              key={row.label}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredRow(row)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Accuracy Bars */}
              <rect
                x={offBarX}
                y={offBarY}
                width={barW}
                height={Math.max(1, pad.top + plotH - offBarY)}
                fill="#94A3B8"
                rx="2"
              />
              <rect
                x={onBarX}
                y={onBarY}
                width={barW}
                height={Math.max(1, pad.top + plotH - onBarY)}
                fill="#0F766E"
                rx="2"
              />

              {/* Cost-per-correct diamond markers */}
              {row.whPerCorrectOff !== null && (
                <circle
                  cx={offBarX + barW / 2}
                  cy={yCost(offCostMwh)}
                  r={4}
                  fill="#1E293B"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                />
              )}
              {row.whPerCorrectOn !== null && (
                <polygon
                  points={`${onBarX + barW / 2},${yCost(onCostMwh) - 5} ${onBarX + barW / 2 + 5},${yCost(onCostMwh)} ${onBarX + barW / 2},${yCost(onCostMwh) + 5} ${onBarX + barW / 2 - 5},${yCost(onCostMwh)}`}
                  fill="#B91C1C"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                />
              )}

              {/* X label */}
              <text
                x={cx}
                y={pad.top + plotH + 15}
                textAnchor="middle"
                fill="#0F172A"
                fontSize="9.5"
                fontWeight="600"
                fontFamily="Public Sans, sans-serif"
              >
                {row.label}
              </text>
              <text
                x={cx}
                y={pad.top + plotH + 28}
                textAnchor="middle"
                fill="#0F766E"
                fontSize="8.5"
                fontFamily="IBM Plex Mono, monospace"
              >
                {row.accOnPct - row.accOffPct >= 0 ? '+' : ''}
                {(row.accOnPct - row.accOffPct).toFixed(1)}%
              </text>
            </g>
          );
        })}

        {/* Top Legend */}
        <g transform={`translate(${pad.left}, 6)`}>
          <rect x="0" y="2" width="10" height="10" fill="#94A3B8" rx="1" />
          <text x="14" y="10" fill="#0F172A" fontSize="8.8" fontWeight="600" fontFamily="Public Sans, sans-serif">
            Direct Acc
          </text>

          <rect x="76" y="2" width="10" height="10" fill="#0F766E" rx="1" />
          <text x="90" y="10" fill="#0F172A" fontSize="8.8" fontWeight="600" fontFamily="Public Sans, sans-serif">
            Thinking Acc
          </text>

          <circle cx="164" cy="7" r="3.5" fill="#1E293B" />
          <text x="172" y="10" fill="#0F172A" fontSize="8.8" fontWeight="600" fontFamily="Public Sans, sans-serif">
            mWh/Corr (Off)
          </text>

          <polygon points="256,2 261,7 256,12 251,7" fill="#B91C1C" />
          <text x="265" y="10" fill="#B91C1C" fontSize="8.8" fontWeight="600" fontFamily="Public Sans, sans-serif">
            mWh/Corr (On)
          </text>
        </g>
      </svg>

      {hoveredRow && (
        <div className="mt-1.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-mono tabular-nums rounded flex flex-wrap items-center justify-between gap-2">
          <span>
            {hoveredRow.label}: Off {hoveredRow.accOffPct.toFixed(1)}% → On {hoveredRow.accOnPct.toFixed(1)}%
          </span>
          <span>
            {hoveredRow.energyOffWh > 0 ? `${(hoveredRow.energyOnWh / hoveredRow.energyOffWh).toFixed(1)}× energy` : '—'}
            {hoveredRow.extraAccPerExtraWh !== null
              ? ` · ${(hoveredRow.extraAccPerExtraWh / 10).toFixed(2)}% / +100mWh`
              : ''}
          </span>
        </div>
      )}
    </div>
  );
};

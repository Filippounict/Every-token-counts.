import React, { useState } from 'react';
import type { InputQualitySummary } from '../../types/experiment';

interface InputQualityChartProps {
  id?: string;
  rows: InputQualitySummary[];
}

export const InputQualityChart: React.FC<InputQualityChartProps> = ({
  id = 'fig4-input-quality-svg',
  rows,
}) => {
  const [hovered, setHovered] = useState<InputQualitySummary | null>(null);

  const width = 460;
  const height = 240;
  const pad = { top: 40, right: 50, bottom: 44, left: 46 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxMwh = Math.max(30, ...rows.map((r) => r.avgEnergyWh * 1000)) * 1.22;
  const groupW = rows.length > 0 ? plotW / rows.length : plotW;
  const barW = Math.min(44, groupW * 0.42);

  const yAcc = (pct: number) => pad.top + plotH - (pct / 100) * plotH;
  const yMwh = (mwh: number) => pad.top + plotH - (mwh / maxMwh) * plotH;

  const energyPath = rows
    .map((r, idx) => {
      const cx = pad.left + idx * groupW + groupW / 2;
      const cy = yMwh(r.avgEnergyWh * 1000);
      return `${idx === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div>
      <svg
        id={id}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        role="img"
        aria-label="Chart comparing answer accuracy and average energy across Short, Medium, and Long input prompts for the same questions"
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

        {/* Right Axis Ticks (Energy mWh) */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
          const val = frac * maxMwh;
          const y = yMwh(val);
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

        {/* Axis titles */}
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
          Energy (mWh)
        </text>

        {/* Accuracy Bars */}
        {rows.map((row, idx) => {
          const cx = pad.left + idx * groupW + groupW / 2;
          const barX = cx - barW / 2;
          const barY = yAcc(row.accuracyPct);
          const barFill =
            row.level === 'short' ? '#0F766E' : row.level === 'medium' ? '#0284C7' : '#64748B';
          return (
            <g
              key={row.level}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(row)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={barX}
                y={barY}
                width={barW}
                height={Math.max(2, pad.top + plotH - barY)}
                fill={barFill}
                rx="3"
              />
              <text
                x={cx}
                y={barY - 6}
                textAnchor="middle"
                fill="#0F172A"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                {row.accuracyPct.toFixed(0)}%
              </text>
              <text
                x={cx}
                y={pad.top + plotH + 15}
                textAnchor="middle"
                fill="#0F172A"
                fontSize="9.5"
                fontWeight="600"
                fontFamily="Public Sans, sans-serif"
              >
                {row.level === 'short' ? 'Short input' : row.level === 'medium' ? 'Medium input' : 'Long input'}
              </text>
              <text
                x={cx}
                y={pad.top + plotH + 28}
                textAnchor="middle"
                fill="#475569"
                fontSize="8.5"
                fontFamily="IBM Plex Mono, monospace"
              >
                ~{Math.round(row.avgInputTokens)} tok
              </text>
            </g>
          );
        })}

        {/* Energy overlay line + diamond markers */}
        {rows.length > 1 && (
          <path d={energyPath} fill="none" stroke="#B91C1C" strokeWidth="2" strokeDasharray="4 2" />
        )}
        {rows.map((row, idx) => {
          const cx = pad.left + idx * groupW + groupW / 2;
          const cy = yMwh(row.avgEnergyWh * 1000);
          return (
            <g
              key={`e-${row.level}`}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(row)}
              onMouseLeave={() => setHovered(null)}
            >
              <polygon
                points={`${cx},${cy - 5.5} ${cx + 5.5},${cy} ${cx},${cy + 5.5} ${cx - 5.5},${cy}`}
                fill="#B91C1C"
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
            </g>
          );
        })}

        {/* Top Legend */}
        <g transform={`translate(${pad.left}, 4)`}>
          <rect x="0" y="2" width="10" height="10" fill="#0F766E" rx="1.5" />
          <text x="14" y="10" fill="#0F172A" fontSize="9" fontWeight="600" fontFamily="Public Sans, sans-serif">
            Answer Accuracy (%)
          </text>
          <polygon points="154,2 159,7 154,12 149,7" fill="#B91C1C" />
          <text x="164" y="10" fill="#B91C1C" fontSize="9" fontWeight="600" fontFamily="Public Sans, sans-serif">
            Average Energy (mWh)
          </text>
        </g>
      </svg>

      {hovered && (
        <div className="mt-1.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-mono tabular-nums rounded flex flex-wrap items-center justify-between gap-2">
          <span>
            {hovered.label}: {hovered.correctCount}/{hovered.count} correct ({hovered.accuracyPct.toFixed(0)}%)
          </span>
          <span>
            {(hovered.avgEnergyWh * 1000).toFixed(1)} mWh · {hovered.avgLatencySec.toFixed(2)}s
          </span>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import type { ParetoPoint } from '../../types/experiment';

interface ParetoKneeChartProps {
  id?: string;
  tokenLimitCurve: ParetoPoint[];
  wordLimitCurve: ParetoPoint[];
  kneePoint: ParetoPoint | null;
}

export const ParetoKneeChart: React.FC<ParetoKneeChartProps> = ({
  id = 'fig3-pareto-knee-svg',
  tokenLimitCurve,
  wordLimitCurve,
  kneePoint,
}) => {
  const [hovered, setHovered] = useState<ParetoPoint | null>(null);

  const width = 460;
  const height = 240;
  const pad = { top: 24, right: 20, bottom: 40, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allPts = [...tokenLimitCurve, ...wordLimitCurve];
  const maxMwh = Math.max(15, ...allPts.map((p) => p.energyWh * 1000)) * 1.12;
  const minAcc = Math.max(0, Math.floor((Math.min(10, ...allPts.map((p) => p.accuracyPct)) - 5) / 10) * 10);
  const maxAcc = Math.min(100, Math.ceil((Math.max(85, ...allPts.map((p) => p.accuracyPct)) + 5) / 10) * 10);

  const xScale = (mwh: number) => pad.left + (mwh / maxMwh) * plotW;
  const yScale = (acc: number) =>
    pad.top + plotH - ((acc - minAcc) / Math.max(1, maxAcc - minAcc)) * plotH;

  const toPath = (pts: ParetoPoint[]) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.energyWh * 1000).toFixed(1)} ${yScale(p.accuracyPct).toFixed(1)}`)
      .join(' ');

  const xTicks = [0, maxMwh * 0.25, maxMwh * 0.5, maxMwh * 0.75, maxMwh];
  const yTicks = [minAcc, (minAcc + maxAcc) / 2, maxAcc];

  const kneeX = kneePoint ? xScale(kneePoint.energyWh * 1000) : null;
  const kneeY = kneePoint ? yScale(kneePoint.accuracyPct) : null;

  return (
    <div>
      <svg
        id={id}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        role="img"
        aria-label="RQ2 Pareto frontier of Accuracy versus Energy with Saturation Knee Point highlighted"
      >
        <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />

        {/* Shaded Diminishing Returns Region beyond the Knee */}
        {kneeX !== null && (
          <g>
            <rect
              x={kneeX}
              y={pad.top}
              width={Math.max(0, width - pad.right - kneeX)}
              height={plotH}
              fill="#FEF2F2"
              opacity="0.7"
            />
            <line
              x1={kneeX}
              y1={pad.top}
              x2={kneeX}
              y2={pad.top + plotH}
              stroke="#B91C1C"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <text
              x={Math.min(width - pad.right - 4, kneeX + 6)}
              y={pad.top + 14}
              fill="#991B1B"
              fontSize="8.5"
              fontWeight="600"
              fontFamily="Public Sans, sans-serif"
            >
              Diminishing Returns (+Energy, ~0% Acc)
            </text>
          </g>
        )}

        {/* Gridlines */}
        {yTicks.map((t, i) => {
          const y = yScale(t);
          return (
            <g key={i}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text
                x={pad.left - 8}
                y={y + 3}
                textAnchor="end"
                fill="#475569"
                fontSize="9.5"
                fontFamily="IBM Plex Mono, monospace"
              >
                {t.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {xTicks.map((t, i) => {
          const x = xScale(t);
          return (
            <g key={i}>
              <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotH} stroke="#F1F5F9" strokeWidth="1" />
              <text
                x={x}
                y={height - pad.bottom + 14}
                textAnchor="middle"
                fill="#475569"
                fontSize="9.5"
                fontFamily="IBM Plex Mono, monospace"
              >
                {t.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="#94A3B8" strokeWidth="1.2" />
        <line x1={pad.left} y1={pad.top + plotH} x2={width - pad.right} y2={pad.top + plotH} stroke="#94A3B8" strokeWidth="1.2" />

        <text
          x={pad.left + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          fill="#0F172A"
          fontSize="10"
          fontWeight="600"
          fontFamily="Public Sans, sans-serif"
        >
          Mean Energy per Query (mWh)
        </text>
        <text
          x={14}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          fill="#0F172A"
          fontSize="10"
          fontWeight="600"
          fontFamily="Public Sans, sans-serif"
          transform={`rotate(-90 14 ${pad.top + plotH / 2})`}
        >
          Accuracy (%)
        </text>

        {/* Word-limit Curve (Prompt constraint) */}
        {wordLimitCurve.length > 1 && (
          <path
            d={toPath(wordLimitCurve)}
            fill="none"
            stroke="#B45309"
            strokeWidth="1.8"
            strokeDasharray="5 3"
          />
        )}

        {/* Token-limit Curve (num_predict) */}
        {tokenLimitCurve.length > 1 && (
          <path d={toPath(tokenLimitCurve)} fill="none" stroke="#0F766E" strokeWidth="2.4" />
        )}

        {/* Word-limit markers */}
        {wordLimitCurve.map((pt) => {
          const cx = xScale(pt.energyWh * 1000);
          const cy = yScale(pt.accuracyPct);
          return (
            <g
              key={`wl-${pt.limit}`}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(pt)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={cx - 3.5}
                y={cy - 3.5}
                width={7}
                height={7}
                fill="#B45309"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* Token-limit markers + labels */}
        {tokenLimitCurve.map((pt, idx) => {
          const cx = xScale(pt.energyWh * 1000);
          const cy = yScale(pt.accuracyPct);
          return (
            <g
              key={`tl-${pt.limit}`}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(pt)}
              onMouseLeave={() => setHovered(null)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={pt.isKnee ? 6 : 4.2}
                fill={pt.isKnee ? '#B91C1C' : '#0F766E'}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <text
                x={cx}
                y={cy + (idx % 2 === 0 ? -9 : 14)}
                textAnchor="middle"
                fill={pt.isKnee ? '#B91C1C' : '#0F172A'}
                fontSize="8.5"
                fontWeight={pt.isKnee ? '700' : '600'}
                fontFamily="IBM Plex Mono, monospace"
              >
                {pt.limit}
              </text>
            </g>
          );
        })}

        {/* Knee annotation callout with clean background box so it never overlaps curves */}
        {kneeX !== null && kneeY !== null && kneePoint && (() => {
          const labelW = 148;
          const labelH = 20;
          const boxX = Math.max(pad.left + 6, Math.min(width - pad.right - labelW - 6, kneeX - labelW / 2));
          const boxY = Math.max(pad.top + 22, kneeY - 34);
          return (
            <g>
              <circle cx={kneeX} cy={kneeY} r={10} fill="none" stroke="#B91C1C" strokeWidth="1.4" />
              <line
                x1={kneeX}
                y1={kneeY - 10}
                x2={boxX + labelW / 2}
                y2={boxY + labelH}
                stroke="#B91C1C"
                strokeWidth="1"
              />
              <rect
                x={boxX}
                y={boxY}
                width={labelW}
                height={labelH}
                rx="3"
                fill="#FEF2F2"
                stroke="#FCA5A5"
                strokeWidth="1"
              />
              <text
                x={boxX + labelW / 2}
                y={boxY + 13.5}
                textAnchor="middle"
                fill="#991B1B"
                fontSize="9"
                fontWeight="700"
                fontFamily="Public Sans, sans-serif"
              >
                Knee: {kneePoint.limit} tok ({kneePoint.accuracyPct.toFixed(1)}%)
              </text>
            </g>
          );
        })()}

        {/* Compact Legend bottom right */}
        <g transform={`translate(${width - pad.right - 168}, ${pad.top + plotH - 42})`}>
          <rect x="0" y="0" width="164" height="36" rx="4" fill="#FFFFFF" fillOpacity="0.92" stroke="#E2E8F0" strokeWidth="1" />
          <circle cx="12" cy="12" r="3.5" fill="#0F766E" />
          <text x="21" y="15" fill="#0F172A" fontSize="8.8" fontWeight="600" fontFamily="Public Sans, sans-serif">
            num_predict cap (tokens)
          </text>
          <rect x="8.5" y="22" width="7" height="7" fill="#B45309" />
          <text x="21" y="28.5" fill="#0F172A" fontSize="8.8" fontWeight="600" fontFamily="Public Sans, sans-serif">
            "Answer in N words" prompt
          </text>
        </g>
      </svg>

      {hovered && (
        <div className="mt-1.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-mono tabular-nums rounded flex items-center justify-between">
          <span>Limit: {hovered.label}</span>
          <span>
            Acc {hovered.accuracyPct.toFixed(1)}% · {(hovered.energyWh * 1000).toFixed(1)} mWh · {(hovered.whPerCorrect * 1000).toFixed(1)} mWh/correct
          </span>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import type { OutputCapPoint } from '../../types/experiment';

interface ParetoKneeChartProps {
  id?: string;
  tokenLimitCurve: OutputCapPoint[];
  wordLimitCurve: OutputCapPoint[];
  sweetSpot: OutputCapPoint | null;
}

export const ParetoKneeChart: React.FC<ParetoKneeChartProps> = ({
  id = 'fig3-output-caps-svg',
  tokenLimitCurve,
  wordLimitCurve,
  sweetSpot,
}) => {
  const [hovered, setHovered] = useState<OutputCapPoint | null>(null);

  const width = 460;
  const height = 244;
  const pad = { top: 34, right: 22, bottom: 40, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allPts = [...tokenLimitCurve, ...wordLimitCurve];
  const maxMwh = Math.max(15, ...allPts.map((p) => p.energyWh * 1000)) * 1.22;
  const minAcc = 0;
  const maxAcc = 100;

  const xScale = (mwh: number) => pad.left + (mwh / maxMwh) * plotW;
  const yScale = (acc: number) =>
    pad.top + plotH - ((acc - minAcc) / (maxAcc - minAcc)) * plotH;

  const toPath = (pts: OutputCapPoint[]) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.energyWh * 1000).toFixed(1)} ${yScale(p.accuracyPct).toFixed(1)}`)
      .join(' ');

  const xTicks = [0, maxMwh * 0.25, maxMwh * 0.5, maxMwh * 0.75, maxMwh];
  const yTicks = [0, 50, 100];

  const sweetX = sweetSpot ? xScale(sweetSpot.energyWh * 1000) : null;
  const sweetY = sweetSpot ? yScale(sweetSpot.accuracyPct) : null;

  return (
    <div>
      <svg
        id={id}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        role="img"
        aria-label="Chart of answer accuracy versus average energy across output limits showing the sweet spot where extra tokens stop improving accuracy"
      >
        <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />

        {/* Shaded Plateau Zone beyond Sweet Spot */}
        {sweetX !== null && (
          <g>
            <rect
              x={sweetX}
              y={pad.top}
              width={Math.max(0, width - pad.right - sweetX)}
              height={plotH}
              fill="#FEF2F2"
              opacity="0.7"
            />
            <line
              x1={sweetX}
              y1={pad.top}
              x2={sweetX}
              y2={pad.top + plotH}
              stroke="#B91C1C"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <text
              x={width - pad.right - 2}
              y={pad.top - 14}
              textAnchor="end"
              fill="#991B1B"
              fontSize="8.5"
              fontWeight="700"
              fontFamily="Public Sans, sans-serif"
            >
              Plateau (~0% extra gain)
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
                {t}%
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
          Average Energy per Query (mWh)
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

        {/* Word-limit Curve */}
        {wordLimitCurve.length > 1 && (
          <path
            d={toPath(wordLimitCurve)}
            fill="none"
            stroke="#B45309"
            strokeWidth="1.8"
            strokeDasharray="5 3"
          />
        )}

        {/* Token-limit Curve */}
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
                x={cx - 3.8}
                y={cy - 3.8}
                width={7.6}
                height={7.6}
                fill="#B45309"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* Token-limit markers */}
        {tokenLimitCurve.map((pt, idx) => {
          const cx = xScale(pt.energyWh * 1000);
          const cy = yScale(pt.accuracyPct);
          const labelOffsetY = pt.accuracyPct >= 88 ? 16 : idx % 2 === 0 ? 15 : -10;
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
                r={pt.isSweetSpot ? 5.5 : 4.2}
                fill={pt.isSweetSpot ? '#B91C1C' : '#0F766E'}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {!pt.isSweetSpot && (
                <text
                  x={cx}
                  y={cy + labelOffsetY}
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="8.8"
                  fontWeight="600"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {pt.limit}
                </text>
              )}
            </g>
          );
        })}

        {/* Plain-English Sweet Spot Callout placed in clear space with leader line */}
        {sweetX !== null && sweetY !== null && sweetSpot && (() => {
          const labelW = 156;
          const labelH = 20;
          const placeLeft = sweetX > pad.left + labelW + 24;
          const boxX = placeLeft
            ? pad.left + 8
            : Math.min(width - pad.right - labelW - 6, sweetX + 18);
          const boxY = placeLeft
            ? pad.top + 8
            : Math.max(pad.top + 8, Math.min(pad.top + plotH - 68, sweetY + 14));
          const leaderStartX = placeLeft ? boxX + labelW : boxX;
          const leaderStartY = boxY + labelH / 2;
          const leaderEndX = placeLeft ? sweetX - 10 : sweetX + 10;
          const leaderEndY = sweetY + (placeLeft ? 1 : 0);
          return (
            <g>
              <circle cx={sweetX} cy={sweetY} r={9.5} fill="none" stroke="#B91C1C" strokeWidth="1.4" />
              <line
                x1={leaderStartX}
                y1={leaderStartY}
                x2={leaderEndX}
                y2={leaderEndY}
                stroke="#B91C1C"
                strokeWidth="1.1"
                strokeDasharray="3 2"
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
                fontSize="8.8"
                fontWeight="700"
                fontFamily="Public Sans, sans-serif"
              >
                Sweet spot: {sweetSpot.limit} tok ({sweetSpot.accuracyPct.toFixed(0)}%)
              </text>
            </g>
          );
        })()}

        {/* Legend bottom right */}
        <g transform={`translate(${width - pad.right - 168}, ${pad.top + plotH - 40})`}>
          <rect x="0" y="0" width="164" height="36" rx="4" fill="#FFFFFF" fillOpacity="0.94" stroke="#E2E8F0" strokeWidth="1" />
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
          <span>Cap: {hovered.label}</span>
          <span>
            Acc {hovered.accuracyPct.toFixed(0)}% · {(hovered.energyWh * 1000).toFixed(1)} mWh
            {hovered.whPerCorrect !== null ? ` · ${(hovered.whPerCorrect * 1000).toFixed(1)} mWh/correct` : ''}
          </span>
        </div>
      )}
    </div>
  );
};

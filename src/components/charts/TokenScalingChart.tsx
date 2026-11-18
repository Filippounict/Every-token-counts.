import React, { useState } from 'react';
import type { LinearTrendResult, ScalingPoint } from '../../types/experiment';

interface TokenScalingChartProps {
  id?: string;
  inputCurve: ScalingPoint[];
  outputCurve: ScalingPoint[];
  inputTrend: LinearTrendResult;
  outputTrend: LinearTrendResult;
  slopeRatio: number;
}

export const TokenScalingChart: React.FC<TokenScalingChartProps> = ({
  id = 'fig1-token-scaling-svg',
  inputCurve,
  outputCurve,
  inputTrend,
  outputTrend,
  slopeRatio,
}) => {
  const [hovered, setHovered] = useState<{
    series: 'Input (reading prompt)' | 'Output (writing answer)';
    tokens: number;
    energyMwh: number;
    latencySec: number;
  } | null>(null);

  const width = 460;
  const height = 240;
  const pad = { top: 24, right: 20, bottom: 40, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allTokens = [
    ...inputCurve.map((p) => p.tokens),
    ...outputCurve.map((p) => p.tokens),
    64,
  ];
  const allEnergyMwh = [
    ...inputCurve.map((p) => p.energyWh * 1000),
    ...outputCurve.map((p) => p.energyWh * 1000),
    10,
  ];

  const maxX = Math.max(...allTokens) * 1.08;
  const maxY = Math.max(...allEnergyMwh) * 1.15;

  const xScale = (t: number) => pad.left + (t / maxX) * plotW;
  const yScale = (mwh: number) => pad.top + plotH - (mwh / maxY) * plotH;

  const buildPath = (pts: ScalingPoint[]) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.tokens).toFixed(1)} ${yScale(p.energyWh * 1000).toFixed(1)}`)
      .join(' ');

  const xTicks = [0, Math.round(maxX * 0.25), Math.round(maxX * 0.5), Math.round(maxX * 0.75), Math.round(maxX)];
  const yTicks = [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY];

  const inSlopeMwh = inputTrend.slope * 1000;
  const outSlopeMwh = outputTrend.slope * 1000;

  return (
    <div className="relative">
      <svg
        id={id}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        role="img"
        aria-label="Line chart comparing energy used as input prompt length grows versus generated output length in milliwatt-hours"
      >
        <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />

        {/* Horizontal gridlines */}
        {yTicks.map((tick, idx) => {
          const y = yScale(tick);
          return (
            <g key={idx}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text
                x={pad.left - 8}
                y={y + 3}
                textAnchor="end"
                fill="#475569"
                fontSize="9.5"
                fontFamily="IBM Plex Mono, monospace"
              >
                {tick.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Vertical ticks */}
        {xTicks.map((tick, idx) => {
          const x = xScale(tick);
          return (
            <g key={idx}>
              <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotH} stroke="#F1F5F9" strokeWidth="1" />
              <text
                x={x}
                y={height - pad.bottom + 14}
                textAnchor="middle"
                fill="#475569"
                fontSize="9.5"
                fontFamily="IBM Plex Mono, monospace"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="#94A3B8" strokeWidth="1.2" />
        <line x1={pad.left} y1={pad.top + plotH} x2={width - pad.right} y2={pad.top + plotH} stroke="#94A3B8" strokeWidth="1.2" />

        {/* Axis labels */}
        <text
          x={pad.left + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          fill="#0F172A"
          fontSize="10"
          fontWeight="600"
          fontFamily="Public Sans, sans-serif"
        >
          Number of Tokens (Input Prompt vs. Output Answer)
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
          Energy (mWh / query)
        </text>

        {/* Curves */}
        {inputCurve.length > 1 && (
          <path d={buildPath(inputCurve)} fill="none" stroke="#1D4ED8" strokeWidth="2.2" />
        )}
        {outputCurve.length > 1 && (
          <path d={buildPath(outputCurve)} fill="none" stroke="#B91C1C" strokeWidth="2.4" />
        )}

        {/* Data points */}
        {inputCurve.map((pt) => (
          <circle
            key={`in-${pt.tokens}`}
            cx={xScale(pt.tokens)}
            cy={yScale(pt.energyWh * 1000)}
            r={4.2}
            fill="#1D4ED8"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            className="cursor-pointer"
            onMouseEnter={() =>
              setHovered({
                series: 'Input (reading prompt)',
                tokens: pt.tokens,
                energyMwh: pt.energyWh * 1000,
                latencySec: pt.latencySec,
              })
            }
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {outputCurve.map((pt) => (
          <rect
            key={`out-${pt.tokens}`}
            x={xScale(pt.tokens) - 4}
            y={yScale(pt.energyWh * 1000) - 4}
            width={8}
            height={8}
            fill="#B91C1C"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            className="cursor-pointer"
            onMouseEnter={() =>
              setHovered({
                series: 'Output (writing answer)',
                tokens: pt.tokens,
                energyMwh: pt.energyWh * 1000,
                latencySec: pt.latencySec,
              })
            }
            onMouseLeave={() => setHovered(null)}
          />
        ))}

        {/* Plain-English Legend Box */}
        <g transform={`translate(${width - pad.right - 224}, ${pad.top + 4})`}>
          <rect x="0" y="0" width="220" height="54" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
          <rect x="8" y="9" width="10" height="10" fill="#B91C1C" />
          <text x="24" y="18" fill="#0F172A" fontSize="9.3" fontWeight="600" fontFamily="Public Sans, sans-serif">
            Output tokens: {outSlopeMwh.toFixed(3)} mWh / token
          </text>
          <circle cx="13" cy="31" r="4.5" fill="#1D4ED8" />
          <text x="24" y="34" fill="#0F172A" fontSize="9.3" fontWeight="600" fontFamily="Public Sans, sans-serif">
            Input tokens: {inSlopeMwh.toFixed(3)} mWh / token
          </text>
          <text x="8" y="48" fill="#B91C1C" fontSize="9" fontWeight="700" fontFamily="IBM Plex Mono, monospace">
            Output costs {slopeRatio > 0 ? `${slopeRatio.toFixed(1)}×` : '—'} more per token
          </text>
        </g>
      </svg>

      {hovered && (
        <div className="mt-1.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-mono tabular-nums rounded flex items-center justify-between">
          <span>{hovered.series} @ {hovered.tokens} tok</span>
          <span>{hovered.energyMwh.toFixed(2)} mWh · {hovered.latencySec.toFixed(2)}s</span>
        </div>
      )}
    </div>
  );
};

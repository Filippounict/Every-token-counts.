import React, { useState } from 'react';
import type { HeatmapCell } from '../../types/experiment';

interface EnergyHeatmapChartProps {
  id?: string;
  inputBins: number[];
  outputBins: number[];
  cells: HeatmapCell[];
}

function interpolateHeatColor(ratio: number): { bg: string; text: string } {
  // Calibrated cream -> amber -> deep crimson ramp (colorblind-distinguishable luminance progression)
  const clamped = Math.min(1, Math.max(0, ratio));
  if (clamped < 0.2) return { bg: '#FEF3C7', text: '#0F172A' };
  if (clamped < 0.4) return { bg: '#FDE68A', text: '#0F172A' };
  if (clamped < 0.6) return { bg: '#F59E0B', text: '#0F172A' };
  if (clamped < 0.8) return { bg: '#DC2626', text: '#FFFFFF' };
  return { bg: '#7F1D1D', text: '#FFFFFF' };
}

export const EnergyHeatmapChart: React.FC<EnergyHeatmapChartProps> = ({
  id = 'fig2-heatmap-svg',
  inputBins,
  outputBins,
  cells,
}) => {
  const [hoverCell, setHoverCell] = useState<HeatmapCell | null>(null);

  const cellMap = new Map<string, HeatmapCell>();
  for (const c of cells) {
    cellMap.set(`${c.inputBin}x${c.outputBin}`, c);
  }

  const maxMwh = Math.max(1, ...cells.map((c) => c.energyWh * 1000));
  const minMwh = Math.min(...cells.map((c) => c.energyWh * 1000), maxMwh);

  const width = 460;
  const height = 212;
  const pad = { top: 20, right: 20, bottom: 42, left: 58 };

  const cols = Math.max(1, inputBins.length);
  const rows = Math.max(1, outputBins.length);
  const gridW = width - pad.left - pad.right;
  const gridH = height - pad.top - pad.bottom;
  const cellW = gridW / cols;
  const cellH = gridH / rows;

  // Render output bins bottom-to-top (lowest at bottom)
  const reversedOutput = [...outputBins].reverse();

  return (
    <div>
      <svg
        id={id}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        role="img"
        aria-label="2D Heatmap of inference energy in milliwatt-hours across input token lengths and output token lengths"
      >
        <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />

        {reversedOutput.map((outBin, rIdx) =>
          inputBins.map((inBin, cIdx) => {
            const cell = cellMap.get(`${inBin}x${outBin}`);
            const x = pad.left + cIdx * cellW;
            const y = pad.top + rIdx * cellH;
            const mwh = cell ? cell.energyWh * 1000 : 0;
            const ratio = maxMwh > minMwh ? (mwh - minMwh) / (maxMwh - minMwh) : 0;
            const colors = cell ? interpolateHeatColor(ratio) : { bg: '#F1F5F9', text: '#94A3B8' };

            return (
              <g
                key={`${inBin}-${outBin}`}
                className="cursor-pointer"
                onMouseEnter={() => cell && setHoverCell(cell)}
                onMouseLeave={() => setHoverCell(null)}
              >
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={Math.max(1, cellW - 2)}
                  height={Math.max(1, cellH - 2)}
                  rx="2"
                  fill={colors.bg}
                />
                <text
                  x={x + cellW / 2}
                  y={y + cellH / 2 + 3.5}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {cell ? mwh.toFixed(0) : '—'}
                </text>
              </g>
            );
          })
        )}

        {/* X Axis Bin Labels */}
        {inputBins.map((inBin, cIdx) => (
          <text
            key={`x-${inBin}`}
            x={pad.left + cIdx * cellW + cellW / 2}
            y={pad.top + gridH + 14}
            textAnchor="middle"
            fill="#334155"
            fontSize="9.5"
            fontFamily="IBM Plex Mono, monospace"
          >
            {inBin}
          </text>
        ))}

        {/* Y Axis Bin Labels */}
        {reversedOutput.map((outBin, rIdx) => (
          <text
            key={`y-${outBin}`}
            x={pad.left - 8}
            y={pad.top + rIdx * cellH + cellH / 2 + 3}
            textAnchor="end"
            fill="#334155"
            fontSize="9.5"
            fontFamily="IBM Plex Mono, monospace"
          >
            {outBin}
          </text>
        ))}

        <text
          x={pad.left + gridW / 2}
          y={height - 6}
          textAnchor="middle"
          fill="#0F172A"
          fontSize="10"
          fontWeight="600"
          fontFamily="Public Sans, sans-serif"
        >
          Input Length (tokens) · Cell values = Energy (mWh)
        </text>
        <text
          x={14}
          y={pad.top + gridH / 2}
          textAnchor="middle"
          fill="#0F172A"
          fontSize="10"
          fontWeight="600"
          fontFamily="Public Sans, sans-serif"
          transform={`rotate(-90 14 ${pad.top + gridH / 2})`}
        >
          Output Length (tok)
        </text>
      </svg>

      {hoverCell && (
        <div className="mt-1.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-mono tabular-nums rounded flex items-center justify-between">
          <span>In {hoverCell.inputBin} tok × Out {hoverCell.outputBin} tok</span>
          <span>{(hoverCell.energyWh * 1000).toFixed(2)} mWh (n={hoverCell.count})</span>
        </div>
      )}
    </div>
  );
};

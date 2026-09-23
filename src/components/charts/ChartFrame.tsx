import type { ReactNode } from "react";
import { signedTickLabel, type Scale } from "../../lib/chartMath";

/** Shared chart geometry, in viewBox units. Sized so labels stay readable at 390px. */
export const CHART = {
  width: 380,
  height: 270,
  top: 22,
  right: 10,
  bottom: 56,
  left: 50,
} as const;

/** Rows below the plot: direction word, x tick labels, axis title. */
export const directionY = CHART.height - CHART.bottom + 15;
export const xTickY = CHART.height - CHART.bottom + 33;
export const axisTitleY = CHART.height - 4;

export const plotLeft = CHART.left;
export const plotRight = CHART.width - CHART.right;
export const plotTop = CHART.top;
export const plotBottom = CHART.height - CHART.bottom;

interface SignedYAxisProps {
  ticks: readonly number[];
  y: Scale;
}

/** Y axis for signed %: gridlines, sign-bearing labels, the strongest line at 0, and direction words. */
export function SignedYAxis({ ticks, y }: SignedYAxisProps) {
  return (
    <g className="axis">
      {ticks.map((t) => (
        <g key={t}>
          {t !== 0 && <line className="grid" x1={plotLeft} x2={plotRight} y1={y(t)} y2={y(t)} />}
          <text className="tick" x={plotLeft - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
            {signedTickLabel(t)}
          </text>
        </g>
      ))}
      <text className="direction" x={plotLeft + 4} y={plotTop - 8}>
        ↑ overshoot
      </text>
      <text className="direction" x={plotLeft + 4} y={directionY}>
        ↓ undershoot
      </text>
    </g>
  );
}

/** Drawn last so nothing covers it: the zero line is the chart's reference. */
export function ZeroLine({ y }: { y: Scale }) {
  return <line className="zero" x1={plotLeft} x2={plotRight} y1={y(0)} y2={y(0)} />;
}

export function ChartSvg({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg className="chart" viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

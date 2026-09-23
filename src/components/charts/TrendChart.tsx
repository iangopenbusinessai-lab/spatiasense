import type { RoundPoint } from "../../core/insight";
import { linearScale, niceTicks, rollingMean, symmetricAxis } from "../../lib/chartMath";
import { CHART, ChartSvg, SignedYAxis, ZeroLine, plotBottom, plotLeft, plotRight, plotTop } from "./ChartFrame";

const MIN_AXIS_HALF_PCT = 10;
const X_PAD = 10;
const MAX_X_TICKS = 6;

interface TrendChartProps {
  points: readonly RoundPoint[];
  rollingWindow: number;
}

export function TrendChart({ points, rollingWindow }: TrendChartProps) {
  const means = points.map((p) => p.meanSignedPct);
  const rolling = rollingMean(means, rollingWindow);
  const axis = symmetricAxis(means, MIN_AXIS_HALF_PCT);
  const y = linearScale([-axis.half, axis.half], [plotBottom, plotTop]);
  const last = Math.max(1, points.length);
  const x = linearScale([1, last], [plotLeft + X_PAD, plotRight - X_PAD]);
  const xTicks = niceTicks(1, last, Math.min(MAX_X_TICKS, last - 1)).filter((t) => Number.isInteger(t) && t >= 1 && t <= last);

  let path = "";
  rolling.forEach((v, i) => {
    if (v === null) return;
    path += `${path === "" ? "M" : "L"} ${x(i + 1)} ${y(v)} `;
  });

  return (
    <figure className="chart-figure">
      <ChartSvg label={`Mean signed bias for each of ${points.length} rounds, oldest first.`}>
        <SignedYAxis ticks={axis.ticks} y={y} />
        {xTicks.map((t) => (
          <text key={t} className="tick" x={x(t)} y={plotBottom + 30} textAnchor="middle">
            {t}
          </text>
        ))}
        <text className="axis-title" x={(plotLeft + plotRight) / 2} y={CHART.height - 2} textAnchor="middle">
          round
        </text>
        <ZeroLine y={y} />
        {path && <path className="rolling" d={path} />}
        {points.map((p, i) => (
          <circle key={p.finishedAt} className="round-dot" cx={x(i + 1)} cy={y(p.meanSignedPct)} r={3.5} />
        ))}
      </ChartSvg>
      <figcaption className="legend">
        <span className="legend-item">dots = one round</span>
        <span className="legend-item">line = average of the last {rollingWindow} rounds</span>
      </figcaption>
    </figure>
  );
}

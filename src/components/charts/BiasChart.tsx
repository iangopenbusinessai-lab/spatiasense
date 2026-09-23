import type { GroupStats, DimValue } from "../../core/insight";
import { bandCenters, linearScale, symmetricAxis } from "../../lib/chartMath";
import { ChartSvg, SignedYAxis, ZeroLine, axisTitleY, plotBottom, plotLeft, plotRight, plotTop, xTickY } from "./ChartFrame";

/** Smallest y half-range, so a handful of tiny errors doesn't look dramatic. */
const MIN_AXIS_HALF_PCT = 10;
/** Horizontal spread of series within one x band. */
const SERIES_OFFSET = 12;
const MARK = 6;

type Shape = "circle" | "square" | "triangle";
const SHAPES: readonly Shape[] = ["circle", "square", "triangle"];

function Marker({ shape, x, y, hollow, series }: { shape: Shape; x: number; y: number; hollow: boolean; series: number }) {
  const cls = `mark series-${series % SHAPES.length}${hollow ? " hollow" : ""}`;
  if (shape === "square") return <rect className={cls} x={x - MARK} y={y - MARK} width={MARK * 2} height={MARK * 2} />;
  if (shape === "triangle")
    return <path className={cls} d={`M ${x} ${y - MARK - 1} L ${x + MARK + 1} ${y + MARK} L ${x - MARK - 1} ${y + MARK} Z`} />;
  return <circle className={cls} cx={x} cy={y} r={MARK} />;
}

interface BiasChartProps {
  groups: readonly GroupStats[];
  xLabel: string;
  seriesLabel?: string;
  minTrials: number;
}

const keyOf = (v: DimValue) => `${typeof v}:${String(v)}`;

export function BiasChart({ groups, xLabel, seriesLabel, minTrials }: BiasChartProps) {
  const xValues: DimValue[] = [];
  const seriesValues: DimValue[] = [];
  for (const g of groups) {
    if (!xValues.some((v) => keyOf(v) === keyOf(g.value))) xValues.push(g.value);
    const series = g.series;
    if (series !== undefined && !seriesValues.some((v) => keyOf(v) === keyOf(series))) seriesValues.push(series);
  }
  const centers = bandCenters(xValues.length, [plotLeft, plotRight]);
  const seriesIndex = (g: GroupStats) => {
    const series = g.series;
    return series === undefined ? 0 : Math.max(0, seriesValues.findIndex((v) => keyOf(v) === keyOf(series)));
  };
  const xOf = (g: GroupStats) => {
    const base = centers[xValues.findIndex((v) => keyOf(v) === keyOf(g.value))] ?? plotLeft;
    if (g.series === undefined || seriesValues.length < 2) return base;
    return base + (seriesIndex(g) - (seriesValues.length - 1) / 2) * SERIES_OFFSET;
  };

  const extent = groups.flatMap((g) => (g.ci95 ? [g.meanSignedPct, g.ci95.low, g.ci95.high] : [g.meanSignedPct]));
  const axis = symmetricAxis(extent, MIN_AXIS_HALF_PCT);
  const y = linearScale([-axis.half, axis.half], [plotBottom, plotTop]);

  const summary = groups
    .map((g) => `${xLabel} ${String(g.value)}${g.series === undefined ? "" : ` ${String(g.series)}`}: ${g.meanSignedPct.toFixed(1)}%`)
    .join("; ");

  return (
    <figure className="chart-figure">
      <ChartSvg label={`Signed bias by ${xLabel}. ${summary}`}>
        <SignedYAxis ticks={axis.ticks} y={y} />
        {xValues.map((v, i) => (
          <text key={keyOf(v)} className="tick" x={centers[i]} y={xTickY} textAnchor="middle">
            {String(v)}
          </text>
        ))}
        <text className="axis-title" x={(plotLeft + plotRight) / 2} y={axisTitleY} textAnchor="middle">
          {xLabel}
        </text>
        {groups.map((g) => {
          const x = xOf(g);
          return g.ci95 ? (
            <g key={`w-${keyOf(g.value)}-${g.series === undefined ? "" : keyOf(g.series)}`} className={`whisker series-${seriesIndex(g) % SHAPES.length}`}>
              <line x1={x} x2={x} y1={y(g.ci95.low)} y2={y(g.ci95.high)} />
              <line x1={x - 4} x2={x + 4} y1={y(g.ci95.low)} y2={y(g.ci95.low)} />
              <line x1={x - 4} x2={x + 4} y1={y(g.ci95.high)} y2={y(g.ci95.high)} />
            </g>
          ) : null;
        })}
        <ZeroLine y={y} />
        {groups.map((g) => (
          <Marker
            key={`m-${keyOf(g.value)}-${g.series === undefined ? "" : keyOf(g.series)}`}
            shape={SHAPES[seriesIndex(g) % SHAPES.length] ?? "circle"}
            series={seriesIndex(g)}
            x={xOf(g)}
            y={y(g.meanSignedPct)}
            hollow={g.count < minTrials}
          />
        ))}
      </ChartSvg>
      <figcaption className="legend">
        {seriesLabel && seriesValues.length > 1 && (
          <>
            {seriesValues.map((v, i) => (
              <span key={keyOf(v)} className="legend-item">
                <svg viewBox="-8 -8 16 16" className="legend-mark" aria-hidden="true">
                  <Marker shape={SHAPES[i % SHAPES.length] ?? "circle"} series={i} x={0} y={0} hollow={false} />
                </svg>
                {seriesLabel} {String(v)}
              </span>
            ))}
          </>
        )}
        <span className="legend-item">
          <svg viewBox="-8 -8 16 16" className="legend-mark" aria-hidden="true">
            <Marker shape="circle" series={0} x={0} y={0} hollow />
          </svg>
          hollow = fewer than {minTrials} trials
        </span>
        <span className="legend-item">bars = 95% interval</span>
      </figcaption>
    </figure>
  );
}

// Pure scale and tick math for the hand-rolled SVG charts.

export type Scale = (value: number) => number;

/** Maps [d0, d1] linearly onto [r0, r1]. A zero-width domain maps to the range midpoint. */
export function linearScale(domain: readonly [number, number], range: readonly [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => (r0 + r1) / 2;
  const k = (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}

/** A "nice" step (1, 2, 2.5 or 5 × 10^k) giving roughly `target` intervals over `span`. */
export function niceStep(span: number, target: number): number {
  if (!(span > 0) || !(target > 0)) return 1;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function clean(v: number): number {
  // Avoid -0 and float dust like 0.30000000000000004 in labels.
  const r = Math.round(v * 1e9) / 1e9;
  return r === 0 ? 0 : r;
}

/** Ticks at multiples of a nice step covering [min, max]. */
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (max < min) return niceTicks(max, min, target);
  if (max === min) return [clean(min)];
  const step = niceStep(max - min, target);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(clean(v));
  return ticks;
}

export interface SymmetricAxis {
  /** Domain is [-half, +half]. */
  half: number;
  ticks: number[];
}

/**
 * A y-axis symmetric around 0, so over- and undershoot of the same size look
 * the same size. `minHalf` stops tiny data from filling the chart with noise.
 */
export function symmetricAxis(values: readonly number[], minHalf: number, target = 4): SymmetricAxis {
  let m = minHalf;
  for (const v of values) if (Number.isFinite(v)) m = Math.max(m, Math.abs(v));
  const step = niceStep(m, target / 2);
  const half = Math.ceil(m / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = -half; v <= half + step / 2; v += step) ticks.push(clean(v));
  return { half: clean(half), ticks };
}

/** Trailing mean over `window` points; null until the window is full. */
export function rollingMean(values: readonly number[], window: number): Array<number | null> {
  const out: Array<number | null> = [];
  let sum = 0;
  values.forEach((v, i) => {
    sum += v;
    if (i >= window) sum -= values[i - window] ?? 0;
    out.push(i >= window - 1 ? sum / window : null);
  });
  return out;
}

/** Centers of `count` equal bands across [r0, r1] (for ordinal/category x axes). */
export function bandCenters(count: number, range: readonly [number, number]): number[] {
  const [r0, r1] = range;
  const w = (r1 - r0) / Math.max(1, count);
  return Array.from({ length: count }, (_, i) => r0 + w * (i + 0.5));
}

/** "+10%", "−5%", "0%" for axis labels: the sign is in the text, not only in color. */
export function signedTickLabel(v: number): string {
  const r = clean(v);
  if (r === 0) return "0%";
  return `${r > 0 ? "+" : "−"}${Math.abs(r)}%`;
}

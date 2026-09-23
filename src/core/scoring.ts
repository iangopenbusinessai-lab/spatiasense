import type { TrialResult } from "./types";

/** Signed percentage error of an answer against the truth. Positive = overshoot. */
export function signedErrorPct(answer: number, truth: number): number {
  return ((answer - truth) / truth) * 100;
}

export function scoreFromErrorPct(signedPct: number): number {
  return Math.max(0, Math.round(100 - 2 * Math.abs(signedPct)));
}

export interface RoundSummary {
  count: number;
  meanAbsErrorPct: number;
  meanSignedErrorPct: number;
  meanScore: number;
  /** Index of the trial with the smallest |error|, or -1 when empty. */
  bestIndex: number;
}

export function summarize(trials: readonly TrialResult[]): RoundSummary {
  if (trials.length === 0) {
    return { count: 0, meanAbsErrorPct: 0, meanSignedErrorPct: 0, meanScore: 0, bestIndex: -1 };
  }
  let abs = 0;
  let signed = 0;
  let score = 0;
  let bestIndex = 0;
  let bestAbs = Infinity;
  trials.forEach((t, i) => {
    abs += t.absErrorPct;
    signed += t.signedErrorPct;
    score += t.score;
    if (t.absErrorPct < bestAbs) {
      bestAbs = t.absErrorPct;
      bestIndex = i;
    }
  });
  const n = trials.length;
  return {
    count: n,
    meanAbsErrorPct: abs / n,
    meanSignedErrorPct: signed / n,
    meanScore: score / n,
    bestIndex,
  };
}

/** e.g. "+8.3% — overshot", "-4.0% — undershot", "0.0% — exact". */
export function formatSignedError(signedPct: number): string {
  const rounded = Math.round(signedPct * 10) / 10;
  if (rounded === 0) return "0.0% — exact";
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${Math.abs(rounded).toFixed(1)}% — ${rounded > 0 ? "overshot" : "undershot"}`;
}

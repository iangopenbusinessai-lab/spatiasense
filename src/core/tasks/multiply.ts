import { MARGIN, VIEW_H, VIEW_W, clamp } from "../geometry";
import { randInt, randRange, type Rng } from "../rng";
import { scoreFromErrorPct, signedErrorPct } from "../scoring";
import type { TaskType } from "../types";

export const N_MIN = 2;
export const N_MAX = 8;
export const MIN_REF_LENGTH = 30;
/** Bar thickness in viewBox units; geometry checks include it. */
export const BAR_H = 16;
/** Right-most allowed x for anything on the track, including the answer marker. */
export const TRACK_MAX_X = VIEW_W - MARGIN;

export type Layout = "anchored" | "detached";

export interface MultiplyParams {
  n: number | "random";
  layout: Layout;
}

export interface MultiplyTrial {
  n: number;
  layout: Layout;
  refLength: number;
  /** Track origin x: where copy 1 starts and answers are measured from. */
  origin: number;
  trackY: number;
  /** Reference bar position. Equals (origin, trackY) when anchored. */
  refX: number;
  refY: number;
}

/** Response: the marker's x in viewBox units. */
export type MultiplyResponse = number;

export function resolveN(n: MultiplyParams["n"], rng: Rng): number {
  if (n === "random") return randInt(rng, N_MIN, N_MAX);
  return clamp(Math.round(n), N_MIN, N_MAX);
}

export function clampMarker(trial: MultiplyTrial, x: number): number {
  return clamp(x, trial.origin, TRACK_MAX_X);
}

export function trueEndX(trial: MultiplyTrial): number {
  return trial.origin + trial.n * trial.refLength;
}

// Vertical bands keep the detached reference and the track well apart.
const TOP_BAND: readonly [number, number] = [MARGIN + 60, 240];
const BOTTOM_BAND: readonly [number, number] = [360, VIEW_H - MARGIN - 60];
const ANCHORED_BAND: readonly [number, number] = [150, VIEW_H - 150];
/** Fraction of the true length always left free to the right of the true endpoint. */
export const OVERSHOOT_ROOM = 0.3;
/** Minimum horizontal offset between a detached reference and the track origin. */
const MIN_DETACHED_DX = 60;

function generate(params: MultiplyParams, rng: Rng): MultiplyTrial {
  const n = resolveN(params.n, rng);
  const layout = params.layout;
  const span = TRACK_MAX_X - MARGIN;

  // Total length first, then the endpoint. The endpoint always leaves room to
  // overshoot by OVERSHOOT_ROOM, so the marker clamp never censors overshoots
  // (which would bias stored errors toward undershoot), and the right limit
  // moves with the length, so the screen edge is not a landmark.
  const total = randRange(rng, n * MIN_REF_LENGTH, span / (1 + OVERSHOOT_ROOM));
  const end = randRange(rng, MARGIN + total, TRACK_MAX_X - OVERSHOOT_ROOM * total);
  const refLength = total / n;
  const origin = end - total;

  if (layout === "anchored") {
    const trackY = randRange(rng, ANCHORED_BAND[0], ANCHORED_BAND[1]);
    return { n, layout, refLength, origin, trackY, refX: origin, refY: trackY };
  }

  const refOnTop = rng() < 0.5;
  const refBand = refOnTop ? TOP_BAND : BOTTOM_BAND;
  const trackBand = refOnTop ? BOTTOM_BAND : TOP_BAND;
  const refY = randRange(rng, refBand[0], refBand[1]);
  const trackY = randRange(rng, trackBand[0], trackBand[1]);

  // Reference must fit the viewBox with margin and not line up with the origin.
  const refMaxX = TRACK_MAX_X - refLength;
  let refX = randRange(rng, MARGIN, refMaxX);
  if (Math.abs(refX - origin) < MIN_DETACHED_DX) {
    // Move it away deterministically, staying inside the allowed range.
    const right = origin + MIN_DETACHED_DX;
    const left = origin - MIN_DETACHED_DX;
    if (right <= refMaxX) refX = randRange(rng, right, refMaxX);
    else if (left >= MARGIN) refX = randRange(rng, MARGIN, left);
  }
  return { n, layout, refLength, origin, trackY, refX, refY };
}

function score(trial: MultiplyTrial, response: MultiplyResponse) {
  const trueLength = trial.n * trial.refLength;
  const answerLength = clampMarker(trial, response) - trial.origin;
  const signed = signedErrorPct(answerLength, trueLength);
  return {
    params: { n: trial.n, layout: trial.layout },
    trueValue: trueLength,
    response: answerLength,
    signedErrorPct: signed,
    absErrorPct: Math.abs(signed),
    score: scoreFromErrorPct(signed),
  };
}

export const multiply: TaskType<MultiplyParams, MultiplyTrial, MultiplyResponse> = {
  id: "multiply",
  label: "Extrapolate: N bars end to end",
  defaultParams: { n: 6, layout: "anchored" },
  generate,
  score,
};

export const VIEW_W = 1000;
export const VIEW_H = 600;
export const MARGIN = 40;

/** The 2D affine part of a DOMMatrix: pass `svg.getScreenCTM().inverse()`. */
export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Convert a client (screen) point to viewBox units using the inverse screen CTM. */
export function clientToViewBox(inverseCtm: Affine, clientX: number, clientY: number): Point {
  const m = inverseCtm;
  return {
    x: m.a * clientX + m.c * clientY + m.e,
    y: m.b * clientX + m.d * clientY + m.f,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

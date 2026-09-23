import { describe, expect, it } from "vitest";
import { MARGIN, VIEW_H, VIEW_W } from "../geometry";
import { mulberry32 } from "../rng";
import { BAR_H, HIT_LIMIT_TOLERANCE, OVERSHOOT_ROOM, N_MAX, N_MIN, TRACK_MAX_X, multiply, trueEndX, type Layout, type MultiplyParams } from "./multiply";

const layouts: Layout[] = ["anchored", "detached"];
const nChoices: MultiplyParams["n"][] = [2, 3, 4, 5, 6, 7, 8, "random"];

function inBox(x0: number, x1: number, yCenter: number) {
  return (
    x0 >= MARGIN &&
    x1 <= VIEW_W - MARGIN &&
    yCenter - BAR_H / 2 >= MARGIN &&
    yCenter + BAR_H / 2 <= VIEW_H - MARGIN
  );
}

describe("multiply.generate", () => {
  it("same seed → identical trial", () => {
    for (const layout of layouts) {
      const params: MultiplyParams = { n: "random", layout };
      expect(multiply.generate(params, mulberry32(42))).toEqual(multiply.generate(params, mulberry32(42)));
    }
  });

  it("different seeds → different trials", () => {
    const params = multiply.defaultParams;
    expect(multiply.generate(params, mulberry32(1))).not.toEqual(multiply.generate(params, mulberry32(2)));
  });

  it("every trial fits the viewBox with margin across 1000 seeds (track, answer, and detached reference)", () => {
    for (const layout of layouts) {
      for (const n of nChoices) {
        for (let seed = 0; seed < 1000; seed++) {
          const t = multiply.generate({ n, layout }, mulberry32(seed));
          expect(t.n).toBeGreaterThanOrEqual(N_MIN);
          expect(t.n).toBeLessThanOrEqual(N_MAX);
          expect(Number.isInteger(t.n)).toBe(true);
          expect(t.refLength).toBeGreaterThanOrEqual(30);
          expect(trueEndX(t)).toBeLessThanOrEqual(TRACK_MAX_X + 1e-9);
          // Room to overshoot, so the clamp never censors positive errors.
          expect(trueEndX(t) + OVERSHOOT_ROOM * t.n * t.refLength).toBeLessThanOrEqual(TRACK_MAX_X + 1e-9);
          expect(inBox(t.origin, trueEndX(t), t.trackY)).toBe(true);
          // The reference bar itself (the longest one, at n = 2) must fit too.
          expect(inBox(t.refX, t.refX + t.refLength, t.refY)).toBe(true);
          if (layout === "anchored") {
            expect(t.refX).toBe(t.origin);
            expect(t.refY).toBe(t.trackY);
          } else {
            // Detached: different y, far enough apart that the bars never overlap.
            expect(Math.abs(t.refY - t.trackY)).toBeGreaterThan(BAR_H * 4);
          }
        }
      }
    }
  });

  it("detached reference mostly does not share the track's x", () => {
    let aligned = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const t = multiply.generate({ n: "random", layout: "detached" }, mulberry32(seed));
      if (Math.abs(t.refX - t.origin) < 60) aligned++;
    }
    expect(aligned).toBeLessThan(10);
  });

  it("endpoint varies widely (right edge is not a landmark)", () => {
    const ends: number[] = [];
    for (let seed = 0; seed < 1000; seed++) {
      ends.push(trueEndX(multiply.generate({ n: 6, layout: "anchored" }, mulberry32(seed))));
    }
    const nearEdge = ends.filter((x) => x > TRACK_MAX_X - 20).length;
    expect(Math.max(...ends) - Math.min(...ends)).toBeGreaterThan(500);
    expect(nearEdge).toBeLessThan(100);
  });

  it("random n resolves to every value 2–8", () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 500; seed++) {
      seen.add(multiply.generate({ n: "random", layout: "anchored" }, mulberry32(seed)).n);
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("multiply.score", () => {
  const trial = multiply.generate({ n: 5, layout: "anchored" }, mulberry32(7));
  const trueLength = trial.n * trial.refLength;

  it("perfect response → score 100, zero error", () => {
    const s = multiply.score(trial, trueEndX(trial));
    expect(s.score).toBe(100);
    expect(s.signedErrorPct).toBeCloseTo(0, 9);
    expect(s.trueValue).toBeCloseTo(trueLength, 9);
  });

  it("10% overshoot → +10, score 80", () => {
    const s = multiply.score(trial, trial.origin + trueLength * 1.1);
    expect(s.signedErrorPct).toBeCloseTo(10, 6);
    expect(s.absErrorPct).toBeCloseTo(10, 6);
    expect(s.score).toBe(80);
  });

  it("25% undershoot → −25, score 50", () => {
    const s = multiply.score(trial, trial.origin + trueLength * 0.75);
    expect(s.signedErrorPct).toBeCloseTo(-25, 6);
    expect(s.score).toBe(50);
  });

  it("score floors at 0", () => {
    expect(multiply.score(trial, trial.origin).score).toBe(0);
  });

  it("response is clamped to [origin, 960]", () => {
    expect(multiply.score(trial, -500).response).toBe(0);
    expect(multiply.score(trial, 5000).response).toBeCloseTo(TRACK_MAX_X - trial.origin, 9);
  });

  it("sets hitLimit at the clamp edge, not 1 unit inside it", () => {
    expect(multiply.score(trial, TRACK_MAX_X).hitLimit).toBe(true);
    expect(multiply.score(trial, 5000).hitLimit).toBe(true);
    expect(multiply.score(trial, TRACK_MAX_X - HIT_LIMIT_TOLERANCE).hitLimit).toBe(true);
    expect(multiply.score(trial, TRACK_MAX_X - 1).hitLimit).toBe(false);
    expect(multiply.score(trial, trueEndX(trial)).hitLimit).toBe(false);
  });

  it("records resolved params, not 'random'", () => {
    const t = multiply.generate({ n: "random", layout: "detached" }, mulberry32(3));
    expect(multiply.score(t, trueEndX(t)).params).toEqual({ n: t.n, layout: "detached" });
  });
});

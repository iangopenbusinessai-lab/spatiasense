import { describe, expect, it } from "vitest";
import { bandCenters, linearScale, niceStep, niceTicks, rollingMean, signedTickLabel, symmetricAxis } from "./chartMath";

describe("chartMath", () => {
  it("linearScale maps, inverts direction, and handles zero width", () => {
    const y = linearScale([-10, 10], [200, 0]);
    expect(y(-10)).toBe(200);
    expect(y(0)).toBe(100);
    expect(y(10)).toBe(0);
    expect(linearScale([3, 3], [0, 50])(3)).toBe(25);
  });

  it("niceStep picks 1/2/2.5/5 × 10^k", () => {
    expect(niceStep(10, 5)).toBe(2);
    expect(niceStep(37, 4)).toBe(10);
    expect(niceStep(0.9, 3)).toBe(0.5);
    expect(niceStep(24, 4)).toBe(10);
    expect(niceStep(10, 4)).toBe(2.5);
  });

  it("niceTicks cover the range without float dust", () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(0.1, 0.7, 3)).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
    expect(niceTicks(5, 5)).toEqual([5]);
  });

  it("symmetricAxis is symmetric around 0 and covers the data", () => {
    const a = symmetricAxis([-12.4, 3, 7], 5);
    expect(a.ticks[0]).toBe(-a.half);
    expect(a.ticks[a.ticks.length - 1]).toBe(a.half);
    expect(a.ticks).toContain(0);
    expect(a.half).toBeGreaterThanOrEqual(12.4);
    expect(a.ticks.every((t) => a.ticks.includes(-t))).toBe(true);
    expect(symmetricAxis([], 5).half).toBe(5);
    expect(symmetricAxis([0.5, NaN], 5).half).toBe(5);
  });

  it("rollingMean is null until the window is full", () => {
    expect(rollingMean([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    expect(rollingMean([1, 2], 3)).toEqual([null, null]);
  });

  it("bandCenters", () => {
    expect(bandCenters(4, [0, 100])).toEqual([12.5, 37.5, 62.5, 87.5]);
  });

  it("signed labels carry the sign in text", () => {
    expect(signedTickLabel(10)).toBe("+10%");
    expect(signedTickLabel(-5)).toBe("−5%");
    expect(signedTickLabel(-0)).toBe("0%");
  });
});

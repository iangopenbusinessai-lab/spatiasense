import { describe, expect, it } from "vitest";
import { initialSession, sessionReducer, toRoundRecord, type SessionAction, type SessionState } from "./session";
import { multiply, trueEndX, type MultiplyParams, type MultiplyTrial } from "./tasks/multiply";
import type { AnyTaskCore } from "./types";

// Test-only erasure, mirroring what defineTask does in the registry.
const core: AnyTaskCore = {
  id: multiply.id,
  label: multiply.label,
  defaultParams: multiply.defaultParams,
  generate: (p, rng) => multiply.generate(p as MultiplyParams, rng),
  score: (t, r) => multiply.score(t as MultiplyTrial, r as number),
};

const start = (roundSeed = 123, trialCount = 3): SessionAction => ({
  type: "start",
  task: core,
  params: { n: "random", layout: "anchored" },
  roundSeed,
  trialCount,
  now: 1000,
});

function run(state: SessionState, ...actions: SessionAction[]): SessionState {
  return actions.reduce(sessionReducer, state);
}

describe("sessionReducer", () => {
  it("idle → showing on start", () => {
    const s = run(initialSession, start());
    expect(s.phase).toBe("showing");
  });

  it("same roundSeed → same trial sequence; each trial regenerates alone", () => {
    const trialsFor = (seed: number) => {
      let s = run(initialSession, start(seed, 4));
      const trials: unknown[] = [];
      while (s.phase !== "results") {
        if (s.phase === "showing") {
          trials.push(s.current.trial);
          s = run(s, { type: "respond", response: 500 }, { type: "confirm", now: 2000 }, { type: "next", now: 3000 });
        }
      }
      return trials;
    };
    expect(trialsFor(99)).toEqual(trialsFor(99));
    expect(trialsFor(99)).not.toEqual(trialsFor(100));
  });

  it("full flow produces TrialResults with all required fields", () => {
    let s = run(initialSession, start(5, 2));
    if (s.phase !== "showing") throw new Error("expected showing");
    const end = trueEndX(s.current.trial as MultiplyTrial);
    s = run(s, { type: "respond", response: 100 }, { type: "respond", response: end });
    expect(s.phase).toBe("answering");
    s = run(s, { type: "confirm", now: 1750 });
    expect(s.phase).toBe("feedback");
    if (s.phase !== "feedback") throw new Error();
    const r = s.results[0];
    expect(r).toMatchObject({ taskId: "multiply", score: 100, responseMs: 750, timestamp: 1750 });
    expect(r?.seed).toBe(s.current.seed);
    expect((r?.params as { n: unknown }).n).toBeTypeOf("number");
    s = run(s, { type: "next", now: 2000 }, { type: "respond", response: 300 }, { type: "confirm", now: 2500 });
    s = run(s, { type: "next", now: 2600 });
    expect(s.phase).toBe("results");
    if (s.phase !== "results") throw new Error();
    const record = toRoundRecord(s);
    expect(record.trials).toHaveLength(2);
    expect(record.finishedAt).toBe(2600);
    expect(record.params).toEqual({ n: "random", layout: "anchored" });
  });

  it("ignores illegal actions (returns the same state)", () => {
    expect(sessionReducer(initialSession, { type: "confirm", now: 1 })).toBe(initialSession);
    expect(sessionReducer(initialSession, { type: "next", now: 1 })).toBe(initialSession);
    expect(sessionReducer(initialSession, { type: "respond", response: 1 })).toBe(initialSession);
    const showing = run(initialSession, start());
    expect(sessionReducer(showing, { type: "confirm", now: 1 })).toBe(showing); // no response yet
    expect(sessionReducer(showing, start())).toBe(showing); // already running
    const feedback = run(showing, { type: "respond", response: 400 }, { type: "confirm", now: 2000 });
    expect(sessionReducer(feedback, { type: "respond", response: 1 })).toBe(feedback);
    expect(sessionReducer(feedback, { type: "confirm", now: 3 })).toBe(feedback);
  });

  it("quit returns to idle from any active phase", () => {
    const s = run(initialSession, start(), { type: "respond", response: 400 });
    expect(sessionReducer(s, { type: "quit" })).toBe(initialSession);
  });
});

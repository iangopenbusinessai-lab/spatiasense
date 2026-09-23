import { mulberry32, trialSeed } from "./rng";
import type { AnyTaskCore, RoundRecord, TrialResult } from "./types";

export interface RoundInfo {
  id: string;
  task: AnyTaskCore;
  params: unknown;
  roundSeed: number;
  trialCount: number;
  startedAt: number;
}

export interface ActiveTrial {
  index: number;
  seed: number;
  trial: unknown;
  shownAt: number;
}

export type SessionState =
  | { phase: "idle" }
  /** Trial on screen, no response yet. */
  | { phase: "showing"; round: RoundInfo; current: ActiveTrial; results: TrialResult[] }
  /** A draft response exists and can be adjusted or confirmed. */
  | { phase: "answering"; round: RoundInfo; current: ActiveTrial; response: unknown; results: TrialResult[] }
  /** Confirmed; the last element of `results` is this trial. */
  | { phase: "feedback"; round: RoundInfo; current: ActiveTrial; response: unknown; results: TrialResult[] }
  | { phase: "results"; round: RoundInfo; results: TrialResult[]; finishedAt: number };

export type SessionAction =
  | { type: "start"; task: AnyTaskCore; params: unknown; roundSeed: number; trialCount: number; now: number }
  | { type: "respond"; response: unknown }
  | { type: "confirm"; now: number }
  | { type: "next"; now: number }
  | { type: "quit" };

export const initialSession: SessionState = { phase: "idle" };

export function makeTrial(round: RoundInfo, index: number, now: number): ActiveTrial {
  const seed = trialSeed(round.roundSeed, index);
  const trial = round.task.generate(round.params, mulberry32(seed));
  return { index, seed, trial, shownAt: now };
}

/** Pure reducer. Actions that are illegal for the current phase return the same state. */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "start": {
      if (state.phase !== "idle" && state.phase !== "results") return state;
      if (!(action.trialCount >= 1)) return state;
      const roundSeed = action.roundSeed >>> 0;
      const round: RoundInfo = {
        id: `${action.now.toString(36)}-${roundSeed.toString(36)}`,
        task: action.task,
        params: action.params,
        roundSeed,
        trialCount: Math.floor(action.trialCount),
        startedAt: action.now,
      };
      return { phase: "showing", round, current: makeTrial(round, 0, action.now), results: [] };
    }
    case "respond": {
      if (state.phase !== "showing" && state.phase !== "answering") return state;
      return {
        phase: "answering",
        round: state.round,
        current: state.current,
        response: action.response,
        results: state.results,
      };
    }
    case "confirm": {
      if (state.phase !== "answering") return state;
      const { round, current } = state;
      const scored = round.task.score(current.trial, state.response);
      const result: TrialResult = {
        ...scored,
        taskId: round.task.id,
        seed: current.seed,
        responseMs: Math.max(0, action.now - current.shownAt),
        timestamp: action.now,
      };
      return {
        phase: "feedback",
        round,
        current,
        response: state.response,
        results: [...state.results, result],
      };
    }
    case "next": {
      if (state.phase !== "feedback") return state;
      const nextIndex = state.current.index + 1;
      if (nextIndex >= state.round.trialCount) {
        return { phase: "results", round: state.round, results: state.results, finishedAt: action.now };
      }
      return {
        phase: "showing",
        round: state.round,
        current: makeTrial(state.round, nextIndex, action.now),
        results: state.results,
      };
    }
    case "quit":
      return state.phase === "idle" ? state : initialSession;
  }
}

/** The persistable record of a finished round. */
export function toRoundRecord(state: Extract<SessionState, { phase: "results" }>): RoundRecord {
  return {
    id: state.round.id,
    taskId: state.round.task.id,
    roundSeed: state.round.roundSeed,
    params: state.round.params,
    startedAt: state.round.startedAt,
    finishedAt: state.finishedAt,
    trials: state.results,
  };
}

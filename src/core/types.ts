import type { Rng } from "./rng";

/** What a task's score() can know: nothing about seeds or timing. */
export interface TrialScore<P> {
  /** RESOLVED values (e.g. the n actually drawn when n was "random"). */
  params: P;
  trueValue: number;
  response: number;
  signedErrorPct: number;
  absErrorPct: number;
  score: number;
}

/** A stored trial: TrialScore plus the session-owned fields. */
export interface TrialResult extends TrialScore<unknown> {
  taskId: string;
  seed: number;
  responseMs: number;
  timestamp: number;
}

export interface TaskType<P, T, R> {
  id: string;
  label: string;
  defaultParams: P;
  generate(params: P, rng: Rng): T;
  score(trial: T, response: R): TrialScore<P>;
}

/** A task with its generics erased. Only `defineTask` produces these. */
export interface AnyTaskCore {
  id: string;
  label: string;
  defaultParams: unknown;
  generate(params: unknown, rng: Rng): unknown;
  score(trial: unknown, response: unknown): TrialScore<unknown>;
}

export interface RoundRecord {
  id: string;
  taskId: string;
  roundSeed: number;
  /** Params as chosen on Home (may contain "random"); per-trial resolved values live in trials. */
  params: unknown;
  startedAt: number;
  finishedAt: number;
  trials: TrialResult[];
}

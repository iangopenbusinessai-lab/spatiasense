import type { RoundRecord, TrialResult } from "./types";

export const STORAGE_VERSION = 1;
export const ROUNDS_KEY = `spatiasense:v${STORAGE_VERSION}:rounds`;

interface StoredRounds {
  version: number;
  rounds: RoundRecord[];
}

export interface ParseOutcome {
  rounds: RoundRecord[];
  /** Human-readable problems; empty when everything parsed cleanly. */
  problems: string[];
}

export function serializeRounds(rounds: readonly RoundRecord[]): string {
  const data: StoredRounds = { version: STORAGE_VERSION, rounds: [...rounds] };
  return JSON.stringify(data);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseTrial(v: unknown): TrialResult | null {
  if (!isRecord(v) || !("params" in v)) return null;
  const { taskId, params, seed, trueValue, response, signedErrorPct, absErrorPct, score, responseMs, timestamp } = v;
  if (typeof taskId !== "string") return null;
  // Added in session 2 (additive, no version bump): missing means false.
  const hitLimit = v.hitLimit === undefined ? false : v.hitLimit;
  if (typeof hitLimit !== "boolean") return null;
  if (
    !isFiniteNumber(seed) ||
    !isFiniteNumber(trueValue) ||
    !isFiniteNumber(response) ||
    !isFiniteNumber(signedErrorPct) ||
    !isFiniteNumber(absErrorPct) ||
    !isFiniteNumber(score) ||
    !isFiniteNumber(responseMs) ||
    !isFiniteNumber(timestamp)
  ) {
    return null;
  }
  return { taskId, params, seed, trueValue, response, signedErrorPct, absErrorPct, score, hitLimit, responseMs, timestamp };
}

function parseRound(v: unknown): RoundRecord | null {
  if (!isRecord(v) || !("params" in v)) return null;
  const { id, taskId, roundSeed, params, startedAt, finishedAt, trials } = v;
  if (typeof id !== "string" || typeof taskId !== "string") return null;
  if (!isFiniteNumber(roundSeed) || !isFiniteNumber(startedAt) || !isFiniteNumber(finishedAt)) return null;
  if (!Array.isArray(trials)) return null;
  const parsed: TrialResult[] = [];
  for (const t of trials) {
    const trial = parseTrial(t);
    if (!trial) return null;
    parsed.push(trial);
  }
  return { id, taskId, roundSeed, params, startedAt, finishedAt, trials: parsed };
}

/** Defensive parse: never throws. Bad data is dropped and reported in `problems`. */
export function parseRounds(raw: string | null): ParseOutcome {
  if (raw === null || raw === "") return { rounds: [], problems: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rounds: [], problems: ["Saved history is not valid JSON and was ignored."] };
  }
  if (!isRecord(data) || !Array.isArray(data.rounds)) {
    return { rounds: [], problems: ["Saved history has an unknown format and was ignored."] };
  }
  if (data.version !== STORAGE_VERSION) {
    return { rounds: [], problems: [`Saved history has unknown version ${String(data.version)} and was ignored.`] };
  }
  const rounds: RoundRecord[] = [];
  let dropped = 0;
  for (const r of data.rounds) {
    const round = parseRound(r);
    if (round) rounds.push(round);
    else dropped++;
  }
  const problems = dropped > 0 ? [`${dropped} saved round(s) were unreadable and were ignored.`] : [];
  return { rounds, problems };
}

/** Append a round, replacing any existing round with the same id (idempotent). */
export function appendRound(rounds: readonly RoundRecord[], round: RoundRecord): RoundRecord[] {
  return [...rounds.filter((r) => r.id !== round.id), round];
}

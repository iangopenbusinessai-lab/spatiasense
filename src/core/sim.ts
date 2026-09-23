// Synthetic players: ground truth for testing the insight engine, and the
// dev-only demo. Trials are generated and scored by the real multiply task,
// so clamping and hitLimit happen exactly as in play.
import { hashSeeds, mulberry32, randNormal, trialSeed } from "./rng";
import { multiply, type Layout, type MultiplyParams } from "./tasks/multiply";
import type { RoundRecord, TrialResult } from "./types";

export interface SimOptions {
  /** True signed bias (%) per n; missing n → 0. */
  biasByN?: Partial<Record<number, number>>;
  /** Extra signed bias (%) added per layout; missing → 0. */
  layoutBiasPct?: Partial<Record<Layout, number>>;
  /** SD (percentage points) of per-trial noise around the bias. */
  noiseSd: number;
  /** Percentage points per trial that bias moves toward 0 (never past it). */
  improvementPerTrial?: number;
  seed: number;
  /** Total trials (default 100). */
  trials?: number;
  n?: MultiplyParams["n"];
  /** Fixed layout, or "mixed" to pick one per round (default mixed). */
  layout?: Layout | "mixed";
  trialsPerRound?: number;
  /** Timestamp of the first trial; trials are spaced 4 s apart, rounds 60 s. */
  startTime?: number;
}

export interface SimOutput {
  rounds: RoundRecord[];
  trials: TrialResult[];
}

const TRIAL_SPACING_MS = 4000;
const ROUND_GAP_MS = 60_000;
const PLAYER_STREAM = 0x5eed;

/** The bias this player would show on a trial, before noise. */
export function simBias(opts: SimOptions, n: number, layout: Layout, trialIndex: number): number {
  const base = (opts.biasByN?.[n] ?? 0) + (opts.layoutBiasPct?.[layout] ?? 0);
  const shrink = (opts.improvementPerTrial ?? 0) * trialIndex;
  return Math.sign(base) * Math.max(0, Math.abs(base) - shrink);
}

export function simulatePlayer(opts: SimOptions): SimOutput {
  const total = opts.trials ?? 100;
  const perRound = opts.trialsPerRound ?? 10;
  const start = opts.startTime ?? 1_700_000_000_000;
  const player = mulberry32(hashSeeds(opts.seed, PLAYER_STREAM));

  const rounds: RoundRecord[] = [];
  const trials: TrialResult[] = [];
  let clock = start;

  for (let r = 0; r * perRound < total; r++) {
    const roundSeed = hashSeeds(opts.seed, r);
    const layout: Layout =
      opts.layout === undefined || opts.layout === "mixed" ? (player() < 0.5 ? "anchored" : "detached") : opts.layout;
    const params: MultiplyParams = { n: opts.n ?? "random", layout };
    const startedAt = clock;
    const roundTrials: TrialResult[] = [];

    for (let i = 0; i < perRound && trials.length < total; i++) {
      const seed = trialSeed(roundSeed, i);
      const trial = multiply.generate(params, mulberry32(seed));
      const trueLength = trial.n * trial.refLength;
      const errorPct = simBias(opts, trial.n, layout, trials.length) + opts.noiseSd * randNormal(player);
      const responseX = trial.origin + trueLength * (1 + errorPct / 100);
      const responseMs = Math.round(1500 + 2500 * player());
      clock += TRIAL_SPACING_MS;
      const result: TrialResult = {
        ...multiply.score(trial, responseX),
        taskId: multiply.id,
        seed,
        responseMs,
        timestamp: clock,
      };
      roundTrials.push(result);
      trials.push(result);
    }

    rounds.push({
      id: `sim-${opts.seed}-${r}`,
      taskId: multiply.id,
      roundSeed,
      params,
      startedAt,
      finishedAt: clock,
      trials: roundTrials,
    });
    clock += ROUND_GAP_MS;
  }
  return { rounds, trials };
}

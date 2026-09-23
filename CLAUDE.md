# Spatial Trainer — CLAUDE.md

> This file was seeded BEFORE session 1 and is the project's source of truth.
> Read it in full at the start of every session. UPDATE it, never rewrite it
> from scratch: keep every section, change only what became true or false.
> STATUS starts empty on purpose — only add a line once you've verified it.

---

## Product

A browser app that trains spatial estimation. The first and flagship task is
EXTRAPOLATION: the user sees one reference bar and clicks where N copies of it
laid end to end would end ("how long do 6 bars look side by side?"). The
reference bar counts as copy 1: the correct answer is where copy n ends,
measured from the track origin.

### Why it's different (drives design calls)

Existing tools (Matthias Wandel's Eyeballing Game, CanYouGames' perception
games, Eyeball It!, daily estimation games) do matching, bisecting, and
center-finding. Nobody leads with extrapolation. Our second differentiator is
LONG-TERM BIAS TRACKING — "you undershoot by 12% once N is above 4, and it's
improving" — rather than one-off round scores. A daily-seed mode comes later.

When a design decision is unclear, pick the option that (a) keeps extrapolation
central and (b) preserves data needed for bias-over-time analysis.

---

## Stack

- Vite + React + TypeScript — `strict: true`, `noUncheckedIndexedAccess: true`
- Vitest for tests
- Plain SVG rendering, Pointer Events for input
- localStorage for persistence
- NO UI library, NO chart library, NO router, NO Supabase (yet)
- Screens are switched by state in `App.tsx` (no router → Vercel needs no
  rewrite config)

## Environment

- Windows / PowerShell. Every command run or documented must work in
  PowerShell. Chain commands with `;` — not `&&` (PowerShell 5.1 lacks it).
- NEVER run a command that waits for interactive input; it hangs the session.
  Use non-interactive flags, or write files by hand.
- GitHub: `iangopenbusinessai-lab/spatial-trainer` (private). `gh` is authenticated.

## Deploy

Vercel, auto-deploy on `git push` to `main`. Ian connects the repo in the
Vercel dashboard. NEVER run the Vercel CLI.

## Scripts

| Command         | Purpose                                   |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Dev server                                |
| `npm run build` | Type-check + production build (strict gate) |
| `npm run test`  | Vitest, single run                        |

---

## Absolute rules

These are non-negotiable. If a change would violate one, stop and ask Ian.

1. Pure logic lives in `src/core/` and imports NOTHING from React or the DOM.
   React only renders core state and forwards input.

2. Every task type implements one interface in `src/core/types.ts`:
   ```ts
   interface TaskType<P, T, R> {
     id: string;
     label: string;
     defaultParams: P;
     generate(params: P, rng: Rng): T;
     score(trial: T, response: R): TrialResult;
   }
   ```
   The matching React component lives in `src/tasks/[id]/View.tsx`. Both are
   registered in ONE place: `src/tasks/registry.ts` (one import, one entry),
   via a `defineTask<P, T, R>(core, View)` helper that erases the generics to
   an `AnyTask` type IN THAT ONE PLACE. Session code only ever sees unknown
   trials/responses. NO `any` and no casts outside that helper. Adding a future
   task type (fractions, angles, area, rotated bars) must never require editing
   core or session code — if it would, the abstraction is wrong; stop and ask.

3. ALL randomness flows through a seeded RNG (mulberry32) in `src/core/rng.ts`.
   `Math.random` is banned in `src/core/`. Same seed must always produce the
   identical trial sequence. Each round has a `roundSeed`; per-trial seed =
   `hash(roundSeed, trialIndex)`, so any single trial can be regenerated alone.
   `Date.now` is also banned in `src/core/` — timestamps arrive in action
   payloads, because the reducer must stay pure.

4. ALL geometry is in viewBox units, NEVER pixels. Fixed SVG viewBox 1000 x 600.
   Convert pointer positions with `svg.getScreenCTM().inverse()` — never
   offsetX/clientX math. The conversion is a pure function in
   `src/core/geometry.ts` so it's unit-testable. A given answer must score
   identically on a 390px phone and a 1440px monitor. The SVG sets
   `touch-action: none` so dragging never scrolls the page.

5. Session flow is a `useReducer` state machine in `src/core/session.ts`
   (pure reducer, no React import, no clock reads):
   `idle → showing → answering → feedback → (next trial | results)`.
   Components dispatch actions; they never mutate session data. Illegal
   actions for the current state are ignored, never thrown.

6. Every trial produces a `TrialResult` with: `taskId, params, seed, trueValue,
   response, signedErrorPct, absErrorPct, score, responseMs, timestamp`.
   SIGNED error is mandatory — bias direction is the product's core insight.
   `params` stores RESOLVED values: if n was `"random"`, record the n drawn.

---

## Storage

- `src/core/storage.ts` = pure serialize/parse. A thin wrapper outside core
  touches `localStorage`.
- Key: `spatial-trainer:v1:rounds`. Bump the version on any breaking schema
  change and write a migration (or explicitly drop old data — document which).
- Parse defensively: corrupt or unknown-version data is ignored and reported;
  it NEVER crashes the app.

---

## Task spec: `multiply` (`src/core/tasks/multiply.ts`)

- **Params:** `n` — integer 2–8, default 6, or `"random"` per trial.
  `layout` — `"anchored" | "detached"`, default anchored.
- **generate:** pick `refLength` (min 30 units) and random `startX` / `trackY`
  such that `startX + n * refLength <= 1000 - 40`. Randomize every trial.
  The true endpoint's x must vary widely — never pick the largest refLength
  that fits, or the right screen edge becomes a landmark.
- **anchored:** reference bar sits at the start of the answer track (copy 1).
- **detached:** reference bar drawn elsewhere (different x and y, never
  overlapping the track or confirm UI); track starts at its own marked origin.
- **No landmarks:** no gridlines, ticks, rulers, or anything else to measure by.
- **Response:** click or drag a marker along the track, adjust, confirm with
  a button or Enter. Marker x clamped to `[origin, 1000 - 40]`.
- **score:**
  ```
  trueLength     = n * refLength
  answerLength   = response - origin
  signedErrorPct = (answerLength - trueLength) / trueLength * 100
  score          = max(0, round(100 - 2 * |signedErrorPct|))
  ```
- **Feedback:** draw the true endpoint and ghost-tile all n copies along the
  track. Show signed error, e.g. "+8.3% — overshot".

## Screens

- **Home:** choose n (fixed or random), layout, start a 10-trial round.
- **Play:** the task view.
- **Results:** mean |error|, mean signed bias, best trial, per-trial list.
- **History:** rounds from localStorage, newest first, mean bias per round.

---

## Folder map

```
src/
  core/            pure logic — no React, no DOM, no Math.random, no Date.now
    rng.ts         mulberry32 + seed hashing
    types.ts       TaskType, TrialResult, shared types
    geometry.ts    pointer → viewBox conversion (pure)
    session.ts     reducer state machine
    scoring.ts     shared error/score math + round aggregates
    storage.ts     versioned serialize/parse
    tasks/
      multiply.ts  generate + score for "multiply"
  tasks/
    registry.ts    THE ONLY place task types are registered
    multiply/
      View.tsx     SVG rendering + input for "multiply"
  screens/
    Home.tsx  Play.tsx  Results.tsx  History.tsx
  App.tsx          screen switching via state
```

Test location: _to be decided in session 1 (colocated `*.test.ts` or
`src/test/`) — record the choice here and follow it everywhere._

## How to add a new task type

1. Create `src/core/tasks/<id>.ts` exporting a `TaskType<P, T, R>`:
   params type, trial type, response type, `generate`, `score`. Use only the
   passed-in `rng`. All geometry in viewBox units.
2. Write its tests: same seed → same trial; every generated trial fits the
   viewBox with margin across 1000 seeds; perfect response → score 100;
   known over/undershoot → correct signed error sign and size.
3. Create `src/tasks/<id>/View.tsx`: render the trial as SVG, convert input
   via `core/geometry.ts`, dispatch actions only. No scoring in the view.
4. Add ONE entry to `src/tasks/registry.ts` via `defineTask`.
5. If any step required touching `core/session.ts`, `core/types.ts`,
   `core/storage.ts`, or a screen — STOP. The abstraction is wrong; tell Ian.
6. Update this file: folder map, STATUS, session log.

---

## Roadmap (in order)

1. Bias-vs-N chart (hand-rolled SVG, no chart library)
2. More task types: fraction, angle, area, rotated/vertical bars,
   reference-disappears mode
3. Daily seed mode
4. Supabase accounts + leaderboard

Ideas parked mid-session go here, not into the code:

- _(none yet)_

---

## STATUS

Only verified facts. Each line says HOW it was verified.

### Verified

- _(nothing yet — session 1 not run)_

### Open / unverified

- Everything in this file is spec, not implementation.

---

## Decisions log

Choices the spec didn't dictate, with a one-line reason.

- _(session 1 adds entries here)_

## Session log

- **Session 0 (planning):** spec and this file written. No code exists.

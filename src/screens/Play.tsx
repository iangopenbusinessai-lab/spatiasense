import { useEffect, type Dispatch } from "react";
import { formatTrialError } from "../core/scoring";
import type { SessionAction, SessionState } from "../core/session";
import type { AnyTask } from "../tasks/registry";

type PlayState = Extract<SessionState, { phase: "showing" | "answering" | "feedback" }>;

interface PlayProps {
  task: AnyTask;
  state: PlayState;
  dispatch: Dispatch<SessionAction>;
}

export function Play({ task, state, dispatch }: PlayProps) {
  const { View } = task;
  const { phase, current, round } = state;
  const response = phase === "showing" ? null : state.response;
  const last = phase === "feedback" ? state.results[state.results.length - 1] : undefined;
  const isLast = current.index + 1 >= round.trialCount;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      // A focused button handles Enter itself; don't fire twice.
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement) return;
      e.preventDefault();
      if (phase === "answering") dispatch({ type: "confirm", now: Date.now() });
      else if (phase === "feedback") dispatch({ type: "next", now: Date.now() });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, dispatch]);

  return (
    <section className="screen play">
      <header className="play-header">
        <span>
          Trial {current.index + 1} / {round.trialCount}
        </span>
        <button className="quiet" onClick={() => dispatch({ type: "quit" })}>
          Quit
        </button>
      </header>

      <View
        key={current.seed}
        trial={current.trial}
        response={response}
        phase={phase}
        onResponse={(r) => dispatch({ type: "respond", response: r })}
      />

      <footer className="play-footer">
        {phase !== "feedback" && (
          <>
            <span className="hint">{phase === "showing" ? "Click or drag on the track." : "Adjust, then confirm (Enter)."}</span>
            <button
              className="primary"
              disabled={phase !== "answering"}
              onClick={() => dispatch({ type: "confirm", now: Date.now() })}
            >
              Confirm
            </button>
          </>
        )}
        {phase === "feedback" && last && (
          <>
            <span className={`verdict ${last.signedErrorPct > 0 ? "over" : "under"}`}>
              {formatTrialError(last)} · score {last.score}
            </span>
            <button className="primary" autoFocus onClick={() => dispatch({ type: "next", now: Date.now() })}>
              {isLast ? "See results" : "Next"}
            </button>
          </>
        )}
      </footer>
    </section>
  );
}

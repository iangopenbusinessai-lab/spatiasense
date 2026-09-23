import { useEffect, useReducer, useState } from "react";
import { initialSession, sessionReducer, toRoundRecord } from "./core/session";
import { saveRound } from "./persistence";
import { History } from "./screens/History";
import { Insight } from "./screens/Insight";
import { Home } from "./screens/Home";
import { Play } from "./screens/Play";
import { Results } from "./screens/Results";
import { findTask, tasks, type AnyTask } from "./tasks/registry";

const TRIALS_PER_ROUND = 10;

function newRoundSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

export function App() {
  const firstTask = tasks[0];
  if (!firstTask) throw new Error("No tasks registered");

  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const [idleScreen, setIdleScreen] = useState<"home" | "history" | "insight">("home");
  const [taskId, setTaskId] = useState(firstTask.core.id);
  const [paramsByTask, setParamsByTask] = useState<Record<string, unknown>>({});
  const [saveFailed, setSaveFailed] = useState(false);

  const task: AnyTask = findTask(taskId) ?? firstTask;
  const params = paramsByTask[task.core.id] ?? task.core.defaultParams;

  const start = () => {
    setSaveFailed(false);
    dispatch({
      type: "start",
      task: task.core,
      params,
      roundSeed: newRoundSeed(),
      trialCount: TRIALS_PER_ROUND,
      now: Date.now(),
    });
  };

  // Persist each finished round once: keyed on the round id only, and
  // saveRound is idempotent by id (StrictMode may run the effect twice).
  const finishedId = session.phase === "results" ? session.round.id : null;
  useEffect(() => {
    if (session.phase !== "results") return;
    setSaveFailed(!saveRound(toRoundRecord(session)));
  }, [finishedId]);

  switch (session.phase) {
    case "idle":
      if (idleScreen === "insight") return <Insight onBack={() => setIdleScreen("home")} />;
      return idleScreen === "history" ? (
        <History onBack={() => setIdleScreen("home")} onInsight={() => setIdleScreen("insight")} />
      ) : (
        <Home
          task={task}
          params={params}
          trialCount={TRIALS_PER_ROUND}
          onSelectTask={setTaskId}
          onParamsChange={(next) => setParamsByTask((m) => ({ ...m, [task.core.id]: next }))}
          onStart={start}
          onHistory={() => setIdleScreen("history")}
          onInsight={() => setIdleScreen("insight")}
        />
      );
    case "showing":
    case "answering":
    case "feedback": {
      const playing = findTask(session.round.task.id) ?? task;
      return <Play task={playing} state={session} dispatch={dispatch} />;
    }
    case "results":
      return (
        <Results
          label={session.round.task.label}
          results={session.results}
          saveFailed={saveFailed}
          onAgain={start}
          onHome={() => {
            setIdleScreen("home");
            dispatch({ type: "quit" });
          }}
          onInsight={() => {
            setIdleScreen("insight");
            dispatch({ type: "quit" });
          }}
        />
      );
  }
}

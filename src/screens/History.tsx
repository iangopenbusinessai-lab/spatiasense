import { useMemo } from "react";
import { summarize } from "../core/scoring";
import { loadRounds } from "../persistence";
import { findTask } from "../tasks/registry";
import { pct } from "./Results";

interface HistoryProps {
  onBack: () => void;
}

export function History({ onBack }: HistoryProps) {
  const { rounds, problems } = useMemo(() => loadRounds(), []);
  const newestFirst = [...rounds].sort((a, b) => b.finishedAt - a.finishedAt);

  return (
    <section className="screen history">
      <h1>History</h1>
      {problems.map((p) => (
        <p key={p} className="warning">
          {p}
        </p>
      ))}
      {newestFirst.length === 0 && <p className="lede">No rounds yet.</p>}
      {newestFirst.length > 0 && (
        <table className="trials">
          <thead>
            <tr>
              <th>When</th>
              <th>Task</th>
              <th>Trials</th>
              <th>Mean |error|</th>
              <th>Mean bias</th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((r) => {
              const s = summarize(r.trials);
              return (
                <tr key={r.id}>
                  <td>{new Date(r.finishedAt).toLocaleString()}</td>
                  <td>{findTask(r.taskId)?.core.label ?? r.taskId}</td>
                  <td>{s.count}</td>
                  <td>{s.meanAbsErrorPct.toFixed(1)}%</td>
                  <td>{pct(s.meanSignedErrorPct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="actions">
        <button onClick={onBack}>Back</button>
      </div>
    </section>
  );
}

import { formatSignedError, summarize } from "../core/scoring";
import type { TrialResult } from "../core/types";

interface ResultsProps {
  label: string;
  results: readonly TrialResult[];
  saveFailed: boolean;
  onAgain: () => void;
  onHome: () => void;
}

export const pct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;

export function Results({ label, results, saveFailed, onAgain, onHome }: ResultsProps) {
  const s = summarize(results);
  const best = results[s.bestIndex];
  return (
    <section className="screen results">
      <h1>Round complete</h1>
      <p className="lede">{label}</p>
      {saveFailed && <p className="warning">This round couldn't be saved to history (browser storage unavailable).</p>}

      <dl className="stats">
        <div>
          <dt>Mean |error|</dt>
          <dd>{s.meanAbsErrorPct.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Mean bias</dt>
          <dd>{pct(s.meanSignedErrorPct)}</dd>
        </div>
        <div>
          <dt>Best trial</dt>
          <dd>{best ? `#${s.bestIndex + 1} · ${best.absErrorPct.toFixed(1)}%` : "—"}</dd>
        </div>
        <div>
          <dt>Mean score</dt>
          <dd>{s.meanScore.toFixed(0)}</dd>
        </div>
      </dl>

      <table className="trials">
        <thead>
          <tr>
            <th>#</th>
            <th>Error</th>
            <th>Score</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={r.seed} className={i === s.bestIndex ? "best" : undefined}>
              <td>{i + 1}</td>
              <td>{formatSignedError(r.signedErrorPct)}</td>
              <td>{r.score}</td>
              <td>{(r.responseMs / 1000).toFixed(1)}s</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="actions">
        <button className="primary" onClick={onAgain}>
          Play again
        </button>
        <button onClick={onHome}>Home</button>
      </div>
    </section>
  );
}

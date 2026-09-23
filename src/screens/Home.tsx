import { tasks, type AnyTask } from "../tasks/registry";

interface HomeProps {
  task: AnyTask;
  params: unknown;
  trialCount: number;
  onSelectTask: (id: string) => void;
  onParamsChange: (next: unknown) => void;
  onStart: () => void;
  onHistory: () => void;
  onInsight: () => void;
}

export function Home({ task, params, trialCount, onSelectTask, onParamsChange, onStart, onHistory, onInsight }: HomeProps) {
  const { Settings } = task;
  return (
    <section className="screen home">
      <h1>Spatiasense</h1>
      <p className="lede">Train your eye for extrapolation. Tracks your bias over time.</p>

      {tasks.length > 1 && (
        <label className="field">
          <span>Task</span>
          <select value={task.core.id} onChange={(e) => onSelectTask(e.target.value)}>
            {tasks.map((t) => (
              <option key={t.core.id} value={t.core.id}>
                {t.core.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {tasks.length === 1 && <h2>{task.core.label}</h2>}

      <Settings value={params} onChange={onParamsChange} />

      <div className="actions">
        <button className="primary" onClick={onStart}>
          Start {trialCount}-trial round
        </button>
        <button onClick={onInsight}>Your bias</button>
        <button onClick={onHistory}>History</button>
      </div>
    </section>
  );
}

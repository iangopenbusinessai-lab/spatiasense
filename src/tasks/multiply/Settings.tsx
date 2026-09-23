import { N_MAX, N_MIN, type Layout, type MultiplyParams } from "../../core/tasks/multiply";
import type { SettingsProps } from "../props";

const nOptions = Array.from({ length: N_MAX - N_MIN + 1 }, (_, i) => N_MIN + i);

export function MultiplySettings({ value, onChange }: SettingsProps<MultiplyParams>) {
  return (
    <div className="settings">
      <label className="field">
        <span>Copies (n)</span>
        <select
          value={String(value.n)}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ ...value, n: v === "random" ? "random" : Number(v) });
          }}
        >
          {nOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="random">Random ({N_MIN}–{N_MAX}) each trial</option>
        </select>
      </label>
      <fieldset className="field">
        <legend>Reference bar</legend>
        {(["anchored", "detached"] as const).map((layout: Layout) => (
          <label key={layout} className="radio">
            <input
              type="radio"
              name="multiply-layout"
              checked={value.layout === layout}
              onChange={() => onChange({ ...value, layout })}
            />
            {layout === "anchored" ? "Anchored — at the start of the track" : "Detached — drawn elsewhere"}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

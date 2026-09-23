import type { ComponentType } from "react";
import type { AnyTaskCore, TaskType } from "../core/types";
import type { SettingsProps, ViewProps } from "./props";
import { multiply } from "../core/tasks/multiply";
import { MultiplySettings } from "./multiply/Settings";
import { MultiplyView } from "./multiply/View";

export interface AnyTask {
  core: AnyTaskCore;
  View: ComponentType<ViewProps<unknown, unknown>>;
  Settings: ComponentType<SettingsProps<unknown>>;
}

/**
 * THE ONLY place generics are erased. Everything downstream sees unknown
 * params/trials/responses, which only ever come back into the task that made them.
 */
function defineTask<P, T, R>(
  core: TaskType<P, T, R>,
  View: ComponentType<ViewProps<T, R>>,
  Settings: ComponentType<SettingsProps<P>>,
): AnyTask {
  return {
    core: {
      id: core.id,
      label: core.label,
      defaultParams: core.defaultParams,
      generate: (params, rng) => core.generate(params as P, rng),
      score: (trial, response) => core.score(trial as T, response as R),
      insightDimensions: (core.insightDimensions ?? []).map((d) => ({
        key: d.key,
        label: d.label,
        kind: d.kind,
        extract: (params: unknown) => d.extract(params as P),
      })),
    },
    View: View as unknown as ComponentType<ViewProps<unknown, unknown>>,
    Settings: Settings as unknown as ComponentType<SettingsProps<unknown>>,
  };
}

export const tasks: readonly AnyTask[] = [
  defineTask(multiply, MultiplyView, MultiplySettings),
];

export function findTask(id: string): AnyTask | undefined {
  return tasks.find((t) => t.core.id === id);
}

export type TrialPhase = "showing" | "answering" | "feedback";

/** Props every task View receives. Views render and forward input; they never score. */
export interface ViewProps<T, R> {
  trial: T;
  /** Current draft (or confirmed, in feedback) response; null before the first input. */
  response: R | null;
  phase: TrialPhase;
  onResponse: (response: R) => void;
}

/** Props every task Settings form receives. */
export interface SettingsProps<P> {
  value: P;
  onChange: (next: P) => void;
}

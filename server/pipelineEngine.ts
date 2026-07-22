import { callLLM } from "./llm";

/**
 * Generic declarative pipeline engine.
 *
 * Every multi-step AI pipeline (dossier, story docs, chapter writing, line
 * editing) used to be a hand-rolled switch statement with its own step
 * counter, resume logic, and preview handling. They are now declared as data:
 * an ordered list of named steps, each a function of the pipeline state.
 *
 * The engine owns step sequencing, bounds checking, step advancement, and
 * the run-one-step contract the REST routes expose. Pipeline definitions
 * own only their prompts and how outputs land in state.
 */

export interface PipelineState {
  current_step: number;
}

export interface LLMOpts {
  /** Static rules/reference text — sent as a cacheable system prompt */
  system?: string;
  maxTokens?: number;
}

/** Model-tier helpers for use inside step bodies */
export const llm = {
  cheap: (prompt: string, opts?: LLMOpts) =>
    callLLM(prompt, "cheap", opts?.system, opts?.maxTokens),
  powerful: (prompt: string, opts?: LLMOpts) =>
    callLLM(prompt, "powerful", opts?.system, opts?.maxTokens),
};

/** Standard 300-char output preview */
export function preview(text: string, n = 300): string {
  return text.length > n ? text.substring(0, n) + "..." : text;
}

export interface StepDef<S extends PipelineState> {
  name: string;
  /**
   * Execute the step: call the LLM, write results into state, and return a
   * short human-readable preview (or nothing for a default preview).
   * Must NOT touch state.current_step — the engine advances it.
   */
  run: (state: S) => Promise<string | void> | string | void;
}

export interface PipelineDef<S extends PipelineState> {
  name: string;
  steps: StepDef<S>[];
}

export function definePipeline<S extends PipelineState>(
  name: string,
  steps: StepDef<S>[]
): PipelineDef<S> {
  return { name, steps };
}

export function stepNameOf<S extends PipelineState>(
  def: PipelineDef<S>,
  step: number
): string {
  return def.steps[step]?.name ?? "Unknown Step";
}

export function isComplete<S extends PipelineState>(
  def: PipelineDef<S>,
  state: S
): boolean {
  return state.current_step >= def.steps.length;
}

export async function runPipelineStep<S extends PipelineState>(
  def: PipelineDef<S>,
  state: S
): Promise<{ updatedState: S; outputPreview: string }> {
  const idx = state.current_step;
  const step = def.steps[idx];
  if (!step) {
    throw new Error(
      `${def.name} step ${idx} is out of range. Pipeline is complete.`
    );
  }
  const result = await step.run(state);
  state.current_step = idx + 1;
  return { updatedState: state, outputPreview: result ?? "" };
}

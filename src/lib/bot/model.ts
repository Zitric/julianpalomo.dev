/**
 * The model behind the assistant and its settings, in one place. Why this
 * model is in docs/adr/2026-10-27-claude-model-and-ai-sdk-7.md.
 */
import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";

export const MODEL_ID = "claude-haiku-5-5";

// Thinking counts toward this cap too; answers are meant to be short.
export const MAX_OUTPUT_TOKENS = 2000;

/** The most model calls one answer may take, tool calls included. */
export const MAX_STEPS = 5;

// Effort is set explicitly because this model defaults to `medium`. Never add
// temperature, topP or topK: the model rejects non-default values.
export const anthropicOptions = {
  effort: "low",
} as const satisfies AnthropicLanguageModelOptions;

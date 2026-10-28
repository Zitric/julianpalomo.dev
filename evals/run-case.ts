/**
 * Runs one case through `handleChat`, the production endpoint, with the real
 * model, and collects what came back. The request is built like the
 * browser's, so the validation, the tools, the prompt, the citation check and
 * the limits all run as they do in production. Only `handleChat`'s existing
 * overrides are used; there is no code path for evals in src/.
 */
import {
  parseJsonEventStream,
  readUIMessageStream,
  type UIMessageChunk,
  uiMessageChunkSchema,
} from "ai";
import { handleChat } from "../src/lib/bot/chat";
import type { ChatUIMessage } from "../src/lib/bot/chat-message";
import type { TokenUsage } from "../src/lib/bot/limits";
import type { UsageStore } from "../src/lib/bot/usage";
import type { EvalCase } from "./cases";
import type { Answer } from "./checks";

export type ToolCall = { tool: string; input: unknown; output: unknown };

/** One run of one case: the last answer, with what it cost across every turn. */
export type RunResult = Answer & {
  toolCalls: ToolCall[];
  usage: TokenUsage;
  costMicroUsd: number;
};

const VISITOR_SALT = "evals-fixed-salt";

/** Passes `isD1`, so the endpoint answers; the in-memory store means it's never queried. */
const standInDb = {
  prepare: () => {
    throw new Error("evals use the in-memory store, never D1");
  },
};

/**
 * Today's counts for one run only, so a long eval run never hits the
 * 30-questions or $1-a-day limits. It also collects the usage the endpoint
 * records, which is how the runner learns each answer's tokens and cost.
 */
function runStore() {
  const messages = new Map<string, number>();
  const usage: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let costMicroUsd = 0;
  const store: UsageStore = {
    readToday: async (_day, visitor) => ({
      visitorMessages: messages.get(visitor) ?? 0,
      spentMicroUsd: costMicroUsd,
    }),
    countMessage: async (_day, visitor) => {
      messages.set(visitor, (messages.get(visitor) ?? 0) + 1);
    },
    addUsage: async (_day, step, cost) => {
      usage.input += step.input;
      usage.output += step.output;
      usage.cacheRead += step.cacheRead;
      usage.cacheWrite += step.cacheWrite;
      costMicroUsd += cost;
    },
  };
  return { store, usage, cost: () => costMicroUsd };
}

/** A POST shaped like the one `useChat` sends. */
function chatRequest(messages: ChatUIMessage[]): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "eval", messages, trigger: "submit-message" }),
  });
}

/** The last state of the streamed answer, read with the SDK's own readers. */
async function readAnswer(
  body: ReadableStream<Uint8Array>,
): Promise<{ message: ChatUIMessage | undefined; streamError: string | undefined }> {
  let streamError: string | undefined;
  const chunks: UIMessageChunk[] = [];
  const reader = parseJsonEventStream({ stream: body, schema: uiMessageChunkSchema }).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value.success) chunks.push(value.value);
    else streamError = `unreadable chunk: ${value.error.message}`;
  }

  let message: ChatUIMessage | undefined;
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  for await (const state of readUIMessageStream<ChatUIMessage>({
    stream,
    onError: (error) => {
      streamError = error instanceof Error ? error.message : String(error);
    },
  })) {
    message = state;
  }
  return { message, streamError };
}

function textOf(message: ChatUIMessage | undefined): string {
  return (message?.parts ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("");
}

function sourceIdsOf(message: ChatUIMessage | undefined): string[] {
  return (message?.parts ?? []).flatMap((part) =>
    part.type === "data-sources" ? part.data.sources.map((source) => source.id) : [],
  );
}

function toolCallsOf(message: ChatUIMessage | undefined): ToolCall[] {
  return (message?.parts ?? []).flatMap((part) => {
    if (!("toolCallId" in part)) return [];
    const tool = part.type === "dynamic-tool" ? part.toolName : part.type.slice("tool-".length);
    return [{ tool, input: part.input, output: "output" in part ? part.output : undefined }];
  });
}

/**
 * Asks the case's visitor turns in order, sending the bot's earlier answers
 * back whole, as `useChat` does, and returns the last answer. A fixed earlier
 * answer in the case goes into the history as written. A request that doesn't
 * answer 200 ends the run with that status.
 */
export async function runCase(evalCase: EvalCase, apiKey: string): Promise<RunResult> {
  const { store, usage, cost } = runStore();
  const env = { ANTHROPIC_API_KEY: apiKey, VISITOR_SALT, DB: standInDb };
  const history: ChatUIMessage[] = [];
  let last: Answer = { status: 200, text: "", sourceIds: [], streamError: undefined };
  let toolCalls: ToolCall[] = [];

  for (const [index, turn] of evalCase.turns.entries()) {
    const id = `m${index + 1}`;
    if (typeof turn !== "string") {
      history.push({ id, role: "assistant", parts: [{ type: "text", text: turn.text }] });
      continue;
    }
    history.push({ id, role: "user", parts: [{ type: "text", text: turn }] });

    const pending: Promise<unknown>[] = [];
    const response = await handleChat(chatRequest(history), env, {
      createStore: () => store,
      waitUntil: (promise) => {
        pending.push(promise);
      },
    });
    if (response.status !== 200 || response.body === null) {
      last = { status: response.status, text: "", sourceIds: [], streamError: undefined };
      toolCalls = [];
      break;
    }
    const { message, streamError } = await readAnswer(response.body);
    await Promise.all(pending);
    if (message !== undefined) history.push({ ...message, id: `a${index + 1}` });
    last = {
      status: response.status,
      text: textOf(message),
      sourceIds: sourceIdsOf(message),
      streamError,
    };
    toolCalls = toolCallsOf(message);
  }

  return { ...last, toolCalls, usage: { ...usage }, costMicroUsd: cost() };
}

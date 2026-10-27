/**
 * Demo mode: a scripted model for previews and e2e runs, where there is no
 * API key. It calls the real get_claims tool, then quotes the first claim it
 * returns word for word with its citation, so the answer goes through the
 * same tools, sources and citation check as a real one and never says
 * anything about Julian that isn't a confirmed claim.
 *
 * The endpoint uses it only when BOT_DEMO is "1" and there is no API key, so
 * production, which has a key, can never answer from here.
 */
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";

type StreamPart =
  Awaited<ReturnType<MockLanguageModelV4["doStream"]>>["stream"] extends ReadableStream<infer P>
    ? P
    : never;

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

// The first claim in a get_claims result, as the model sees it in the prompt.
const toolMessageSchema = z.object({
  role: z.literal("tool"),
  content: z.array(
    z.looseObject({
      type: z.literal("tool-result"),
      toolName: z.literal("get_claims"),
      output: z.object({
        type: z.literal("json"),
        value: z.object({ claims: z.array(z.looseObject({ id: z.string(), text: z.string() })) }),
      }),
    }),
  ),
});

function firstClaimIn(prompt: readonly unknown[]): { id: string; text: string } | undefined {
  for (const message of prompt) {
    const parsed = toolMessageSchema.safeParse(message);
    if (parsed.success) return parsed.data.content[0]?.output.value.claims[0];
  }
  return undefined;
}

function textAnswer(text: string): StreamPart[] {
  return [
    { type: "text-start", id: "demo" },
    { type: "text-delta", id: "demo", delta: text },
    { type: "text-end", id: "demo" },
    { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
  ];
}

/** Text the demo answer starts with, so nobody mistakes it for the model. */
export const DEMO_ANSWER_INTRO = "Demo answer: previews don't call the model.";

export function createDemoModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: "demo",
    modelId: "demo",
    doStream: async ({ prompt }) => {
      const claim = firstClaimIn(prompt);
      const hasLookedUp = prompt.some((message) => message.role === "tool");
      let chunks: StreamPart[];
      if (claim) {
        chunks = textAnswer(
          `${DEMO_ANSWER_INTRO} Here is a claim as an example: ${claim.text} [[${claim.id}]]`,
        );
      } else if (hasLookedUp) {
        chunks = textAnswer(`${DEMO_ANSWER_INTRO} There are no confirmed claims to quote yet.`);
      } else {
        chunks = [
          { type: "tool-call", toolCallId: "demo-call", toolName: "get_claims", input: "{}" },
          { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
        ];
      }
      return { stream: simulateReadableStream({ chunks }) };
    },
  });
}

/**
 * The chat endpoint's logic: validates the request, streams an answer from
 * the confirmed claims, and turns every failure into a small typed error.
 * The route in src/routes/api/chat.ts only passes in the request and the
 * environment, so this module can be tested with a mock model.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  type LanguageModel,
  streamText,
  toUIMessageStream,
} from "ai";
import { z } from "zod";
import { confirmedClaims } from "../claims";
import { type ChatErrorCode, chatErrorBody } from "./chat-error";
import type { ChatUIMessage } from "./chat-message";
import { parseCitations, type Source } from "./citations";
import { createDemoModel } from "./demo";
import { MAX_VISITOR_TEXT } from "./limits";
import { anthropicOptions, MAX_OUTPUT_TOKENS, MAX_STEPS, MODEL_ID } from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import { buildTools } from "./tools";

const MAX_MESSAGES = 20;
// The most text one earlier answer may hold. Like MAX_VISITOR_TEXT it counts a
// message's text parts together, so splitting a message can't get around
// either limit; with 20 messages a request carries at most about 110,000
// characters. It is higher because an answer can be up to MAX_OUTPUT_TOKENS
// long and useChat sends it back with the next question.
const MAX_ANSWER_TEXT = 10_000;

/** What the stream says when the model fails mid-answer; never the provider's message. */
export const STREAM_ERROR_TEXT = "Something went wrong. Please try again.";

// A missing, empty or malformed value reads as unset, never as an error.
const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional().catch(undefined),
  BOT_DEMO: z.string().optional().catch(undefined),
});

// What get_claims and search_claims return, read down to the fields a source
// needs. z.object drops the rest (text, area), so a source never carries them.
const claimsOutputSchema = z.object({
  claims: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      org: z.string().optional(),
      source: z.enum(["cv", "julian"]) satisfies z.ZodType<Source["source"]>,
    }),
  ),
});

// Only text parts reach the model. Tool results and any other part type in the
// history are dropped, because the visitor controls the history and could
// forge a tool result that the model would take as a source.
const partSchema = z.looseObject({ type: z.string(), text: z.unknown().optional() });

const messageSchema = z
  .looseObject({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    parts: z.array(partSchema).max(100),
  })
  .superRefine((message, ctx) => {
    let total = 0;
    message.parts.forEach((part, index) => {
      if (part.type !== "text") return;
      if (typeof part.text !== "string") {
        ctx.addIssue({
          code: "custom",
          message: "text must be a string",
          path: ["parts", index, "text"],
        });
        return;
      }
      total += part.text.length;
    });
    const limit = message.role === "user" ? MAX_VISITOR_TEXT : MAX_ANSWER_TEXT;
    if (total > limit) {
      ctx.addIssue({
        code: "custom",
        message: `a ${message.role} message holds at most ${limit} characters of text`,
        path: ["parts"],
      });
    }
  })
  .transform((message) => ({
    role: message.role,
    parts: message.parts.flatMap((part) =>
      part.type === "text" && typeof part.text === "string"
        ? [{ type: "text" as const, text: part.text }]
        : [],
    ),
  }));

// The model answers the visitor's last message, so the conversation has to end
// with one that has text; anything else would fail at the provider instead.
const bodySchema = z
  .looseObject({
    messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  })
  .refine(
    (body) => {
      const last = body.messages.at(-1);
      return last?.role === "user" && last.parts.length > 0;
    },
    { message: "the last message must be the visitor's, with text", path: ["messages"] },
  );

type Deps = {
  createModel: (apiKey: string) => LanguageModel;
};

const defaultDeps: Deps = {
  createModel: (apiKey) => createAnthropic({ apiKey })(MODEL_ID),
};

function errorResponse(status: 400 | 500 | 503, error: ChatErrorCode): Response {
  return Response.json(chatErrorBody(error), { status });
}

/** Answers a POST to /api/chat. `env` is the Worker's environment, unparsed. */
export async function handleChat(
  request: Request,
  env: unknown,
  deps: Deps = defaultDeps,
): Promise<Response> {
  const parsedEnv = envSchema.safeParse(env);
  if (!parsedEnv.success) return errorResponse(503, "unavailable");
  const { ANTHROPIC_API_KEY: apiKey, BOT_DEMO } = parsedEnv.data;
  // With a key the model always answers, whatever BOT_DEMO says, so a
  // production Worker can never serve the demo. Without a key, BOT_DEMO="1"
  // turns the demo on; otherwise there is nothing to answer with.
  const demo = apiKey === undefined && BOT_DEMO === "1";
  if (apiKey === undefined && !demo) return errorResponse(503, "unavailable");

  const json: unknown = await request.json().catch(() => undefined);
  const body = bodySchema.safeParse(json);
  if (!body.success) return errorResponse(400, "invalid_request");

  try {
    const messages = await convertToModelMessages(
      body.data.messages.filter((message) => message.parts.length > 0),
    );
    const tools = buildTools(confirmedClaims());
    const model = apiKey === undefined ? createDemoModel() : deps.createModel(apiKey);
    const onError = (error: unknown) => {
      console.error("chat stream failed", error);
      return STREAM_ERROR_TEXT;
    };

    const stream = createUIMessageStream<ChatUIMessage>({
      execute: ({ writer }) => {
        // The claims tools returned during this answer, in the order they
        // arrived. Only these ids may become sources.
        const sources = new Map<string, Source>();

        writer.write({ type: "start", messageMetadata: demo ? { demo: true } : undefined });
        const result = streamText({
          model,
          // One breakpoint here caches the tools and the system prompt, which
          // come first in the request. Both are byte-stable between requests.
          instructions: {
            role: "system",
            content: SYSTEM_PROMPT,
            providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
          },
          messages,
          tools,
          stopWhen: isStepCount(MAX_STEPS),
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          providerOptions: { anthropic: anthropicOptions },
          onToolExecutionEnd: ({ toolOutput }) => {
            if (toolOutput.type !== "tool-result") return;
            const output = claimsOutputSchema.safeParse(toolOutput.output);
            if (!output.success) return;
            const before = sources.size;
            for (const claim of output.data.claims) {
              if (!sources.has(claim.id)) sources.set(claim.id, claim);
            }
            if (sources.size === before) return;
            // The same id each time, so the UI updates one part instead of adding another.
            writer.write({
              type: "data-sources",
              id: "sources",
              data: { sources: [...sources.values()] },
            });
          },
          onEnd: ({ steps }) => {
            const text = steps.map((step) => step.text).join("");
            const { invalid } = parseCitations(text, new Set(sources.keys()));
            // Ids only: the answer can quote the visitor, so its text is never logged.
            if (invalid.length > 0) console.warn("chat: invalid citations", invalid);
          },
        });
        writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false, onError }));
      },
      onError,
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("chat request failed", error);
    return errorResponse(500, "failed");
  }
}

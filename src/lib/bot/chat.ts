/**
 * The chat endpoint's logic: validates the request, streams an answer from
 * the confirmed claims, and turns every failure into a small typed error.
 * The route in src/routes/api/chat.ts only passes in the request and the
 * environment, so this module can be tested with a mock model.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  type LanguageModel,
  streamText,
  toUIMessageStream,
} from "ai";
import { z } from "zod";
import { confirmedClaims } from "../claims";
import { anthropicOptions, MAX_OUTPUT_TOKENS, MAX_STEPS, MODEL_ID } from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import { buildTools } from "./tools";

const MAX_MESSAGES = 20;
const MAX_VISITOR_TEXT = 1_000;
// A previous answer can be up to MAX_OUTPUT_TOKENS long, well over the
// visitor's limit, and useChat sends it back with the next question.
const MAX_ANSWER_TEXT = 10_000;

/** The JSON body of every error response, so the UI can tell them apart. */
type ChatError = { error: "invalid_request" | "unavailable" | "failed" };

/** What the stream says when the model fails mid-answer; never the provider's message. */
export const STREAM_ERROR_TEXT = "Something went wrong. Please try again.";

const envSchema = z.object({ ANTHROPIC_API_KEY: z.string().trim().min(1) });

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
    const limit = message.role === "user" ? MAX_VISITOR_TEXT : MAX_ANSWER_TEXT;
    message.parts.forEach((part, index) => {
      if (part.type !== "text") return;
      if (typeof part.text !== "string" || part.text.length > limit) {
        ctx.addIssue({
          code: "custom",
          message: `text must be a string of at most ${limit} characters`,
          path: ["parts", index, "text"],
        });
      }
    });
  })
  .transform((message) => ({
    role: message.role,
    parts: message.parts.flatMap((part) =>
      part.type === "text" && typeof part.text === "string"
        ? [{ type: "text" as const, text: part.text }]
        : [],
    ),
  }));

const bodySchema = z.looseObject({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
});

type Deps = {
  createModel: (apiKey: string) => LanguageModel;
};

const defaultDeps: Deps = {
  createModel: (apiKey) => createAnthropic({ apiKey })(MODEL_ID),
};

function errorResponse(status: 400 | 500 | 503, error: ChatError["error"]): Response {
  return Response.json({ error } satisfies ChatError, { status });
}

/** Answers a POST to /api/chat. `env` is the Worker's environment, unparsed. */
export async function handleChat(
  request: Request,
  env: unknown,
  deps: Deps = defaultDeps,
): Promise<Response> {
  const parsedEnv = envSchema.safeParse(env);
  if (!parsedEnv.success) return errorResponse(503, "unavailable");

  const json: unknown = await request.json().catch(() => undefined);
  const body = bodySchema.safeParse(json);
  if (!body.success) return errorResponse(400, "invalid_request");

  try {
    const messages = body.data.messages.filter((message) => message.parts.length > 0);
    const tools = buildTools(confirmedClaims());
    const result = streamText({
      model: deps.createModel(parsedEnv.data.ANTHROPIC_API_KEY),
      // One breakpoint here caches the tools and the system prompt, which
      // come first in the request. Both are byte-stable between requests.
      instructions: {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: isStepCount(MAX_STEPS),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      providerOptions: { anthropic: anthropicOptions },
    });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        onError: (error) => {
          console.error("chat stream failed", error);
          return STREAM_ERROR_TEXT;
        },
      }),
    });
  } catch (error) {
    console.error("chat request failed", error);
    return errorResponse(500, "failed");
  }
}

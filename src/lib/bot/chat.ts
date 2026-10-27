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
import { checkLimits, estimateCostMicroUsd, MAX_VISITOR_TEXT, type TokenUsage } from "./limits";
import { anthropicOptions, MAX_OUTPUT_TOKENS, MAX_STEPS, MODEL_ID } from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import { buildTools } from "./tools";
import { type D1Like, d1UsageStore, isD1, type UsageStore, utcDay, visitorHash } from "./usage";

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
  VISITOR_SALT: z.string().trim().min(1).optional().catch(undefined),
  // Checked with isD1 where it is used. Optional, since previews and demo mode have no D1.
  DB: z.unknown().optional(),
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
  createStore: (db: D1Like) => UsageStore;
  /** Keeps the Worker running until `promise` settles, even after the visitor has gone. */
  waitUntil: (promise: Promise<unknown>) => void;
};

const defaultDeps: Deps = {
  createModel: (apiKey) => createAnthropic({ apiKey })(MODEL_ID),
  createStore: d1UsageStore,
  // Outside Workers nothing cuts the request short, so the promise just runs.
  // The route passes the runtime's waitUntil.
  waitUntil: () => {},
};

function addTokens(total: TokenUsage, step: TokenUsage): void {
  total.input += step.input;
  total.output += step.output;
  total.cacheRead += step.cacheRead;
  total.cacheWrite += step.cacheWrite;
}

/** Who is asking, without keeping their IP. Local dev has no header, so it gets one shared id. */
const LOCAL_VISITOR_IP = "local";

/** The SDK's usage report, in the units the price table charges. */
function tokenUsage(usage: {
  inputTokens: number | undefined;
  inputTokenDetails: {
    noCacheTokens: number | undefined;
    cacheReadTokens: number | undefined;
    cacheWriteTokens: number | undefined;
  };
  outputTokens: number | undefined;
}): TokenUsage {
  return {
    input: usage.inputTokenDetails.noCacheTokens ?? usage.inputTokens ?? 0,
    output: usage.outputTokens ?? 0,
    cacheRead: usage.inputTokenDetails.cacheReadTokens ?? 0,
    cacheWrite: usage.inputTokenDetails.cacheWriteTokens ?? 0,
  };
}

function errorResponse(status: 400 | 429 | 500 | 503, error: ChatErrorCode): Response {
  return Response.json(chatErrorBody(error), { status });
}

/** Answers a POST to /api/chat. `env` is the Worker's environment, unparsed. */
export async function handleChat(
  request: Request,
  env: unknown,
  overrides: Partial<Deps> = {},
): Promise<Response> {
  const deps: Deps = { ...defaultDeps, ...overrides };
  const parsedEnv = envSchema.safeParse(env);
  if (!parsedEnv.success) return errorResponse(503, "unavailable");
  const { ANTHROPIC_API_KEY: apiKey, BOT_DEMO, VISITOR_SALT: salt, DB } = parsedEnv.data;
  // With a key the model always answers, whatever BOT_DEMO says, so a
  // production Worker can never serve the demo. Without a key, BOT_DEMO="1"
  // turns the demo on; otherwise there is nothing to answer with.
  const demo = apiKey === undefined && BOT_DEMO === "1";
  if (apiKey === undefined && !demo) return errorResponse(503, "unavailable");
  // Fail closed: a real model call never happens without the limits in front
  // of it, so a key without D1 or the visitor salt answers like no key at all.
  if (apiKey !== undefined && (!isD1(DB) || salt === undefined)) {
    return errorResponse(503, "unavailable");
  }

  const json: unknown = await request.json().catch(() => undefined);
  const body = bodySchema.safeParse(json);
  if (!body.success) return errorResponse(400, "invalid_request");

  try {
    // The limits, checked before the model is created. Demo answers cost
    // nothing and skip them, so previews and e2e never need D1.
    let recordUsage: ((usage: TokenUsage) => Promise<void>) | undefined;
    if (apiKey !== undefined && isD1(DB) && salt !== undefined) {
      const store = deps.createStore(DB);
      const day = utcDay();
      const ip = request.headers.get("CF-Connecting-IP") ?? LOCAL_VISITOR_IP;
      const visitor = await visitorHash(ip, day, salt);
      const verdict = checkLimits(await store.readToday(day, visitor));
      if (!verdict.ok) return errorResponse(429, verdict.limit);
      await store.countMessage(day, visitor);
      recordUsage = (usage) => store.addUsage(day, usage, estimateCostMicroUsd(usage));
    }

    const messages = await convertToModelMessages(
      body.data.messages.filter((message) => message.parts.length > 0),
    );
    const tools = buildTools(confirmedClaims());
    const model = apiKey === undefined ? createDemoModel() : deps.createModel(apiKey);
    const logStreamError = (error: unknown) => console.error("chat stream failed", error);

    const stream = createUIMessageStream<ChatUIMessage>({
      execute: ({ writer }) => {
        // The claims tools returned during this answer, in the order they
        // arrived. Only these ids may become sources.
        const sources = new Map<string, Source>();
        // The tokens of every step that finished, added as each one ends.
        // Never read onEnd's totalUsage instead: when the model fails as a
        // later step starts, it comes back empty and the finished steps'
        // tokens are lost.
        const spent: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

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
          // Fires when the visitor presses Stop or leaves (enable_request_signal
          // in wrangler.jsonc), and cancels the model call so it stops spending.
          abortSignal: request.signal,
          stopWhen: isStepCount(MAX_STEPS),
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          providerOptions: { anthropic: anthropicOptions },
          // The one log of a model error. Without it the SDK logs the error
          // itself, and the UI stream below would log it a second time.
          onError: ({ error }) => logStreamError(error),
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
          onStepEnd: ({ usage }) => addTokens(spent, tokenUsage(usage)),
          onEnd: ({ steps }) => {
            const text = steps.map((step) => step.text).join("");
            const { invalid } = parseCitations(text, new Set(sources.keys()));
            // Ids only: the answer can quote the visitor, so its text is never logged.
            if (invalid.length > 0) console.warn("chat: invalid citations", invalid);
          },
        });
        writer.merge(
          toUIMessageStream({
            stream: result.stream,
            sendStart: false,
            // Already logged by streamText's onError: only turn it into the fixed text.
            onError: () => STREAM_ERROR_TEXT,
            // The one place usage is recorded. The SDK calls this once per
            // answer however it ends: finished, failed, aborted by Stop or
            // cancelled by the visitor leaving. streamText's onEnd and onAbort
            // each miss some of those, so never record from them as well.
            onEnd: async () => {
              // The answer has already streamed, so a failed write is logged
              // rather than turned into an error the visitor would see.
              const write = recordUsage?.({ ...spent }).catch((error: unknown) => {
                console.error("chat usage not recorded", error);
              });
              if (write === undefined) return;
              deps.waitUntil(write);
              await write;
            },
          }),
        );
      },
      // Errors outside the model's stream, which streamText never sees.
      onError: (error) => {
        logStreamError(error);
        return STREAM_ERROR_TEXT;
      },
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("chat request failed", error);
    return errorResponse(500, "failed");
  }
}

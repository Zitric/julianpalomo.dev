/**
 * Provider errors: a call to the model API that failed for a reason that says
 * nothing about the bot, such as no credit, a bad key, a rate limit or an
 * overload. A run that hits one is neither passed nor failed, and the eval run
 * is inconclusive. Only the kind is ever kept, never the provider's message.
 */
import { APICallError, type LanguageModelMiddleware, RetryError } from "ai";
import { z } from "zod";

export const PROVIDER_ERROR_KINDS = ["credit", "auth", "rate-limit", "overload", "other"] as const;
export type ProviderErrorKind = (typeof PROVIDER_ERROR_KINDS)[number];

// Anthropic's error body, `{ type: "error", error: { type, message } }`, which
// the provider keeps parsed in an APICallError's `data`.
const errorBodySchema = z.object({
  error: z.object({ type: z.string(), message: z.string().optional() }),
});

// What the provider puts in an `error` stream part when Anthropic sends an
// error event mid-answer: Anthropic's error type, with the status it implies.
const streamErrorSchema = z.object({
  type: z.string(),
  message: z.string().optional(),
  statusCode: z.number().optional(),
});

// Unconfirmed: no real out-of-credit response has been seen yet. Anthropic
// may send `billing_error` or an `invalid_request_error` with this phrase, so
// both count as credit. Correct this from the first real out-of-credit run.
const CREDIT_PHRASE = /credit balance is too low/i;

/**
 * Anything left undefined, such as another `invalid_request_error`,
 * `not_found_error` or `request_too_large`, comes from the request the bot's
 * code or settings built, so it stays a failure of the bot.
 */
function kindOf(
  type: string | undefined,
  message: string | undefined,
  status: number | undefined,
): ProviderErrorKind | undefined {
  if (
    type === "billing_error" ||
    status === 402 ||
    (type === "invalid_request_error" && CREDIT_PHRASE.test(message ?? ""))
  ) {
    return "credit";
  }
  if (type === "authentication_error" || type === "permission_error") return "auth";
  if (status === 401 || status === 403) return "auth";
  if (type === "rate_limit_error" || status === 429) return "rate-limit";
  if (type === "overloaded_error" || status === 529) return "overload";
  if (type === "api_error" || (status !== undefined && status >= 500)) return "other";
  return undefined;
}

function parseJson(text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // A body that isn't JSON has no error type; the status code still counts.
    return undefined;
  }
}

/**
 * Anthropic's error type and message in an APICallError. A failed response
 * keeps its parsed body in `data`; an error that arrived as the stream's first
 * part has none, and keeps the streamed error as JSON in `responseBody`.
 */
function apiErrorDetails(error: APICallError): { type: string | undefined; message: string } {
  const body = errorBodySchema.safeParse(error.data ?? parseJson(error.responseBody));
  if (body.success) {
    return { type: body.data.error.type, message: body.data.error.message ?? error.message };
  }
  const streamed = streamErrorSchema.safeParse(parseJson(error.responseBody));
  return { type: streamed.success ? streamed.data.type : undefined, message: error.message };
}

/**
 * The kind of provider error `error` is, or undefined when it isn't one. It
 * reads an APICallError (a request that failed or never connected), the
 * error of an Anthropic stream error part, and the last error of a RetryError.
 */
export function providerErrorKind(error: unknown): ProviderErrorKind | undefined {
  if (RetryError.isInstance(error)) return providerErrorKind(error.lastError);
  if (APICallError.isInstance(error)) {
    // No status and no body: the request never reached the API.
    if (error.statusCode === undefined && error.responseBody === undefined) return "other";
    const { type, message } = apiErrorDetails(error);
    return kindOf(type, message, error.statusCode);
  }
  const streamed = streamErrorSchema.safeParse(error);
  if (!streamed.success) return undefined;
  return kindOf(streamed.data.type, streamed.data.message, streamed.data.statusCode);
}

/** Passes `stream` through unchanged, calling `onError` with each error part's error. */
function tapErrors<T extends { type: string }>(
  stream: ReadableStream<T>,
  onError: (error: unknown) => void,
  onEnd: () => void,
): ReadableStream<T> {
  return stream.pipeThrough(
    new TransformStream<T, T>({
      transform(part, controller) {
        if (part.type === "error" && "error" in part) onError(part.error);
        controller.enqueue(part);
      },
      flush: onEnd,
    }),
  );
}

/**
 * A middleware for `wrapLanguageModel` that remembers whether the model's last
 * call ended in a provider error. Every call reports, so a retry that worked
 * clears the error of the attempt before it. Only `wrapStream`: the bot only
 * streams, and the judge catches its own errors.
 */
export function providerErrorRecorder(): {
  middleware: LanguageModelMiddleware;
  /** The last call's provider error, if any, and forgets it. */
  takeLast: () => ProviderErrorKind | undefined;
} {
  let last: ProviderErrorKind | undefined;
  const middleware: LanguageModelMiddleware = {
    wrapStream: async ({ doStream }) => {
      let result: Awaited<ReturnType<typeof doStream>>;
      try {
        result = await doStream();
      } catch (error) {
        last = providerErrorKind(error);
        throw error;
      }
      let callError: ProviderErrorKind | undefined;
      return {
        ...result,
        stream: tapErrors(
          result.stream,
          (error) => {
            callError ??= providerErrorKind(error);
          },
          () => {
            last = callError;
          },
        ),
      };
    },
  };
  return {
    middleware,
    takeLast: () => {
      const kind = last;
      last = undefined;
      return kind;
    },
  };
}

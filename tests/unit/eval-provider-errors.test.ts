import { APICallError, RetryError, simulateReadableStream, wrapLanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import type { EvalCase } from "../../evals/cases";
import { checkAnswer } from "../../evals/checks";
import { providerErrorKind, providerErrorRecorder } from "../../evals/provider-errors";
import { runCase } from "../../evals/run-case";
import { STREAM_ERROR_TEXT } from "../../src/lib/bot/chat-error";

const CREDIT_MESSAGE =
  "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing.";

/** A failed response as the Anthropic provider builds it: the parsed body in `data`. */
function apiError(statusCode: number | undefined, type?: string, message = "a provider message") {
  return new APICallError({
    message,
    url: "https://api.anthropic.com/v1/messages",
    requestBodyValues: {},
    statusCode,
    ...(type === undefined
      ? {}
      : {
          responseBody: JSON.stringify({ type: "error", error: { type, message } }),
          data: { type: "error", error: { type, message } },
        }),
    isRetryable: false,
  });
}

describe("providerErrorKind", () => {
  it.each([
    [
      "an invalid request that says the credit is too low",
      apiError(400, "invalid_request_error", CREDIT_MESSAGE),
      "credit",
    ],
    ["a billing error", apiError(400, "billing_error"), "credit"],
    ["a 402", apiError(402), "credit"],
    ["an authentication error", apiError(401, "authentication_error"), "auth"],
    ["a permission error", apiError(403, "permission_error"), "auth"],
    ["a rate limit", apiError(429, "rate_limit_error"), "rate-limit"],
    ["an overload", apiError(529, "overloaded_error"), "overload"],
    ["an API error", apiError(500, "api_error"), "other"],
    ["a 503 with no body", apiError(503), "other"],
    ["a request that never connected", apiError(undefined), "other"],
  ] as const)("reads %s as %s", (_name, error, kind) => {
    expect(providerErrorKind(error)).toBe(kind);
  });

  it.each([
    ["another invalid request", apiError(400, "invalid_request_error", "max_tokens: too large")],
    ["a model that doesn't exist", apiError(404, "not_found_error")],
    ["a request that's too large", apiError(413, "request_too_large")],
    ["an ordinary error", new Error("boom")],
    ["a string", "boom"],
  ])("doesn't count %s, which is the bot's", (_name, error) => {
    expect(providerErrorKind(error)).toBeUndefined();
  });

  it("reads an error the stream sent mid-answer", () => {
    const streamed = { type: "overloaded_error", message: "Overloaded", statusCode: 529 };
    expect(providerErrorKind(streamed)).toBe("overload");
  });

  it("reads an error that arrived as the stream's first part, kept in the response body", () => {
    const error = new APICallError({
      message: "a provider message",
      url: "https://api.anthropic.com/v1/messages",
      requestBodyValues: {},
      statusCode: 400,
      responseBody: JSON.stringify({ type: "billing_error", message: "a provider message" }),
    });
    expect(providerErrorKind(error)).toBe("credit");
  });

  it("reads the last error of a retry that gave up", () => {
    const error = new RetryError({
      message: "Failed after 3 attempts.",
      reason: "maxRetriesExceeded",
      errors: [apiError(500, "api_error"), apiError(529, "overloaded_error")],
    });
    expect(providerErrorKind(error)).toBe("overload");
  });
});

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

type StreamPart =
  Awaited<ReturnType<MockLanguageModelV4["doStream"]>>["stream"] extends ReadableStream<infer P>
    ? P
    : never;

function streamOf(chunks: StreamPart[]) {
  return { stream: simulateReadableStream({ chunks }) };
}

function textAnswer(text: string) {
  return streamOf([
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
  ]);
}

describe("providerErrorRecorder", () => {
  it("forgets a failed attempt once the next call works, as after a retry", async () => {
    const recorder = providerErrorRecorder();
    let calls = 0;
    const model = wrapLanguageModel({
      model: new MockLanguageModelV4({
        doStream: async () => {
          calls += 1;
          if (calls === 1) throw apiError(529, "overloaded_error");
          return textAnswer("Hello");
        },
      }),
      middleware: recorder.middleware,
    });

    await expect(model.doStream({ prompt: [] })).rejects.toThrow();
    const { stream } = await model.doStream({ prompt: [] });
    for await (const _part of stream) {
      // Read to the end, so the call reports how it ended.
    }
    expect(recorder.takeLast()).toBeUndefined();
  });
});

const evalCase: EvalCase = {
  id: "cazoo-overview",
  category: "answered",
  language: "en",
  critical: false,
  turns: ["What did Julian do at Cazoo?"],
  expect: { outcome: "answered" },
  rubric: "Says what he did at Cazoo, cited.",
};

function mockModel(doStream: MockLanguageModelV4["doStream"]) {
  return () => new MockLanguageModelV4({ doStream });
}

describe("runCase with a provider error", () => {
  let errorLog: MockInstance;
  beforeEach(() => {
    errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorLog.mockRestore();
  });

  it("marks a run whose model call throws a provider error, without its message", async () => {
    const result = await runCase(
      evalCase,
      "test-key",
      mockModel(async () => {
        throw apiError(400, "invalid_request_error", CREDIT_MESSAGE);
      }),
    );
    expect(result.providerError).toBe("credit");
    expect(result.streamError).toBe(STREAM_ERROR_TEXT);
    expect(JSON.stringify(result)).not.toContain("credit balance");
  });

  it("marks a run whose stream sends a provider error mid-answer", async () => {
    const result = await runCase(
      evalCase,
      "test-key",
      mockModel(async () =>
        streamOf([
          { type: "text-start", id: "t1" },
          { type: "text-delta", id: "t1", delta: "Julian" },
          {
            type: "error",
            error: { type: "overloaded_error", message: "Overloaded", statusCode: 529 },
          },
        ]),
      ),
    );
    expect(result.providerError).toBe("overload");
  });

  it("ends a conversation at the turn that hit it", async () => {
    let calls = 0;
    const result = await runCase(
      { ...evalCase, turns: ["What did Julian do at Cazoo?", "And before that?"] },
      "test-key",
      mockModel(async () => {
        calls += 1;
        throw apiError(429, "rate_limit_error");
      }),
    );
    expect(result.providerError).toBe("rate-limit");
    expect(calls).toBe(1);
  });

  it("still fails a bot that streams the fixed error text for any other reason", async () => {
    const result = await runCase(
      evalCase,
      "test-key",
      mockModel(async () => {
        throw new Error("a bug in the bot");
      }),
    );
    expect(result.providerError).toBeUndefined();
    expect(result.streamError).toBe(STREAM_ERROR_TEXT);
    const notEmpty = checkAnswer(result, evalCase.expect).find(
      (check) => check.name === "not-empty",
    );
    expect(notEmpty?.pass).toBe(false);
  });

  it("leaves a run whose model answers alone", async () => {
    const result = await runCase(
      evalCase,
      "test-key",
      mockModel(async () => textAnswer("Hi")),
    );
    expect(result).toMatchObject({ providerError: undefined, text: "Hi", streamError: undefined });
  });
});

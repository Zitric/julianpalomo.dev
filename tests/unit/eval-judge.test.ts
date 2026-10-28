import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import {
  claimsFromToolCalls,
  type JudgeInput,
  type JudgeOutcome,
  type JudgeVerdict,
  judgeAnswer,
  judgeChecks,
  judgeCostMicroUsd,
  parseJudgeVerdict,
  tidySentences,
} from "../../evals/judge";
import { JUDGE_PROMPT } from "../../evals/judge-prompt";

const zero = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

const verdict: JudgeVerdict = {
  sentences: [
    {
      sentence: "He was the technical lead for a team of four developers.",
      verdict: "supported",
      claimIds: ["oms-lead"],
      reason: "The claim says technical lead for a team of 4 developers.",
    },
  ],
  language: { matches: true, reason: "English." },
  rubric: { met: true, reason: "Says technical lead, never managed." },
};

function judged(overrides: Partial<JudgeVerdict> = {}): JudgeOutcome {
  return {
    status: "judged",
    verdict: { ...verdict, ...overrides },
    usage: zero,
    costMicroUsd: 0,
  };
}

function check(outcome: JudgeOutcome, name: string) {
  const found = judgeChecks(outcome).find((result) => result.name === name);
  if (found === undefined) throw new Error(`no check called ${name}`);
  return found;
}

const input: JudgeInput = {
  earlierTurns: [],
  question: "How many people did Julian manage?",
  answer: "He was the technical lead for a team of four developers. [[oms-lead]]",
  claims: [
    {
      id: "oms-lead",
      label: "Technical lead",
      org: "Orders Made Simple",
      text: "Technical lead for a team of 4 developers.",
    },
  ],
  language: "en",
  rubric: "Technical lead for a team of 4, cited; never managed.",
};

describe("parseJudgeVerdict", () => {
  it("accepts a well-formed verdict", () => {
    expect(parseJudgeVerdict(verdict)).toEqual(verdict);
  });

  it.each([
    [
      "an unknown verdict",
      { ...verdict, sentences: [{ ...verdict.sentences[0], verdict: "fine" }] },
    ],
    ["no rubric", { sentences: verdict.sentences, language: verdict.language }],
    ["a language that isn't a boolean", { ...verdict, language: { matches: "yes", reason: "" } }],
  ])("rejects %s", (_name, output) => {
    expect(() => parseJudgeVerdict(output)).toThrow();
  });
});

describe("judgeChecks", () => {
  it("passes a supported answer in the right language that meets its rubric", () => {
    expect(judgeChecks(judged()).every((result) => result.pass)).toBe(true);
  });

  it.each(["overstated", "unsupported"] as const)("fails an %s sentence and quotes it", (bad) => {
    const outcome = judged({
      sentences: [
        ...verdict.sentences,
        {
          sentence: "He managed a team\nof four.",
          verdict: bad,
          claimIds: ["oms-lead"],
          reason: "Adds\n'managed'.",
        },
      ],
    });
    expect(check(outcome, "judge-sentences")).toEqual({
      name: "judge-sentences",
      pass: false,
      reason: `${bad}: "He managed a team of four." (Adds 'managed'.)`,
    });
  });

  it("passes a sentence that isn't a claim", () => {
    const outcome = judged({
      sentences: [
        {
          sentence: "Ask him on LinkedIn.",
          verdict: "not_a_claim",
          claimIds: [],
          reason: "A link.",
        },
      ],
    });
    expect(check(outcome, "judge-sentences").pass).toBe(true);
  });

  it("fails the wrong language and an unmet rubric with the judge's reasons", () => {
    const outcome = judged({
      language: { matches: false, reason: "Written in English, not Spanish." },
      rubric: { met: false, reason: "Says he managed people." },
    });
    expect(check(outcome, "judge-language")).toMatchObject({
      pass: false,
      reason: "Written in English, not Spanish.",
    });
    expect(check(outcome, "judge-rubric")).toMatchObject({
      pass: false,
      reason: "Says he managed people.",
    });
  });

  it("reports a judge failure as one judge-error, never as a verdict on the bot", () => {
    const failed: JudgeOutcome = {
      status: "error",
      error: "blocked",
      usage: zero,
      costMicroUsd: 0,
    };
    expect(judgeChecks(failed)).toEqual([{ name: "judge-error", pass: false, reason: "blocked" }]);
    expect(judgeChecks(judged({ sentences: [] }))).toEqual([
      { name: "judge-error", pass: false, reason: "the judge returned no sentences" },
    ]);
  });
});

describe("judgeAnswer", () => {
  const usage = {
    inputTokens: { total: 1_000, noCache: 1_000, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 500, text: 500, reasoning: undefined },
  };

  function mockJudge(text: string, finish: "stop" | "content-filter" = "stop") {
    return new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [{ type: "text", text }],
        finishReason: { unified: finish, raw: undefined },
        usage,
        warnings: [],
      }),
    });
  }

  it("sends the prompt, the claims and the rubric, and returns the verdict with its cost", async () => {
    const model = mockJudge(JSON.stringify(verdict));
    const outcome = await judgeAnswer(input, model);

    // 1,000 input tokens at $2 and 500 output tokens at $10 per million: $0.007.
    expect(outcome).toEqual({
      status: "judged",
      verdict,
      usage: { input: 1_000, output: 500, cacheRead: 0, cacheWrite: 0 },
      costMicroUsd: 7_000,
    });
    const prompt = JSON.stringify(model.doGenerateCalls[0]?.prompt);
    expect(prompt).toContain(JSON.stringify(JUDGE_PROMPT).slice(1, 80));
    expect(prompt).toContain("Technical lead for a team of 4 developers.");
    expect(prompt).toContain("never managed");
    expect(prompt).toContain("<language>en</language>");
  });

  it("turns output that doesn't fit the schema into an error that still has its cost", async () => {
    const outcome = await judgeAnswer(input, mockJudge('{"sentences": "none"}'));
    expect(outcome).toMatchObject({ status: "error", costMicroUsd: 7_000 });
    expect(outcome.status === "error" && outcome.error).toContain("didn't fit the schema");
  });

  it("turns a verdict that cites a claim it wasn't given into an error", async () => {
    const foreign = {
      ...verdict,
      sentences: [{ ...verdict.sentences[0], claimIds: ["oms-lead", "cazoo-role"] }],
    };
    const outcome = await judgeAnswer(input, mockJudge(JSON.stringify(foreign)));
    expect(outcome).toMatchObject({
      status: "error",
      error: "the judge cited claims it wasn't given: cazoo-role",
      costMicroUsd: 7_000,
    });
  });

  it("returns the verdict without a trailing marker-only entry, merged into the sentence before", async () => {
    const extra = {
      ...verdict,
      sentences: [
        ...verdict.sentences,
        { sentence: "[[oms-lead]]", verdict: "not_a_claim", claimIds: [], reason: "A marker." },
        { sentence: "", verdict: "not_a_claim", claimIds: [], reason: "placeholder" },
      ],
    };
    const outcome = await judgeAnswer(input, mockJudge(JSON.stringify(extra)));
    expect(outcome.status === "judged" && outcome.verdict.sentences).toEqual([
      {
        ...verdict.sentences[0],
        sentence: "He was the technical lead for a team of four developers. [[oms-lead]]",
      },
    ]);
  });

  it("still turns a merged marker's claim it wasn't given into an error", async () => {
    const extra = {
      ...verdict,
      sentences: [
        ...verdict.sentences,
        {
          sentence: "[[cazoo-role]]",
          verdict: "not_a_claim",
          claimIds: ["cazoo-role"],
          reason: "",
        },
      ],
    };
    const outcome = await judgeAnswer(input, mockJudge(JSON.stringify(extra)));
    expect(outcome).toMatchObject({
      status: "error",
      error: "the judge cited claims it wasn't given: cazoo-role",
    });
  });

  it("turns a safety block into an error", async () => {
    const outcome = await judgeAnswer(input, mockJudge(JSON.stringify(verdict), "content-filter"));
    expect(outcome).toMatchObject({
      status: "error",
      error: "the judge's request was blocked by a safety classifier",
    });
  });

  function failingJudge(error: unknown) {
    return new MockLanguageModelV4({
      doGenerate: async () => {
        throw error;
      },
    });
  }

  it("keeps a provider error's kind, and never its message", async () => {
    const error = new APICallError({
      message: "a provider message",
      url: "https://api.anthropic.com/v1/messages",
      requestBodyValues: {},
      statusCode: 401,
      data: {
        type: "error",
        error: { type: "authentication_error", message: "a provider message" },
      },
      isRetryable: false,
    });
    const outcome = await judgeAnswer(input, failingJudge(error));
    expect(outcome).toEqual({
      status: "provider-error",
      providerError: "auth",
      usage: zero,
      costMicroUsd: 0,
    });
    expect(judgeChecks(outcome)).toEqual([
      { name: "judge-error", pass: false, reason: "the judge call hit a provider error: auth" },
    ]);
  });

  it("keeps any other failed call a plain judge error", async () => {
    const outcome = await judgeAnswer(input, failingJudge(new Error("boom")));
    expect(outcome).toEqual({
      status: "error",
      error: "the judge call failed: boom",
      usage: zero,
      costMicroUsd: 0,
    });
  });
});

describe("claimsFromToolCalls", () => {
  it("collects each returned claim once, with its full text, and skips other outputs", () => {
    const claim = {
      id: "oms-lead",
      label: "Technical lead",
      org: "Orders Made Simple",
      source: "cv",
      area: "experience",
      text: "Technical lead for a team of 4 developers.",
    };
    const claims = claimsFromToolCalls([
      { tool: "list_topics", input: {}, output: { areas: [], orgs: [] } },
      { tool: "get_claims", input: {}, output: { claims: [claim] } },
      { tool: "search_claims", input: { query: "lead" }, output: { claims: [claim] } },
    ]);
    expect(claims).toEqual([
      {
        id: "oms-lead",
        label: "Technical lead",
        org: "Orders Made Simple",
        text: "Technical lead for a team of 4 developers.",
      },
    ]);
  });
});

describe("judgeCostMicroUsd", () => {
  it("charges cache writes above the input price and reads at it, rounded up", () => {
    // 1 write at $2.50 and 1 read at $2 per million: 4.5 micro-dollars, rounded up.
    expect(judgeCostMicroUsd({ input: 0, output: 0, cacheWrite: 1, cacheRead: 1 })).toBe(5);
  });
});

describe("tidySentences", () => {
  const said = {
    sentence: "Yes, Playwright is one of his testing skills.",
    verdict: "supported" as const,
    claimIds: ["skills-testing"],
    reason: "The claim lists Playwright.",
  };
  const extra = (sentence: string, claimIds: string[] = []) => ({
    sentence,
    verdict: "not_a_claim" as const,
    claimIds,
    reason: "placeholder",
  });

  it("drops an empty sentence", () => {
    expect(tidySentences([said, extra("")])).toEqual([said]);
  });

  it("drops a whitespace-only sentence", () => {
    expect(tidySentences([extra(" \n\t "), said])).toEqual([said]);
  });

  it("merges a marker-only sentence into the one before, text and claim ids, once each", () => {
    expect(
      tidySentences([
        said,
        extra(" [[skills-testing]] [[skills-tools]] ", ["skills-testing", "skills-tools"]),
      ]),
    ).toEqual([
      {
        ...said,
        sentence:
          "Yes, Playwright is one of his testing skills. [[skills-testing]] [[skills-tools]]",
        claimIds: ["skills-testing", "skills-tools"],
      },
    ]);
  });

  it("drops a marker-only sentence that comes first", () => {
    expect(tidySentences([extra("[[skills-testing]]"), said])).toEqual([said]);
  });

  it("leaves nothing when every entry is empty or markers only", () => {
    expect(tidySentences([extra(""), extra("[[skills-testing]]"), extra("  ")])).toEqual([]);
  });

  it("keeps a sentence with any other text as it is, markers and all", () => {
    const withText = extra("See [[skills-testing]].");
    expect(tidySentences([said, withText])).toEqual([said, withText]);
  });
});

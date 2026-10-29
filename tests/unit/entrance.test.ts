import { describe, expect, it } from "vitest";
import {
  BEATS,
  beatAt,
  bubbleAt,
  ENTRANCE_COOKIE,
  entranceCookie,
  entranceCowState,
  entranceKind,
  FLIGHT_MS,
  heroCowWidth,
  joinAt,
  nextBeatIn,
} from "../../src/lib/entrance";

describe("entranceKind", () => {
  it("plays the full entrance on a first visit", () => {
    expect(entranceKind(undefined)).toBe("full");
  });

  it("plays the short entrance when the cookie is there", () => {
    expect(entranceKind("1")).toBe("short");
  });

  it("treats a cookie it doesn't recognise as a first visit", () => {
    expect(entranceKind("yes")).toBe("full");
    expect(entranceKind(1)).toBe("full");
  });
});

describe("entranceCookie", () => {
  it("is set for 7 days on every path, refreshed by each visit's response", () => {
    const cookie = entranceCookie({ secure: true });
    expect(cookie.name).toBe(ENTRANCE_COOKIE);
    expect(cookie.value).toBe("1");
    expect(cookie.options).toEqual({
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  });

  it("is Secure only over https", () => {
    expect(entranceCookie({ secure: false }).options.secure).toBe(false);
  });

  it("reads back as a later visit", () => {
    expect(entranceKind(entranceCookie({ secure: true }).value)).toBe("short");
  });
});

describe("beatAt", () => {
  it("follows the full entrance's table", () => {
    expect(beatAt(0)).toBe("glen");
    expect(beatAt(2499)).toBe("glen");
    expect(beatAt(2500)).toBe("heroCow");
    expect(beatAt(4250)).toBe("heroLick");
    expect(beatAt(4600)).toBe("flight");
    expect(beatAt(5150)).toBe("landed");
    expect(beatAt(5550)).toBe("greeting");
    expect(beatAt(60_000)).toBe("greeting");
  });

  it("flies the cow for 0.55s, landing when the chat appears", () => {
    expect(FLIGHT_MS).toBe(550);
    expect(BEATS.flight + FLIGHT_MS).toBe(BEATS.landing);
  });

  it("starts the greeting 0.4s after the landing", () => {
    expect(BEATS.greeting - BEATS.landing).toBe(400);
  });
});

describe("bubbleAt", () => {
  it("shows the hero's bubble for 1.7s from 3.15s", () => {
    expect(bubbleAt(3149)).toBe(false);
    expect(bubbleAt(3150)).toBe(true);
    expect(bubbleAt(4849)).toBe(true);
    expect(bubbleAt(4850)).toBe(false);
  });
});

describe("nextBeatIn", () => {
  it("waits until the next beat", () => {
    expect(nextBeatIn(0)).toBe(2500);
    expect(nextBeatIn(2500)).toBe(650);
    expect(nextBeatIn(4700)).toBe(150);
  });

  it("is null once every beat has passed", () => {
    expect(nextBeatIn(BEATS.greeting)).toBeNull();
  });
});

describe("entranceCowState", () => {
  it("talks in the hero, licks before it flies, and talks while the greeting types", () => {
    expect(entranceCowState("glen")).toBe("idle");
    expect(entranceCowState("heroCow")).toBe("talking");
    expect(entranceCowState("heroLick")).toBe("satisfied");
    expect(entranceCowState("flight")).toBe("satisfied");
    expect(entranceCowState("greeting")).toBe("talking");
  });
});

describe("joinAt", () => {
  it("plays everything when JavaScript starts before the cow appears", () => {
    expect(joinAt(800)).toEqual({ cow: "pop", greeting: "type" });
  });

  it("puts the cow straight in the hero when JavaScript starts after it should have appeared", () => {
    expect(joinAt(3000)).toEqual({ cow: "hero", greeting: "type" });
    expect(joinAt(4599)).toEqual({ cow: "hero", greeting: "type" });
  });

  it("skips the flight once it has begun, leaving the cow on the edge", () => {
    expect(joinAt(4600)).toEqual({ cow: "edge", greeting: "type" });
  });

  it("keeps the greeting whole once the chat is on screen, so no text is taken away", () => {
    expect(joinAt(5150)).toEqual({ cow: "edge", greeting: "whole" });
    expect(joinAt(8000)).toEqual({ cow: "edge", greeting: "whole" });
  });
});

describe("heroCowWidth", () => {
  it("is 200px where the hero is tall enough", () => {
    expect(heroCowWidth(320)).toBe(200);
  });

  it("keeps the cow within 62% of a phone's shorter hero", () => {
    const width = heroCowWidth(230);
    expect(width).toBeLessThan(200);
    expect((width * 150) / 190).toBeCloseTo(230 * 0.62);
  });
});

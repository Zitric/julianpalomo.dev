import { describe, expect, it } from "vitest";
import { isD1, utcDay, visitorHash } from "../../src/lib/bot/usage";

const ip = "203.0.113.7";
const salt = "a-test-salt";

describe("visitorHash", () => {
  it("gives the same hash for the same IP, day and salt", async () => {
    expect(await visitorHash(ip, "2026-10-27", salt)).toBe(
      await visitorHash(ip, "2026-10-27", salt),
    );
  });

  it("gives a different hash on another day or with another salt", async () => {
    const today = await visitorHash(ip, "2026-10-27", salt);
    expect(await visitorHash(ip, "2026-10-28", salt)).not.toBe(today);
    expect(await visitorHash(ip, "2026-10-27", "another-salt")).not.toBe(today);
  });

  it("is a SHA-256 in hex that doesn't contain the IP", async () => {
    const hash = await visitorHash(ip, "2026-10-27", salt);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(ip);
    expect(hash).not.toContain("203");
  });
});

describe("utcDay", () => {
  it("uses the UTC date, whatever the local time zone", () => {
    expect(utcDay(new Date("2026-10-27T23:30:00-05:00"))).toBe("2026-10-28");
  });
});

describe("isD1", () => {
  it("accepts an object with prepare and rejects anything else", () => {
    expect(isD1({ prepare: () => undefined })).toBe(true);
    expect(isD1(undefined)).toBe(false);
    expect(isD1("DB")).toBe(false);
    expect(isD1({ prepare: "no" })).toBe(false);
  });
});

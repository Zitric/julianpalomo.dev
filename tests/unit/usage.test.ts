import { describe, expect, it } from "vitest";
import { isD1, utcDay, visitorHash, visitorKey } from "../../src/lib/bot/usage";

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

  it("gives one hash to every address in an IPv6 /64, and another to the next /64", async () => {
    const day = "2026-10-27";
    const first = await visitorHash("2001:db8:1:2::1", day, salt);
    expect(await visitorHash("2001:db8:1:2:ffff:abcd:1234:5678", day, salt)).toBe(first);
    expect(await visitorHash("2001:db8:1:3::1", day, salt)).not.toBe(first);
  });

  it("gives an IPv4-mapped address the same hash as its IPv4", async () => {
    expect(await visitorHash(`::ffff:${ip}`, "2026-10-27", salt)).toBe(
      await visitorHash(ip, "2026-10-27", salt),
    );
  });
});

describe("visitorKey", () => {
  it("leaves an IPv4 address as it is", () => {
    expect(visitorKey("203.0.113.7")).toBe("203.0.113.7");
  });

  it.each([
    ["2001:db8:1:2::1", "2001:db8:1:2::/64"],
    ["2001:0db8:0001:0002:0000:0000:0000:0001", "2001:db8:1:2::/64"],
    ["2001:DB8:1:2:A:B:C:D", "2001:db8:1:2::/64"],
    ["2001:db8::1", "2001:db8:0:0::/64"],
    ["::1", "0:0:0:0::/64"],
    ["::", "0:0:0:0::/64"],
    ["2001:db8:1:2:3:4:192.0.2.1", "2001:db8:1:2::/64"],
  ])("reads %s as the /64 %s", (address, key) => {
    expect(visitorKey(address)).toBe(key);
  });

  it.each([
    ["::ffff:203.0.113.7"],
    ["::FFFF:203.0.113.7"],
    ["::ffff:cb00:7107"],
    ["0:0:0:0:0:ffff:203.0.113.7"],
  ])("reads the IPv4-mapped %s as its IPv4", (address) => {
    expect(visitorKey(address)).toBe("203.0.113.7");
  });

  it.each([
    ["local"],
    ["1::2::3"],
    ["1:2:3:4:5:6:7:8:9"],
    ["1:2:3:4:5:6:7"],
    ["1:2:3:4::5:6:7:8"],
    ["2001:db8::12345"],
    ["::ffff:203.0.113.700"],
    ["fe80::1%eth0"],
  ])("passes %s through when it isn't an IPv6 address", (value) => {
    expect(visitorKey(value)).toBe(value);
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

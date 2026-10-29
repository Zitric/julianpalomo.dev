import { describe, expect, it } from "vitest";
import { effects } from "../../src/lib/scene/effects";
import { particles as colours } from "../../src/lib/scene/palette";
import { particleCounts, particlesFor } from "../../src/lib/scene/particles";
import { defaultSky, type SkyState } from "../../src/lib/scene/sky-state";

const base: SkyState = { ...defaultSky(Date.parse("2026-10-28T12:00:00Z")), season: "autumn" };

function input(sky: Partial<SkyState>, moment: { elevation?: number; landLight?: number } = {}) {
  const full = { ...base, ...sky };
  return {
    sky: full,
    effects: effects(full),
    elevation: moment.elevation ?? 20,
    landLight: moment.landLight ?? 1,
  };
}

describe("particleCounts", () => {
  it("drops 12 leaves in autumn and 14 petals in spring, fewer as rain rises", () => {
    expect(particleCounts(input({ season: "autumn" })).leaf).toBe(12);
    expect(particleCounts(input({ season: "autumn", rain: 6 })).leaf).toBe(6);
    expect(particleCounts(input({ season: "spring" })).petal).toBe(14);
    expect(particleCounts(input({ season: "spring", rain: 6 })).petal).toBe(7);
    expect(particleCounts(input({ season: "summer" }))).toMatchObject({ leaf: 0, petal: 0 });
  });

  it("brings midges on still, dry summer days only", () => {
    expect(particleCounts(input({ season: "summer" })).midge).toBe(16);
    expect(particleCounts(input({ season: "summer", wind: 4 })).midge).toBe(0);
    expect(particleCounts(input({ season: "summer", rain: 3 })).midge).toBe(0);
  });

  it("glints frost on clear, dry winter days only", () => {
    expect(particleCounts(input({ season: "winter" })).glint).toBe(10);
    expect(particleCounts(input({ season: "winter" }, { elevation: -3 })).glint).toBe(0);
    expect(particleCounts(input({ season: "winter", clouds: 4 })).glint).toBe(0);
    expect(particleCounts(input({ season: "winter", rain: 1 })).glint).toBe(0);
  });

  it("drops rain × 10 raindrops, or rain × 8 snowflakes with snow", () => {
    expect(particleCounts(input({ rain: 4 }))).toMatchObject({ rain: 40, snow: 0 });
    expect(particleCounts(input({ rain: 4, snow: true }))).toMatchObject({ rain: 0, snow: 32 });
    expect(particleCounts(input({}))).toMatchObject({ rain: 0, snow: 0 });
  });
});

describe("particlesFor", () => {
  it("renders the same particles every time, so server and client agree", () => {
    expect(particlesFor(input({ rain: 5 }))).toEqual(particlesFor(input({ rain: 5 })));
  });

  it("keeps the leaves where they are when the rain changes", () => {
    const leaves = (rain: number) =>
      particlesFor(input({ rain }))
        .filter(({ kind }) => kind === "leaf")
        .slice(0, 6);
    expect(leaves(2)).toEqual(leaves(4));
  });

  it("speeds the fall with the wind and blows rain and leaves sideways from 5", () => {
    const calm = particlesFor(input({ rain: 3 })).filter(({ kind }) => kind === "rain");
    const windy = particlesFor(input({ rain: 3, wind: 5 })).filter(({ kind }) => kind === "rain");
    expect(windy[0]?.duration).toBeCloseTo((calm[0]?.duration ?? 0) / 1.9);
    expect(calm[0]?.drift).toBe(0);
    expect(windy[0]?.drift).toBeGreaterThan(0);
    expect(
      particlesFor(input({ wind: 5 })).find(({ kind }) => kind === "leaf")?.drift,
    ).toBeGreaterThan(0);
  });

  it("puts midges over the loch and glints on the meadow, in the scene's own units", () => {
    const midges = particlesFor(input({ season: "summer" })).filter(({ kind }) => kind === "midge");
    const glints = particlesFor(input({ season: "winter" })).filter(({ kind }) => kind === "glint");
    for (const { x, y } of midges) {
      expect(x).toBeGreaterThanOrEqual(560);
      expect(x).toBeLessThanOrEqual(640);
      expect(y).toBeGreaterThanOrEqual(222);
      expect(y).toBeLessThanOrEqual(238);
    }
    for (const { x, y } of glints) {
      expect(x).toBeGreaterThanOrEqual(340);
      expect(x).toBeLessThanOrEqual(860);
      expect(y).toBeGreaterThanOrEqual(268);
    }
  });

  it("uses the darker colours at night and in the blue hour", () => {
    const day = particlesFor(input({ rain: 2 })).find(({ kind }) => kind === "rain");
    const night = particlesFor(input({ rain: 2 }, { landLight: 0.2 })).find(
      ({ kind }) => kind === "rain",
    );
    expect(day?.colour).toBe(colours.raindrop);
    expect(night?.colour).toBe(colours.raindropDark);
  });

  it("starts each particle part-way through its loop", () => {
    for (const particle of particlesFor(input({ rain: 2 }))) {
      expect(particle.delay).toBeLessThanOrEqual(0);
      expect(-particle.delay).toBeLessThanOrEqual(particle.duration);
    }
  });
});

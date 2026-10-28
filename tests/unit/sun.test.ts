import { describe, expect, it } from "vitest";
import { glasgow } from "../../src/lib/glasgow";
import { type Day, sunPosition, sunTimes } from "../../src/lib/sun";

// Every expected value comes from the NOAA Solar Calculator
// (https://gml.noaa.gov/grad/solcalc/) for latitude 55.8642, longitude -4.2518
// and Europe/London, never from the code under test. Elevations are apparent,
// corrected for refraction, as the calculator shows them. The calculator
// doesn't display civil twilight, so those times are where NOAA's own
// elevation function crosses -6°, stepped every 30 seconds.

const MINUTES = 2 * 60_000;
const DEGREES = 0.5;

type Reference = {
  day: Day;
  /** Glasgow's UTC offset that day. */
  offset: "+00:00" | "+01:00";
  solarNoon: string;
  sunrise: string;
  sunset: string;
  civilDawn: string;
  civilDusk: string;
  elevations: [time: string, degrees: number][];
};

const references: Reference[] = [
  {
    day: { year: 2026, month: 6, day: 21 },
    offset: "+01:00",
    solarNoon: "13:18:44",
    sunrise: "04:31",
    sunset: "22:06",
    civilDawn: "03:28:30",
    civilDusk: "23:09:30",
    elevations: [
      ["13:00", 57.4],
      ["22:30", -2.87],
    ],
  },
  {
    day: { year: 2026, month: 12, day: 21 },
    offset: "+00:00",
    solarNoon: "12:14:51",
    sunrise: "08:46",
    sunset: "15:44",
    civilDawn: "07:58:30",
    civilDusk: "16:32:30",
    elevations: [
      ["12:00", 10.72],
      ["16:30", -5.75],
    ],
  },
  {
    // The day after the clocks went back.
    day: { year: 2026, month: 10, day: 26 },
    offset: "+00:00",
    solarNoon: "12:00:59",
    sunrise: "07:11",
    sunset: "16:50",
    civilDawn: "06:32:00",
    civilDusk: "17:29:30",
    elevations: [
      ["12:00", 21.64],
      ["17:30", -6.1],
    ],
  },
  {
    day: { year: 2026, month: 10, day: 28 },
    offset: "+00:00",
    solarNoon: "12:00:47",
    sunrise: "07:15",
    sunset: "16:46",
    civilDawn: "06:36:00",
    civilDusk: "17:25:00",
    elevations: [
      ["12:00", 20.96],
      ["17:30", -6.69],
    ],
  },
  {
    // The day after the clocks went forward.
    day: { year: 2026, month: 3, day: 30 },
    offset: "+01:00",
    solarNoon: "13:21:35",
    sunrise: "06:53",
    sunset: "19:51",
    civilDawn: "06:15:30",
    civilDusk: "20:29:30",
    elevations: [
      ["13:00", 37.86],
      ["20:30", -6.11],
    ],
  },
];

/** A Glasgow local time on the reference's day, as an instant. */
function at(reference: Reference, time: string): number {
  const { year, month, day } = reference.day;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const seconds = time.length === 5 ? `${time}:00` : time;
  return Date.parse(`${date}T${seconds}${reference.offset}`);
}

describe("sunTimes", () => {
  for (const reference of references) {
    const { year, month, day } = reference.day;
    const times = sunTimes(reference.day, glasgow);

    it(`matches NOAA's sun events in Glasgow on ${year}-${month}-${day}`, () => {
      for (const event of ["solarNoon", "sunrise", "sunset", "civilDawn", "civilDusk"] as const) {
        const actual = times[event];
        if (actual === null) throw new Error(`No ${event}`);
        const off = Math.abs(actual - at(reference, reference[event]));
        expect(off, event).toBeLessThanOrEqual(MINUTES);
      }
    });
  }
});

describe("sunPosition", () => {
  for (const reference of references) {
    for (const [time, degrees] of reference.elevations) {
      const { year, month, day } = reference.day;
      it(`puts the sun at ${degrees}° over Glasgow at ${time} on ${year}-${month}-${day}`, () => {
        const { elevation } = sunPosition(at(reference, time), glasgow);
        expect(Math.abs(elevation - degrees)).toBeLessThanOrEqual(DEGREES);
      });
    }
  }

  it("puts the sun due south at solar noon and in the east in the morning", () => {
    const winter = references[1];
    if (!winter) throw new Error("No winter reference");
    const { solarNoon, sunrise } = sunTimes(winter.day, glasgow);
    if (sunrise === null) throw new Error("No sunrise");
    expect(sunPosition(solarNoon, glasgow).azimuth).toBeCloseTo(180, 0);
    const morning = sunPosition(sunrise, glasgow).azimuth;
    expect(morning).toBeGreaterThan(90);
    expect(morning).toBeLessThan(180);
  });

  // Internal consistency, not a NOAA reference: the twilight times are where
  // this module's own elevation crosses -6°.
  it("puts the sun 6° below the horizon at civil dawn and dusk", () => {
    for (const reference of references) {
      const { civilDawn, civilDusk } = sunTimes(reference.day, glasgow);
      if (civilDawn === null || civilDusk === null) throw new Error("No civil twilight");
      expect(sunPosition(civilDawn, glasgow).elevation).toBeCloseTo(-6, 2);
      expect(sunPosition(civilDusk, glasgow).elevation).toBeCloseTo(-6, 2);
    }
  });
});

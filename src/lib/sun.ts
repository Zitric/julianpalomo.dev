/*
 * The sun's position and the day's events, from the NOAA solar equations
 * (the ones behind https://gml.noaa.gov/grad/solcalc/). No dependencies.
 * Instants are epoch milliseconds; angles are degrees.
 */

import type { Day, Place } from "./glasgow";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;

/** The sun's declination and the equation of time (minutes) at an instant. */
function solarCoordinates(instant: number) {
  const julianDay = instant / 86_400_000 + 2_440_587.5;
  const t = (julianDay - 2_451_545) / 36_525;

  const meanLongitude = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const centre =
    Math.sin(rad(meanAnomaly)) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(rad(2 * meanAnomaly)) * (0.019993 - 0.000101 * t) +
    Math.sin(rad(3 * meanAnomaly)) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const apparentLongitude = meanLongitude + centre - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(rad(omega));

  const declination = deg(Math.asin(Math.sin(rad(obliquity)) * Math.sin(rad(apparentLongitude))));
  const y = Math.tan(rad(obliquity / 2)) ** 2;
  const l = rad(meanLongitude);
  const m = rad(meanAnomaly);
  const equationOfTime =
    4 *
    deg(
      y * Math.sin(2 * l) -
        2 * eccentricity * Math.sin(m) +
        4 * eccentricity * y * Math.sin(m) * Math.cos(2 * l) -
        0.5 * y * y * Math.sin(4 * l) -
        1.25 * eccentricity * eccentricity * Math.sin(2 * m),
    );

  return { declination, equationOfTime };
}

/** Atmospheric refraction (degrees) at a geometric elevation, as NOAA approximates it. */
function refraction(elevation: number): number {
  if (elevation > 85) return 0;
  const te = Math.tan(rad(elevation));
  let arcseconds: number;
  if (elevation > 5) arcseconds = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  else if (elevation > -0.575)
    arcseconds =
      1735 + elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)));
  else arcseconds = -20.774 / te;
  return arcseconds / 3600;
}

type Position = {
  /** Apparent elevation above the horizon, corrected for refraction as the NOAA calculator shows it. */
  elevation: number;
  /** Clockwise from north. */
  azimuth: number;
};

/** Where the sun is in the sky over `place` at `instant`. */
export function sunPosition(instant: number, place: Place): Position {
  const { geometric, azimuth } = geometricPosition(instant, place);
  return { elevation: geometric + refraction(geometric), azimuth };
}

/** The sun's elevation without refraction, and its azimuth. */
function geometricPosition(instant: number, place: Place) {
  const { declination, equationOfTime } = solarCoordinates(instant);
  const utcMinutes = (instant % 86_400_000) / MINUTE;
  const trueSolarTime =
    (((utcMinutes + equationOfTime + 4 * place.longitude) % 1440) + 1440) % 1440;
  const hourAngle = trueSolarTime / 4 - 180;

  const latitude = rad(place.latitude);
  const decl = rad(declination);
  const cosZenith = Math.min(
    1,
    Math.max(
      -1,
      Math.sin(latitude) * Math.sin(decl) +
        Math.cos(latitude) * Math.cos(decl) * Math.cos(rad(hourAngle)),
    ),
  );
  const zenith = Math.acos(cosZenith);
  const geometric = 90 - deg(zenith);

  const azimuthDenominator = Math.cos(latitude) * Math.sin(zenith);
  let azimuth = 0;
  if (Math.abs(azimuthDenominator) > 1e-9) {
    const cosAzimuth = (Math.sin(latitude) * cosZenith - Math.sin(decl)) / azimuthDenominator;
    const fromSouth = deg(Math.acos(Math.min(1, Math.max(-1, cosAzimuth))));
    azimuth = hourAngle > 0 ? (fromSouth + 180) % 360 : (540 - fromSouth) % 360;
  }

  return { geometric, azimuth };
}

type SunTimes = {
  /** The sun is 6° below the horizon in the morning. */
  civilDawn: number | null;
  sunrise: number | null;
  solarNoon: number;
  sunset: number | null;
  /** The sun is 6° below the horizon in the evening. */
  civilDusk: number | null;
};

// NOAA's apparent sunrise and sunset: the sun's centre 0.833° below the
// horizon geometrically (its radius plus refraction at the horizon), so these
// two are found on the geometric elevation.
const HORIZON = -0.833;
// Civil twilight is found on the apparent elevation, the one sunPosition
// returns, so the theme's "below -6°" and these times agree to the second.
const CIVIL_TWILIGHT = -6;

/**
 * The day's sun events over `place`, as instants. An event that doesn't happen
 * that day (the sun never dips 6° below the horizon) is null.
 */
export function sunTimes(day: Day, place: Place): SunTimes {
  // Solar noon from the equation of time, refined once at the noon it finds.
  const midday = Date.UTC(day.year, day.month - 1, day.day, 12);
  let solarNoon = midday;
  for (let i = 0; i < 2; i++) {
    const { equationOfTime } = solarCoordinates(solarNoon);
    solarNoon = midday - (4 * place.longitude + equationOfTime) * MINUTE;
  }

  const apparent = (instant: number) => sunPosition(instant, place).elevation;
  const geometric = (instant: number) => geometricPosition(instant, place).geometric;
  // The sun climbs from solar midnight to solar noon and sinks after it, so
  // each event is the one crossing on its side of noon.
  const morning = (f: (instant: number) => number, target: number) =>
    crossing(f, target, solarNoon - 12 * HOUR, solarNoon);
  const evening = (f: (instant: number) => number, target: number) =>
    crossing(f, target, solarNoon, solarNoon + 12 * HOUR);

  return {
    civilDawn: morning(apparent, CIVIL_TWILIGHT),
    sunrise: morning(geometric, HORIZON),
    solarNoon,
    sunset: evening(geometric, HORIZON),
    civilDusk: evening(apparent, CIVIL_TWILIGHT),
  };
}

/** Where `f` crosses `target` between `from` and `to`, by bisection to the second; null if it doesn't. */
function crossing(f: (x: number) => number, target: number, from: number, to: number) {
  let low = from;
  let high = to;
  const lowSide = Math.sign(f(low) - target);
  if (lowSide === Math.sign(f(high) - target)) return null;
  while (high - low > 1000) {
    const middle = (low + high) / 2;
    if (Math.sign(f(middle) - target) === lowSide) low = middle;
    else high = middle;
  }
  return Math.round((low + high) / 2);
}

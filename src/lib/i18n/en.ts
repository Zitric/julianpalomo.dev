/**
 * Every visible string on the site, in English. `es.ts` has the same keys:
 * its type is this object's, so a missing or extra key fails `tsc`. Text
 * that holds a number is a function, so each language orders and pluralises
 * it in its own way.
 */

import { site } from "../site";

const numbers = new Intl.NumberFormat("en");

export const en = {
  name: "Julian Palomo",
  role: site.role,
  intro:
    "Ask about my experience. Answers come only from facts I've confirmed, with their sources.",
  portraitAlt: "Pixel-art portrait of Julian Palomo",
  metaDescription:
    "Ask about Julian Palomo's experience. Answers come only from facts he has confirmed, with their sources.",

  // The language toggle, as shown on this language's page: it offers the other one.
  switchLanguage: { short: "ES", label: "Ver en español" },
  themeToDark: "Switch to dark theme",
  themeToLight: "Switch to light theme",

  chatLabel: "Chat",
  greeting:
    "Hi! Ask me about Julian's experience. I only answer with facts he has confirmed, and I show where each one comes from.",
  suggestionsLabel: "Suggested questions",
  // The first three start the chat; the rest come back under each answer as
  // "Keep asking". Each one is answered by a confirmed claim.
  suggestions: [
    "What did Julian do at Cazoo?",
    "What is Form:at?",
    "Is Julian open to remote work?",
    "Which languages does Julian speak?",
    "Does Julian need visa sponsorship?",
    "How did Julian upgrade React at Cazoo?",
  ],
  conversationLabel: "Conversation",
  keepAsking: "Keep asking",
  copy: "Copy",
  copied: "Copied",
  couldntCopy: "Couldn't copy",
  // The heading of the sources in a copied answer.
  sourcesHeading: "Sources:",
  citationLabel: (number: number, label: string) => `Source ${number}: ${label}`,
  confirmedBy: (date: string, from: string) => `Confirmed by Julian on ${date} · ${from}`,
  fromCv: "from his CV",
  fromJulian: "from Julian",
  newAnswer: "New answer ↓",
  answerLabel: "Answer",
  sourcesLabel: "Sources",
  sourceNames: { cv: "CV", julian: "Julian" },
  demo: "Demo",
  lookingUpClaims: "Looking up claims…",
  checkingTopics: "Checking what topics exist…",

  questionLabel: "Your question",
  send: "Send",
  stop: "Stop",
  counter: (length: number, limit: number) =>
    `${numbers.format(length)} / ${numbers.format(limit)}`,
  counterOver: (over: number, limit: number) =>
    `${numbers.format(over)} ${over === 1 ? "character" : "characters"} over the ${numbers.format(limit)} limit`,

  errorUnavailable: "The assistant isn't available here right now.",
  errorVisitorLimit: "You've reached today's limit for questions.",
  errorDailyBudget: "The assistant has reached its daily budget. Try again tomorrow.",
  errorGeneric: "Something went wrong.",
  // "You can still reach me on LinkedIn or GitHub.", around the two links.
  contact: { before: "You can still reach me on", between: "or", after: "." },

  patTheCow: "Pat the cow",
  moo: "Moo!",

  // The weather chip and the footer's credit. The words follow the levels 0–10 (DESIGN.md section 8).
  glasgow: "Glasgow",
  weatherClouds: [
    "Clear",
    "Clear",
    "A few clouds",
    "A few clouds",
    "Some clouds",
    "Cloudy",
    "Cloudy",
    "Mostly cloudy",
    "Mostly cloudy",
    "Overcast",
    "Overcast",
  ],
  weatherRain: [
    "Dry",
    "Drizzle",
    "Drizzle",
    "Light rain",
    "Light rain",
    "Steady rain",
    "Steady rain",
    "Heavy rain",
    "Heavy rain",
    "Downpour",
    "Downpour",
  ],
  weatherSnow: "Snow",
  weatherHaar: "Haar",
  weatherCredit: { before: "Weather data by", link: "Open-Meteo.com" },
  // The chip's accessible names: what it shows, then what pressing it does.
  chipLiveName: (weather: string) => `Weather in Glasgow: ${weather}. Play with the sky`,
  chipPlayingName: (time: string) => `Your sky, ${time}. Back to live Glasgow`,
  yourSky: "Your sky",
  tapToReset: "tap to reset",

  // The gear and its panel (DESIGN.md section 8).
  playWithTheSky: "Play with the sky",
  playSubtitle: "Only on your screen, for as long as you like.",
  playBubble: "Psst… you can change the weather",
  close: "Close",
  seasonLabel: "Season",
  seasons: { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" },
  timeOfDay: "Time of day",
  moments: {
    night: "night",
    blue: "blue hour",
    golden: "golden hour",
    morning: "morning",
    day: "day",
  },
  cloudsLabel: "Clouds",
  rainLabel: "Rain",
  snowLabel: "Snow",
  windLabel: "Wind",
  // Words for snow levels 0–10 when "Snow instead of rain" is on.
  weatherSnowLevels: [
    "None",
    "Flurries",
    "Flurries",
    "Light snow",
    "Light snow",
    "Snow",
    "Snow",
    "Heavy snow",
    "Heavy snow",
    "Blizzard",
    "Blizzard",
  ],
  weatherWind: [
    "Calm",
    "Breeze",
    "Breeze",
    "Fresh",
    "Fresh",
    "Windy",
    "Windy",
    "Strong",
    "Strong",
    "Gale",
    "Gale",
  ],
  snowInsteadOfRain: "Snow instead of rain",
  backToLive: "Back to live Glasgow",
};

export type Messages = typeof en;

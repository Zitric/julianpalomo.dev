import { site } from "../site";
import type { Messages } from "./en";

const numbers = new Intl.NumberFormat("es");

/** Every visible string on the site, in Spanish from Spain. Same keys as `en.ts`. */
export const es: Messages = {
  name: "Julián Palomo",
  // Deliberately the English role from site.ts: a Spanish one needs Julian's approval.
  role: site.role,
  intro:
    "Pregúntame por mi experiencia. Las respuestas salen solo de datos que he confirmado, con sus fuentes.",
  portraitAlt: "Retrato en pixel art de Julián Palomo",
  metaDescription:
    "Pregunta por la experiencia de Julián Palomo. Las respuestas salen solo de datos que él ha confirmado, con sus fuentes.",

  switchLanguage: { short: "EN", label: "View in English" },
  themeToDark: "Cambiar al tema oscuro",
  themeToLight: "Cambiar al tema claro",

  chatLabel: "Chat",
  greeting:
    "¡Hola! Pregúntame por la experiencia de Julián. Solo respondo con datos que él ha confirmado y te enseño de dónde sale cada uno.",
  suggestionsLabel: "Preguntas sugeridas",
  suggestions: [
    "¿Qué hizo Julián en Cazoo?",
    "¿Qué es Form:at?",
    "¿Está Julián abierto a trabajar en remoto?",
  ],
  conversationLabel: "Conversación",
  answerLabel: "Respuesta",
  sourcesLabel: "Fuentes",
  sourceNames: { cv: "CV", julian: "Julián" },
  demo: "Demo",
  lookingUpClaims: "Buscando en los datos confirmados…",
  checkingTopics: "Mirando qué temas hay…",

  questionLabel: "Tu pregunta",
  send: "Enviar",
  stop: "Parar",
  counter: (length, limit) => `${numbers.format(length)} / ${numbers.format(limit)}`,
  counterOver: (over, limit) =>
    `${numbers.format(over)} ${over === 1 ? "carácter" : "caracteres"} por encima del límite de ${numbers.format(limit)}`,

  errorUnavailable: "El asistente no está disponible ahora mismo.",
  errorVisitorLimit: "Has llegado al límite de preguntas de hoy.",
  errorDailyBudget: "El asistente ha llegado a su presupuesto diario. Vuelve a intentarlo mañana.",
  errorGeneric: "Algo ha salido mal.",
  contact: { before: "Aún puedes encontrarme en", between: "o", after: "." },

  patTheCow: "Acaricia a la vaca",
  moo: "¡Muu!",
};

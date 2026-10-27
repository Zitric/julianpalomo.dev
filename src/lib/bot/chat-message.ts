/**
 * The shape of an answer as the UI receives it. Safe to import in the browser.
 */
import type { UIMessage } from "ai";
import type { Source } from "./citations";

/**
 * The model's text, one `data-sources` part listing every claim a tool
 * returned while producing it, and `demo: true` in the metadata when the
 * answer came from demo mode instead of the model.
 */
export type ChatUIMessage = UIMessage<{ demo?: boolean }, { sources: { sources: Source[] } }>;

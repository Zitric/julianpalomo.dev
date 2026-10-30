/**
 * The JSON body of every error response from /api/chat, and the stream's
 * error text. The endpoint builds them, the UI reads them and the e2e tests
 * fake them, all from this one module, so the three can't drift apart. Safe
 * to import in the browser.
 */
import { z } from "zod";

export const chatErrorSchema = z.object({
  error: z.enum(["invalid_request", "unavailable", "failed", "visitor_limit", "daily_budget"]),
});

export type ChatErrorCode = z.infer<typeof chatErrorSchema>["error"];

export function chatErrorBody(error: ChatErrorCode): z.infer<typeof chatErrorSchema> {
  return { error };
}

/**
 * What the stream's error chunk says when the model fails mid-answer; never
 * the provider's message. Visitors never read it: useChat turns the chunk into
 * its error, and the chat shows the generic error text in the page's
 * language instead (chatErrorMessage), so it stays one fixed English string.
 */
export const STREAM_ERROR_TEXT = "Something went wrong. Please try again.";

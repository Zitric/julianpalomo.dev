/**
 * The JSON body of every error response from /api/chat. The endpoint builds
 * it, the UI reads it and the e2e tests fake it, all from this one module, so
 * the three can't drift apart. Safe to import in the browser.
 */
import { z } from "zod";

export const chatErrorSchema = z.object({
  error: z.enum(["invalid_request", "unavailable", "failed"]),
});

export type ChatErrorCode = z.infer<typeof chatErrorSchema>["error"];

export function chatErrorBody(error: ChatErrorCode): z.infer<typeof chatErrorSchema> {
  return { error };
}

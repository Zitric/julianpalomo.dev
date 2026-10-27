import { site } from "../../lib/site";
import { chatErrorMessage } from "./chat-view";

/** Why the last request failed, and where to reach Julian instead. */
export function ChatErrorNotice({ error }: { error: Error }) {
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2">
      <p>{chatErrorMessage(error)}</p>
      <p className="text-sm text-muted">
        You can still reach me on <a href={site.links.linkedin}>LinkedIn</a> or{" "}
        <a href={site.links.github}>GitHub</a>.
      </p>
    </div>
  );
}

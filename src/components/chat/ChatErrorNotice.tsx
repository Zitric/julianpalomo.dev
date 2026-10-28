import { site } from "../../lib/site";
import { chatErrorMessage } from "./chat-view";

/** Why the last request failed, and where to reach Julian instead. */
export function ChatErrorNotice({ error }: { error: Error }) {
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-[20px] bg-tint px-4 py-3">
      <p>{chatErrorMessage(error)}</p>
      <p className="text-[12.5px] text-muted">
        You can still reach me on{" "}
        <a href={site.links.linkedin} className="font-medium text-accent underline">
          LinkedIn
        </a>{" "}
        or{" "}
        <a href={site.links.github} className="font-medium text-accent underline">
          GitHub
        </a>
        .
      </p>
    </div>
  );
}

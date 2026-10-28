import type { CowState } from "../../lib/cow-state";
import { site } from "../../lib/site";
import { AssistantCow } from "../cow/AssistantCow";
import { chatErrorMessage } from "./chat-view";

type Props = { error: Error; cowState: CowState | undefined };

/**
 * Why the last request failed, and where to reach Julian instead. The cow sits
 * beside the alert, not inside it, so its button isn't read out with the alert.
 */
export function ChatErrorNotice({ error, cowState }: Props) {
  return (
    <div className="flex items-end gap-2">
      <AssistantCow state={cowState ?? "idle"} size={58} animated={cowState !== undefined} />
      <div role="alert" className="flex min-w-0 flex-col gap-1 rounded-[20px] bg-tint px-4 py-3">
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
    </div>
  );
}

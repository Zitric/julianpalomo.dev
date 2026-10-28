import type { CowState } from "../../lib/cow-state";
import { AssistantCow } from "../cow/AssistantCow";

/** The cow's hello at the top of the chat. `cowState` is set while its cow is the latest one. */
export function Greeting({ cowState }: { cowState: CowState | undefined }) {
  return (
    <div className="flex items-end gap-2">
      <AssistantCow state={cowState ?? "idle"} size={66} animated={cowState !== undefined} />
      <p className="w-fit min-w-0 rounded-[20px] rounded-bl-[6px] bg-tint px-4 py-3">
        Hi! Ask me about Julian's experience. I only answer with facts he has confirmed, and I show
        where each one comes from.
      </p>
    </div>
  );
}

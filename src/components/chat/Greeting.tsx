import type { CowState } from "../../lib/cow-state";
import { t } from "../../lib/i18n/t";
import { AssistantCow } from "../cow/AssistantCow";
import { useLocale } from "../i18n/useLocale";

/** The cow's hello at the top of the chat. `cowState` is set while its cow is the latest one. */
export function Greeting({ cowState }: { cowState: CowState | undefined }) {
  const locale = useLocale();
  return (
    <div className="flex items-end gap-2">
      <AssistantCow state={cowState ?? "idle"} size={66} animated={cowState !== undefined} />
      <p className="w-fit min-w-0 rounded-[20px] rounded-bl-[6px] bg-tint px-4 py-3">
        {t(locale, "greeting")}
      </p>
    </div>
  );
}

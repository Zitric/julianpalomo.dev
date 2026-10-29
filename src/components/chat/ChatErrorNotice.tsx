import type { CowState } from "../../lib/cow-state";
import { t } from "../../lib/i18n/t";
import { site } from "../../lib/site";
import { AssistantCow } from "../cow/AssistantCow";
import { useLocale } from "../i18n/useLocale";
import { chatErrorMessage } from "./chat-view";

type Props = { error: Error; cowState: CowState | undefined };

// The other ways to reach Julian, in the order the notice lists them.
const WAYS = [
  { name: "LinkedIn", href: site.links.linkedin },
  { name: "GitHub", href: site.links.github },
] as const;

/**
 * Why the last request failed, warmly, and the other ways to reach Julian
 * (DESIGN.md section 10). It's an alert, so screen readers announce it once
 * when it appears. The cow sits beside the alert, not inside it, so its
 * button isn't read out with the alert; it lowers its head.
 */
export function ChatErrorNotice({ error, cowState }: Props) {
  const locale = useLocale();
  const contact = t(locale, "contact");
  return (
    <div className="flex items-end gap-2">
      <AssistantCow state={cowState ?? "idle"} size={58} animated={cowState !== undefined} />
      <div role="alert" className="flex min-w-0 flex-col gap-1 rounded-[20px] bg-tint px-4 py-3">
        <p>{chatErrorMessage(error, locale)}</p>
        <p className="text-[12.5px] text-muted">
          {contact.before}{" "}
          {WAYS.map((way, index) => (
            <span key={way.name}>
              {index > 0 && ` ${contact.between} `}
              <a href={way.href} className="font-medium text-accent underline">
                {way.name}
              </a>
            </span>
          ))}
          {contact.after}
        </p>
      </div>
    </div>
  );
}

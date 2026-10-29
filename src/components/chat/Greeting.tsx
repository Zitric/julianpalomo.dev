import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { revealStops } from "./reveal";

const bubble = "enter-chat w-fit min-w-0 rounded-[20px] rounded-bl-[6px] bg-tint px-4 py-3";

/**
 * The cow's hello at the top of the chat. In the full entrance it types
 * itself out word by word (`typed` is how much is on screen): the rest of the
 * text keeps its place, invisible, so the bubble never grows, and screen
 * readers get the whole greeting at once.
 */
export function Greeting({ typed }: { typed: number | undefined }) {
  const locale = useLocale();
  const text = t(locale, "greeting");
  if (typed === undefined) return <p className={bubble}>{text}</p>;

  const words = revealStops(text, false).filter((stop) => stop <= typed);
  const shown = words.at(-1) ?? 0;
  return (
    <p className={bubble}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((stop, index) => (
          <span key={stop} className="answer-chunk">
            {text.slice(words[index - 1] ?? 0, stop)}
          </span>
        ))}
        <span className="opacity-0">{text.slice(shown)}</span>
      </span>
    </p>
  );
}

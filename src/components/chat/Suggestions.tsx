import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";

type Props = { onPick: (question: string) => void };

/** Questions to start with, sent as an ordinary message. */
export function Suggestions({ onPick }: Props) {
  const locale = useLocale();
  return (
    <ul aria-label={t(locale, "suggestionsLabel")} className="flex flex-wrap gap-2">
      {t(locale, "suggestions").map((question) => (
        <li key={question}>
          <button
            type="button"
            onClick={() => onPick(question)}
            className="min-h-11 rounded-full border-[1.5px] border-border bg-field px-4 py-2 text-left text-sm font-medium hover:border-accent"
          >
            {question}
          </button>
        </li>
      ))}
    </ul>
  );
}

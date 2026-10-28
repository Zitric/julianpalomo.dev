import { useNavigate } from "@tanstack/react-router";
import { rememberChoice } from "../../lib/cookie";
import { LANG_COOKIE, type Locale, paramFromLocale } from "../../lib/i18n/locale";
import { t } from "../../lib/i18n/t";
import { IconButton } from "../ui/IconButton";
import { useLocale } from "./useLocale";

/** Moves to the other language's page, keeping the conversation, and remembers the choice. */
export function LanguageToggle() {
  const locale = useLocale();
  const navigate = useNavigate();
  const other: Locale = locale === "es" ? "en" : "es";
  const { short, label } = t(locale, "switchLanguage");

  function switchLanguage() {
    rememberChoice(LANG_COOKIE, other);
    void navigate({ to: "/{-$locale}", params: { locale: paramFromLocale(other) }, search: true });
  }

  // `lang` is the other language's, which the label is written in.
  return (
    <IconButton look="glass" label={label} lang={other} onClick={switchLanguage}>
      <span className="font-display text-[13px] font-bold">{short}</span>
    </IconButton>
  );
}

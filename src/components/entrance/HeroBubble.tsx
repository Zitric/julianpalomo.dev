import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { useEntrance } from "./Entrance";

// Centred over the hero, just above the big cow: half its height (71px on a
// phone, 79px from lg, from heroCowWidth) and 8px more.
const bubble =
  "bubble-pop pointer-events-none absolute bottom-[calc(50%+79px)] left-1/2 z-10 -translate-x-1/2 rounded-full border-[1.5px] border-border bg-field px-3 py-1 font-display text-sm font-bold whitespace-nowrap text-foreground lg:bottom-[calc(50%+87px)]";

/**
 * "Hi! I'm the Highland cow." over the big cow in the hero, for 1.7s of the
 * full entrance. It's decoration, hidden from screen readers: they read the
 * whole greeting in the chat from the start.
 */
export function HeroBubble() {
  const locale = useLocale();
  const { bubble: shown } = useEntrance();
  if (!shown) return null;
  return (
    <p aria-hidden="true" className={bubble}>
      {t(locale, "heroCowHello")}
    </p>
  );
}

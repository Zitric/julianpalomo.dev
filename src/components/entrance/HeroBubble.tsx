import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { useEntrance } from "./Entrance";

// On a phone, beside the big cow's face and under the hero's controls (which
// end 56px down), wrapping in 92px, with a tail towards its mouth. From lg,
// a pill centred just above the cow: half its height (79px, from
// heroCowWidth) and 8px more.
const bubble =
  "bubble-pop pointer-events-none absolute top-[96px] left-[calc(50%+50px)] z-10 w-[92px] rounded-[14px] border-[1.5px] border-border bg-field px-2.5 py-1.5 font-display text-sm leading-tight font-bold text-foreground lg:top-auto lg:bottom-[calc(50%+87px)] lg:left-1/2 lg:w-auto lg:-translate-x-1/2 lg:rounded-full lg:px-3 lg:py-1 lg:whitespace-nowrap";

/**
 * "Hi! I'm the Highland cow." beside or over the big cow in the hero, for
 * 1.7s of the full entrance. It's decoration, hidden from screen readers:
 * they read the whole greeting in the chat from the start.
 */
export function HeroBubble() {
  const locale = useLocale();
  const { bubble: shown } = useEntrance();
  if (!shown) return null;
  return (
    <p aria-hidden="true" className={bubble}>
      {t(locale, "heroCowHello")}
      <Tail />
    </p>
  );
}

/**
 * The phone's comic-style tail on the bubble's left edge, pointing down and
 * left. It overlaps the bubble's 1.5px border, so its fill covers that stretch
 * of border and the outline runs on around the tail with no seam.
 */
function Tail() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 22 16"
      width={22}
      height={16}
      className="absolute bottom-2.5 -left-[20.5px] overflow-visible lg:hidden"
    >
      <path d="M22 0 L0.75 15.25 L22 9.5 Z" className="fill-field" />
      <path
        d="M22 0 L0.75 15.25 L22 9.5"
        className="fill-none stroke-border"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

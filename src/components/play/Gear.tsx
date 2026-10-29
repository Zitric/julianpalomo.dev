import { useEffect, useState } from "react";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { IconButton } from "../ui/IconButton";

// The gear isn't there at first: it spins in this long after the page is ready.
const GEAR_DELAY_MS = 2000;
// The first-visit bubble goes away after this long, or on any tap.
const BUBBLE_MS = 5000;
const BUBBLE_SEEN = "julianpalomo.sky-bubble-seen";

/** Whether the bubble was shown before. Storage that fails reads as "no", so it shows again. */
function bubbleSeen(): boolean {
  try {
    return localStorage.getItem(BUBBLE_SEEN) === "1";
  } catch {
    return false;
  }
}

function rememberBubble(): void {
  try {
    localStorage.setItem(BUBBLE_SEEN, "1");
  } catch {
    // Private mode or blocked storage: the bubble simply shows again next time.
  }
}

/**
 * The gear that opens "Play with the sky" (DESIGN.md section 8). It holds a
 * 44px slot from the start, so the chip beside it never moves, and appears in
 * it after 2s; on a first visit, a bubble beside it says what it does.
 */
export function Gear({ onOpen }: { onOpen: (trigger: HTMLElement) => void }) {
  const locale = useLocale();
  const [shown, setShown] = useState(false);
  const [bubble, setBubble] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), GEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shown || bubbleSeen()) return;
    rememberBubble();
    setBubble(true);
    const hide = () => setBubble(false);
    const timer = setTimeout(hide, BUBBLE_MS);
    document.addEventListener("pointerdown", hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", hide);
    };
  }, [shown]);

  return (
    <div className="relative size-11 shrink-0">
      {shown && (
        <span className="gear-in inline-flex">
          <IconButton
            look="accent"
            label={t(locale, "playWithTheSky")}
            onClick={(event) => onOpen(event.currentTarget)}
          >
            <GearIcon />
          </IconButton>
        </span>
      )}
      {bubble && (
        <p
          role="status"
          className="absolute top-full left-0 mt-2 w-max max-w-[220px] rounded-[14px] rounded-tl-[6px] border-[1.5px] border-border bg-field px-3 py-2 text-[13px] font-semibold text-foreground"
        >
          {t(locale, "playBubble")}
        </p>
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

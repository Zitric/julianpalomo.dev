import { t } from "../../lib/i18n/t";
import { land } from "../../lib/scene/palette";
import { seasonOf } from "../../lib/scene/season";
import { useNow } from "../clock/Clock";
import { useLocale } from "../i18n/useLocale";
import { useTheme } from "../theme/Theme";
import { ThemeToggle } from "../theme/ThemeToggle";

/**
 * The compact bar on a phone, once the chat has started (DESIGN.md section
 * 5): the square portrait, the name, the sound toggle's place and the theme
 * toggle, 58px tall, with a strip of hills along its bottom in the season's
 * land colours. Fixed to the top below 1024px; the hero has scrolled away.
 */
export function CompactBar() {
  const locale = useLocale();
  const now = useNow();
  const { theme } = useTheme();
  const hills = land[seasonOf(now)][theme === "dark" ? "night" : "day"];

  return (
    <div className="fixed inset-x-0 top-0 z-30 flex h-[58px] items-center gap-3 bg-background px-4 sm:px-6 lg:hidden">
      <img
        src="/images/julian-square.png"
        alt=""
        width={34}
        height={34}
        className="size-[34px] -scale-x-100 rounded-[10px] [image-rendering:pixelated]"
      />
      <p className="min-w-0 flex-1 truncate font-display text-[17px] font-extrabold">
        {t(locale, "name")}
      </p>
      {/* The sound toggle's place. */}
      <span aria-hidden="true" className="size-11 shrink-0" />
      <ThemeToggle look="tint" />
      <svg
        aria-hidden="true"
        viewBox="0 0 400 10"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2.5 w-full"
      >
        <path d="M0 6 C 60 1 110 2 170 5 C 240 9 300 1 400 4 L400 10 L0 10 Z" fill={hills.far} />
        <path d="M0 8 C 80 4 150 9 230 6 C 300 3 350 8 400 7 L400 10 L0 10 Z" fill={hills.near} />
      </svg>
    </div>
  );
}

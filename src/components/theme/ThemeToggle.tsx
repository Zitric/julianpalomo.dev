import { useId } from "react";
import { IconButton } from "../ui/IconButton";
import { useTheme } from "./Theme";

// The sun and the moon sit on top of each other. With motion, the sun pulls in
// its rays and turns away as the moon turns in, over 0.55s (DESIGN.md section
// 6). With reduced motion they only crossfade, over 0.3s. Transform and
// opacity only.
const layer =
  "absolute inset-0 size-5 transition-opacity duration-300 motion-safe:transition-[opacity,transform] motion-safe:duration-[550ms] motion-safe:ease-in-out";
const rays =
  "origin-center [transform-box:fill-box] motion-safe:transition-transform motion-safe:duration-[550ms] motion-safe:ease-in-out";

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/** Switches between the light and dark themes, and remembers the choice. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const maskId = useId();
  const isDark = theme === "dark";

  const label = isDark ? "Switch to light theme" : "Switch to dark theme";
  const sun = isDark ? "opacity-0 motion-safe:scale-50 motion-safe:rotate-90" : "opacity-100";
  const sunRays = isDark ? "motion-safe:scale-0" : "";
  const moon = isDark ? "opacity-100" : "opacity-0 motion-safe:scale-50 motion-safe:-rotate-90";

  return (
    <IconButton look="glass" label={label} onClick={toggle}>
      <span className="relative block size-5">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`${layer} ${sun}`}
          fill="none"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="4.5" strokeWidth="2" />
          <g className={`${rays} ${sunRays}`} strokeWidth="2" strokeLinecap="round">
            {RAY_ANGLES.map((angle) => (
              <line
                key={angle}
                x1="12"
                y1="2.5"
                x2="12"
                y2="4.5"
                transform={`rotate(${angle} 12 12)`}
              />
            ))}
          </g>
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`${layer} ${moon}`}
          fill="currentColor"
        >
          <mask id={maskId}>
            {/* Mask luminance, not colours on screen: white keeps the disc, black cuts the crescent. */}
            <rect width="24" height="24" fill="white" />
            <circle cx="17" cy="7" r="6.5" fill="black" />
          </mask>
          <circle cx="12" cy="12" r="8.5" mask={`url(#${maskId})`} />
        </svg>
      </span>
    </IconButton>
  );
}

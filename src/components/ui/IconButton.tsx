import type { ComponentProps, ReactNode } from "react";

// Only the looks in use: add one (glass, tint) with its first caller.
type Look = "accent";

type Props = Omit<ComponentProps<"button">, "aria-label" | "children" | "className"> & {
  /** The accessible name: the button shows only an icon. */
  label: string;
  look: Look;
  /** The icon, hidden from screen readers. */
  children: ReactNode;
};

const shape =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-transform duration-[80ms] motion-safe:active:scale-[0.92] disabled:active:scale-100";

const looks: Record<Look, string> = {
  accent: "bg-accent text-on-accent hover:brightness-110 disabled:opacity-50",
};

/** A round, flat, icon-only button, 44px so it's easy to hit on touch. */
export function IconButton({ label, look, children, type = "button", ...rest }: Props) {
  return (
    <button type={type} aria-label={label} className={`${shape} ${looks[look]}`} {...rest}>
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

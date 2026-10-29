import type { ComponentProps, ReactNode } from "react";

// Only the looks in use: add one (secondary) with its first caller.
type Look = "primary";

type Props = Omit<ComponentProps<"button">, "className" | "children"> & {
  look: Look;
  children: ReactNode;
};

const shape =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 font-display font-bold transition-transform duration-[80ms] motion-safe:active:scale-[0.97]";

const looks: Record<Look, string> = {
  primary: "bg-accent text-on-accent hover:brightness-110",
};

/** A wide, flat, fully round button (DESIGN.md section 4); it presses to 0.97. */
export function Button({ look, children, type = "button", ...rest }: Props) {
  return (
    <button type={type} className={`${shape} ${looks[look]}`} {...rest}>
      {children}
    </button>
  );
}

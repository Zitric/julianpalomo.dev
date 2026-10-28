import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

const MINUTE = 60_000;

const ClockContext = createContext<number | null>(null);

/**
 * The page's one clock. It starts from the server's request time, so the first
 * client render matches the server's HTML, then ticks on every whole minute.
 */
export function ClockProvider({ start, children }: { start: number; children: ReactNode }) {
  const [now, setNow] = useState(start);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      timer = setTimeout(tick, MINUTE - (current % MINUTE));
    };
    timer = setTimeout(tick, MINUTE - (Date.now() % MINUTE));

    // Browsers throttle timers in hidden tabs, so catch up on return.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return <ClockContext value={now}>{children}</ClockContext>;
}

/** The current time, to the minute. Read it here, never with `Date.now()` during render. */
export function useNow(): number {
  const now = useContext(ClockContext);
  if (now === null) throw new Error("useNow needs a ClockProvider");
  return now;
}

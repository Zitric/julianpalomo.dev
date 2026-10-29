import { useEffect, useRef, useState } from "react";
import { advanceReveal, onScreen, revealStops } from "./reveal";

/** How often the reveal moves on. */
const TICK_MS = 50;

type Options = {
  /** The latest answer, or undefined before the first one. */
  id: string | undefined;
  /** Its text as it has arrived so far, markers included. */
  text: string;
  /** More text may still arrive. */
  streaming: boolean;
  /** Show everything that has arrived at once: with reduced motion, after Stop, after an error. */
  instant: boolean;
};

/**
 * How much of the latest answer's text is on screen as it types itself out,
 * and whether it's still typing: until the stream ends and the reveal reaches
 * the end. `shown` is a length in `text`, always at the end of a word.
 */
export function useReveal({ id, text, streaming, instant }: Options): {
  shown: number;
  revealing: boolean;
} {
  const stops = revealStops(text, streaming);
  const end = stops.at(-1) ?? 0;

  const [reveal, setReveal] = useState({ id, shown: 0, carry: 0 });
  // A new answer starts from nothing, and what an instant reveal showed stays
  // shown, so a stopped answer never types on again. Adjusting state while
  // rendering, as React documents for state that depends on a changed value.
  if (reveal.id !== id) setReveal({ id, shown: instant ? end : 0, carry: 0 });
  else if (instant && reveal.shown < end) setReveal({ id, shown: end, carry: 0 });
  const shown = onScreen(reveal.id === id ? reveal.shown : 0, text, stops, instant);
  const behind = !instant && shown < end;

  // The timer reads the latest stops without restarting on every new piece
  // of text, which would keep resetting it while text streams in quickly.
  const latestStops = useRef(stops);
  useEffect(() => {
    latestStops.current = stops;
  });

  useEffect(() => {
    if (!behind) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      setReveal((current) =>
        current.id === id
          ? { id, ...advanceReveal(current, latestStops.current, elapsed) }
          : current,
      );
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [id, behind]);

  return { shown, revealing: id !== undefined && (streaming || behind) };
}

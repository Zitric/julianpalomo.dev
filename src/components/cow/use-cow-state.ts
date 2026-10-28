import { useEffect, useState } from "react";
import { type CowSituation, type CowState, LICK_MS, nextCowState } from "../../lib/cow-state";

/** The live cow's state, kept across renders so `satisfied` plays once and then ends. */
export function useCowState(situation: CowSituation): CowState {
  const [previous, setPrevious] = useState<CowState>("idle");
  const state = nextCowState(previous, situation);
  // Adjusting state while rendering, as React documents for state that depends
  // on the previous render. nextCowState gives the same state when applied
  // twice, so this settles after one extra render.
  if (state !== previous) setPrevious(state);

  useEffect(() => {
    if (state !== "satisfied") return;
    const timer = setTimeout(() => setPrevious("idle"), LICK_MS);
    return () => clearTimeout(timer);
  }, [state]);

  return state;
}

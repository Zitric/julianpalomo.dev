import { createContext, type Dispatch, type ReactNode, useContext, useReducer } from "react";
import { type PlayAction, type PlayState, playReducer } from "../../lib/scene/play";

type PlayContextValue = { state: PlayState; dispatch: Dispatch<PlayAction> };

const PlayContext = createContext<PlayContextValue | null>(null);

/**
 * The visitor's own sky, from the gear's panel. It sits above the theme in the
 * root shell, because <html data-theme> follows the slider while playing.
 * Every page load starts live: nothing is stored.
 */
export function PlayProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playReducer, { status: "live" });
  return <PlayContext value={{ state, dispatch }}>{children}</PlayContext>;
}

export function usePlay(): PlayContextValue {
  const value = useContext(PlayContext);
  if (!value) throw new Error("usePlay needs a PlayProvider");
  return value;
}

import { type RefObject, useEffect, useRef } from "react";
import type { CowState } from "../../lib/cow-state";
import { FLIGHT_MS, heroCowWidth } from "../../lib/entrance";
import { t } from "../../lib/i18n/t";
import { AssistantCow } from "../cow/AssistantCow";
import { CowHooves } from "../cow/CowHooves";
import { useEntrance } from "../entrance/Entrance";
import { useLocale } from "../i18n/useLocale";

/**
 * The top of the chat (DESIGN.md sections 5 and 9): the assistant's one cow,
 * resting its chin and hooves on the chat's edge, with "Ask me about Julian"
 * beside it. The edge itself is the card's top border on desktop and a line on
 * a phone, both drawn by Chat. The cow hangs 22px below this row, so its
 * hooves sit on the edge.
 */
export function ChatEdge({ cowState }: { cowState: CowState }) {
  const locale = useLocale();
  const cow = useRef<HTMLDivElement>(null);
  useCowFlight(cow);
  return (
    <div className="flex items-end gap-3 lg:pl-7">
      <div ref={cow} className="edge-cow relative z-10 -mb-[22px] shrink-0">
        <div className="edge-lift relative" data-state={cowState}>
          <AssistantCow state={cowState} size={132} animated />
          <CowHooves />
        </div>
      </div>
      <div className="enter-chat min-w-0 pb-2">
        <h2 className="font-display text-base leading-tight font-bold">
          {t(locale, "chatHeading")}
        </h2>
        <p className="text-[13px] text-muted">{t(locale, "chatReady")}</p>
      </div>
    </div>
  );
}

type Step = "wait" | "pop" | "place" | "fly" | "landed" | "rest";

/**
 * The full entrance's cow (DESIGN.md section 11): big in the middle of the
 * hero, then flying to its place on the edge. It's the edge's own cow, moved
 * with `transform` only, so no second cow ever exists. Only JavaScript moves
 * it to the hero, after measuring the way; without it, the CSS shows it on
 * the edge at the landing.
 */
function useCowFlight(cow: RefObject<HTMLElement | null>) {
  const { flight, hero } = useEntrance();
  const animations = useRef<Animation[]>([]);
  // The transform that puts the cow in the hero, measured when it gets there.
  const inHero = useRef<string | null>(null);

  let step: Step = "rest";
  if (flight && flight.join.cow !== "edge") {
    const { beat, join } = flight;
    if (beat === "glen") step = "wait";
    else if (beat === "heroCow" || beat === "heroLick") step = join.cow === "pop" ? "pop" : "place";
    else if (beat === "flight") step = "fly";
    else step = "landed";
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: each step runs once, when it starts; the refs are stable.
  useEffect(() => {
    const element = cow.current;
    const from = hero.current;
    if (!element) return;
    const play = (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      animations.current.push(element.animate(keyframes, { fill: "forwards", ...options }));
    };
    switch (step) {
      case "wait":
      case "landed":
        return;
      case "pop":
      case "place": {
        if (!from) return;
        const transform = heroTransform(element, from);
        inHero.current = transform;
        if (step === "place") {
          play([{ opacity: 1, transform }], { duration: 0 });
          return;
        }
        play(
          [
            { opacity: 1, transform: `${transform} scale(0)` },
            { opacity: 1, transform: `${transform} scale(1.08)`, offset: 0.7 },
            { opacity: 1, transform },
          ],
          { duration: 600, easing: "ease-out" },
        );
        return;
      }
      case "fly": {
        if (!inHero.current) return;
        play(
          [
            { opacity: 1, transform: inHero.current },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: FLIGHT_MS,
            easing: "cubic-bezier(.5, 0, .2, 1)",
          },
        );
        return;
      }
      case "rest": {
        for (const animation of animations.current) animation.cancel();
        animations.current = [];
        inHero.current = null;
        return;
      }
      default: {
        const unhandled: never = step;
        throw new Error(String(unhandled));
      }
    }
  }, [step]);
}

/** Moves the cow, from where it sits on the edge, to the middle of the hero at its hero size. */
function heroTransform(cow: HTMLElement, hero: HTMLElement): string {
  const at = cow.getBoundingClientRect();
  const to = hero.getBoundingClientRect();
  const dx = to.left + to.width / 2 - (at.left + at.width / 2);
  const dy = to.top + to.height / 2 - (at.top + at.height / 2);
  const scale = heroCowWidth(to.height) / at.width;
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}

import { useLayoutEffect, useRef } from "react";
import type { ChatUIMessage } from "../../lib/bot/chat-message";
import type { CowSlot, CowState } from "../../lib/cow-state";
import { t } from "../../lib/i18n/t";
import { AssistantCow } from "../cow/AssistantCow";
import { useLocale } from "../i18n/useLocale";
import { AssistantMessage } from "./AssistantMessage";
import { messageText } from "./chat-view";

type Props = {
  messages: ChatUIMessage[];
  /** The answer still typing itself out, and how much of its text is on screen. */
  typing: { id: string | undefined; shown: number } | undefined;
  /** Where the one animated cow is, and what it's doing. */
  cowSlot: CowSlot;
  cowState: CowState;
  /** The question a suggestion chip sent, and where the chip was. */
  flight: { text: string; from: DOMRect } | null;
  /** Called once when the visitor's newest bubble appears, so a sound can play with it. */
  onBubbleShown?: () => void;
};

/** The conversation in order. */
export function MessageList({ messages, typing, cowSlot, cowState, flight, onBubbleShown }: Props) {
  const locale = useLocale();
  const newestQuestion = messages.filter((message) => message.role === "user").at(-1)?.id;
  return (
    <ol aria-label={t(locale, "conversationLabel")} className="flex flex-col gap-6">
      {messages.map((message) => {
        if (message.role === "user") {
          const text = messageText(message.parts);
          const newest = message.id === newestQuestion;
          return (
            <li key={message.id}>
              <Question
                text={text}
                from={newest && flight?.text === text ? flight.from : null}
                onShown={newest ? onBubbleShown : undefined}
              />
            </li>
          );
        }
        const live = cowSlot.kind === "answer" && cowSlot.id === message.id;
        return (
          <li key={message.id} className="flex items-end gap-2">
            <AssistantCow state={live ? cowState : "idle"} size={58} animated={live} />
            <AssistantMessage
              message={message}
              typed={typing?.id === message.id ? typing.shown : undefined}
            />
          </li>
        );
      })}
      {/* Where the answer will appear, until its first chunk arrives. */}
      {cowSlot.kind === "pending" && (
        <li>
          <AssistantCow state={cowState} size={58} animated />
        </li>
      )}
    </ol>
  );
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The visitor's question. It pops into place with a small overshoot; sent
 * from a suggestion chip, it flies from the chip instead (a FLIP: drawn in
 * its place, then animated from the chip's position with `transform` only).
 * With reduced motion it simply appears.
 */
function Question({
  text,
  from,
  onShown,
}: {
  text: string;
  from: DOMRect | null;
  onShown: (() => void) | undefined;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  // Runs once, when the bubble mounts: measure, then animate from the chip.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a bubble flies in only when it first appears.
  useLayoutEffect(() => {
    onShown?.();
    const bubble = ref.current;
    if (!bubble || !from || reducedMotion()) return;
    const to = bubble.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    bubble.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})` },
        { transform: "none" },
      ],
      { duration: 450, easing: "cubic-bezier(0.3, 1.2, 0.5, 1)" },
    );
  }, []);

  const pop = from ? "" : "bubble-pop";
  return (
    <p
      ref={ref}
      className={`ml-auto w-fit max-w-[85%] origin-bottom-right rounded-[20px] rounded-br-[6px] bg-user px-4 py-2.5 whitespace-pre-wrap break-words text-on-user ${pop}`}
    >
      {text}
    </p>
  );
}

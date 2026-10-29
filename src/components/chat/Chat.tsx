import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { MAX_MESSAGES } from "../../lib/bot/limits";
import { liveCowSlot } from "../../lib/cow-state";
import { t } from "../../lib/i18n/t";
import { useCowState } from "../cow/use-cow-state";
import { useLocale } from "../i18n/useLocale";
import { ChatErrorNotice } from "./ChatErrorNotice";
import { Composer } from "./Composer";
import {
  answerAsText,
  latestMessages,
  messageText,
  outOfQuestions,
  remainingSuggestions,
  shouldFollow,
} from "./chat-view";
import { Greeting } from "./Greeting";
import { MessageList } from "./MessageList";
import { Suggestions } from "./Suggestions";
import { useReveal } from "./use-reveal";

// Posts to /api/chat, the default endpoint, with the body the transport sends
// by default except that only the latest MAX_MESSAGES messages go, so a long
// conversation never reaches the endpoint's cap. Module-level so the
// transport isn't rebuilt on every render.
const transport = new DefaultChatTransport<ChatUIMessage>({
  prepareSendMessagesRequest: ({ body, id, messages, trigger, messageId }) => ({
    body: { ...body, id, messages: latestMessages(messages, MAX_MESSAGES), trigger, messageId },
  }),
});

/** The chat with the assistant. */
/** `onStarted` runs when the visitor sends their first question. */
export function Chat({ onStarted }: { onStarted?: () => void }) {
  const locale = useLocale();
  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>({ transport });
  const [input, setInput] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const requesting = status === "submitted" || status === "streaming";
  const last = messages.at(-1);
  const latestAnswer = messages.filter((message) => message.role === "assistant").at(-1);
  const latestText = latestAnswer ? messageText(latestAnswer.parts) : "";

  // The latest answer types itself out from what has arrived; with reduced
  // motion, after Stop or after an error, all of it shows at once.
  const reveal = useReveal({
    id: latestAnswer?.id,
    text: latestText,
    streaming: status === "streaming" && last?.role === "assistant",
    instant: stopped || status === "error" || (latestAnswer !== undefined && reducedMotion()),
  });
  // Stop stays until the answer has finished typing, so it can show the rest at once.
  const busy = requesting || reveal.revealing;

  const cowSlot = liveCowSlot(status, messages);
  const cowState = useCowState({
    status,
    answerHasText: reveal.revealing && reveal.shown > 0,
    revealing: reveal.revealing,
    stopped,
    composer: { hasText: input.length > 0, focused: composerFocused },
  });

  // Sending swaps Send for Stop, a suggestion removes its own button, and
  // stopping removes Stop. Each would leave keyboard focus on the page, so it
  // goes back to the question box instead.
  // The question a suggestion chip sent, and where the chip was: its bubble
  // flies in from there.
  const [flight, setFlight] = useState<{ text: string; from: DOMRect } | null>(null);

  function send(text: string, from?: DOMRect) {
    if (messages.length === 0) onStarted?.();
    setFlight(from ? { text, from } : null);
    setStopped(false);
    void sendMessage({ text });
    setInput("");
    inputRef.current?.focus();
  }

  // For screen readers: "Answering…" when an answer starts, then the whole
  // answer once, as plain text, when it has finished typing; never piece by
  // piece.
  const [announcement, setAnnouncement] = useState("");
  const [seenStatus, setSeenStatus] = useState(status);
  if (status !== seenStatus) {
    setSeenStatus(status);
    if (status === "submitted") setAnnouncement(t(locale, "answering"));
  }
  const [wasRevealing, setWasRevealing] = useState(false);
  if (reveal.revealing !== wasRevealing) {
    setWasRevealing(reveal.revealing);
    if (!reveal.revealing) {
      setAnnouncement(answerAsText(latestText, [], t(locale, "sourceNames"), ""));
    }
  }

  // Follow the typing only from the bottom of the page; a visitor who
  // scrolled up to read gets a "New answer ↓" pill instead.
  const atBottom = useAtBottom();
  useEffect(() => {
    if (reveal.shown > 0 && shouldFollow({ atBottom, streaming: reveal.revealing })) {
      scrollToBottom();
    }
  }, [reveal.shown, atBottom, reveal.revealing]);
  const showNewAnswer = reveal.revealing && !atBottom;

  const asked = messages.filter((m) => m.role === "user").map((m) => messageText(m.parts));
  const keepAsking =
    !busy && last?.role === "assistant"
      ? remainingSuggestions(t(locale, "suggestions"), asked, 3)
      : [];

  function stopAnswer() {
    setStopped(true);
    if (requesting) void stop();
    inputRef.current?.focus();
  }

  return (
    <section aria-label={t(locale, "chatLabel")} className="flex flex-col gap-6">
      <p aria-live="polite" className="sr-only" data-testid="chat-announcer">
        {announcement}
      </p>
      <Greeting cowState={cowSlot.kind === "greeting" ? cowState : undefined} />
      {messages.length === 0 && (
        <Suggestions
          label={t(locale, "suggestionsLabel")}
          questions={t(locale, "suggestions").slice(0, 3)}
          onPick={send}
        />
      )}
      {messages.length > 0 && (
        <MessageList
          messages={messages}
          flight={flight}
          typing={reveal.revealing ? { id: latestAnswer?.id, shown: reveal.shown } : undefined}
          cowSlot={cowSlot}
          cowState={cowState}
        />
      )}
      {keepAsking.length > 0 && (
        <Suggestions
          label={t(locale, "keepAsking")}
          heading={t(locale, "keepAsking")}
          questions={keepAsking}
          onPick={send}
        />
      )}
      {showNewAnswer && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="fixed bottom-44 left-1/2 z-20 lg:bottom-6 min-h-11 -translate-x-1/2 rounded-full bg-accent px-4 text-[13px] font-semibold text-on-accent"
        >
          {t(locale, "newAnswer")}
        </button>
      )}
      {error && (
        <ChatErrorNotice error={error} cowState={cowSlot.kind === "error" ? cowState : undefined} />
      )}
      <Composer
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        onStop={stopAnswer}
        onFocus={() => setComposerFocused(true)}
        onBlur={() => setComposerFocused(false)}
        busy={busy}
        closed={outOfQuestions(error)}
        ref={inputRef}
      />
    </section>
  );
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function scrollToBottom() {
  window.scrollTo({ top: document.documentElement.scrollHeight });
}

/** Whether the page is scrolled to (near) its bottom, kept current on scroll and resize. */
function useAtBottom(): boolean {
  const [atBottom, setAtBottom] = useState(true);
  useEffect(() => {
    const check = () =>
      setAtBottom(
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48,
      );
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return atBottom;
}

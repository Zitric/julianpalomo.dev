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
  latestMessages,
  messageText,
  outOfQuestions,
  remainingSuggestions,
  shouldFollow,
  toolStatus,
} from "./chat-view";
import { Greeting } from "./Greeting";
import { MessageList } from "./MessageList";
import { Suggestions } from "./Suggestions";

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
  const busy = status === "submitted" || status === "streaming";
  const last = messages.at(-1);
  const streamingId = status === "streaming" && last?.role === "assistant" ? last.id : undefined;
  const streamingParts = streamingId === undefined ? [] : (last?.parts ?? []);

  const cowSlot = liveCowSlot(status, messages);
  const cowState = useCowState({
    status,
    answerHasText: messageText(streamingParts).length > 0,
    toolRunning: toolStatus(streamingParts, locale) !== undefined,
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

  // Follow a streaming answer only from the bottom of the page; a visitor who
  // scrolled up to read gets a "New answer ↓" pill instead.
  const atBottom = useAtBottom();
  const streamingLength = messageText(streamingParts).length;
  useEffect(() => {
    if (streamingLength > 0 && shouldFollow({ atBottom, streaming: streamingId !== undefined })) {
      scrollToBottom();
    }
  }, [streamingLength, atBottom, streamingId]);
  const showNewAnswer = streamingId !== undefined && !atBottom;

  const asked = messages.filter((m) => m.role === "user").map((m) => messageText(m.parts));
  const keepAsking =
    !busy && last?.role === "assistant"
      ? remainingSuggestions(t(locale, "suggestions"), asked, 3)
      : [];

  function stopAnswer() {
    setStopped(true);
    void stop();
    inputRef.current?.focus();
  }

  return (
    <section aria-label={t(locale, "chatLabel")} className="flex flex-col gap-6">
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
          streamingId={streamingId}
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

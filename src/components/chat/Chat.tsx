import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useState } from "react";
import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { MAX_MESSAGES } from "../../lib/bot/limits";
import { liveCowSlot } from "../../lib/cow-state";
import { t } from "../../lib/i18n/t";
import { useCowState } from "../cow/use-cow-state";
import { useLocale } from "../i18n/useLocale";
import { ChatErrorNotice } from "./ChatErrorNotice";
import { Composer } from "./Composer";
import { latestMessages, messageText, toolStatus } from "./chat-view";
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
export function Chat() {
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
  function send(text: string) {
    setStopped(false);
    void sendMessage({ text });
    setInput("");
    inputRef.current?.focus();
  }

  function stopAnswer() {
    setStopped(true);
    void stop();
    inputRef.current?.focus();
  }

  return (
    <section aria-label={t(locale, "chatLabel")} className="flex flex-col gap-6">
      <Greeting cowState={cowSlot.kind === "greeting" ? cowState : undefined} />
      {messages.length === 0 && <Suggestions onPick={send} />}
      {messages.length > 0 && (
        <MessageList
          messages={messages}
          streamingId={streamingId}
          cowSlot={cowSlot}
          cowState={cowState}
        />
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
        ref={inputRef}
      />
    </section>
  );
}

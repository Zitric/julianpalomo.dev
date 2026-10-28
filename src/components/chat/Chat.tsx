import { useChat } from "@ai-sdk/react";
import { useRef, useState } from "react";
import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { liveCowSlot } from "../../lib/cow-state";
import { useCowState } from "../cow/use-cow-state";
import { ChatErrorNotice } from "./ChatErrorNotice";
import { Composer } from "./Composer";
import { messageText, toolStatus } from "./chat-view";
import { Greeting } from "./Greeting";
import { MessageList } from "./MessageList";
import { Suggestions } from "./Suggestions";

/** The chat with the assistant. useChat posts to /api/chat, its default endpoint. */
export function Chat() {
  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>();
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
    toolRunning: toolStatus(streamingParts) !== undefined,
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
    <section aria-label="Chat" className="flex flex-col gap-6">
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

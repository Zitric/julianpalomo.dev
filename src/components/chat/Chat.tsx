import { useChat } from "@ai-sdk/react";
import { useRef, useState } from "react";
import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { ChatErrorNotice } from "./ChatErrorNotice";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { Suggestions } from "./Suggestions";

/** The chat with the assistant. useChat posts to /api/chat, its default endpoint. */
export function Chat() {
  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const last = messages.at(-1);
  const streamingId = status === "streaming" && last?.role === "assistant" ? last.id : undefined;

  // Sending swaps Send for Stop, a suggestion removes its own button, and
  // stopping removes Stop. Each would leave keyboard focus on the page, so it
  // goes back to the question box instead.
  function send(text: string) {
    void sendMessage({ text });
    setInput("");
    inputRef.current?.focus();
  }

  function stopAnswer() {
    void stop();
    inputRef.current?.focus();
  }

  return (
    <section aria-label="Chat" className="flex flex-col gap-6">
      {messages.length === 0 && <Suggestions onPick={send} />}
      {messages.length > 0 && <MessageList messages={messages} streamingId={streamingId} />}
      {error && <ChatErrorNotice error={error} />}
      <Composer
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        onStop={stopAnswer}
        busy={busy}
        ref={inputRef}
      />
    </section>
  );
}

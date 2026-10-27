import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { ChatErrorNotice } from "./ChatErrorNotice";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { Suggestions } from "./Suggestions";

/** The chat with the assistant. useChat posts to /api/chat, its default endpoint. */
export function Chat() {
  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>();
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const last = messages.at(-1);
  const streamingId = status === "streaming" && last?.role === "assistant" ? last.id : undefined;

  function send(text: string) {
    void sendMessage({ text });
    setInput("");
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
        onStop={() => void stop()}
        busy={busy}
      />
    </section>
  );
}

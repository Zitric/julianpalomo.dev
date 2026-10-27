import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { AssistantMessage } from "./AssistantMessage";
import { messageText } from "./chat-view";

type Props = { messages: ChatUIMessage[]; streamingId: string | undefined };

/** The conversation in order. Answers are announced politely as they stream. */
export function MessageList({ messages, streamingId }: Props) {
  return (
    <ol aria-live="polite" aria-label="Conversation" className="flex flex-col gap-6">
      {messages.map((message) => (
        <li key={message.id}>
          {message.role === "user" ? (
            <p className="ml-auto w-fit max-w-[85%] rounded-lg border border-border px-3 py-2 whitespace-pre-wrap break-words">
              {messageText(message.parts)}
            </p>
          ) : (
            <AssistantMessage message={message} streaming={message.id === streamingId} />
          )}
        </li>
      ))}
    </ol>
  );
}

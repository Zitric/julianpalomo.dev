import type { ChatUIMessage } from "../../lib/bot/chat-message";
import type { CowSlot, CowState } from "../../lib/cow-state";
import { t } from "../../lib/i18n/t";
import { AssistantCow } from "../cow/AssistantCow";
import { useLocale } from "../i18n/useLocale";
import { AssistantMessage } from "./AssistantMessage";
import { messageText } from "./chat-view";

type Props = {
  messages: ChatUIMessage[];
  streamingId: string | undefined;
  /** Where the one animated cow is, and what it's doing. */
  cowSlot: CowSlot;
  cowState: CowState;
};

/** The conversation in order. Answers are announced politely as they stream. */
export function MessageList({ messages, streamingId, cowSlot, cowState }: Props) {
  const locale = useLocale();
  return (
    <ol
      aria-live="polite"
      aria-label={t(locale, "conversationLabel")}
      className="flex flex-col gap-6"
    >
      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <li key={message.id}>
              <p className="ml-auto w-fit max-w-[85%] rounded-[20px] rounded-br-[6px] bg-user px-4 py-2.5 whitespace-pre-wrap break-words text-on-user">
                {messageText(message.parts)}
              </p>
            </li>
          );
        }
        const live = cowSlot.kind === "answer" && cowSlot.id === message.id;
        return (
          <li key={message.id} className="flex items-end gap-2">
            <AssistantCow state={live ? cowState : "idle"} size={58} animated={live} />
            <AssistantMessage message={message} streaming={message.id === streamingId} />
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

import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { chipLabel } from "../../lib/bot/citations";
import { messageText, renderAnswer, toolStatus } from "./chat-view";

type Props = { message: ChatUIMessage; streaming: boolean };

/** One answer: its text with numbered citations, the source chips, and a Demo label. */
export function AssistantMessage({ message, streaming }: Props) {
  const text = messageText(message.parts);
  const sources = message.parts.find((part) => part.type === "data-sources")?.data.sources ?? [];
  const { parts, chips } = renderAnswer(text, sources, streaming);
  const status = streaming ? toolStatus(message.parts) : undefined;
  const isDemo = message.metadata?.demo === true;

  return (
    <article
      className="flex w-fit max-w-[92%] min-w-0 flex-col gap-2 rounded-[20px] rounded-bl-[6px] bg-tint px-4 py-3"
      aria-label="Answer"
    >
      {isDemo && (
        <p className="w-fit rounded-full border border-border px-2 text-xs font-semibold text-muted">
          Demo
        </p>
      )}
      {status && <p className="text-[12.5px] font-medium text-muted">{status}</p>}
      <p className="whitespace-pre-wrap break-words">
        {parts.map((part, index) =>
          part.type === "text" ? (
            // Parts never reorder while an answer streams, so the index is a stable key.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            <span key={index}>{part.text}</span>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            <sup key={index} className="font-semibold text-accent">
              [{part.number}]
            </sup>
          ),
        )}
      </p>
      {chips.length > 0 && (
        <ol aria-label="Sources" className="flex flex-wrap gap-2">
          {chips.map(({ number, source }) => (
            <li
              key={source.id}
              className="rounded-full border-[1.5px] border-border bg-field px-3 py-1 text-[13px] font-medium break-words"
            >
              [{number}] {chipLabel(source)}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

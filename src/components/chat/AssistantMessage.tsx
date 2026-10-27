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
    <article className="flex flex-col gap-2" aria-label="Answer">
      {isDemo && (
        <p className="w-fit rounded border border-border px-1.5 text-xs text-muted">Demo</p>
      )}
      {status && <p className="text-sm text-muted">{status}</p>}
      <p className="whitespace-pre-wrap break-words">
        {parts.map((part, index) =>
          part.type === "text" ? (
            // Parts never reorder while an answer streams, so the index is a stable key.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            <span key={index}>{part.text}</span>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            <sup key={index} className="text-muted">
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
              className="rounded-full border border-border px-2.5 py-0.5 text-sm break-words"
            >
              [{number}] {chipLabel(source)}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

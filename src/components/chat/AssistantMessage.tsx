import { useEffect, useId, useState } from "react";
import type { ChatUIMessage } from "../../lib/bot/chat-message";
import { chipLabel, type Source } from "../../lib/bot/citations";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import {
  answerAsText,
  confirmationLine,
  messageText,
  renderAnswer,
  splitIntoChunks,
  toolStatus,
} from "./chat-view";

type Props = { message: ChatUIMessage; streaming: boolean };

/**
 * One answer (DESIGN.md section 10): its text, fading in piece by piece while
 * it streams; citations as numbered buttons; when it ends, the numbered
 * source chips rising in and a Copy button. A number or a chip opens its
 * claim, exactly as Julian confirmed it, under the answer.
 */
export function AssistantMessage({ message, streaming }: Props) {
  const locale = useLocale();
  const claimId = useId();
  const names = t(locale, "sourceNames");
  const text = messageText(message.parts);
  const sources = message.parts.find((part) => part.type === "data-sources")?.data.sources ?? [];
  const { parts, chips, length } = renderAnswer(text, sources, streaming);
  const status = streaming ? toolStatus(message.parts, locale) : undefined;
  const isDemo = message.metadata?.demo === true;

  // Where the text had got to on each render while it streamed. Each new
  // stretch mounts as its own span and fades in; spans already on screen keep
  // their keys and never animate again.
  const [boundaries, setBoundaries] = useState<number[]>([]);
  if (streaming && length > (boundaries.at(-1) ?? 0)) setBoundaries([...boundaries, length]);
  const chunks = splitIntoChunks(parts, boundaries);
  const fades = boundaries.length > 0;

  const [open, setOpen] = useState<number | null>(null);
  const opened = chips.find(({ number }) => number === open);
  const toggle = (number: number) => setOpen(open === number ? null : number);
  const labelOf = (number: number) => {
    const chip = chips.find((candidate) => candidate.number === number);
    return chip ? chipLabel(chip.source, names) : "";
  };

  return (
    <article
      className="flex w-fit max-w-[92%] min-w-0 flex-col gap-2 rounded-[20px] rounded-bl-[6px] bg-tint px-4 py-3"
      aria-label={t(locale, "answerLabel")}
    >
      {isDemo && (
        <p className="w-fit rounded-full border border-border px-2 text-xs font-semibold text-muted">
          {t(locale, "demo")}
        </p>
      )}
      {status && <StatusPill text={status} />}
      <p className="whitespace-pre-wrap break-words">
        {chunks.map((chunk) =>
          chunk.type === "text" ? (
            <span key={chunk.key} className={fades ? "answer-chunk" : undefined}>
              {chunk.text}
            </span>
          ) : (
            <button
              key={chunk.key}
              type="button"
              aria-label={t(locale, "citationLabel")(chunk.number, labelOf(chunk.number))}
              aria-expanded={open === chunk.number}
              aria-controls={claimId}
              onClick={() => toggle(chunk.number)}
              className={fades ? "citation answer-chunk" : "citation"}
            >
              {chunk.number}
            </button>
          ),
        )}
      </p>
      {!streaming && chips.length > 0 && (
        <ol aria-label={t(locale, "sourcesLabel")} className="flex flex-wrap gap-2">
          {chips.map(({ number, source }, index) => (
            <li
              key={source.id}
              className="chip-rise"
              // One after another, 80ms apart (DESIGN.md section 11).
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <button
                type="button"
                aria-expanded={open === number}
                aria-controls={claimId}
                onClick={() => toggle(number)}
                className="min-h-11 rounded-full border-[1.5px] border-border bg-field px-3 text-left text-[13px] font-medium break-words hover:border-accent"
              >
                {number} · {chipLabel(source, names)}
              </button>
            </li>
          ))}
        </ol>
      )}
      <div id={claimId}>{opened && <Claim number={opened.number} source={opened.source} />}</div>
      {!streaming && text.length > 0 && (
        <CopyButton text={answerAsText(text, chips, names, t(locale, "sourcesHeading"))} />
      )}
    </article>
  );
}

/** A claim opened from its number or chip: its text exactly as confirmed, and when Julian confirmed it. */
function Claim({ number, source }: { number: number; source: Source }) {
  const locale = useLocale();
  return (
    <div className="claim-open flex flex-col gap-1 rounded-[14px] border-[1.5px] border-border bg-field p-3">
      <p className="text-[12.5px] font-semibold text-accent">
        {number} · {chipLabel(source, t(locale, "sourceNames"))}
      </p>
      <p>{source.text}</p>
      <p className="text-[12.5px] text-muted">{confirmationLine(source, locale)}</p>
    </div>
  );
}

/** What the answer is doing, in words, with three bouncing dots (still with reduced motion). */
function StatusPill({ text }: { text: string }) {
  return (
    <p className="flex w-fit items-center gap-2 rounded-full bg-background px-3 py-1 text-[12.5px] font-medium text-muted">
      {text}
      <span aria-hidden="true" className="status-dots">
        <span />
        <span />
        <span />
      </span>
    </p>
  );
}

type CopyState = "idle" | "copied" | "failed";

/** Copies the answer as plain text with its sources; says whether it worked, then resets. */
function CopyButton({ text }: { text: string }) {
  const locale = useLocale();
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // No permission, no focus, or no clipboard at all: say so instead.
      setState("failed");
    }
  }

  const label = {
    idle: t(locale, "copy"),
    copied: t(locale, "copied"),
    failed: t(locale, "couldntCopy"),
  }[state];

  return (
    <div>
      <button
        type="button"
        onClick={copy}
        className="min-h-11 rounded-full border-[1.5px] border-border bg-field px-4 text-[13px] font-semibold hover:border-accent"
      >
        {label}
      </button>
      <span role="status" className="sr-only">
        {state === "idle" ? "" : label}
      </span>
    </div>
  );
}

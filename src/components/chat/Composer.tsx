import { type FormEvent, type KeyboardEvent, useId } from "react";
import { MAX_VISITOR_TEXT } from "../../lib/bot/limits";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
};

const numberFormat = new Intl.NumberFormat("en");

/** The question box: Enter sends, Shift+Enter adds a line, and a counter enforces the limit. */
export function Composer({ value, onChange, onSend, onStop, busy }: Props) {
  const inputId = useId();
  const counterId = useId();
  const length = value.length;
  const over = length - MAX_VISITOR_TEXT;
  const canSend = !busy && value.trim().length > 0 && over <= 0;

  const counterText =
    over > 0
      ? `${numberFormat.format(over)} characters over the ${numberFormat.format(MAX_VISITOR_TEXT)} limit`
      : `${numberFormat.format(length)} / ${numberFormat.format(MAX_VISITOR_TEXT)}`;
  const counterClass = over > 0 ? "text-danger" : "text-muted";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canSend) onSend();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        Your question
      </label>
      <textarea
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy}
        rows={3}
        aria-invalid={over > 0}
        aria-describedby={counterId}
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={counterId} className={`text-sm ${counterClass}`}>
          {counterText}
        </p>
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-lg border border-border px-4 py-1.5"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-lg border border-border px-4 py-1.5 disabled:text-muted"
          >
            Send
          </button>
        )}
      </div>
    </form>
  );
}

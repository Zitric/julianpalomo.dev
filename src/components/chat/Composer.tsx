import { type FormEvent, type KeyboardEvent, type Ref, useId } from "react";
import { MAX_VISITOR_TEXT } from "../../lib/bot/limits";
import { IconButton } from "../ui/IconButton";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFocus: () => void;
  onBlur: () => void;
  busy: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

const numberFormat = new Intl.NumberFormat("en");

/** The question box: Enter sends, Shift+Enter adds a line, and a counter enforces the limit. */
export function Composer({ value, onChange, onSend, onStop, onFocus, onBlur, busy, ref }: Props) {
  const inputId = useId();
  const counterId = useId();
  const length = value.length;
  const over = length - MAX_VISITOR_TEXT;
  const canSend = !busy && value.trim().length > 0 && over <= 0;

  const counterText =
    over > 0
      ? `${numberFormat.format(over)} ${over === 1 ? "character" : "characters"} over the ${numberFormat.format(MAX_VISITOR_TEXT)} limit`
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
      <label htmlFor={inputId} className="text-[12.5px] font-semibold text-muted">
        Your question
      </label>
      {/* The box, not the textarea, shows focus: its border turns accent with a
          glow, in place of the outline ring. */}
      <div className="flex items-end gap-2 rounded-[24px] border-2 border-field-border bg-field p-1.5 pl-4 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/22">
        {/* readOnly, not disabled, while an answer streams: a disabled field drops
            keyboard focus to the page, and Send is blocked by canSend anyway.
            The transparent outline is what Windows high-contrast mode paints
            when it drops the glow. */}
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={busy}
          rows={2}
          aria-invalid={over > 0}
          aria-describedby={counterId}
          className="min-w-0 flex-1 resize-none self-center bg-transparent py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-transparent"
        />
        {busy ? (
          <IconButton look="accent" label="Stop" onClick={onStop}>
            <StopIcon />
          </IconButton>
        ) : (
          <IconButton look="accent" label="Send" type="submit" disabled={!canSend}>
            <SendIcon />
          </IconButton>
        )}
      </div>
      <p id={counterId} className={`text-[12.5px] ${counterClass}`}>
        {counterText}
      </p>
    </form>
  );
}

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  );
}

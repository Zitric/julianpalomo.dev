import {
  type FormEvent,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MAX_VISITOR_TEXT } from "../../lib/bot/limits";
import { t } from "../../lib/i18n/t";
import { useLocale } from "../i18n/useLocale";
import { IconButton } from "../ui/IconButton";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFocus: () => void;
  onBlur: () => void;
  busy: boolean;
  /** No more questions today: the box is disabled and says when they're back. */
  closed: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

// The box grows with the text up to this many lines, then scrolls.
const MAX_LINES = 6;
// The counter appears this close to the limit (DESIGN.md section 10).
const COUNTER_FROM = 900;

/**
 * The question box: it grows to 6 lines, Enter sends, Shift+Enter adds a
 * line, Escape stops a streaming answer, and a counter near the limit blocks
 * a question that's too long. Below 1024px it's fixed to the bottom, above
 * the on-screen keyboard.
 */
export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  onFocus,
  onBlur,
  busy,
  closed,
  ref,
}: Props) {
  const locale = useLocale();
  const inputId = useId();
  const counterId = useId();
  const hintId = useId();
  const box = useRef<HTMLTextAreaElement | null>(null);
  const keyboard = useKeyboardInset();

  // The textarea's own ref and the caller's, which Chat uses to give focus back.
  const setRefs = (element: HTMLTextAreaElement | null) => {
    box.current = element;
    if (typeof ref === "function") ref(element);
    else if (ref) ref.current = element;
  };

  // Grow with the text, measured after each change and before the browser paints.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the height follows the value.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const line = Number.parseFloat(getComputedStyle(element).lineHeight) || 24;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, line * MAX_LINES + 16)}px`;
  }, [value]);
  const length = value.length;
  const over = length - MAX_VISITOR_TEXT;
  const canSend = !busy && !closed && value.trim().length > 0 && over <= 0;

  const counterText =
    over > 0
      ? t(locale, "counterOver")(over, MAX_VISITOR_TEXT)
      : t(locale, "counter")(length, MAX_VISITOR_TEXT);
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
    if (event.key === "Escape" && busy) {
      event.preventDefault();
      onStop();
    }
  }

  const showCounter = length >= COUNTER_FROM;
  const describedBy = showCounter ? `${hintId} ${counterId}` : hintId;

  return (
    <form
      onSubmit={submit}
      // Below 1024px the form is fixed to the bottom; on a keyboard that
      // overlays the page (iOS Safari) it moves up by what the keyboard covers.
      style={{ bottom: keyboard }}
      className="enter-chat-later flex flex-col gap-2 max-lg:fixed max-lg:inset-x-0 max-lg:z-30 max-lg:border-t-2 max-lg:border-border max-lg:bg-background max-lg:px-4 max-lg:pt-3 max-lg:pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:max-lg:px-6"
    >
      {/* Fixed to the bottom of a phone, the box speaks for itself: the label
          stays as its accessible name, hidden to save height. */}
      <label htmlFor={inputId} className="text-[12.5px] font-semibold text-muted max-lg:sr-only">
        {t(locale, "questionLabel")}
      </label>
      {/* The box, not the textarea, shows focus: its border turns accent with a
          glow, in place of the outline ring. */}
      <div className="flex items-end gap-2 rounded-[24px] border-2 border-field-border bg-field p-1.5 pl-4 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/22">
        {/* readOnly, not disabled, while an answer streams: a disabled field drops
            keyboard focus to the page, and Send is blocked by canSend anyway.
            The transparent outline is what Windows high-contrast mode paints
            when it drops the glow. */}
        <textarea
          ref={setRefs}
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={busy}
          disabled={closed}
          placeholder={closed ? t(locale, "questionsBackTomorrow") : undefined}
          rows={1}
          aria-invalid={over > 0}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 resize-none self-center bg-transparent py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-transparent"
        />
        {busy ? (
          <IconButton look="accent" label={t(locale, "stop")} onClick={onStop}>
            <StopIcon />
          </IconButton>
        ) : (
          <IconButton look="accent" label={t(locale, "send")} type="submit" disabled={!canSend}>
            <SendIcon />
          </IconButton>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        {/* Touch screens have no Enter or Shift, so the hint is hidden there. */}
        <p id={hintId} className="text-muted [@media(hover:none)]:hidden">
          {t(locale, "composerHint")}
        </p>
        {showCounter && (
          <p id={counterId} className={`ml-auto ${counterClass}`}>
            {counterText}
          </p>
        )}
      </div>
    </form>
  );
}

/**
 * How many pixels an on-screen keyboard covers at the bottom of the page.
 * Chrome on Android shrinks the page instead (`interactive-widget` in the
 * viewport meta), so this stays 0 there; iOS Safari overlays its keyboard,
 * and the visual viewport says by how much.
 */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
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

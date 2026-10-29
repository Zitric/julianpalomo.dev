type Props = {
  /** The list's accessible name. */
  label: string;
  /** A visible heading above the questions, such as "Keep asking". */
  heading?: string;
  questions: readonly string[];
  /** `from` is where the chip was on screen, so the bubble can fly in from it. */
  onPick: (question: string, from: DOMRect) => void;
};

/** Questions to start with, or to keep asking, sent as an ordinary message. */
export function Suggestions({ label, heading, questions, onPick }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {heading && <p className="text-[12.5px] font-semibold text-muted">{heading}</p>}
      <ul aria-label={label} className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={(event) => onPick(question, event.currentTarget.getBoundingClientRect())}
              className="min-h-11 rounded-full border-[1.5px] border-border bg-field px-4 py-2 text-left text-sm font-medium hover:border-accent"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

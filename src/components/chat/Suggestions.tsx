const SUGGESTIONS = [
  "What did Julian do at Cazoo?",
  "What is Form:at?",
  "Is Julian open to remote work?",
] as const;

type Props = { onPick: (question: string) => void };

/** Questions to start with, sent as an ordinary message. */
export function Suggestions({ onPick }: Props) {
  return (
    <ul aria-label="Suggested questions" className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((question) => (
        <li key={question}>
          <button
            type="button"
            onClick={() => onPick(question)}
            className="min-h-11 rounded-full border-[1.5px] border-border bg-field px-4 py-2 text-left text-sm font-medium hover:border-accent"
          >
            {question}
          </button>
        </li>
      ))}
    </ul>
  );
}

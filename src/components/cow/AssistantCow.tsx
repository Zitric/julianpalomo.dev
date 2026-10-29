import { useEffect, useState } from "react";
import { type CowState, LICK_MS } from "../../lib/cow-state";
import { t } from "../../lib/i18n/t";
import { assistantCow as cow } from "../../lib/scene/palette";
import { useLocale } from "../i18n/useLocale";

type Props = {
  state: CowState;
  /** Width in px: 132 on the chat's edge, 66 on the link preview card and the icons. */
  size: 132 | 66;
  /** The chat's cow animates; the link preview card's and the icons' are still and hidden. */
  animated: boolean;
  /** Called on every pat; the caller decides whether to moo. */
  onMoo?: () => void;
};

const mooBubble =
  "pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-full border-[1.5px] border-border bg-field px-2.5 py-0.5 font-display text-[13px] font-bold whitespace-nowrap text-foreground opacity-0 group-hover:opacity-100 motion-safe:translate-y-1 motion-safe:transition motion-safe:duration-200 motion-safe:group-hover:translate-y-0";

/**
 * The assistant, a Highland cow (DESIGN.md section 9). Its animations live in
 * src/styles/cow.css, keyed by `data-state` and `data-pat`; only an animated
 * cow gets them.
 */
export function AssistantCow({ state, size, animated, onMoo }: Props) {
  const locale = useLocale();
  const [patting, setPatting] = useState(false);

  useEffect(() => {
    if (!patting) return;
    const timer = setTimeout(() => setPatting(false), LICK_MS);
    return () => clearTimeout(timer);
  }, [patting]);

  if (!animated) {
    return (
      <span aria-hidden="true" data-state={state} className="cow inline-flex shrink-0">
        <CowDrawing size={size} />
      </span>
    );
  }

  function pat() {
    onMoo?.();
    // While it talks, a lick would cover the open mouth.
    if (state !== "talking") setPatting(true);
  }

  return (
    <button
      type="button"
      aria-label={t(locale, "patTheCow")}
      data-state={state}
      data-pat={patting ? "" : undefined}
      onClick={pat}
      className="cow cow-live group relative inline-flex shrink-0 cursor-pointer rounded-[14px]"
    >
      <span aria-hidden="true" className={mooBubble}>
        {t(locale, "moo")}
      </span>
      <CowDrawing size={size} />
    </button>
  );
}

/**
 * The approved drawing from docs/design/assistant-cow.svg: the same paths, in
 * the same order, in the same groups. Never redraw or simplify it;
 * tests/unit/assistant-cow.test.ts checks it against the reference.
 */
function CowDrawing({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="5 26 190 150"
      width={size}
      height={Math.round((size * 150) / 190)}
    >
      <g className="tilt">
        <g transform="translate(0 16)">
          <path
            d="M74 60 L42 58 Q32 57 28 48 L15 20 Q13 16 12 21 L20 56 Q24 74 42 74 L72 78 Z"
            fill={cow.horn}
          />
          <path
            d="M126 60 L158 58 Q168 57 172 48 L185 20 Q187 16 188 21 L180 56 Q176 74 158 74 L128 78 Z"
            fill={cow.horn}
          />
          <path
            d="M68 61 L44 60 Q34 59 30 50 L19 26"
            fill="none"
            stroke={cow["horn-hi"]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M132 61 L156 60 Q166 59 170 50 L181 26"
            fill="none"
            stroke={cow["horn-hi"]}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <path
          d="M68 80 C 50 76 36 88 40 102 C 42 110 46 104 48 114 C 52 106 56 116 60 108 C 64 114 68 104 72 102 Z"
          fill={cow.ear}
        />
        <path
          d="M132 80 C 150 76 164 88 160 102 C 158 110 154 104 152 114 C 148 106 144 116 140 108 C 136 114 132 104 128 102 Z"
          fill={cow.ear}
        />
        <path
          d="M64 78 C 72 64 128 64 136 78 C 142 98 138 118 128 136 C 120 150 80 150 72 136 C 62 118 58 98 64 78 Z"
          fill={cow.face}
        />
        <path d="M75 139 L71 144 L79 143 Z M125 139 L129 144 L121 143 Z" fill={cow.face} />
        <g className="jaw">
          <path
            d="M90 155 L93 164 L97 159 L100 167 L103 159 L107 164 L110 155 C 104 159 96 159 90 155 Z"
            fill={cow.face}
          />
          <path
            d="M84 140 C 90 148 110 148 116 140 C 118 152 110 158 100 158 C 90 158 82 152 84 140 Z"
            fill={cow.chin}
          />
        </g>
        <path
          d="M54 92 C 52 82 55 75 59 71 L57 67 L65 66 C 67 61 71 58 75 56 L74 53 L82 53 C 85 50 89 49 93 49 L94 46 L100 48 C 104 46 108 47 112 49 L116 47 L118 51 C 123 53 127 57 131 61 L137 61 L137 67 C 142 72 146 80 146 92 C 146 100 142 106 138 110 L62 110 C 58 106 54 100 54 92 Z"
          fill={cow.fringe}
        />
        <path d="M84 54 C 82 50 79 49 75 49 C 78 51 80 53 80 57 Z" fill={cow["fringe-hi"]} />
        <path d="M112 52 C 113 48 116 46 120 46 C 117 48 116 51 116 55 Z" fill={cow["fringe-hi"]} />
        <path d="M98 50 C 97 46 98 43 101 41 C 100 44 101 47 103 49 Z" fill={cow.fringe} />
        <path d="M66 64 C 63 62 60 62 57 63 C 60 64 61 66 62 69 Z" fill={cow.fringe} />
        <path d="M134 62 C 137 60 140 60 143 62 C 140 63 139 65 138 68 Z" fill={cow.fringe} />
        <path d="M52 86 C 50 98 50 106 43 116 C 56 112 60 102 62 92 Z" fill={cow["fringe-hi"]} />
        <path
          d="M148 86 C 150 98 150 106 157 116 C 144 112 140 102 138 92 Z"
          fill={cow["fringe-hi"]}
        />
        <path d="M58 78 C 56 94 58 104 51 115 C 63 111 67 100 69 86 Z" fill={cow.fringe} />
        <path d="M64 68 C 62 90 64 102 57 116 C 69 111 73 98 75 76 Z" fill={cow["fringe-hi"]} />
        <path d="M73 60 C 71 86 75 104 66 122 C 81 115 85 96 85 64 Z" fill={cow.fringe} />
        <path d="M82 55 C 82 82 86 102 92 124 C 96 104 96 82 95 55 Z" fill={cow["fringe-hi"]} />
        <path d="M92 53 C 90 80 94 104 84 128 C 101 119 105 94 105 54 Z" fill={cow.fringe} />
        <path
          d="M100 53 C 102 82 104 104 117 126 C 117 102 114 78 113 54 Z"
          fill={cow["fringe-hi"]}
        />
        <path d="M110 54 C 110 82 114 102 108 122 C 123 111 125 86 123 57 Z" fill={cow.fringe} />
        <path
          d="M120 59 C 122 86 124 104 135 120 C 135 98 134 82 131 64 Z"
          fill={cow["fringe-hi"]}
        />
        <path d="M128 66 C 132 88 136 100 147 112 C 145 94 142 82 139 72 Z" fill={cow.fringe} />
        <path d="M98 58 C 90 72 80 86 69 92 C 86 92 97 80 104 63 Z" fill={cow["fringe-hi"]} />
        <path d="M106 58 C 112 70 121 78 132 80 C 123 72 117 63 112 56 Z" fill={cow["fringe-hi"]} />
        <path d="M66 122 C 62 125 58 125 54 122 C 58 121 61 119 63 116 Z" fill={cow.fringe} />
        <path d="M84 128 C 81 132 77 133 73 131 C 77 129 79 126 80 122 Z" fill={cow["fringe-hi"]} />
        <path d="M92 124 C 95 129 99 130 103 129 C 99 127 97 124 96 120 Z" fill={cow.fringe} />
        <path
          d="M117 126 C 121 129 125 129 129 127 C 125 126 122 123 121 119 Z"
          fill={cow["fringe-hi"]}
        />
        <path
          d="M108 122 C 105 126 101 127 97 126 C 101 124 103 121 104 117 Z"
          fill={cow["fringe-hi"]}
        />
        <path
          d="M135 120 C 133 124 129 126 125 125 C 129 123 131 120 132 116 Z"
          fill={cow.fringe}
        />
        <path
          d="M147 112 C 151 115 155 115 159 113 C 155 112 152 110 150 106 Z"
          fill={cow["fringe-hi"]}
        />
        <path
          d="M62 80 C 60 94 60 104 56 112 M77 70 C 76 90 77 102 72 115 M89 64 C 89 86 91 102 90 117 M118 66 C 119 86 121 102 126 115 M135 76 C 137 90 139 100 143 108 M98 64 C 92 76 84 86 76 90"
          fill="none"
          stroke={cow.strand}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M78 122 C 78 110 122 110 122 122 C 124 136 114 143 100 143 C 86 143 76 136 78 122 Z"
          fill={cow.muzzle}
        />
        <path
          d="M86 121 C 86 114 114 114 114 121 C 116 129 108 133 100 133 C 92 133 84 129 86 121 Z"
          fill={cow.pad}
        />
        <path
          d="M89 124 q4 -4 8 0"
          fill="none"
          stroke={cow.nostril}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M103 124 q4 -4 8 0"
          fill="none"
          stroke={cow.nostril}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <g className="jaw">
          <path
            d="M89 146 Q100 150 111 146"
            fill="none"
            stroke={cow.strand}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
        <g className="talk" opacity="0">
          <path d="M88 145 C 92 158 108 158 112 145 C 106 148 94 148 88 145 Z" fill={cow.mouth} />
          <path d="M92 151 C 96 156 104 156 108 151 C 104 149 96 149 92 151 Z" fill={cow.tongue} />
        </g>
        <g className="licks">
          <g className="lick-mouth" opacity="0">
            <path d="M90 145 C 94 154 106 154 110 145 C 104 148 96 148 90 145 Z" fill={cow.mouth} />
          </g>
          <g className="lick-r" transform="scale(0)">
            <path
              d="M100 146 C 110 148 122 143 128 131 C 135 135 135 150 123 156 C 112 161 102 156 98 150 Z"
              fill={cow.tongue}
            />
            <path
              d="M103 150 C 112 151 121 146 127 137"
              fill="none"
              stroke={cow["tongue-dark"]}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
          <g className="lick-l" transform="scale(0)">
            <path
              d="M100 146 C 90 148 78 143 72 131 C 65 135 65 150 77 156 C 88 161 98 156 102 150 Z"
              fill={cow.tongue}
            />
            <path
              d="M97 150 C 88 151 79 146 73 137"
              fill="none"
              stroke={cow["tongue-dark"]}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}

import { type CSSProperties, useEffect, useId, useRef } from "react";
import { t } from "../../lib/i18n/t";
import { momentAt, type PanelControl, panelSky } from "../../lib/scene/play";
import type { Season } from "../../lib/scene/season";
import type { SkyState } from "../../lib/scene/sky-state";
import { useNow } from "../clock/Clock";
import { useLocale } from "../i18n/useLocale";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { usePlay } from "./Play";

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

type Props = {
  open: boolean;
  /** Where the popover sits from 1024px, under the gear; the sheet below that ignores it. */
  position: { top: number; left: number } | null;
  /** The live sky on screen: the controls show it until the first change starts playing from it. */
  live: SkyState;
  onClose: () => void;
};

/**
 * The gear's panel (DESIGN.md section 8): a native modal <dialog>, so focus
 * stays inside while it's open, Escape closes it, and focus goes back to the
 * gear or the chip that opened it. The backdrop is clear, so the visitor
 * watches the sky change as they play.
 */
export function SkyPanel({ open, position, live, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const locale = useLocale();
  const now = useNow();
  const { state, dispatch } = usePlay();
  // Opening the panel changes nothing: it shows the live sky, read afresh on
  // every render, and the first change starts playing from it.
  const controls = state.status === "playing" ? state : panelSky(live);
  const change = (control: PanelControl) => dispatch({ ...control, from: live });

  // The dialog is outside React's model: opening and closing it is syncing
  // with the DOM.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const place = position
    ? ({
        "--panel-top": `${position.top}px`,
        "--panel-left": `${position.left}px`,
      } as CSSProperties)
    : undefined;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes a modal <dialog> natively.
    <dialog
      ref={ref}
      className="sky-panel"
      aria-labelledby={titleId}
      style={place}
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself; clicks inside land
      // on its content. Keyboards close it with Escape, which the modal dialog
      // handles natively.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="font-display text-xl font-extrabold">
                {t(locale, "playWithTheSky")}
              </h2>
              <p className="text-[13px] text-muted">{t(locale, "playSubtitle")}</p>
            </div>
            <IconButton look="tint" label={t(locale, "close")} onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>

          <SeasonPicker
            value={controls.season}
            onChange={(season) => change({ type: "season", season })}
          />

          <Slider
            label={t(locale, "timeOfDay")}
            track="track-time"
            min={0}
            max={23}
            value={controls.hour}
            word={timeLabel(controls.hour, t(locale, "moments")[momentAt(controls, now)])}
            onChange={(hour) => change({ type: "hour", hour })}
          />
          <LevelSlider
            label={t(locale, "cloudsLabel")}
            track="track-clouds"
            words={t(locale, "weatherClouds")}
            value={controls.clouds}
            onChange={(value) => change({ type: "level", level: "clouds", value })}
          />
          <LevelSlider
            label={t(locale, controls.snow ? "snowLabel" : "rainLabel")}
            track="track-rain"
            words={t(locale, controls.snow ? "weatherSnowLevels" : "weatherRain")}
            value={controls.rain}
            onChange={(value) => change({ type: "level", level: "rain", value })}
          />
          <LevelSlider
            label={t(locale, "windLabel")}
            track="track-wind"
            words={t(locale, "weatherWind")}
            value={controls.wind}
            onChange={(value) => change({ type: "level", level: "wind", value })}
          />

          <div className="flex flex-col gap-2">
            <Switch
              label={t(locale, "snowInsteadOfRain")}
              on={controls.snow}
              onChange={(on) => change({ type: "switch", name: "snow", on })}
            />
            <Switch
              label={t(locale, "weatherHaar")}
              on={controls.haar}
              onChange={(on) => change({ type: "switch", name: "haar", on })}
            />
          </div>

          {/* A sticky footer: the way back stays in view while the controls
              above it scroll inside the sheet. */}
          <div className="sticky bottom-0 -mx-5 -mb-5 border-t-2 border-border bg-background px-5 pt-3 pb-5">
            <Button
              look="primary"
              onClick={() => {
                dispatch({ type: "backToLive" });
                onClose();
              }}
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-live" />
              {t(locale, "backToLive")}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** "15:00 · day": the slider's hour on a 24-hour clock, then the moment. */
function timeLabel(hour: number, moment: string): string {
  return `${String(hour).padStart(2, "0")}:00 · ${moment}`;
}

function SeasonPicker({ value, onChange }: { value: Season; onChange: (season: Season) => void }) {
  const locale = useLocale();
  const names = t(locale, "seasons");
  const name = useId();

  // Native radios: one tab stop, and the arrow keys move and choose. Each one
  // is hidden behind its pill, which shows its focus.
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[12.5px] font-semibold text-muted">
        {t(locale, "seasonLabel")}
      </legend>
      <div className="grid grid-cols-4 gap-1 rounded-full bg-tint p-1">
        {SEASONS.map((season) => {
          const look =
            season === value ? "bg-accent text-on-accent" : "text-foreground hover:bg-background";
          return (
            <label
              key={season}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-full px-2 text-[13px] font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${look}`}
            >
              <input
                type="radio"
                name={name}
                value={season}
                checked={season === value}
                onChange={() => onChange(season)}
                className="sr-only"
              />
              {names[season]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type SliderProps = {
  label: string;
  track: string;
  min: number;
  max: number;
  value: number;
  /** What the value means, shown and read out (`aria-valuetext`). */
  word: string;
  /** The words at both ends of the track, when they help. */
  ends?: [string, string];
  onChange: (value: number) => void;
};

function Slider({ label, track, min, max, value, word, ends, onChange }: SliderProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[12.5px] font-semibold text-muted">
          {label}
        </label>
        <span className="text-[13px] font-semibold">{word}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-valuetext={word}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`sky-range ${track}`}
      />
      {ends && (
        <div className="flex justify-between text-[12px] text-muted">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
    </div>
  );
}

type LevelSliderProps = {
  label: string;
  track: string;
  /** One word per level, 0 to 10. */
  words: string[];
  value: number;
  onChange: (value: number) => void;
};

function LevelSlider({ label, track, words, value, onChange }: LevelSliderProps) {
  const ends: [string, string] = [words[0] ?? "", words.at(-1) ?? ""];
  return (
    <Slider
      label={label}
      track={track}
      min={0}
      max={10}
      value={value}
      word={words[value] ?? ""}
      ends={ends}
      onChange={onChange}
    />
  );
}

function Switch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const knob = on ? "translate-x-5 bg-on-accent" : "bg-field-border";
  const track = on ? "bg-accent" : "bg-tint";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-11 items-center justify-between gap-3 text-left text-[14px] font-medium"
    >
      {label}
      <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full ${track}`}>
        <span
          className={`absolute top-1 left-1 size-4 rounded-full motion-safe:transition-transform ${knob}`}
        />
      </span>
    </button>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

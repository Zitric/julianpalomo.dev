import { createFileRoute, getRouteApi, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import { CompactBar } from "../../components/bar/CompactBar";
import { Chat } from "../../components/chat/Chat";
import { useNow } from "../../components/clock/Clock";
import { Entrance } from "../../components/entrance/Entrance";
import { HeroBubble } from "../../components/entrance/HeroBubble";
import { LanguageToggle } from "../../components/i18n/LanguageToggle";
import { useLocale } from "../../components/i18n/useLocale";
import { HeroLandscape } from "../../components/landscape/HeroLandscape";
import { useLiveWeather } from "../../components/landscape/useLiveWeather";
import { useSceneOverride } from "../../components/landscape/useSceneOverride";
import { WeatherChip } from "../../components/landscape/WeatherChip";
import { Gear } from "../../components/play/Gear";
import { usePlay } from "../../components/play/Play";
import { SkyPanel } from "../../components/play/SkyPanel";
import { SiteFooter } from "../../components/SiteFooter";
import { ThemeToggle } from "../../components/theme/ThemeToggle";
import { localeFromParam } from "../../lib/i18n/locale";
import { rootLanguage } from "../../lib/i18n/root-language";
import { t } from "../../lib/i18n/t";
import { defaultSky, withWeather } from "../../lib/scene/sky-state";
import { shareHead } from "../../lib/share";

// `/` is English and `/es` is Spanish: one route, so switching language keeps
// the page, and the conversation in it, mounted. Any other first segment is a
// 404.
export const Route = createFileRoute("/{-$locale}/")({
  params: {
    parse: ({ locale }) => (locale === undefined || locale === "es" ? { locale } : false),
  },
  // `?sky=` sets the landscape on previews and in e2e (SCENE_OVERRIDE).
  validateSearch: z.object({ sky: z.string().optional().catch(undefined) }),
  beforeLoad: ({ params }) => {
    if (params.locale !== undefined || rootLanguage() !== "es") return;
    // 302, never cached: it depends on the visitor's cookie and country. The
    // query string comes along, so a shared link keeps its parameters.
    throw redirect({
      to: "/{-$locale}",
      params: { locale: "es" },
      search: true,
      statusCode: 302,
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  },
  head: ({ params }) => shareHead(localeFromParam(params.locale)),
  component: Home,
});

// One column on mobile. From lg, a four-column grid: two gutters and, centred
// between them, the intro (300px) and the chat, at most 1120px together. The
// header spans every column on a subgrid, so the hero runs edge to edge in its
// first row and the intro sits in the second row's left column, while main
// takes the second row's right column beside it.
// Below 1024px the composer is fixed to the bottom, so the page ends with room for it.
const page = "pb-12 max-lg:pb-44 lg:grid lg:grid-cols-[1fr_300px_minmax(0,772px)_1fr] lg:gap-x-12";
const header =
  "lg:col-span-full lg:row-span-2 lg:row-start-1 lg:grid lg:grid-cols-subgrid lg:grid-rows-subgrid";
const portrait =
  "ml-1 -mt-[60px] h-[120px] w-24 -scale-x-100 rounded-[26px] ring-4 ring-background [image-rendering:pixelated] sm:ml-0 lg:-mt-[75px] lg:h-[150px] lg:w-[120px] lg:rounded-[32px] lg:ring-[6px]";
// From lg the chat is a card whose top edge the cow rests on (Chat draws the
// border), so it starts low enough for the cow and its heading above it.
const chatCard =
  "scroll-mt-[58px] px-4 pt-8 sm:px-6 lg:col-start-3 lg:row-start-2 lg:mt-10 lg:self-start lg:px-0 lg:pt-0";

const rootRoute = getRouteApi("__root__");

type PanelState = { open: boolean; position: { top: number; left: number } | null };

function Home() {
  const locale = useLocale();
  // Read once by Entrance, when the page mounts, so a language switch never replays it.
  const { entrance } = rootRoute.useLoaderData();
  const heroRef = useRef<HTMLDivElement>(null);
  const { sky } = Route.useSearch();
  const override = useSceneOverride(sky);
  // An override is a fixed scene, so it doesn't wait for the real weather.
  const weather = useLiveWeather(override === null);
  const now = useNow();
  const { state: play, dispatch } = usePlay();
  const [panel, setPanel] = useState<PanelState>({ open: false, position: null });

  // After the first question a phone gets the compact bar, and the page
  // scrolls so the chat fills the screen under it. The chat is at least a
  // screen tall from then on: with only a greeting and a question there'd be
  // too little page below it to scroll it up to the bar.
  const [started, setStarted] = useState(false);
  const chatRef = useRef<HTMLElement>(null);
  function start() {
    setStarted(true);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => chatRef.current?.scrollIntoView({ block: "start" }));
    }
  }

  // The gear and the chip open the panel; playing starts from the sky on
  // screen, and the popover sits under whichever was pressed.
  function openPanel(trigger: HTMLElement) {
    dispatch({ type: "play", from: override ?? withWeather(defaultSky(now), weather) });
    const { bottom, left } = trigger.getBoundingClientRect();
    setPanel({ open: true, position: { top: bottom + 8, left } });
  }

  return (
    <Entrance kind={entrance} greeting={t(locale, "greeting")} hero={heroRef} className={page}>
      <header className={header}>
        <div
          ref={heroRef}
          className="relative h-[230px] overflow-hidden bg-tint lg:col-span-full lg:h-80"
        >
          <HeroLandscape override={override} weather={weather} />
          <HeroBubble />
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Gear onOpen={openPanel} />
              <div className="enter-control enter-control-1">
                <WeatherChip
                  weather={weather}
                  playingHour={play.status === "playing" ? play.hour : null}
                  onOpen={openPanel}
                  onBackToLive={() => dispatch({ type: "backToLive" })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="enter-control enter-control-2">
                <LanguageToggle />
              </div>
              <div className="enter-control enter-control-3">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col px-4 sm:px-6 lg:col-start-2 lg:px-0">
          <img
            src="/images/julian.png"
            alt={t(locale, "portraitAlt")}
            width={96}
            height={120}
            className={`enter-portrait ${portrait}`}
          />
          <h1 className="enter-intro enter-intro-1 mt-4 font-display text-[34px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[44px]">
            {t(locale, "name")}
          </h1>
          <p className="enter-intro enter-intro-2 mt-1 font-display text-lg font-bold text-accent lg:text-xl">
            {t(locale, "role")}
          </p>
          <p className="enter-intro enter-intro-3 mt-3 text-muted">{t(locale, "intro")}</p>
        </div>
      </header>
      {started && <CompactBar />}
      <main
        ref={chatRef}
        className={started ? `${chatCard} max-lg:min-h-[calc(100dvh-58px)]` : chatCard}
      >
        <Chat onStarted={start} />
      </main>
      <SiteFooter className="lg:col-start-2 lg:col-end-4 lg:px-0" />
      <SkyPanel
        open={panel.open}
        position={panel.position}
        onClose={() => setPanel((current) => ({ ...current, open: false }))}
      />
    </Entrance>
  );
}

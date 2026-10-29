/**
 * The card for link previews and the cow for the icons, drawn with the site's
 * own components (DESIGN.md, "Sharing"). `?card=en` or `?card=es` shows a
 * language's 1200 × 630 card; `?icon` shows the cow alone. Only `pnpm og`
 * opens this page (generate.ts); it never reaches the site's bundle.
 */
import "../../src/styles/app.css";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AssistantCow } from "../../src/components/cow/AssistantCow";
import { useLocale } from "../../src/components/i18n/useLocale";
import { Landscape } from "../../src/components/landscape/Landscape";
import { t } from "../../src/lib/i18n/t";
import { glasgowElevation } from "../../src/lib/scene/moment";
import type { SkyState } from "../../src/lib/scene/sky-state";

// A fixed day in the middle of autumn, so the image is the same every run.
const DAY = Date.UTC(2026, 9, 15);
// A warm autumn afternoon: the first minute the sun sinks to 8° over Glasgow
// (17:10), low enough to warm the light, high enough to keep the sky bright.
const AT = afternoonMinute();
const SKY: SkyState = {
  season: "autumn",
  at: new Date(AT),
  clouds: 0,
  rain: 0,
  wind: 0,
  snow: false,
  haar: false,
};

function afternoonMinute(): number {
  for (let minute = 12 * 60; minute < 21 * 60; minute++) {
    const at = DAY + minute * 60_000;
    if (glasgowElevation(at) <= 8) return at;
  }
  throw new Error("The sun never sinks to 8° on the card's day");
}

/** A language's preview card: the glen, the portrait, the name and role, and the cow asking. */
function Card() {
  const locale = useLocale();
  return (
    <div className="relative h-[630px] w-[1200px] overflow-hidden bg-background text-foreground">
      <div className="absolute inset-x-0 top-0 h-[360px]">
        <Landscape sky={SKY} at={AT} choreography={null} paused />
      </div>
      <img
        src="/images/julian.png"
        alt=""
        width={176}
        height={220}
        className="absolute top-[250px] left-[64px] h-[220px] w-[176px] -scale-x-100 rounded-[48px] ring-[10px] ring-background [image-rendering:pixelated]"
      />
      <div className="absolute top-[388px] left-[272px]">
        <p className="font-display text-[76px] leading-none font-extrabold tracking-[-0.02em]">
          {t(locale, "name")}
        </p>
        <p className="mt-4 font-display text-[38px] font-bold text-accent">{t(locale, "role")}</p>
      </div>
      <div className="absolute right-[56px] bottom-[32px] flex flex-col items-end gap-3">
        <p className="max-w-[340px] rounded-[24px] rounded-br-[8px] border-2 border-border bg-field px-5 py-3 font-display text-[24px] leading-tight font-bold">
          {t(locale, "ogBubble")}
        </p>
        {/* The cow comes in two sizes for the chat; here it's scaled up, still. */}
        <div className="h-[125px] w-[158px]">
          <div className="origin-top-left scale-[2.4]">
            <AssistantCow state="idle" size={66} animated={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

const params = new URLSearchParams(window.location.search);
const icon = params.has("icon");

const router = createRouter({
  routeTree: createRootRoute({
    component: () => (icon ? <AssistantCow state="idle" size={66} animated={false} /> : <Card />),
  }),
  // The cow and the copy read the language from the path, as on the site.
  history: createMemoryHistory({ initialEntries: [params.get("card") === "es" ? "/es" : "/"] }),
});

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

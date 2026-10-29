import bricolageUrl from "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url";
import interUrl from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ClockProvider } from "../components/clock/Clock";
import { useLocale } from "../components/i18n/useLocale";
import { PlayProvider } from "../components/play/Play";
import { ThemeDocument } from "../components/theme/Theme";
import { getFirstRender } from "../lib/first-render";
import { pageTitle } from "../lib/site";
import appCss from "../styles/app.css?url";

export const Route = createRootRoute({
  loader: () => getFirstRender(),
  // The HTML depends on the visitor's cookies (theme, language) and the time,
  // so no cache may keep it and serve it to someone else.
  headers: () => ({ "Cache-Control": "private, no-store", Vary: "Cookie" }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // resizes-content: Chrome on Android shrinks the page above its keyboard,
      // so the composer fixed to the bottom stays in view.
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, interactive-widget=resizes-content",
      },
      { title: pageTitle() },
    ],
    links: [
      // The first screen needs both fonts (the name, and the body text), so
      // they start downloading with the HTML. Same files as src/styles/fonts.css.
      {
        rel: "preload",
        href: bricolageUrl,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "preload", href: interUrl, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
});

// No script in <head>: the server renders data-theme from the cookie or
// Glasgow's sun (docs/adr/2026-10-28-visual-direction.md).
function RootDocument({ children }: { children: ReactNode }) {
  const { choice, now } = Route.useLoaderData();
  const locale = useLocale();
  return (
    <ClockProvider start={now}>
      <PlayProvider>
        <ThemeDocument initialChoice={choice} lang={locale}>
          <head>
            <HeadContent />
          </head>
          <body className="bg-background text-[15.5px] leading-[1.55] text-foreground antialiased">
            {children}
            <Scripts />
          </body>
        </ThemeDocument>
      </PlayProvider>
    </ClockProvider>
  );
}

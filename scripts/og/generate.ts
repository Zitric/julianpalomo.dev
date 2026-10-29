/**
 * `pnpm og`: writes the link preview images and the icons into public/ from
 * the card page next to this file (DESIGN.md, "Sharing"). It serves that page
 * with Vite and its own minimal config, so the site's build and its plugins
 * play no part, and screenshots it in Playwright's Chromium. Rerun it when
 * the name or the role in src/lib/site.ts changes, and commit the files.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "@playwright/test";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const PORT = 5188;
const root = fileURLToPath(new URL("../..", import.meta.url));
const publicPath = (name: string) =>
  fileURLToPath(new URL(`../../public/${name}`, import.meta.url));

const server = await createServer({
  root,
  configFile: false,
  logLevel: "warn",
  plugins: [react(), tailwindcss()],
  server: { port: PORT, strictPort: true },
});
await server.listen();
const page = `http://localhost:${PORT}/scripts/og/index.html`;
const browser = await chromium.launch();

try {
  // Reduced motion and loaded fonts: the scene holds still and the text is
  // never in a fallback font, so two runs give the same images.
  const context = await browser.newContext({ reducedMotion: "reduce", deviceScaleFactor: 1 });
  const tab = await context.newPage();

  await mkdir(publicPath("og"), { recursive: true });
  for (const locale of ["en", "es"]) {
    await tab.setViewportSize({ width: 1200, height: 630 });
    await tab.goto(`${page}?card=${locale}`);
    await ready(tab);
    await tab.screenshot({ path: publicPath(`og/${locale}.png`) });
  }

  await tab.goto(`${page}?icon`);
  await ready(tab);
  const svg = await tab.locator("svg").evaluate(iconSvg);
  await writeFile(publicPath("favicon.svg"), `${svg}\n`);
  const tint = await tab.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--tint").trim(),
  );

  const png32 = await drawIcon(tab, svg, 32, null);
  await writeFile(publicPath("favicon.ico"), icoOf(png32, 32));
  await writeFile(publicPath("apple-touch-icon.png"), await drawIcon(tab, svg, 180, tint));
} finally {
  await browser.close();
  await server.close();
}

async function ready(tab: Page): Promise<void> {
  await tab.locator("#root > *").first().waitFor();
  await tab.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
}

/**
 * The cow as a standalone icon: still, without the mouth and tongue drawn for
 * talking and licking, in a square around its head, with its colours inline.
 * Runs in the page.
 */
function iconSvg(drawing: SVGSVGElement): string {
  const svg = drawing.cloneNode(true) as SVGSVGElement;
  for (const part of svg.querySelectorAll(".talk, .licks")) part.remove();
  for (const group of svg.querySelectorAll("[class]")) group.removeAttribute("class");
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.removeAttribute("class");
  svg.removeAttribute("aria-hidden");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("viewBox", "5 9 190 190");
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = "Julian Palomo";
  svg.prepend(title);
  return svg.outerHTML;
}

/** The icon drawn at `size` px: transparent, or centred on `background` with a margin. */
async function drawIcon(
  tab: Page,
  svg: string,
  size: number,
  background: string | null,
): Promise<Buffer> {
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const inner = background ? Math.round(size * 0.8) : size;
  await tab.setViewportSize({ width: size, height: size });
  await tab.setContent(
    `<body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;background:${background ?? "transparent"}"><img src="${src}" width="${inner}" height="${inner}"></body>`,
  );
  await tab.evaluate(() => document.images[0]?.decode());
  return tab.screenshot({ omitBackground: background === null });
}

/** An .ico holding one PNG: a 6-byte header, one 16-byte directory entry, then the PNG. */
function icoOf(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(size, 6); // width
  header.writeUInt8(size, 7); // height
  header.writeUInt8(0, 8); // no palette
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14); // image size
  header.writeUInt32LE(22, 18); // image offset
  return Buffer.concat([header, png]);
}

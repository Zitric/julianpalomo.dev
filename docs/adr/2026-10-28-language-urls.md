# One URL per language: / in English, /es in Spanish

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

The site is bilingual ([English and Spanish](2026-10-26-english-and-spanish.md)).
Most visitors read English: I live in the UK and apply for jobs here. Spanish
speakers, most of them in Spain, should get Spanish without hunting for it. A
recruiter must never get Spanish by surprise.

## Decision

- **`/` is English and `/es` is Spanish.** Each language has its own link,
  which can be shared and indexed. One route with an optional `locale`
  parameter serves both, so switching keeps the page, and the conversation in
  it, mounted.
- **Visitors in Spain get Spanish by default.** A first visit to `/` from a
  country in `SPANISH_COUNTRIES` (`src/lib/i18n/locale.ts`, today `["ES"]`) is
  redirected to `/es`. The country comes from Cloudflare (`request.cf.country`,
  or the `CF-IPCountry` header), is read only on the server, and is never
  stored, logged or sent to the page.
- **The visitor's choice always wins.** The language toggle stores it in a
  cookie (`lang=en|es`, one year). The rule for `/` is the cookie if there is
  one, otherwise the country (`chooseLanguage`).
- **Only `/` redirects**, with a `302` that is never cached
  (`Cache-Control: private, no-store`, `Vary: Cookie`) and keeps the query
  string. A link to `/es` always shows Spanish.
- **Both pages carry `hreflang` links** to `/` (`en` and `x-default`) and `/es`.

## Alternatives considered

- **One URL, the language in a cookie.** Simpler, but there's no Spanish link
  to share, and search engines see only one version of the page.
- **Following the browser's language (`Accept-Language`).** A recruiter in the
  UK with a Spanish browser would get Spanish without asking for it.

## Consequences

- Search engines mostly crawl from outside Spain, so they see English at `/`
  and find `/es` through `hreflang`.
- Adding a country, such as one in Latin America, is one entry in
  `SPANISH_COUNTRIES`.
- Every visible string lives in `src/lib/i18n/` (`en.ts` and `es.ts`, the same
  keys enforced by the type), and every new one needs both languages.
- End-to-end tests that open `/` without a cookie assume the runner isn't in
  Spain. From Spain, `/` redirects and they fail.

# Brief: secpriv

Read `00-ground-rules.md` (same folder) first.

**You own:**
- `index.html`
- `public/` (new font files only)
- `src/index.css` (only `@font-face` and font-family tokens)
- `vite.config.ts`, but ONLY the Google Fonts entries in
  `workbox.runtimeCaching`, `workbox.globPatterns`, and whatever the CSP
  needs. `perf` may edit the `build:` block. The file also holds uncommitted
  scanner work; preserve it.
- `.github/**`
- `package.json`, `package-lock.json`, `node_modules`
- `src/ui/components/GameIcon.tsx`
- in `src/App.tsx`, ONLY the footer paragraph
  (`Local-first — nothing leaves this browser.`). `perf` owns the rest of
  `App.tsx`.

Work through these in order.

## 1. Dependencies

`npm audit` reports 3 high-severity advisories, all in dev dependencies:
- `brace-expansion`, via eslint / typescript-eslint
- `source-map-js`, via @tailwindcss/node and jsdom
- `undici`, via jsdom

`npm audit --omit=dev` is clean. Run `npm audit fix` (no `--force`) and
confirm lint, tests and build still pass.

## 2. Self-host fonts

`index.html:37` loads Pixelify Sans and Nunito from Google Fonts on every
visit. That sends each visitor's IP to Google and breaks the first load
offline.
- Serve the fonts from the app instead: either `@fontsource` packages, or
  OFL woff2 files under `public/` with `@font-face`.
- Keep the same weights (Pixelify Sans 500/600/700, Nunito 500/700/800) and
  use `font-display: swap`.
- Remove the preconnect and stylesheet links, and the two google-fonts
  `runtimeCaching` routes in `vite.config.ts`.
- Make sure the service worker precaches the font files. `globPatterns`
  currently omits woff2.

## 3. Content-Security-Policy

Add the CSP as a `<meta http-equiv>` in `index.html`, because GitHub Pages
can't set headers. First inventory what the app really loads, then lock it
down.

Known needs:
- **Inline theme script** in `index.html`: allow it with a sha256 hash, not
  `'unsafe-inline'`.
- **Scripts and workers:** module scripts from `'self'`; the optimizer runs
  as a module worker from `'self'`.
- **OCR:** tesseract.js runs its worker from a `blob:` URL, needs
  WebAssembly (`'wasm-unsafe-eval'`), and loads its runtime files from
  `'self'`.
- **connect-src:** `'self' https://api-v2.encore.moe`, for the background
  game-data refresh in `src/data/providerSync.ts`.
- **img-src:** `'self' data: blob:` plus the icon host(s) used in
  `src/data/generated/snapshot.json` (currently `https://api.encore.moe`).
- **Also set:** `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`.
  Meta CSP can't express `frame-ancestors`; note that.

Dev server: Vite dev injects inline scripts and styles, so make sure
`npm run dev` still works. For example, inject the CSP only in builds via a
small `transformIndexHtml` plugin, or whatever is cleanest.

Verify in a real browser if one is available, e.g. `npm run build &&
npm run preview`, then headless Chromium or Firefox. Check the console for
CSP violations:
- on every section
- during an optimizer run
- during an Echo scan

If you can't verify in a browser, say exactly what was and wasn't checked.

## 4. Referrer policy

Add a referrer policy so icon fetches to encore.moe don't send the page URL.
Use a meta referrer (`strict-origin-when-cross-origin` or `no-referrer`)
and/or `referrerPolicy` on GameIcon's `<img>`. Check that nothing depends on
the referrer (the fonts are gone by now).

## 5. Privacy copy

The footer (`App.tsx:180`) says "nothing leaves this browser", but icons and
the game-data refresh contact encore.moe. Reword it truthfully, e.g.
"Your data never leaves this browser". Add a short note naming the third
party where it fits; one sentence in the footer is fine. Don't edit the
Database page; if you think the note belongs there, propose it in your
report.

## 6. CI hardening (`.github/workflows`)

- `deploy.yml` grants `pages: write` and `id-token: write` workflow-wide,
  so the build job gets them too, and that job runs `npm ci` with install
  scripts (esbuild, tesseract.js). Move both permissions to the deploy job
  and keep `contents: read` at the top level.
- Pin every third-party action to a full commit SHA with a `# vX.Y.Z`
  comment. Look the SHAs up with `gh api` or `git ls-remote`; don't guess.
- Add `.github/dependabot.yml`: npm + github-actions, weekly, with
  minor/patch updates grouped.
- Optionally add `npm audit --omit=dev --audit-level=high` to CI.
- Don't push or trigger workflows.

## 7. Report only, no code

The github.io origin is shared by every Pages repo on this account. Any of
them can read and write this app's IndexedDB and Cache Storage. That
includes poisoning the CacheFirst `wuwa-ocr` cache or the workbox precache
to run code inside this app. Assess this briefly and recommend a direction:
a custom domain, or keeping that account's Pages free of third-party JS.
Also note anything else you find.

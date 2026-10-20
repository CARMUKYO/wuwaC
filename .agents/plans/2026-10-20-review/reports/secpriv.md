# secpriv report

Nothing is committed or pushed. All changes are uncommitted in the working tree.

## Files changed

- `index.html`: removed the Google Fonts preconnect and stylesheet links; added `<meta name="referrer" content="no-referrer">`.
- `src/index.css`: added six latin-subset woff2 `@font-face` rules at the top (only `@font-face`; the font-family tokens were not touched).
- `vite.config.ts`: added a `contentSecurityPolicy()` plugin (build-only); added `woff2` to `workbox.globPatterns`; removed the two google-fonts `runtimeCaching` routes. The uncommitted scanner work (`ocrAssets`, `__WUWA_OCR_DIR__`) is untouched and the `build:` block is untouched.
- `src/ui/components/GameIcon.tsx`: added `referrerPolicy="no-referrer"` to the `<img>`.
- `src/App.tsx`: footer paragraph only.
- `package.json`: added `@fontsource/nunito` and `@fontsource/pixelify-sans` (`^5.3.0`). The scanner's `tesseract.js` and `@tesseract.js-data/eng` entries are preserved.
- `package-lock.json`: `npm audit fix` plus the two font packages.
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`: action SHA pins, permissions split, audit step (CI only).
- `.github/dependabot.yml`: new file.

Tests added: none. These are config and markup changes, verified in a browser (below).

## Item 1: Dependencies

- Before: `npm audit` reported 3 high advisories (`brace-expansion`, `source-map-js`, `undici`), all in dev dependencies.
- Ran `npm audit fix` (no `--force`). It changed 4 packages, lockfile only.
- After: `npm audit` reports 0 vulnerabilities, and `npm audit --omit=dev --audit-level=high` exits 0.
- Lint, the targeted UI tests and `vite build` still pass.

## Item 2: Self-hosted fonts

- Added `@fontsource/pixelify-sans` and `@fontsource/nunito`. Hand-wrote `@font-face` rules in `index.css` pointing at the packages' latin woff2 files.
  - I did not import fontsource's own CSS, because it also emits the `.woff` fallbacks.
  - Weights: Pixelify Sans 500/600/700, Nunito 500/700/800. All use `font-display: swap`.
- Removed the Google preconnect and stylesheet links from `index.html`, and the `google-fonts-css` and `google-fonts-files` routes from `runtimeCaching`.
- Added `woff2` to `globPatterns`.
- Verified:
  - `dist/assets` contains 6 hashed woff2 files.
  - `dist/sw.js` references woff2 six times, i.e. the files are precached.
  - `grep google` over `dist/index.html`, `dist/sw.js` and the built CSS finds nothing.
  - In Chromium the faces report as loaded. Unused weights (Pixelify 500, Nunito 800) stay "unloaded" because fonts load lazily.
  - After the service worker took control and the network was disabled, a reload still rendered the app with the self-hosted fonts.
- Caveat: only the latin subset is bundled. Google's CSS served unicode-range subsets, so any non-latin glyph now falls back to a system font.

## Item 3: Content-Security-Policy

- Implemented as a `wuwa-csp` Vite plugin with `apply: 'build'` and a `transformIndexHtml` handler (`order: 'post'`). It injects a `<meta http-equiv="Content-Security-Policy">` at `head-prepend`. The dev server is unaffected, because Vite dev injects inline scripts that the policy would block.
- The sha256 for the one inline script (the theme bootstrap) is computed from the emitted HTML. I checked it by hand against the built `dist/index.html`; the hashes match.
- Resulting policy:

```
default-src 'none';
script-src 'self' 'wasm-unsafe-eval' 'sha256-<hash of theme script>';
worker-src 'self' blob:;
style-src 'self';
img-src 'self' data: blob: https://api.encore.moe;
font-src 'self';
connect-src 'self' https://api-v2.encore.moe;
manifest-src 'self';
object-src 'none';
base-uri 'self';
form-action 'none'
```

- `frame-ancestors`, `report-uri` and `sandbox` are not available in meta CSP, so there is no clickjacking protection on GitHub Pages.
- The service worker script is not covered by the page's meta CSP.
- Verified in headless Chromium (`/usr/bin/chromium`, driven by playwright-core installed in the scratchpad, not the repo), against `vite preview` of the production build:
  - CSP meta present in the built page.
  - Visited all six sections (inventory, roster, calculator, teams, builds, database): no CSP violations.
  - Echo scan of a real fixture screenshot (`scan-fixtures/`) completed in about 2 s and showed "1 scanned · 0 ready · 1 to fix" with no alerts. The OCR blob worker, wasm and same-origin `ocr/` files all loaded under the policy.
  - Built optimizer module worker spawned directly from `/wuwaC/assets/optimizer.worker-*.js` ran without error.
  - Inline theme script ran (`data-theme` became `ink` after setting `wuwa-theme` in localStorage and reloading), so the hash is valid.
  - Negative controls: an injected inline script was blocked (`window.__x` stayed 0), and an image from `https://example.com` was blocked.
  - External origins contacted: only `https://api.encore.moe` and `https://api-v2.encore.moe`.
- One CSP violation remains: `script-src blocked=eval`, once per page load.
  - It comes from zod's JIT feature probe (`Function("")` inside a try/catch in the vendor chunk), which falls back gracefully.
  - Silencing it needs `z.config({ jitless: true })` in app code I don't own, probably `src/main.tsx`. I did not add `'unsafe-eval'`.
- Also seen in the console: tesseract's own "Estimating resolution as 272" log, and the expected "background game-data refresh failed" warning when offline.

## Item 4: Referrer policy

- Added `<meta name="referrer" content="no-referrer">` and `referrerPolicy="no-referrer"` on GameIcon's `<img>`.
- Checked that nothing depends on the referrer: `curl` of an `api.encore.moe` icon URL returned 200 `image/webp` both with no referrer and with `https://carmukyo.github.io/wuwaC/` as the referrer. The fonts that previously used a cross-origin request are gone.
- In the built bundle, `referrerPolicy` appears once.

## Item 5: Privacy copy

- Footer in `src/App.tsx` now reads: "Local-first — your data never leaves this browser. Only game art and game-data updates are fetched, from encore.moe."
- No existing test referenced the old text (grepped `src`).
- I did not edit the Database page. A one-line note there naming encore.moe as the only third party would fit if you want one.

## Item 6: CI hardening

- `deploy.yml`: top-level permissions are now `contents: read` only. `pages: write` and `id-token: write` moved to the `deploy` job, so the `build` job (which runs `npm ci` with install scripts) no longer has them.
- Actions pinned to full commit SHAs, with version comments. SHAs came from `git ls-remote --tags`, not guessed.
  - `actions/checkout` @ `11d5960a326750d5838078e36cf38b85af677262` (v4.4.0)
  - `actions/setup-node` @ `49933ea5288caeca8642d1e84afbd3f7d6820020` (v4.4.0)
  - `actions/upload-pages-artifact` @ `7b1f4a764d45c48632c6b24a0339c27f5614fb0b` (v4.0.0)
  - `actions/deploy-pages` @ `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` (v4.0.5)
- `.github/dependabot.yml`: npm and github-actions ecosystems, weekly, minor and patch updates grouped.
- `ci.yml` gained an "Audit production dependencies" step: `npm audit --omit=dev --audit-level=high`. It currently exits 0. I left it out of `deploy.yml` deliberately, because a newly published advisory would then block deploys.
- Verification: the three YAML files parse (Ruby `YAML.load_file`). No workflow was run or triggered. I did not check that the pinned SHAs resolve inside GitHub Actions itself.

## Item 7: Shared github.io origin (assessment only, no code)

- Every Pages repo on `carmukyo.github.io` shares one origin. Any script served from any of them can open this app's IndexedDB (including `gamedataCache`) and its Cache Storage: the `wuwa-ocr` CacheFirst cache and the workbox precache.
- A page on the same origin can overwrite a cached JS file (the OCR `worker.min.js`, the core `.wasm.js`, or a precached app chunk) with its own code. That code then runs inside this app under this app's own CSP. A poisoned precache entry would run on every later visit until the service worker updates or the entry is rewritten.
- The CSP does not defend against this. It blocks injection through this app's own HTML, not other pages writing to origin-wide storage.
- Likelihood: needs hostile or compromised JS in another repo on that account. Low for a personal account, but users' inventory data is also readable by those pages.
- Recommendation: move the app to its own origin, with a custom domain on Pages or a dedicated account or org. That's the only real fix. Until then, keep third-party JS (analytics, widgets, unreviewed demos) out of every Pages site on that account.
- I considered an integrity check on the `ocr/` assets as interim hardening. It is weak without a separate origin, because the same attacker can also alter the check.

## Other findings

- An icon URL on a different host, from a future provider refresh, would be blocked by `img-src` and fall back to the initials badge. Add the host to `img-src` if the CDN ever changes.
- The zod `eval` probe produces a visible console error under CSP (see item 3).

## Gate results (run at the end)

- `npm run lint`: clean.
- `npx tsc -b`: fails, in files I don't own.
  - `src/data/index.test.ts(1,30)`: TS2591, `node:fs` has no types (the file has an uncommitted edit from another agent, and `tsconfig.app.json` `types` lists only vite types).
  - Earlier in the session `src/optimizer/prune.test.ts` also had "Expected 3 arguments" errors. They no longer appear in the latest `tsc` output.
- `npm run build` (`tsc -b && vite build`): blocked by the `tsc` error above. `npx vite build` alone succeeds ("built in 682ms", 26 precache entries).
- `npm run test`: 2 files failed and 6 tests failed, all in `src/optimizer/prune.test.ts` (five `pruneDominated` tests) and `src/optimizer/search.test.ts` ("prunes by default and reports dropped echoes"). This is in-progress work in the optimizer files. Other results: 79 files passed, 888 tests passed.
- `npx vitest run src/ui/components src/App`: 12 files, 88 tests, all passed. I ran this after my final edits (GameIcon, footer).

## What was not verified

- No full optimizer run through the UI. I spawned the built optimizer worker directly under the CSP and it started without error, but a real run needs a roster entry, rotation blocks and echoes.
- The Echo scan was run once, on a single fixture screenshot with an arbitrary Sonata selection. It exercised the OCR pipeline under CSP, but I did not check scan accuracy.
- Only Chromium was tested. Firefox is installed but I didn't use it.
- Workflows were not run; the SHAs and the permissions split are untested in real Actions.
- The dev server (`npm run dev`) was not started. The CSP plugin is `apply: 'build'`, so the dev path is unchanged by design.

## Proposed doc updates (for the coordinator)

- `AGENTS.md`, Hosting section:
  - Fonts are self-hosted through `@fontsource` and `@font-face` in `index.css` (latin subset, woff2 precached).
  - The CSP is a build-only plugin (`contentSecurityPolicy` in `vite.config.ts`). Any new origin the app talks to needs a matching `connect-src` or `img-src` entry there, and any new inline script is hashed automatically.
  - Meta CSP can't set `frame-ancestors`.
  - Referrer policy is `no-referrer`.
  - Shared-origin caveat (item 7).
- `AGENTS.md`, CI: actions are pinned to SHAs and dependabot updates them. Deploy permissions are on the deploy job only.
- Optional: a Database-page note that encore.moe is the only third party contacted.
- Suggested app change outside my files: `z.config({ jitless: true })` at startup to remove the CSP eval error.

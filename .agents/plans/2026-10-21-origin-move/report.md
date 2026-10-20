# Report: origin move to wuwa-opt.github.io (secpriv, 2026-10-21)

Status: the code part of the brief is implemented. Every gate is green, and both modes were checked in headless Chromium. Nothing is committed, and I made no git state changes, no pushes, no repo or org creation, no workflow runs and no dependency changes. I did not touch `AGENTS.md`, `README.md` or `docs/`. I stayed out of bugfix's follow-up files (`share.ts`, the build/share schemas, `RotationOptimizer`, `library.test.ts`, `backup.test.ts`). I didn't need to edit `BuildsPage.tsx` either (see "Share links" below).

## Gate results (final run)

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npx tsc -b` | clean |
| `npm run test` | 93 files, 1036 tests, all passed (the coordinator saw 1004 earlier; bugfix is also editing tests, so the delta is not only mine) |
| `npm run build` | built; 40 precache entries |
| `VITE_MOVED_TO=https://wuwa-opt.github.io/wuwaC/ npx vite build` | built (output to the scratchpad, not `dist/`) |

I did not run `npm run build` in moved mode. I ran the same build through `npx vite build`, to skip the `tsc -b` step that the full script had already covered.

## Files changed

New:
- `src/site.ts`: the one source of truth, with no imports and no `import.meta`, so `vite.config.ts` can import it. It holds:
  - `CANONICAL_URL` (`https://wuwa-opt.github.io/wuwaC/`) and `LEGACY_SITE_URL` (`https://carmukyo.github.io/wuwaC/`);
  - `parseMovedTo(raw)`, the build-time validator;
  - `movedShareUrl(target, shareHash)`.
- `src/ui/movedMode.ts`: `movedTarget()` reads `import.meta.env.VITE_MOVED_TO` and passes it through `parseMovedTo`. A malformed value returns `null`. It lives in its own file so component files only export components (the `react-refresh` lint rule).
- `src/ui/components/MovedBanner.tsx`: the persistent banner on the old site.
- `src/ui/components/ImportHint.tsx`: the first-run hint on the new site. It exports `IMPORT_HINT_KEY`.
- Tests: `src/site.test.ts`, `src/ui/components/MovedBanner.test.tsx`, `src/ui/components/ImportHint.test.tsx`, `scripts/siteMode.test.ts`.

Changed:
- `vite.config.ts`: new `siteMode()` plugin (`wuwa-site-mode`), and an import of `src/site.ts`.
  - The `config` hook validates `VITE_MOVED_TO` with `loadEnv` and throws on a bad value.
  - The `transformIndexHtml` hook (`order: 'pre'`) replaces the `%SITE_URL%` placeholder with `CANONICAL_URL`.
  - The `BASE` comment now names the new URL.
- `index.html`: canonical, `og:url` and `og:image` now use `%SITE_URL%` (no hand-copied host), plus a comment.
- `src/App.tsx`: renders `<MovedBanner />` and `<ImportHint />` at the top of `<main>`, and imports them.
- `src/vite-env.d.ts`: types `import.meta.env.VITE_MOVED_TO`.
- `.github/workflows/deploy.yml`: the build step gets `env: VITE_MOVED_TO: ${{ vars.MOVED_TO }}`, plus a comment explaining the repo variable.
- `.github/workflows/sync-gamedata.yml`: `if: github.repository == 'wuwa-opt/wuwaC'` on the `sync` job, and the same check ANDed into `open-pr`'s existing `changed` condition.
- `scripts/workflows.test.ts`: new `describe` block for the two guards.

SHA pins and least-privilege permissions in the workflows are unchanged.

## How the two modes are selected

Selection happens at build time, from one variable. Nothing is derived from the page.
- **Live (default).** `VITE_MOVED_TO` is unset or blank. This is every build in `wuwa-opt/wuwaC`, because the `MOVED_TO` repo variable doesn't exist there and `vars.MOVED_TO` expands to an empty string.
- **Moved.** `VITE_MOVED_TO` is set, in the old repo only, by `vars.MOVED_TO` in `deploy.yml`. One-time setup: in `carmukyo/wuwaC`, set the repository variable `MOVED_TO` to `https://wuwa-opt.github.io/wuwaC/` and redeploy.
- **Validation.** `parseMovedTo` accepts only an exact `https:` URL that ends in `/`, with no credentials, query or fragment, and that matches the URL parser's own canonical output. It throws otherwise, so the build fails instead of shipping a banner that points nowhere. A blank value means live. Checked by hand with `npx vite build` for these values:
  - `http://x.example/`
  - `https://wuwa-opt.github.io/wuwaC` (no trailing slash)
  - `…/?a=1`
  - `https://WUWA-opt.github.io/wuwaC/` (non-canonical form)
  - `garbage`

  All failed with a `VITE_MOVED_TO must be an https URL ending in "/" (reason)` message. The valid value built, and the target appears once in the bundle.
- **Runtime.** The app reads the same variable through `import.meta.env` and re-validates it. An invalid value (which the build would have refused) yields no banner rather than a stray link.
- **`index.html` canonical.** `CANONICAL_URL` is used in both modes, so the old site's canonical already points at the new one. Only the banner and the first-run hint differ between modes.

## Behaviour

- **Moved-mode banner** (`MovedBanner`):
  - It is persistent: not dismissible, and shown on every section.
  - The text names the new site, explains that storage is per address, and says to export here and import there on the Database page.
  - Buttons and links: **Export backup** (calls `downloadBackup`, then "Backup downloaded. Import it on the new site."; a failure is shown inline), **Go to the new site**, and, only when a share link is pending, **Open this shared build on the new site**.
  - The app keeps working normally underneath.
- **Share links.** The banner reads the existing `useAppStore().shareLink` (the pending `#b=` hash), so I didn't need to edit `BuildsPage.tsx`. The target is exactly `VITE_MOVED_TO` plus the same fragment. The fragment is client-side only and is never sent to a server. The offer disappears when the user resolves or dismisses the link, the same as the preview.
- **New-site first run** (`ImportHint`). It shows when all of these hold:
  - the build is not in moved mode;
  - the page is not on `carmukyo.github.io` (so the old site, while it is still unmoved, doesn't tell people to come from itself);
  - `hasUserData()` is false (this counts only echoes, roster, builds and teams, not the game-data cache);
  - the hint wasn't dismissed.

  Text: "Coming from carmukyo.github.io/wuwaC? Export a backup there, then restore it here."
  - **Import your backup** goes to `#database`, where the existing `DataSafety` restore lives, with its merge/replace confirmation. I reused that flow rather than building a second restore path.
  - **Dismiss** stores `wuwa-import-hint-dismissed = '1'` in localStorage (per browser, under the existing `wuwa-*` prefix; it fails safe if storage is unavailable).
  - Emptiness is re-checked whenever the section changes, so the hint disappears after a restore. It is hidden on the Database page itself.
- **No storage renames.** IndexedDB and localStorage names are unchanged. The new origin simply starts fresh under the same names. The only new key is `wuwa-import-hint-dismissed`.

## Tests added (33)

| File | Covers |
|---|---|
| `src/site.test.ts` (16) | `parseMovedTo`: unset and blank → null; valid → returned unchanged; 10 rejects (http, `javascript:`, no slash, origin-only, query, fragment, credentials, non-canonical host case, junk, relative path). `movedShareUrl` keeps the fragment, and offers nothing without a pending `#b=`. The constants keep the `/wuwaC/` project-site shape and differ in origin. |
| `MovedBanner.test.tsx` (6) | Renders nothing live, and nothing for a malformed value. Moved: names the target, **Export backup** calls `downloadBackup`, shows the "downloaded" status, and shows a failure. The share link is offered only when pending, with the same fragment. Every link's origin is the configured target's. |
| `ImportHint.test.tsx` (6) | Shows for an empty DB and the button navigates to Database. Dismissal hides it, writes a `wuwa-*` key, and survives a remount. Hidden when data exists. Disappears after data arrives and the section changes. Hidden on the Database page. Never shown in moved mode. |
| `scripts/siteMode.test.ts` (3) | `index.html` contains no hard-coded `github.io`, only `%SITE_URL%`, at least three times. The plugin's HTML transform renders canonical, `og:url` and `og:image` from `CANONICAL_URL`. The config hook accepts empty and valid values and rejects a bad one. |
| `scripts/workflows.test.ts` (+2) | Every `sync-gamedata.yml` job carries the `wuwa-opt/wuwaC` guard. `deploy.yml` passes `VITE_MOVED_TO` from `vars.MOVED_TO` on the `npm run build` step only, keeps top-level `contents: read`, gives the build job no permissions, and keeps `pages` and `id-token` write on the deploy job only. |

Note for `ImportHint.test.tsx`: Node 26's experimental `localStorage` global shadows jsdom's (`localStorage` is `undefined` here), so the test stubs an in-memory `Storage`. It behaves the same on Node 22 in CI.

## Verification beyond unit tests

Built both modes, served them with `vite preview` (ports 4173 live, 4174 moved), and drove them with headless Chromium through playwright-core (installed in the scratchpad, not the repo).

- **Built `index.html` (live).** Canonical, `og:url` and `og:image` are all `https://wuwa-opt.github.io/wuwaC/…`. `carmukyo` does not appear in the HTML. The only `carmukyo.github.io` strings in the JS are the legacy constant, used by the hint's link and origin check.
- **Live mode.**
  - Empty DB shows the hint and no moved banner.
  - "Import your backup" goes to `#database`, the hint hides there, and the "Restore from backup…" button is visible.
  - Back on Inventory the hint reappears.
  - After Dismiss and a reload it stays hidden; `wuwa-import-hint-dismissed` is `1`.
- **Moved mode.**
  - The banner is visible with no hint, and persists on other sections (checked on Roster).
  - Both links are `https://wuwa-opt.github.io/wuwaC/`.
  - **Export backup** downloads a real `wuwa-optimizer-backup-<date>.json` whose keys are `format, version, exportedAt, tables`, and the status line appears.
  - Opening `…/wuwaC/#b=2.AbC-_9` produces a link to `https://wuwa-opt.github.io/wuwaC/#b=2.AbC-_9`.
- **Console and CSP.** 0 problems in both modes. The expected zod `eval` probe is filtered out; it was documented on 2020-10-20 and is unrelated to this change. There were no new CSP violations.

## What is unverified

- The old origin's real service worker and cache. I tested a fresh profile only. A returning visitor with the old precache gets the moved build through the existing update prompt (`registerType: 'prompt'`), so someone who ignores the prompt keeps the old build until they reload.
- The workflows. The YAML is covered by `workflows.test.ts` and parsed by `js-yaml`, but nothing was run. In particular, I have not seen `vars.MOVED_TO` resolve in Actions, and I have not seen the `if: github.repository == …` guards skip a job on the old repo.
- The new origin itself: the org has no repos yet, so nothing was checked against `wuwa-opt.github.io` (Pages settings, "Allow GitHub Actions to create and approve pull requests", base path).
- A restore performed from the hint with a real backup from the old origin. I checked that the button reaches the restore control; the restore itself is existing, tested `DataSafety` code.
- Browsers other than Chromium.

## Proposal only (not built): postMessage handoff

Goal: one click on the old site sends the data to the new one with no file in between.

**Design.**
1. The old site (moved mode) has a button "Send my data to the new site". It calls `window.open(MOVED_TO + '#import', '_blank')` and keeps the `WindowProxy`.
2. The new site, when opened with `#import` and an empty DB, announces itself with `window.opener.postMessage({ type: 'wuwa-ready', nonce }, LEGACY_SITE_URL)`. The target origin is the literal legacy origin, never `*`.
3. The old site accepts a message only if `event.origin === new URL(MOVED_TO).origin` and `event.source === theWindowItOpened`. It replies with `postMessage({ type: 'wuwa-backup', nonce, backup }, event.origin)`, using the existing `createBackup()` payload.
4. The new site accepts a message only if `event.origin === LEGACY_SITE_URL's origin`, `event.source === window.opener`, and the nonce matches. It runs `parseBackup` (zod) on the payload, shows the same counts and Merge / Replace confirmation as `DataSafety`, and only then calls `restoreBackup`. It never auto-restores.

**Constraints.**
- Both origins are hard-coded from `src/site.ts`; neither side reads an origin from the message or the page.
- Both sides `parseBackup`-validate and size-cap the data (the old side by construction, the new side as untrusted input). A malformed message is dropped silently.
- The listener on the new site exists only during the `#import` flow and is removed after one accepted message or a timeout.
- It needs `noopener` to be absent from `window.open`, so `window.opener` is available. That is acceptable only because the target is the fixed, controlled new origin.
- A tab opened by another site must not be able to trigger an import: the nonce is generated by the new site, so a third-party opener that never saw it cannot answer correctly, and the origin check rejects it anyway.
- Cost and benefit: roughly 150 lines plus tests, one more cross-origin trust path, and a CSP that is unchanged (`postMessage` is not governed by `connect-src`). The file-based flow already works and is more transparent, and the old site stays up for months, so I'd recommend shipping the banner as it is and building the handoff only if migration data shows people getting stuck.

## Notes and decisions to confirm

- **Canonical on the moved site.** I let the old site's `<link rel="canonical">` point at the new site, which tells search engines the new address is the real one. If the coordinator wants the old site to stay self-canonical during the transition, `siteMode` needs a one-line change.
- **Fork or preview URL.** `CANONICAL_URL` is a constant, so a fork or a differently-hosted deploy still advertises `wuwa-opt.github.io`. The brief asked for one constant, so I kept it that way.
- **Old repo needs a sync-disabled check, not code.** With the guard in place, the old repo's weekly `sync-gamedata.yml` will show up as skipped runs rather than opening PRs. If you want it gone entirely, delete the workflow in the old repo's copy (the code is the same in both).
- **Dependabot** (`.github/dependabot.yml`) will also run in the old repo and open weekly PRs there. Disable it in that repo's settings or remove the file in the final moved build.

## Proposed `AGENTS.md` / `README.md` text (for the coordinator)

### `AGENTS.md`: replace the opening lines of "Hosting (GitHub Pages)"

```md
## Hosting (GitHub Pages)

Canonical deploy: https://wuwa-opt.github.io/wuwaC/ (repo `wuwa-opt/wuwaC`), by
`.github/workflows/deploy.yml` on push to `main`; `ci.yml` runs lint/test/build
on other branches and PRs. Still client-only: the app must work offline and
from any static host.

Two deploy modes from one codebase, picked at build time (`src/site.ts`,
`siteMode()` in `vite.config.ts`):

- **Live** (default, `wuwa-opt/wuwaC`): the app, with a dismissible first-run
  hint ("Coming from carmukyo.github.io/wuwaC? Import your backup") when the
  DB is empty (`ImportHint`, key `wuwa-import-hint-dismissed`).
- **Moved** (`VITE_MOVED_TO=<https URL ending in />`, set from the repo
  variable `MOVED_TO`): the original `carmukyo/wuwaC`, kept up as a migration
  page. It works normally but shows a persistent banner with an Export backup
  button and a link to the new site (`MovedBanner`); a pending `#b=` share link
  gets an "Open this shared build on the new site" link with the same
  fragment. The value is validated at build time (`parseMovedTo`) and is never
  derived from the page.

The canonical URL lives in one constant, `CANONICAL_URL` in `src/site.ts`;
`index.html` uses a `%SITE_URL%` placeholder that `vite.config.ts` fills.
Never hand-copy the host into HTML or components. `sync-gamedata.yml` only
runs in `wuwa-opt/wuwaC`; the old repo must never open sync PRs.
```

(Keep the existing bullets after that: `base: '/wuwaC/'`, service worker, chunks, backup, prefixed storage names. In the bullet about the shared origin, replace the last sentence with the note below.)

### `AGENTS.md`: replace the shared-origin bullet

```md
- Storage is per origin. The app now lives on its own origin
  (`wuwa-opt.github.io`) so other Pages repos can no longer read or poison its
  IndexedDB / Cache Storage. Keep IndexedDB/localStorage names prefixed
  (`wuwa-optimizer`, `wuwa-*`) and never rename existing ones: they were chosen
  on the old shared origin and users' backups and the first-run hint rely on
  them. Never transfer or delete `carmukyo/wuwaC`: it is the only place
  existing users' data can still be exported from. Keep third-party JS out of
  the `wuwa-opt` org's Pages sites for the same reason.
```

### `README.md`: "Moving from the old address"

```md
## Moving from the old address

WuWa Optimizer now lives at **https://wuwa-opt.github.io/wuwaC/**. Browsers
store data per web address, so your Echoes, roster, builds and teams did not
move automatically:

1. Open the old site, https://carmukyo.github.io/wuwaC/. It still works and
   shows a "moved" banner.
2. Click **Export backup** and save the file.
3. Open the new site, go to **Database → Restore from backup…**, and pick the
   file (Merge keeps anything already there; Replace overwrites it).

Shared build links (`#b=…`) keep working: on the old site, use "Open this shared
build on the new site".
```

## Coordinator checklist (not for the agent)

1. After the repo exists and is pushed, confirm the new Pages deploy works at the new base path.
2. In `carmukyo/wuwaC`: set the repository variable `MOVED_TO=https://wuwa-opt.github.io/wuwaC/`, then redeploy. Check that the banner appears and Export backup works on the real old origin with real data.
3. In `wuwa-opt/wuwaC`: Pages source "GitHub Actions", and "Allow GitHub Actions to create and approve pull requests", then do one manual `sync-gamedata.yml` dispatch to confirm the guard lets it run there.
4. In `carmukyo/wuwaC`: check that `sync-gamedata.yml` runs are skipped; consider disabling dependabot there.

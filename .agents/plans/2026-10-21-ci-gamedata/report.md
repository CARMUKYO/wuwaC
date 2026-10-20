# Report: CI-published, reviewed game data (perf, 2026-10-21)

Status: implemented. All gates are green and browser behaviour is checked in headless Chromium. Nothing is committed. I didn't run, dispatch or push any workflow, and didn't run a full `npm run sync`. The one dependency change is `js-yaml`, which the user approved (see below).

## Update after coordinator review

1. **The weekly cron no longer depends on the event payload for the default branch.**
   - The `open-pr` job no longer reads `github.event.repository.default_branch`. Scheduled events carry no repository object, so the value would have been empty on the Monday run.
   - It now asks the API: `base_branch="$(gh api "repos/$GITHUB_REPOSITORY" --jq .default_branch)"`, followed by `test -n "$base_branch"`. It uses the step's existing `GH_TOKEN`.
   - `scripts/workflows.test.ts` asserts that the workflow text never contains `github.event.repository` and that `open-pr` runs that `gh api` call.
2. **A timestamp-only resync no longer opens a PR.**
   - New pure `hasDataChanges(before, after)` in `scripts/gamedata-summary.ts`: `comparableJson` of the two snapshots differs. That means key-sorted JSON with every `fetchedAt` dropped, at the top level and in each record's `source`.
   - New CLI mode: `npx tsx scripts/gamedata-summary.ts --changed <before> <after>` prints `true` or `false`.
   - The "Detect changes" step calls it whenever `git diff` reports a change. When the answer is `false`, the run makes no artifact and no PR (and skips the gates) and writes "Game data unchanged (fetch timestamps aside); no artifact, no PR." to the job summary.
   - Tests:
     - a restamped copy, with every `fetchedAt` moved, gives `false`;
     - a record change, a removal or a version bump gives `true`;
     - the workflow test asserts the detect step uses `--changed`.
   - CLI smoke run on the real snapshot: `false` for a restamped copy, `true` with one character renamed.
3. **js-yaml declared** (user-approved): `npm install --save-dev js-yaml@^4.3.2`, the version eslint already brings in.
   - Diffed against copies taken just before the install: `package.json` gained only `"js-yaml": "^4.3.2"` in devDependencies, and `package-lock.json` gained only the same line in the root package's devDependencies. No package entries changed and no new packages were added.
   - No `@types/js-yaml`: the test keeps the `createRequire` load with a narrow `{ load: (text: string) => unknown }` type.


## Files changed

New:
- `src/data/gamedataPublication.ts`: pure module, holding:
  - `checksumJson` (moved here from `activeSnapshot.ts`, which re-exports it);
  - `GAMEDATA_MANIFEST_PATH`;
  - `gamedataManifestSchema`;
  - `buildGamedataPublication(raw) -> { manifest, payload }`.
- `src/data/gamedataPublication.test.ts`
- `scripts/gamedata-summary.ts`: pure `diffSnapshots` / `renderSummary` / `comparableJson`, plus a thin CLI.
- `scripts/gamedata-summary.test.ts`
- `.github/workflows/sync-gamedata.yml`
- `scripts/workflows.test.ts`

Changed:
- `src/data/activeSnapshot.ts`:
  - The refresh now reads the same-origin manifest and payload instead of the provider pipeline. It no longer imports `providerSync.ts`.
  - `SNAPSHOT_STALE_AFTER_DAYS` and `isSnapshotStale` are removed.
  - `shouldAdoptCandidate` takes a `SnapshotStamp` (`{ snapshotVersion, fetchedAt }`), so a manifest can be compared directly.
- `src/data/activeSnapshot.test.ts`: the staleness tests are gone, and the refresh tests are rewritten for the manifest.
- `src/state/snapshotStore.ts`: one background manifest check per session, with no age gate. The doc comment is updated.
- `src/state/snapshotStore.test.ts`: tests rewritten.
- `src/ui/pages/DatabasePage.tsx`: toast and description copy, the button tooltip, and the attribution line.
- `src/ui/pages/DatabasePageFreshness.test.tsx`: tests rewritten.
- `vite.config.ts`:
  - New `gamedataPublication()` plugin: emits the files at build time and serves them in dev.
  - CSP `connect-src 'self'` only, with an updated comment.
  - Workbox `globIgnores` adds `gamedata/**`.
  - The vitest `unit` project also includes `scripts/**/*.test.ts`.
- `src/App.tsx`: footer only. It now reads: "Game data updates come from this site; only game art is loaded from encore.moe."
- `src/ui/pages/CalculatorPage.test.tsx`: only the mock near line 26 (`scored: 1, total: 1`).

I didn't touch bugfix's files (share/store/library/calculator, BuildsPage, CalculatorPage.tsx, App.share test, schema).

## Design notes

### Publication
- `buildGamedataPublication(raw)` computes `payload = JSON.stringify(snapshotSchema.parse(raw))`. That is the same canonical JSON `writeCachedSnapshot` checksums.
- Manifest fields:
  - `snapshotVersion` (a plain number, so a newer-than-app publication is recognised rather than failing validation);
  - `fetchedAt`;
  - `checksum` (FNV-1a);
  - `path` = `gamedata/snapshot-<checksum>.json` (the schema pins it to that pattern, so a manifest can't point elsewhere);
  - `bytes` (UTF-8).
- Invalid data throws, so a broken snapshot fails `npm run build`.
- Measured: in the browser check, the IndexedDB row's checksum equals the manifest checksum (`4ebb2f25`).

### Build
- The `wuwa-gamedata` plugin's `generateBundle` emits `gamedata/manifest.json` (139 B) and `gamedata/snapshot-cb54b6f2.json` (2,198,910 B, minified) from `src/data/generated/snapshot.json`.
- `npm run build` / `preview` and the Pages deploy pick them up with no extra step.
- `configureServer` serves the same two files in `npm run dev`. An unknown name falls through to Vite's SPA fallback, which a client rejects as invalid.

### Client refresh (`refreshActiveSnapshot`)
1. Fetch the manifest from `<base>gamedata/manifest.json` with `cache: 'no-store'`. A failure, or HTTP not ok, is `unavailable`.
2. Validate it with the manifest schema; failure is `invalid`.
3. If its version is older than active, keep the current snapshot (warning logged).
4. If its version is greater than `SNAPSHOT_VERSION`, reject with `newer-than-app`, without downloading the payload.
5. If `shouldAdoptCandidate(manifest, active)` is false, keep the current snapshot. This is the normal case, and it costs only the manifest request.
6. Otherwise fetch the payload. It uses normal HTTP caching, which is safe because the name is content-addressed. Failure is `unavailable`.
7. The payload must match the checksum, parse as JSON, pass zod, and agree with the manifest's version and `fetchedAt`; any failure is `invalid`.
8. `writeCachedSnapshot`, then return `updated`.

Notes:
- The fallback order and the version / adoption / newer-than-app rules are unchanged.
- **WHEN to check:** `SNAPSHOT_STALE_AFTER_DAYS` is gone, as proposed. The store does one manifest check per session (`autoRefreshAttempted`), plus the manual "Check for updates". Concurrent callers share one request chain.
- **Browsers no longer reach the provider at all.** The provider pipeline isn't in the browser bundle: no `dist/assets/*.js` contains `api-v2.encore.moe`. `providerSync.ts` remains the single provider pipeline, used by `npm run sync` (CLI and CI).

### Service worker and CSP
- `gamedata/**` is in `globIgnores`; JSON wasn't in `globPatterns` anyway, and no runtime route matches it.
- `dist/sw.js` contains no `gamedata` or `snapshot-*.json` entry (grep count 0).
- Built CSP:
  > `default-src 'none'; script-src 'self' 'wasm-unsafe-eval' 'sha256-…'; worker-src 'self' blob:; style-src 'self'; img-src 'self' data: blob: https://api.encore.moe; font-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`

### Workflow (`sync-gamedata.yml`)
- Triggers: cron `17 4 * * 1` (Mondays 04:17 UTC) and `workflow_dispatch`.
- Workflow default `permissions: contents: read`; `concurrency: gamedata-sync` (no cancel).
- **Job `sync`** (`contents: read`; checkout with `persist-credentials: false`):
  - `npm ci`;
  - copy the committed snapshot aside;
  - `npm run sync`;
  - `git diff --quiet`, which sets `changed`;
  - if changed: lint, test, build, then the summary via `scripts/gamedata-summary.ts`;
  - upload artifact `gamedata-sync`, containing `snapshot.json` and `summary.md` (7-day retention). The summary also goes to the job summary.
- **Job `open-pr`** (`needs: sync`, only when changed; `contents: write`, `pull-requests: write`; no npm, npx or node):
  - checkout, then download the artifact;
  - check the artifact: exactly those two files, and a `jq` shape check on the snapshot;
  - force-push one commit on `data/gamedata-sync`, as `github-actions[bot]`;
  - `gh pr list` / `gh pr create` or `gh pr edit` with `GH_TOKEN: github.token`.
  - The PR body is the summary plus a note: the gates passed in the linked run, `ci.yml` doesn't run on GITHUB_TOKEN PRs, and nothing auto-merges.
- **Action pins**, checked with `git ls-remote` on 2026-10-21 (all lightweight tags, so these are commit SHAs):

  | Action | Version | SHA |
  |---|---|---|
  | checkout | v4.4.0 | `11d5960a326750d5838078e36cf38b85af677262` |
  | setup-node | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
  | upload-artifact | v4.6.2 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
  | download-artifact | v4.3.0 | `d3f86a106a0bac45b974a628896c90dbdf5c8093` |

### Summary script
- Per category (characters, weapons, sonataSets, echoDefs) it lists before/after counts and the added, removed and changed ids.
- "Changed" compares key-sorted JSON with every `fetchedAt` dropped, since each sync restamps `source.fetchedAt` and would otherwise mark every record.
- Lists are capped at 40 ids per bucket, to keep the PR body small.
- When only timestamps moved, it says so.
- Smoke run on the real snapshot against a modified copy: correct counts and ids.

## Tests

- **`gamedataPublication.test.ts`** (7):
  - FNV vectors (`''`, `'a'`, `'foobar'`);
  - payload is the canonical JSON and the manifest is exact;
  - deterministic and minified, and a new `fetchedAt` gives a new name;
  - UTF-8 byte count;
  - bundled round-trip;
  - throws on invalid data;
  - paths are pinned inside `gamedata/`.
- **`activeSnapshot.test.ts`, refresh** (10):
  - newer: adopt and persist, payload fetched once;
  - same or older `fetchedAt`: keep, payload never fetched;
  - older-version manifest: keep;
  - checksum mismatch: `invalid`, nothing written;
  - zod-invalid payload with a matching checksum: `invalid`;
  - payload disagrees with its manifest: `invalid`;
  - invalid manifest, including `../evil.json`: `invalid`, no payload fetch;
  - newer-than-app: no payload fetch;
  - manifest or payload network failure: `unavailable`;
  - default fetchers: exact URLs, `cache: 'no-store'` on the manifest only, HTTP 404 → `unavailable`.
- **`snapshotStore.test.ts`** (8):
  - one manifest check per session, a failure keeps serving silently;
  - background adoption uses same-origin URLs only, with no `encore.moe`;
  - manual check offline → `unavailable`;
  - manual check when already current answers from the manifest alone;
  - manual adopt and persist.
- **`DatabasePageFreshness.test.tsx`** (7): the offline toast, an "already up to date" toast, background adoption on first visit, and live manual adoption.
- **`scripts/gamedata-summary.test.ts`** (8): hand-built fixtures with exact expected output, plus the 2 `hasDataChanges` tests.
- **`scripts/workflows.test.ts`** (8; includes the cron default-branch check and the `--changed` detection):
  - all 3 workflow files parse;
  - every `uses:` is `actions/*@<40-hex>`;
  - the sync triggers, permissions and concurrency;
  - the read-only job runs the gates;
  - the write job runs no npm/npx/node, never `gh pr merge`/`--auto`, and uses only checkout + download-artifact.

## Gate results (final tree)

- `npm run lint`: clean.
- `npx tsc -b`: clean. One run during the work failed in `src/state/share.ts` (bugfix's in-progress file); the final run was clean.
- `npm run test`: **89 files, 969/969 passed.** After the review fixes and the js-yaml change:
  - lint and `npx tsc -b` are clean;
  - `npx vitest run scripts/`: 16/16;
  - the full suite at first had 1 failure, in bugfix's in-progress `src/ui/pages/BuildsPage.test.tsx` ("previews a v2 link as a build card…"; not touched by me);
  - the final run: **89 files, 1002/1002 passed.**
- `npm run build`: succeeds. It emits `dist/gamedata/manifest.json` and `dist/gamedata/snapshot-cb54b6f2.json`; precache is 39 entries.

## Browser verification

Setup: `npm run preview` (port 4173) driven by playwright-core 1.48.2, installed only in my scratchpad, with `/usr/bin/chromium` 154 headless and a fresh context per scenario.

1. **Current data:**
   - `gamedata/` requests: only `manifest.json` (up to date, so no payload);
   - 0 requests to `api-v2.encore.moe`;
   - origins: the site plus `https://api.encore.moe` (art);
   - 0 `securitypolicyviolation` events, 0 console warnings or errors.
2. **Newer manifest adopted.** I wrote a newer publication into `dist/gamedata` (fetchedAt +1 day, first character renamed "Testina") with a scratch tsx script calling `buildGamedataPublication`.
   - Requests: `manifest.json`, then `snapshot-4ebb2f25.json`;
   - the pill read "Cached · 2026-10-04" and "Testina" rendered;
   - IndexedDB `gamedataCache/active` = `{ fetchedAt: 2026-10-04T12:31:17.343Z, checksum: 4ebb2f25 }`;
   - 0 CSP violations, 0 provider API requests.
3. **Service worker.** With the SW active and controlling the page, a reload fetched the manifest with `fromServiceWorker: false`. Cache Storage held 36 entries, none under `gamedata/` and no `.json`.

Afterwards I restored `dist/` with a clean `npm run build`. The dev middleware was checked with curl: manifest and payload return 200.

## Not verified

- **The workflow itself has never run.** It isn't dispatched, and nothing was pushed. Tested: the YAML parses, its structure is as specified, and the SHAs match. Untested on GitHub:
  - the `gh pr create`/`edit` paths;
  - the force-push to `data/gamedata-sync`;
  - the artifact round-trip;
  - permission behaviour with the repo setting off. In that case `gh pr create` should fail, and the branch would still be pushed.
- `npm run sync` wasn't run (as instructed). The workflow relies on it exiting non-zero on provider failure, which is the current behaviour of `scripts/sync-gamedata.ts`.
- **Real GitHub Pages:** I didn't check `Content-Type`/caching headers for `gamedata/*.json` there. I expect `application/json` with Pages' default caching. The manifest uses `cache: 'no-store'` client-side, so a CDN cache of up to about 10 minutes only delays adoption.
- **Phones, Safari and Firefox:** not tested.
- **A first visit with no service worker during a deploy:** the old manifest could point at a payload the new deploy removed. Pages swaps the whole site at once, so the window is tiny. If it happens, the result is `unavailable`, and the check runs again next session.
- **js-yaml:** resolved. The user approved it, and it is now an explicit devDependency (see "Update after coordinator review").

## User actions required

1. **Repo setting:** Settings → Actions → General → Workflow permissions → enable "Allow GitHub Actions to create and approve pull requests". Without it, `open-pr` can push the branch but can't open the PR.
2. **Review and merge sync PRs.** Each weekly run that finds changes opens or updates one PR from `data/gamedata-sync`, with a change summary. Read the summary and the diff, then merge. The merge (a push to `main` by you) triggers `deploy.yml`, which publishes the new `gamedata/`. Nothing auto-merges.
3. **Optional:**
   - Run it once by hand: Actions → "Sync game data" → Run workflow.
   - If you want CI on the PR itself, push an empty commit to the PR branch yourself, or close and reopen it. GITHUB_TOKEN-created PRs don't trigger `ci.yml`; the sync run already ran the same gates.

## Proposed AGENTS.md text

**Architecture → Data layer, runtime contract.** Replace the sentence that begins "Runtime contract (`data/activeSnapshot.ts`, React bridge `state/snapshotStore.ts`):" through "never fork a second one." with:

> Runtime contract (`data/activeSnapshot.ts`, React bridge `state/snapshotStore.ts`): fallback order is validated IndexedDB cache (`gamedataCache`/`active` row: payload + FNV checksum; checksum recomputed on every read, zod validation memoised once per (production build, checksum)) -> bundled `snapshot.json` (imported as a string and `JSON.parse`d; trusted at runtime, gated by `src/data/index.test.ts`) -> opportunistic background revalidation against the reviewed same-origin publication that never blocks load: one `<base>gamedata/manifest.json` check per session (`cache: 'no-store'`) plus manual "Check for updates" on the Database page. The payload `<base>gamedata/snapshot-<checksum>.json` is downloaded only when the manifest is strictly newer, then must match the manifest's checksum, version and `fetchedAt` and pass zod before `writeCachedSnapshot` adopts it. Version decides who serves (matching-or-newer cache wins), adoption needs a strictly newer candidate, newer-than-app publications are held out; anything else keeps serving current data. Browsers never call the provider API (CSP `connect-src 'self'`). `data/providerSync.ts` is the single provider pipeline; it runs only in `npm run sync` (CLI) and the scheduled CI sync — never fork a second one. `data/gamedataPublication.ts` (pure) builds the manifest/payload for the build plugin and is the client's manifest schema.

**Hosting (GitHub Pages).** Add a bullet:

> - Game data publication: `vite.config.ts` `gamedataPublication()` emits `gamedata/manifest.json` and the content-addressed `gamedata/snapshot-<checksum>.json` from the committed snapshot on every build (also served by `npm run dev`). The service worker never precaches or runtime-caches `gamedata/**` (IndexedDB owns adopted data). New data reaches users only by merging a reviewed PR: `.github/workflows/sync-gamedata.yml` (weekly + manual) runs `npm run sync` and every gate in a read-only job, then a write job with no npm commits the artifact to `data/gamedata-sync` and opens/updates a PR with a `scripts/gamedata-summary.ts` change summary. No auto-merge. Requires the repo setting "Allow GitHub Actions to create and approve pull requests".

Also in Hosting, change "Never let the SW cache encore.moe; `activeSnapshot.ts` owns that cache." to:

> Never let the SW cache encore.moe or `gamedata/**`; `activeSnapshot.ts` owns game data via IndexedDB.

**Commands.** Change the `sync` line and add one:

```
npm run sync       # encore.moe -> src/data/generated/ (CLI; CI runs it weekly via sync-gamedata.yml — avoid ad-hoc full syncs, ~370 requests)
npx tsx scripts/gamedata-summary.ts <before.json> <after.json>   # Markdown change summary used in sync PRs
```

**Docs.** `docs/WUWA_GAME_REFERENCE.md` §8 (the fetch-validate-cache-fallback pipeline) and `docs/toddo.md` "Data freshness" still describe browsers re-syncing from the provider with a 7-day staleness gate. Both need the same change: browsers revalidate against the published manifest, and the provider is synced only by CLI/CI. I didn't edit `docs/`.

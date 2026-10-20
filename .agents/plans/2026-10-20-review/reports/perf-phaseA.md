# perf — Phase A report (startup cost)

Status: Phase A complete. All gates green. Nothing committed. Phase B not started
(`src/optimizer/`, `RotationOptimizer` untouched). Waiting for "phase B go".

## Files changed

| File | Change |
|---|---|
| `src/data/index.ts` | Bundled snapshot is imported as a string (`./generated/snapshot.json?raw`) and read with `JSON.parse`, cached once per session. zod no longer runs on it at runtime (see the gate test below). |
| `src/data/index.test.ts` | New `bundled snapshot validation gate` block (3 tests). Not listed in my brief; edited because it is the test for `index.ts`. |
| `src/data/activeSnapshot.ts` | Validation memo: `ValidationMemo`, `SNAPSHOT_VALIDATED_KEY` (`wuwa-optimizer-snapshot-validated`), `defaultValidationMemo()`. `readCachedSnapshot(readRow, memo)` checks the checksum first, then skips zod if the memo matches `${buildId}:${checksum}`. On a successful check it writes the memo. `writeCachedSnapshot(snapshot, writeRow, memo)` records the memo after a validated write. |
| `src/data/activeSnapshot.test.ts` | New `cache validation memo` block (6 tests). |
| `src/App.tsx` | Route-level code splitting: `PAGE_IMPORTS` + `React.lazy` per section, `Suspense` with the existing `Skeleton lines={4}` fallback, idle prefetch of the other pages (`requestIdleCallback`, 3 s timeout; fallback `setTimeout` 1 s). Pages that already loaded render directly, with no fallback flash. Footer paragraph untouched (secpriv's). |
| `src/App.test.tsx` | New `route-level code splitting` block (2 tests, using a fresh module registry and a stubbed `requestIdleCallback`). |
| `vite.config.ts` | `build:` block only: `build.rolldownOptions.plugins` gets `wuwa-minify-snapshot-json`, which turns `snapshot.json?raw` into a minified JSON string in production builds. Scanner/OCR work, workbox routes and CSP untouched. |

Not changed: `src/state/snapshotStore.ts` (and its test). Its synchronous seed now uses the cheaper `loadBundledSnapshot()`, so no change was needed. `scripts/bench-optimizer.ts` is left for phase B.

## Why each change is safe

- **Trusting the bundled snapshot.** I checked that `snapshotSchema.parse(file)` deep-equals the file itself, so the committed file is already zod's output. The sync writes `assembleSnapshot()`'s parsed result. `index.test.ts` now asserts:
  - `snapshotSchema.parse(raw)` `toStrictEqual` `raw`;
  - `loadBundledSnapshot()` `toStrictEqual` the parsed data;
  - the loader parses once per session.

  A re-sync that breaks this fails `npm run test` (and CI).
- **Validation memo.** zod parsing depends only on (schema, payload), and the cached payload is itself a parse result. So once checksum C has passed under build B, checking it again under B gives the same result.
  - The checksum is still recomputed on every read, so a corrupted payload can't match the memo.
  - `buildId` is `import.meta.url`, the hashed production chunk URL. Any change to code, schema or zod renames it, which invalidates the memo.
  - Outside a production build (`!import.meta.env.PROD`) the memo is off, so dev and tests validate every time.
  - The memo is best-effort: if storage read or write throws, the read just validates again.
- **Decision (a) from `docs/toddo.md`** (pages render from the bundled snapshot straight away, no flash) is kept. The snapshot chunk is a static dependency of every page chunk, so the store's synchronous seed is ready whenever a page renders.

## Before/after numbers

### Chunk sizes (`npm run build`, `dist/assets/`)

| Chunk | Before (baseline build, start of session) | After (final build) |
|---|---|---|
| `index-*.js` (entry) | 506.72 kB (gzip 111.49 kB) | **23.56 kB (gzip 8.44 kB)** |
| `snapshot-*.js` | 1,989.22 kB (gzip 390.83 kB), JS object literal | 2,199.27 kB (gzip 404.23 kB), minified JSON string |
| `vendor-*.js` | 382.71 kB (gzip 117.45 kB) | 382.71 kB (gzip 117.36 kB) |
| New page chunks | — | Inventory 63.79, Calculator 331.73, Database 16.39, Teams 7.56, Roster 7.10, Builds 5.04 kB; shared `ui` 35.94 kB plus small shared chunks |
| Precache | 20 entries (3803.88 KiB) | 41 entries (4090.80 KiB). The count includes secpriv's self-hosted fonts. |

- The entry chunk now loads only the runtime and `vendor`. The snapshot and the opening page arrive through the page's dynamic import.
- Trade-off: the snapshot chunk is about 13 kB gzip bigger. Keys keep their quotes inside a JSON string, whereas the minified object literal dropped them. I accepted that for the parse speed below.
- The 500 kB chunk-size warning remains, for the snapshot chunk only.

### Startup timing (method)

Node v26.12.0, this machine. Each run is a fresh `npx tsx` process, so every number is cold. Medians are over 7 runs.

- "before" evaluates the baseline minified snapshot chunk (object literal), then runs `snapshotSchema.parse`.
- "after" evaluates the new chunk (string), then runs `JSON.parse`.

Timing scripts (run from the repo root):
- `/tmp/claude-1000/-home-userman-Projects-WuwaC/cc99998c-e067-4b4b-a4cb-f91056c836da/scratchpad/startup-bench.sh 7`
  - runs `startup-one.mts` in the same folder;
  - its inputs are `snapshot-before.js` and `snapshot-after.js` in the same folder (copies of the two built chunks).
- Cache-read zod cost: `npx tsx /tmp/claude-1000/-home-userman-Projects-WuwaC/cc99998c-e067-4b4b-a4cb-f91056c836da/scratchpad/cache-zod.mts <jit|jitless>`
- Step breakdown: `npx tsx /tmp/claude-1000/-home-userman-Projects-WuwaC/cc99998c-e067-4b4b-a4cb-f91056c836da/scratchpad/snapshot-timing.ts <chunk>`

Bundled-snapshot path, i.e. the synchronous seed that runs before the first page renders. Two final runs:

| Variant | Evaluate chunk | Load (zod / JSON.parse) | Total |
|---|---|---|---|
| before, zod JIT | 77.3–78.9 ms | 58.5–67.6 ms | 136.2–145.1 ms |
| before, zod jitless | 76.8–77.8 ms | 60.9–69.1 ms | 137.7–146.5 ms |
| **after** | 32.3–32.6 ms | 19.6–19.9 ms | **52.1–52.2 ms** |

Result: about 2.6× faster. All of the zod cost is gone from this path, and the chunk evaluates more than 2× faster.

Cache path (runs after the first render, in `ensureLoaded`):
- The IDB read is roughly a `structuredClone`: 23–30 ms.
- `JSON.stringify` is about 7 ms and the FNV checksum 4–7 ms. Both are still paid on every read.
- The memo skips `safeParse` after the first check per (build, checksum):
  - JIT: cold 67–72 ms, warm median 26–29 ms;
  - jitless: cold 67–76 ms, warm median 26–30 ms.

## Coordinator notes — both handled

1. **zod jitless (production CSP has no `'unsafe-eval'`).**
   - Handled. I measured with `z.config({ jitless: true })`.
   - I confirmed it reached the same zod instance the schema uses (`globalConfig.jitless === true`). The scratch scripts are ESM and import zod's ESM entry by absolute path. My first attempt hit the CJS copy, which is a separate instance, so I discarded those numbers.
   - Finding: for this schema jitless costs about the same as JIT in Node, both cold and warm (tables above).
   - Either way, the bundled path no longer runs zod, and the cache path runs it once per (build, checksum). The saving holds under the production CSP.
2. **tsc TS2591 `node:fs` in `src/data/index.test.ts`.**
   - Handled. The test now imports the JSON directly (`import bundledJson from './generated/snapshot.json'`, the same pattern as `activeSnapshot.test.ts`), with no `node:fs`.
   - I also fixed a second tsc error I had introduced in `App.tsx` (TS2352, `Object.fromEntries` cast). `LAZY_PAGES` is now built with a typed loop.
   - `npx tsc -b` is clean.

## Tests added

- `src/data/index.test.ts`, "bundled snapshot validation gate":
  - the file is already the parse output (`toStrictEqual`);
  - the runtime loader serves exactly the validated data;
  - it parses once per session (same object identity).
- `src/data/activeSnapshot.test.ts`, "cache validation memo". Expected memo values are written out in the test as `` `build-A:${checksumJson(JSON.stringify(cached))}` ``.
  - off outside a production build (`defaultValidationMemo()` returns `null`);
  - validates once per (build, checksum), then skips the check (`safeParse` called exactly once across two reads);
  - a memo from another build validates again and is rewritten;
  - a memoised checksum never skips the checksum check (corrupted payload returns `null`);
  - an invalid payload is never memoised;
  - an unreadable or unwritable memo falls back to validating;
  - a validated write is memoised, so the next read skips the check.
- `src/App.test.tsx`, "route-level code splitting":
  - the loading status shows until the opening section's chunk arrives, then the page renders;
  - pages are prefetched when idle, so navigating renders the page with no fallback.

  Mutation check: with the prefetch call commented out, that second test fails. I then restored it.
- The 4 existing App shell tests stay green unchanged. They already used `findByRole`.

## Gate results (final, after all edits)

- `npm run lint`: clean, no output.
- `npx tsc -b`: clean, no output.
- `npm run test`: **83 files, 918 tests passed**, 0 failed.
- `npm run build`: succeeds. The only warning is the >500 kB chunk-size warning for the snapshot chunk.
- Targeted runs during work:
  - `npx vitest run src/data/activeSnapshot.test.ts src/state/snapshotStore.test.ts src/data/index.test.ts` → 49 passed;
  - `npx vitest run src/App.test.tsx src/data/index.test.ts` → 11 passed.
- Chunk correctness: the built snapshot chunk's string `JSON.parse`s to data deep-equal to `src/data/generated/snapshot.json` (`isDeepStrictEqual` → true).

## Not verified

- No real-browser or phone timing. All numbers are from Node. Browsers parse scripts partly off the main thread, so absolute values will differ; the before/after ratio is the useful part.
- The production-only memo path (`import.meta.env.PROD`, `import.meta.url` as the build id, real localStorage) is unit-tested only through a stand-in. I have not run it in a deployed or preview build. I am also relying on, without checking, the assumption that a code change in an imported chunk always renames the importing chunk.
- Under the production CSP I have not checked how evaluating the template-literal string chunk behaves. It's plain script evaluation, not eval, so I expect no CSP impact.
- The idle prefetch hasn't been observed in a browser network panel.

## Open questions

1. **Failed page-chunk load.** `React.lazy` remembers a failed load, so if a page chunk fails, every visit to that section throws and the app unmounts. Example: a first visit during a deploy, before the service worker has precached. Fix: a per-section ErrorBoundary, ideally with a "reload" action. If `bugfix` provides one, I'll mount it per section in `App.tsx`. The prefetch failing on its own is harmless, because the page's own lazy load retries on visit.
2. **First-load visual.** The snapshot chunk now arrives with the first page instead of with the shell. On a cold first visit the header and a skeleton show before the page, where before there was a blank screen until everything loaded. Navigation after the prefetch is instant with no flash, so decision (a) holds for navigation. OK?
3. **Snapshot chunk +13 kB gzip.** Accepted for the faster parse. An alternative is to ship the snapshot as a fetched `.json` asset, but that breaks decision (a) and isn't worth it.
4. **Memo storage.** The memo lives in localStorage, not Dexie, so it is outside the backup format, deliberately: it's a cache hint. Losing it only costs one more check. Agree it should stay out of `state/backup.ts`?
5. **Possible next step, not done.** Move the cache read, check and checksum into a worker so the first post-load cache read (about 100 ms+ on phones) stays off the main thread. I judged the memo enough for now.

## Proposed doc updates (coordinator to integrate; I did not edit docs)

- **AGENTS.md → Architecture → Data layer, runtime contract.** Replace "validated IndexedDB cache (`gamedataCache`/`active` row: payload + FNV checksum, re-validated on every read)" with:
  > validated IndexedDB cache (`gamedataCache`/`active` row: payload + FNV checksum; checksum recomputed on every read, zod validation memoised once per (production build, checksum) in localStorage `wuwa-optimizer-snapshot-validated`) -> bundled `snapshot.json` (imported as a string and `JSON.parse`d, trusted at runtime; `src/data/index.test.ts` gates that the committed file is already the schema's parse output — a re-sync that breaks this fails the tests)
- **AGENTS.md → Hosting → Build chunks.** Add:
  > Pages are lazy-loaded per section (`App.tsx` `PAGE_IMPORTS`, idle prefetch); the shell entry chunk carries no page or snapshot code. `build.rolldownOptions.plugins` ships the snapshot as a minified JSON string.
- **docs/toddo.md → "Data freshness" follow-ups.** Mark "lazy-load the bundled snapshot out of the JS bundle (still shipped inline)" as partly done: it's its own chunk, loaded with the first page and parsed via `JSON.parse` without zod. Fully async loading is still blocked by decision (a).
- **Optional: a repo timing script.** Add a `scripts/bench-snapshot.ts` (from the scratchpad `snapshot-timing.ts`), with an `npm run bench:snapshot` entry, so startup cost can be measured again. It needs a `package.json` edit, which is secpriv's.

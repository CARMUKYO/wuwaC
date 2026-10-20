# Brief: bugfix — self-contained share links (v2), approved 2026-10-21

You built the v1 share-link flow yesterday: `#b=` is captured into
`useAppStore.shareLink`, and BuildsPage previews it with Import / Dismiss.
The user has approved making links self-contained. A v1 link carries only
the sender's Echo IDs, which mean nothing in the recipient's inventory.

## Coordination

`perf` is working in the same tree right now, publishing game data from CI.

**`perf` owns** (don't edit):
- `vite.config.ts`, `index.html`, `src/App.tsx`
- `src/data/activeSnapshot.ts`, `src/state/snapshotStore.ts`
- `src/ui/pages/DatabasePage.tsx`
- `.github/**`, `scripts/**`, `package*.json`

**You own:**
- `src/state/share.ts` (+test)
- `src/state/store.ts` (+test), if needed
- `src/state/library.ts` (+test)
- `src/ui/pages/BuildsPage.tsx` (+test)
- `src/state/calculator.ts` (+test)
- `src/ui/pages/CalculatorPage.tsx`
- `src/App.share.test.tsx`
- new UI components under `src/ui/components/`
- in `src/data/schema.ts`: only the build/share schemas

**Shared file:** `src/ui/pages/CalculatorPage.test.tsx`. `perf` is adding
`scored`/`total` to the mocked `SearchResult` near line 26. Re-read the file
before every edit and don't touch that mock.

All of yesterday's ground rules still hold
(`.agents/plans/2026-10-20-review/briefs/00-ground-rules.md`): no git state
changes, no dependency changes, no `AGENTS.md`/`README.md`/`docs/` edits
(propose the text instead), and preserve the user's scanner work. Read
`AGENTS.md` again: Dexie guardrails, no fabricated values, Pixel Arcade UI
rules.

## What the link carries (v2)

**Include:**
- the build name, the score, and a short summary of the objective
- the character id, with level, ascension, Resonance Chain and forte levels
- the weapon id, with level, ascension and rank
- the 5 Echoes' full data: def, set, cost, level, rarity, main stat,
  secondary main stat and substats
- which Echo is in slot 1
- **opt-in only:** the full rotation / objective spec. Add a checkbox next to
  "Copy link", default off; it's large.

**Leave out:**
- the sender's internal Echo ids
- `equippedTo` and `origin`
- notes and private labels

## Encoding

- Compact JSON → `CompressionStream('deflate-raw')` → base64url, carried
  after `#b=`. The browser built-in means no new dependency, and the
  fragment is never sent to the server.
- The format must say which version it is before anything is decompressed.
  Keep decoding every existing v1 link.

## Treat every link as untrusted input

- Cap the hash length before decoding. Cap the decompressed bytes while
  streaming, and abort past the cap (decompression bomb).
- Use a strict zod schema:
  - reject unknown keys
  - bounded string lengths and array sizes
  - exactly 5 Echoes
  - finite numbers only
- Ids unknown to the recipient's game data get a clear message, not a crash.
- Check stat values against the existing tables in `src/data/echoStats.ts`
  (`MAIN_STAT_RANGES`, `SUB_STAT_TIERS`, `SECONDARY_MAIN_STAT_MAX`). Flag
  out-of-range values visibly in the preview. Never invent ranges, and never
  silently "fix" values.

## What the recipient gets (BuildsPage preview)

- **A read-only build card**, calculated with the recipient's own snapshot
  through the domain layer (no formulas in `.tsx`), showing the key stats and
  the 5 Echoes. Reuse existing display components where they fit.
- **"Save as reference":** stores the shared build in the library WITHOUT
  adding the sender's Echoes to `ownedEchoes`.
  - Pick the least risky data-model change and explain it.
  - Adding an optional unindexed field to `builds` needs no Dexie version
    bump. Never edit an existing `version(n)`.
  - Check the backup format: `state/backup.ts` validates builds with
    `buildSchema`. Decide whether `BACKUP_VERSION` needs a bump (keep reading
    v1) and justify it.
  - Reference builds must not break code that assumes `echoIds` resolve to
    the inventory: the Builds list, apply/equip, the optimizer.
- **"Optimize with my Echoes":** loads the character, weapon and roster
  context (plus the rotation, if the link carries it) into the Calculator,
  then navigates there. The user's own roster entry must not be overwritten
  silently; ask, or use a non-persisted draft, and explain your choice.
- **Import / Dismiss behaviour:** unchanged from v1, apart from these new
  actions.

## Tests

- v2 round trip; v1 links still decode.
- Size caps: an oversized hash is rejected before decompressing, and a
  decompression bomb is rejected.
- The strict schema rejects unknown keys, a 6th Echo, and NaN/Infinity.
- Out-of-range values are flagged; unknown ids are handled.
- The preview renders the card.
- Save as reference leaves `ownedEchoes` untouched.
- Optimize loads the calculator without overwriting the roster.
- An App-level cold open with a v2 link.
- The include-rotation toggle changes the payload.

Gates at the end: `npm run lint`, `npx tsc -b`, `npm run test`,
`npm run build`. Failures in `perf`'s files get reported, not fixed.

## Report

Write `.agents/plans/2026-10-21-share-links-v2/report.md` covering:
- files changed
- the format spec (fields, version tag, caps)
- the data-model and backup decision
- tests
- gate results
- what's unverified
- open questions
- proposed doc text

Reply with the path and a 5-line summary.

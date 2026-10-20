# Report: bugfix — self-contained share links (v2)

Date: 2026-10-21. All work is uncommitted on `main`. No git state changes, no dependency changes, and no edits to `AGENTS.md`, `README.md` or `docs/`. I touched none of perf's files and didn't edit the shared `CalculatorPage.test.tsx`.

## Gate results (final run, after all edits)

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npx tsc -b` | clean |
| `npm run test` | 89 files, 1004 tests, all passed |
| `npm run build` | built; one chunk-size warning, for the pre-existing 2.2 MB `snapshot` chunk (same hash as before my change), not mine |

## Files changed

| File | Change |
|---|---|
| `src/data/schema.ts` | Build/share schemas only: `SHARED_BUILD_VERSION`, `sharedEchoSchema`, `sharedObjectiveSchema`, `sharedBuildSchema`, plus `SharedBuild`/`SharedEcho` types. `buildSchema` gains an optional `reference` field. |
| `src/state/share.ts` | Rewritten: v2 codec with caps, v1 decode kept, the sender-side payload builder, value checks, the recipient view (card stats through the domain layer), reference builds, and the calculator draft. |
| `src/state/share.test.ts` | Rewritten, 22 tests. |
| `src/state/calculator.ts` | New `draftSource` state and `loadSharedDraft()` action. `resetFromRoster`, `resetAll` and a character switch clear `draftSource`. |
| `src/state/calculator.test.ts` | +3 tests. |
| `src/state/library.test.ts` | +2 tests. `library.ts` itself needed no change: `importBuilds` already validates with `buildSchema` and dedupes by id. |
| `src/ui/components/SharedBuildCard.tsx` | **New** read-only card. |
| `src/ui/pages/BuildsPage.tsx` | Async decode, the v2 preview (card + Save as reference / Optimize with my Echoes / Dismiss), the v1 preview unchanged, a "reference" tag in the list, Copy link now makes v2 links, and a per-build "+ rotation" checkbox (default off). |
| `src/ui/pages/BuildsPage.test.tsx` | The copy-link test is rewritten; 6 new tests. |
| `src/ui/pages/CalculatorPage.tsx` | One info banner when `draftSource` is set. |
| `src/App.share.test.tsx` | +1 App-level v2 cold-open test. The 2 v1 tests are kept. |

Not changed: `store.ts`, `library.ts`, `backup.ts`, `db.ts`. Their `M` status in git is from 2026-10-20 or from other agents.

## Format spec

### Hash
- **v2:** `#b=2.<base64url(deflate-raw(UTF-8 JSON))>`.
  - The `2.` version tag comes before the payload, and `.` is outside the base64url alphabet. So the decoder knows the version before decompressing anything.
  - Any other `#b=<digits>.` prefix gets "unsupported build link version N".
- **v1 (legacy, decode only):** `#b=<base64url(JSON {v: 1, build})>`. Still decoded and still previewed with the old Import/Dismiss. `encodeBuildLink` stays only so tests can produce v1 links.
- **Encoding:** compact `JSON.stringify` → `CompressionStream('deflate-raw')` → base64url without padding. Browser built-ins only, no new dependency. The data lives in the URL fragment, which browsers never send to a server.

### Caps (untrusted input)
- **Hash length:** `MAX_SHARE_HASH_LENGTH` = 16 384 characters, checked before base64 or inflate. A test stubs `DecompressionStream` and asserts it is never constructed for an oversized hash.
- **Inflated size:** `MAX_SHARE_JSON_BYTES` = 65 536 bytes, enforced *while streaming*. The reader is cancelled and the decode rejected as soon as the output passes the cap. Tested with 256 KiB of zeros, which deflates to a short hash.
- **Encoder mirrors both caps**, so the app never hands out a link it would refuse to open. The error says "try without the rotation".
- **Base64url:** strict character set; anything else is "not valid base64".
- **Corrupt data:** a corrupt deflate stream gives "not valid compressed data". Invalid UTF-8 or JSON gives "not valid JSON". A browser without `CompressionStream` gets a readable error.
- **Measured sizes:** a full 5-Echo link with 5 substats each is about 520 hash characters. With a 30-block rotation it is about 860.

### Payload (`sharedBuildSchema`)
Every object is `z.strictObject`, so unknown keys reject. Numbers are finite: zod 4 rejects NaN and Infinity, and a `1e999` in the JSON is rejected (tested).

| Key | Shape |
|---|---|
| `v` | literal `2` |
| `name` | string, 1–80 characters. The sender truncates longer names. |
| `score` | finite number, optional |
| `summary` | string ≤ 120: the build's `objectiveId` label |
| `character` | `{ id ≤64, level 1–90, ascension 0–6, chain 0–6, forte: record<skillId ≤64, int 1–10> (≤16 keys), nodes?: forte-node ids ≤64 (≤32) }` |
| `weapon` | `{ id ≤64, level 1–90, ascension 0–6, rank 1–5 }` |
| `echoes` | tuple of **exactly 5** in slot order; **`echoes[0]` is slot 1** |
| `objective` | **opt-in only**: the full objective spec (see below) |

Each Echo is `{ def ≤64, set ≤64, cost 1|3|4, level 0–25, rarity 1–5, main {stat, value 0–100000}, second?, subs ≤5 }`. Duplicate substats are rejected.

`objective` is `objectiveSpecSchema` made strict and bounded:
- at most 200 blocks, 64 buffs, 32 mods per buff and 64 buff ids;
- strings capped at 64 or 120 characters;
- expected-damage `forteLevel` capped at 10.

**Left out:** Echo ids, `equippedTo`, `origin`, labels and notes. A test serializes a payload built from an inventory that has all of those set and asserts none of them appear.

`character.nodes` (unlocked forte nodes) is an addition the brief didn't list. It is roster context that changes the computed stats, so the link carries it only when the sender has explicit unlocks.

### Sender side
`sharedBuildFromLibrary()` takes the build's Echoes from the inventory and the level/chain/forte/weapon context from the sender's own Roster entry, because builds don't store that context. It refuses rather than guesses:
- an Echo has left the inventory;
- the character isn't in the Roster;
- the Roster entry has a different weapon equipped;
- a Roster value is outside the schema (for example forte 11).

The errors are readable and shown inline on the Builds page. A reference build re-shares its stored payload, and the "+ rotation" toggle is respected there too.

## Value checks (no invented ranges)
`checkSharedEchoValues()` reads only `MAIN_STAT_RANGES`, `SECONDARY_MAIN_STAT_MAX` and `SUB_STAT_TIERS`, the same basis the scanner's `values.ts` uses.

| Value | Rule |
|---|---|
| Main stat | Not in the cost's table: **out-of-range** ("not a 1-cost main stat"). 5★ +25: must equal the table maximum. 5★ below +25: must be inside [min, max]. Non-5★: **unverified**, because the tables are a 5★ reference. |
| Secondary | Wrong stat for the cost: out-of-range. 5★ +25: must equal the table value. 5★ below +25: upper bound only, as the table comment says. Non-5★: unverified. |
| Substat | No tier table: unverified. Non-5★: unverified. 5★: must equal a tier exactly; anything else is out-of-range. |

Values are never changed. The card marks out-of-range values with `!` (ember underline, screen-reader text, the reason in a tooltip) and adds a danger alert with the count. Unverified values get `?` and a muted count line.

## Data-model decision: reference builds
**Choice:** a new optional, unindexed `reference?: SharedBuild` field on `buildSchema`, holding the full payload.
- `echoIds` become placeholders `ref:0`..`ref:4`. They can't collide with inventory UUIDs and they satisfy the existing 5-unique-ids rule.
- The id is `ref-<FNV-1a of the payload>`, so saving the same link twice is reported as a duplicate.
- Nothing is written to `ownedEchoes`; tested at the DB level in two places.

**Why this is the least risky option:**
- **No Dexie change.** The `builds` store indexes only `id, characterId`, so an unindexed optional field needs no `version(n+1)`. No existing version was edited.
- **Existing rows are untouched.** They simply lack the field.
- **No path resolves library echo ids.** I checked every consumer. Library builds are read only by BuildsPage (list, copy link, delete, JSON export/import) and `backup.ts`. Apply/equip in `RotationOptimizer` and the optimizer work on search results and the inventory, never on library rows. The Builds list shows a "reference" tag, and Copy link uses the stored payload.
- **The rejected alternative** was writing the sender's Echoes into `ownedEchoes` with a flag. That would pollute the inventory, the optimizer pool and roll statistics, and would need a filter in every consumer.

**Backup: no `BACKUP_VERSION` bump.** It stays 1.
- `backupSchema` validates builds with `buildSchema`, which now accepts the optional `reference`. Every existing v1 backup still parses, because the field is optional.
- A new backup still matches the v1 format: it is a superset with one optional key. A test parses a version-1 backup that contains a reference build.
- Downgrade cost: an *older* app restoring a new backup strips the unknown key (zod's default). Reference builds would then show as ordinary builds whose Echoes don't resolve, which is cosmetic. A bump would instead make the older app refuse the whole backup. I judged that worse for a PWA that prompts users to update.

## "Optimize with my Echoes": non-persisted draft
The calculator store is already documented as session-local overrides that never write back to the roster. `loadSharedDraft()` reuses that:
- it sets character, levels, chain, forte (and nodes), weapon level, ascension and rank;
- `rosterSourceId` becomes `''` ("Manual input"), so nothing is linked to or saved over the user's roster entry;
- Echo slots are cleared, so the user's own Echoes or the optimizer fill them;
- a carried `rotation-dpr` objective replaces blocks (with fresh ids), buffs, global buffs and the crit mode.

Blocks whose motions the recipient's game data lacks are dropped and counted with `isBlockStale`, as presets do, and a toast reports the count. CalculatorPage shows a banner: "Loaded from the shared build … your Roster wasn't changed …; 'Prefill from roster' switches back".

I chose this over asking the user, because no write happens at all. Tests assert the DB roster row is byte-identical afterwards.

The share link stays pending after Optimize, so going back to Builds still offers Save as reference or Dismiss. Save and Dismiss resolve it to `#builds`, as in v1. The "Optimize" button is disabled when the character or weapon is unknown to the recipient's game data.

## Recipient card
`viewSharedBuild()` (state layer) resolves ids against the recipient's snapshot and computes key stats only through domain functions: `computeStats` with slot 1 as `mainEcho`, then `computeHp`/`computeAtk`/`computeDef`.
- **Stats shown:** HP, ATK, DEF, Crit Rate, Crit DMG, Energy Regen and the character's attribute DMG.
- **Rounding:** presentation only, in the `.tsx`. There are no formulas in `.tsx`.
- **Unknown ids** for character, weapon, Echo def or Sonata set become warning lines, never exceptions. Without a character and weapon, the stats block is omitted.
- **Reused pieces:** `GameIcon`, `CostPips` (cost is also shown as text, since pips are `aria-hidden`), `statLabel`, `formatStatValue`, `sonataName`, `sonataTint`, `Alert`. Pixel Arcade tokens only, no raw hex, and no `text-dim` on readable text.
- **Assumptions:** the domain layer's applied assumptions and unmodeled effects sit in a `<details>`. A caption notes that the sender's rotation buffs aren't included in the card stats.

## Tests

| Brief item | Tests (file) |
|---|---|
| v2 round trip; v1 still decodes | `share.test.ts`: "round-trips, tagged with its version…", "still decode through decodeShareLink", plus the v1 encode/decode and reject cases |
| Oversized hash rejected before decompressing | `share.test.ts` (`DecompressionStream` stubbed and never called) |
| Decompression bomb rejected | `share.test.ts` ("expands past 65536 bytes") |
| Strict schema: unknown keys, 6th Echo, NaN/Infinity | `share.test.ts`: top-level extra key, extra key inside an Echo, 6 Echoes, `1e999` via JSON, NaN and Infinity via the schema |
| Out-of-range flagged | `share.test.ts` (4 `checkSharedEchoValues` cases with table values); `BuildsPage.test.tsx` (the card shows "1 value falls outside" and the "out of range: 5★ +25 value is 0.22" text) |
| Unknown ids handled | `share.test.ts` (exact issue lines, no stats, no throw); `BuildsPage.test.tsx` (message shown, Optimize disabled) |
| Preview renders the card | `BuildsPage.test.tsx` (name, key stats, 5 Echoes); `App.share.test.tsx` |
| Save as reference leaves `ownedEchoes` untouched | `BuildsPage.test.tsx` (count stays 2; row has `reference` and placeholder ids; tag shown; URL `#builds`); `library.test.ts` (persist + reload) |
| Optimize loads the calculator without overwriting the roster | `BuildsPage.test.tsx` (store fields, `rosterSourceId ''`, DB roster row equal, section `calculator`); `calculator.test.ts` (3 tests) |
| App-level cold open with a v2 link | `App.share.test.tsx`: lands on Builds, card, Optimize, calculator banner, roster and builds stay empty |
| Include-rotation toggle changes the payload | `share.test.ts` (different hash, objective only when asked); `BuildsPage.test.tsx` (checkbox → second link decodes with an objective) |

Also tested:
- the encoder refuses payloads past the JSON cap;
- readable errors for unknown versions, bad base64, corrupt deflate and a missing `CompressionStream`;
- sender-side refusals: no roster entry, different weapon, missing Echo, forte above 10;
- card stats through the domain layer: one extra 0.105 Crit Rate substat raises Crit Rate by exactly 0.105 (hand-computed delta);
- reference re-share honours the toggle;
- the backup v1 schema accepts reference builds;
- JSON export/import keeps `reference`.

## Unverified
- **No real browser run.** Everything ran in Vitest: Node for `share.test.ts`, jsdom for the UI tests; both expose `CompressionStream`. Browser support for `deflate-raw` in `CompressionStream` is assumed from recent Chromium, Firefox and Safari releases and not checked here. An unsupported browser gets a readable error instead of a crash.
- **Clipboard:** only the mocked clipboard was exercised.
- **Real link lengths in chat apps** (truncation of ~500–900-character URLs) are not tested.
- **Calculator after Optimize:** the RotationOptimizer panel was not driven end to end against a loaded draft; only the store state and the banner were checked.

## Open questions
1. **Context at save time.** Builds store no roster context, so Copy link uses the sender's *current* Roster entry, and refuses if the weapon differs. Storing a context snapshot when the build is saved would be more faithful, but that needs a change in `RotationOptimizer.tsx`'s save path, which isn't mine.
2. **v2 "Import".** I treat Save as reference as the v2 import and offer no action that adds the sender's Echoes to the recipient's inventory. Confirm that's intended.
3. **Pending link after Optimize.** It stays pending so the user can come back and save it. Should Optimize resolve it instead?
4. **Caps.** 16 384 hash characters and 64 KiB inflated are generous: real links are about 0.5–1 k characters. Tighten them if chat-app limits matter more than long rotations.
5. **Forte cap.** Forte levels are capped at 10 in the link, matching the calculator's clamp, while `rosterEntrySchema` leaves forte max uncapped ("unsourced"). A roster value above 10 can't be shared and gets a readable error.

## Proposed doc text

**AGENTS.md, Code Map (replace the share-link part of the routing note):**
> Share links: `#b=` opens Builds and is held as `useAppStore.shareLink`. v2 links (`#b=2.<base64url(deflate-raw JSON)>`, `state/share.ts`, schema `sharedBuildSchema`) are self-contained: 5 Echoes' stats (slot 1 first), the character/weapon roster context and, opt-in, the objective. They never carry Echo ids, `equippedTo`, `origin`, labels or notes. Links are untrusted: hash ≤ 16 384 characters before decoding, inflated ≤ 64 KiB while streaming, strict zod schema; values are flagged against `data/echoStats.ts`, never corrected. v1 links (`#b=<base64url JSON>`) still decode. The preview offers Save as reference, Optimize with my Echoes (a non-persisted Calculator draft; the roster is never written) and Dismiss.

**AGENTS.md, data model (after `Build`):**
> `Build.reference?` holds a saved share-link payload ("reference build"). Its Echoes live only there, never in `ownedEchoes`, and its `echoIds` are the placeholders `ref:0`..`ref:4`. Code that resolves library `echoIds` against the inventory must skip reference builds (`isReferenceBuild`). The field is optional and unindexed: no Dexie version bump, and backup format v1 unchanged.

**docs/** — none needed: no game mechanic changed.

## Follow-up: saved context

The open questions were settled with their default answers. Q2–Q5 keep today's behaviour. Q1 is implemented here: each build stores the context it was optimized with, and links use it.

### Changes
| File | Change |
|---|---|
| `src/data/schema.ts` | `buildSchema` gains `context?: RosterEntry` (it reuses `rosterEntrySchema`). A refine requires `context.characterId`/`weaponId` to match the build's, so a mismatched snapshot can't be stored. |
| `src/ui/components/RotationOptimizer.tsx` | `handleSave` stores `lastRun.data.roster`, the exact context the run scored with. That can come from a Roster prefill, manual input or a shared-build draft. It is copied cleanly: optional `forteUnlockedIds`/`weaponAscension` are included only when set. |
| `src/state/share.ts` | `sharedBuildFromLibrary()` prefers `build.context`. Only builds without it fall back to the current Roster entry, under the original refusal rules (moved unchanged into `rosterFallback()`). Context values the link format can't carry (e.g. forte 11) still get the readable "can't be shared as-is (…)" error. |
| Tests | `share.test.ts`, `RotationOptimizer.test.tsx`, `library.test.ts`, `backup.test.ts` (below). |

`BuildsPage.tsx` needed no change. It already passes the Roster entry, which is now only the fallback for old builds. Copy link stays disabled until the Roster has loaded. That is harmless for builds with context, but secpriv could relax it later.

### Data model and backup
- **Dexie:** `context` follows the same reasoning as `reference`. It is optional and unindexed (the `builds` indexes are `id, characterId`), so no Dexie version bump, and no existing `version(n)` was touched.
- **Backup:** `BACKUP_VERSION` stays 1. `backupSchema` validates builds with `buildSchema`, so new backups are a superset of v1, and v1 backups without `context` parse and restore unchanged (tested).
- **JSON export/import:** `serializeBuilds`/`importBuilds` keep the field (tested).
- **Downgrade:** an older app reading a new backup strips `context`. Those builds then use the Roster fallback, which is today's behaviour.

### Tests added
| Brief item | Test |
|---|---|
| A saved build carries the run's context | `RotationOptimizer.test.tsx` "saves the context the run used, not the Roster". It renders with a draft context (level 70, S3, forte 8, explicit `forteUnlockedIds: []`, weapon Lv 60 / A3 / R2), runs, saves, and asserts the DB row's `context` equals it exactly, with slot order main-first. |
| Copy link uses the saved context after the Roster changed | `share.test.ts` "uses the saved context even after the Roster changed level and weapon". The Roster has level 50, S0 and a different weapon; the link carries the saved level 80, S4, forte 9, nodes, weapon Lv 70 / A4 / R3. It also works with no Roster entry at all. |
| Old builds fall back as before | `share.test.ts`: "falls back to the current Roster for builds saved without context", plus the existing refusal test (no Roster entry, different weapon, missing Echo, forte 11). |
| Readable error for out-of-schema context | `share.test.ts`: a saved forte of 11 gives the exact "can't be shared as-is (character.forte.1001103: Too big…)" message. |
| Backup and export round-trip | `backup.test.ts`: a v1 backup without `context` parses and restores unchanged; a build with `context` round-trips through a JSON backup and restore, and the version is still 1. `library.test.ts`: `context` survives Dexie and JSON export/import. |

Also tested: a context for a different character or weapon is rejected, by `buildSchema` and by `saveBuild`, with nothing written.

### Gates (final run)
| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npx tsc -b` | clean |
| `npm run test` | 93 files, 1045 tests, all passed |
| `npm run build` | built; the only warning is the pre-existing 2.2 MB `snapshot-CA_LIMiu.js` chunk |

No failures in secpriv's files.

### Unverified
- **No real browser run.** The save path was exercised in jsdom with the worker mocked.
- **No live backfill.** Builds saved before this change have no `context` and keep the Roster fallback until they are re-saved from the optimizer.

### Proposed doc text (AGENTS.md, data model, after `Build`)
> `Build.context?` is the `RosterEntry` the optimizer run actually used, saved with the build: it may be a calculator draft, not the Roster. It must match the build's character and weapon. Share links prefer it; builds without it (saved before 2026-10-21) fall back to the current Roster entry. It is optional and unindexed: no Dexie bump, and backup format v1 unchanged.

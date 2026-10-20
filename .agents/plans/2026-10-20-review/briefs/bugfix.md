# Brief: bugfix

Read `00-ground-rules.md` (same folder) first.

**You own:** `src/state/store.ts`, `src/state/store.test.ts`,
`src/state/share.ts` (+test), `src/state/library.ts` (+test),
`src/ui/pages/BuildsPage.tsx` (+test), `src/optimizer/prune.ts`,
`src/optimizer/prune.test.ts`, NEW `src/optimizer/prune.soundness.test.ts`,
NEW `src/App.share.test.tsx`, `src/main.tsx`, NEW
`src/ui/components/ErrorBoundary.tsx` (+test), `src/ui/components/DataSafety.tsx`.

**Narrow exceptions:**
- In `src/optimizer/search.ts` you may change ONLY the `pruneDominated(...)`
  call and the import line for it. `perf` owns the rest of that file, and
  won't touch `src/optimizer/` until you're done.
- In `src/ui/pages/InventoryPage.tsx` you may change only the export
  download's `revokeObjectURL` timing. That file has uncommitted scanner
  edits; preserve them.
- `src/App.tsx` belongs to `perf`. Don't edit it.

Repro folder (call it R):
`/tmp/claude-1000/-home-userman-Projects-WuwaC/a73243ee-af07-45c6-9ab5-7af4a0e6afb9/scratchpad/repro/`

## 1. Share links never import (confirmed)

What happens when someone opens the app at `/#b=<encoded build>`:
- `initialSection()` (`src/state/store.ts:34`) maps `#b=` to `null`
  (`store.ts:27`), so the app falls back to `'inventory'` and BuildsPage
  never mounts.
- When the user clicks Builds, `setActiveSection` sets
  `location.hash = 'builds'` synchronously. That happens before BuildsPage's
  effect (`BuildsPage.tsx:48`) reads the hash, so the link is lost.
- The existing BuildsPage test passes only because it renders BuildsPage
  directly.

Throwaway App-level repro: `R/sharelink.test.tsx`. Run it from the repo root:
`npx vitest run --config R/vitest.config.ts`. It logs
"initial section: inventory", "hash after clicking Builds: #builds" and
"library builds: []".

Fix:
- A `#b=` hash must open the Builds section with the link intact.
- After handling the link, leave the URL at `#builds`, not a bare path
  (a bare path lands on Inventory on reload).
- Stop writing to the DB without consent. Show a preview of the shared
  build (name, character, weapon, score) with Import / Dismiss, and import
  only on Import.
- Add an App-level regression test in `src/App.share.test.tsx`.
- A shared build carries only the sender's Echo IDs. Don't redesign the
  link format; just mention it in your report.

## 2. Optimizer dominance pruning is unsound (confirmed; pruning is on by default)

`pruneDominated` (`src/optimizer/prune.ts:102`) drops an Echo if ONE
same-cost, same-Sonata Echo meets or beats it on every relevant stat. That
is only sound when the two can never appear in the same combo. WuWa builds
hold several same-cost Echoes: 4-3-3-1-1 has two 3-costs and two 1-costs,
and budget 12 allows up to five 1-costs, three 3-costs or two 4-costs.

Two confirmed failures. Run each from the repo root with `npx tsx R/<script>`:
- `prune-cooccur.ts` (no lock, no set bonuses): F (4-cost, ATK 150),
  A (3-cost, ATK 100), B (3-cost, ATK 50), plus 1-costs U/W/V. The
  exhaustive best is {a,b,f,v,w}, score 360. The pruned run drops b and
  returns NO build.
- `prune-sound.ts` (5-piece lock): Sonata pieces count DISTINCT
  `echoDefId`s (`src/domain/stats.ts` ~333; `sonataCounts` in `search.ts`).
  x2 has def X, duplicating x1's def, and dominates y (def Y). y is pruned,
  the only combo with 5 distinct defs disappears, and the result is NO build.

A third gap, same mechanism: an Echo whose `echoDefId` carries a main-slot
bonus for this character (`hasMainEchoBonus`, `stats.ts:216`) can be pruned
by a stronger Echo that doesn't carry it.

Fix requirements:
- Pruning must never change the top-N result compared with `prune: false`.
- A sound direction: drop an Echo only when it has at least k dominators,
  where k is the most Echoes of that cost that can appear in one legal combo
  under the request's cost budget. Then one dominator is always outside any
  combo that contains the dominated Echo. Derive k from budgets 10 and 12;
  don't hardcode one table.
- Count only dominators whose swap can't reduce the distinct-def Sonata
  count. For example, pairwise-distinct defs that also differ from the
  incumbent's def, or the incumbent's own def. Reason this through and
  write the argument in a comment.
- Never drop a main-slot-bonus carrier unless its dominators share its def.
- Handle the chained case, where a dominator is itself pruned.
- Keep it pure, no `any`.

Tests:
- Turn both repros into hand-computed regression tests.
- Add a randomized property test: seeded PRNG; small inventories of about
  10–14 Echoes across 2–3 sets, with duplicate defs; every lock mode;
  budgets 10 and 12. Assert that pruned top-N scores equal unpruned top-N
  scores.
- Update existing prune tests whose expectations encoded the unsound rule,
  and list them in your report.

## 3. Download links revoked too early

`DataSafety.tsx:52`, `BuildsPage.tsx:75` and `InventoryPage.tsx:133` call
`URL.revokeObjectURL` right after `anchor.click()`, and some browsers cancel
the download. Defer the revoke (for example with `setTimeout`). If it reads
cleanly, use one small shared helper under `src/ui/`.

## 4. No error boundary

Any render error blanks the whole app, including the backup Export.
- Add an ErrorBoundary. Per active section is best, but `App.tsx` belongs to
  `perf`. So either wrap at the `main.tsx` level, or add the component and
  say in your report where `perf` should mount it per section.
- The fallback should show the error, offer a reload, and offer
  "Export backup" (reuse `createBackup` from `src/state/backup.ts`).
- Follow the Pixel Arcade UI conventions in `AGENTS.md`: tokens and classes,
  no raw hex.

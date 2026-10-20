# bugfix agent — final report

All four briefed items are fixed. Nothing is committed and no git state was changed. No dependency changes. `AGENTS.md`, `README.md` and `docs/` are untouched.

## Gate results (final run, after all edits)

| Gate | Result |
|---|---|
| `npm run lint` | clean (0 errors, 0 warnings) |
| `npx tsc -b` | clean (no output) |
| `npm run test` | 85 files, 923 tests, all passed |

An earlier full run had one failure in `src/App.test.tsx`, and an earlier lint run had one warning in my `ErrorBoundary.tsx`. Both are covered below: the warning is fixed, and the App test failure did not recur.

## Files changed

### Modified (owned)
- `src/optimizer/prune.ts`:
  - new `PruneOptions` (`costBudget`, `topN`, optional `isMainCarrier`);
  - new exported `maxSameCostInCombo`;
  - `pruneDominated` rewritten with the sound counting rule and a soundness comment;
  - module header comment updated.
- `src/optimizer/prune.test.ts`: `pruneDominated` tests rewritten, `maxSameCostInCombo` tests added (details under Tests).
- `src/state/store.ts`:
  - `isShareHash()`;
  - `sectionFromHash('#b=…')` now returns `'builds'`;
  - new state `shareLink` and action `resolveShareLink()`;
  - `syncHash` won't overwrite an unresolved `#b=` while on Builds;
  - the `hashchange` listener captures pasted `#b=` links.
- `src/state/store.test.ts`: switched to jsdom with a per-file `// @vitest-environment jsdom` pragma. One expectation updated and four share-link tests added.
- `src/ui/pages/BuildsPage.tsx`:
  - auto-import on mount removed (`importLinkIntoLibrary`, `linkHandled`);
  - shows a consent preview `Window` ("Shared build") built from `useAppStore.shareLink`;
  - export goes through `downloadBlob`.
- `src/ui/pages/BuildsPage.test.tsx`: the old "imports from hash on mount" test is replaced by three tests: preview + Import, Dismiss, and corrupt link.
- `src/ui/components/DataSafety.tsx`: export now calls `downloadBackup()` (deferred revoke). The `createBackup` import is dropped.
- `src/main.tsx`: `<App />` is wrapped in `<ErrorBoundary>`. `UpdatePrompt` stays outside it.

### Modified (narrow exceptions)
- `src/optimizer/search.ts`: only the `pruneDominated(...)` call changed. It now passes `{ costBudget, topN, isMainCarrier: (d) => hasMainEchoBonus(character.id, d) }`. The import line didn't need changing, because `hasMainEchoBonus` was already imported.
- `src/ui/pages/InventoryPage.tsx`: two lines changed, `import { revokeObjectUrlLater } from '../download.ts';` and `URL.revokeObjectURL(url)` → `revokeObjectUrlLater(url)`. The user's uncommitted scanner edits are preserved.

### Modified outside my listed files (flag for review)
- `src/optimizer/search.test.ts`: I rewrote the one test that encoded the unsound rule and added one test. perf had agreed not to touch `src/optimizer/` until I was done, so there was no conflict.

### New files
- `src/optimizer/prune.soundness.test.ts` (listed)
- `src/App.share.test.tsx` (listed)
- `src/ui/components/ErrorBoundary.tsx` and `ErrorBoundary.test.tsx` (listed)
- `src/ui/download.ts` and `src/ui/download.test.tsx`: the shared helper the brief allowed under `src/ui/`. The test is `.tsx` because `.test.ts` files run in the node project, without DOM.

## 1. Share links

**Bug:** `#b=` mapped to no section, so the app opened on Inventory. Clicking Builds then set `location.hash = 'builds'` before BuildsPage's effect could read the link.

**Fix:**
- The store owns routing, so it captures the link as `shareLink` in two places: at module init from `location.hash`, and in the `hashchange` listener for links pasted into a running app. It also routes to `builds`.
- `syncHash('builds')` leaves a pending `#b=` in the URL, so a reload still shows the preview.
- BuildsPage decodes the link with `decodeBuildLink` and writes nothing on its own. It shows a preview: name, character, weapon, score, and the note "Its Echoes are the sender's and won't match your inventory. Nothing is saved unless you import it."
- **Import** calls `importBuilds([build])`. The button is disabled until the library has loaded, so duplicate detection is correct. A duplicate gives "Build already in the library".
- **Dismiss** discards the link. Both buttons call `resolveShareLink()`, which clears `shareLink` and `replaceState`s the URL to `<path><search>#builds`. A corrupt link shows a dismissable error alert.

**Link format:** unchanged. A shared build carries only the sender's Echo IDs, which won't resolve against the recipient's inventory. The preview says so, but the format isn't redesigned.

**Verification:**
- `npx vitest run src/App.share.test.tsx`: 2/2 passed.
  - Test 1: a cold open lands on Builds and shows the preview. The DB is empty before Import, holds 1 build after it, and the hash ends at `#builds`.
  - Test 2: Inventory → Builds detour, then Dismiss. DB stays at 0 and the hash ends at `#builds`.
- `npx vitest run src/state/store.test.ts`: 9/9. `npx vitest run src/ui/pages/BuildsPage.test.tsx`: 8/8.
- The coordinator repro `npx vitest run --config R/vitest.config.ts` now passes: "Shared Build" is visible after clicking Builds. The library stays empty there because the repro never clicks Import, which is the intended consent behaviour.
- **Not verified:** I didn't run the old code against `App.share.test.tsx`. It asserts `activeSection === 'builds'` right after a cold open, and the repro showed the old code returned `inventory`.

## 2. Optimizer dominance pruning

### Rule
Let k = `maxSameCostInCombo(cost, costBudget, poolCosts)`. That is the largest m ≤ 5 with m·cost + (5 − m)·cheapest ≤ budget, where `cheapest` is the lowest cost in the pool.

| Budget | 4-cost | 3-cost | 1-cost |
|---|---|---|---|
| 12 | 2 | 3 | 5 |
| 10 | 1 | 2 | 5 |

k is 0 when no legal combo can hold that cost.

Echo I (def dI, set s, cost c) is dropped only when it has at least **max(1, k) + topN − 1** counted dominators among already-kept echoes. A dominator has the same cost and set, is ≥ I on every relevant stat, and is > I on at least one. Counted dominators are:
- **(a)** every kept dominator whose def is dI;
- **(b)** one per distinct def d ≠ dI among kept dominators, but only if every pool echo of set s with def d has cost c;
- if dI is a main-slot carrier (`hasMainEchoBonus`), only (a) counts.

Echoes are decided in descending order of relevant-stat sum, with input order breaking ties.

**This deliberately goes beyond the brief's "k dominators".** k alone is sound for top-1 but not for top-N with N ≥ 2. Counterexample: budget 10, so k = 1 for 4-costs, and a weak 4-cost I with one dominator D, where the rest of the pool forms exactly one completion R. Unpruned top-2 is [R+D, R+I]. Pruned top-2 is only [R+D].

### Soundness argument (also in the code comment on `pruneDominated`)
1. **Swap step.** Take any combo C containing I and a counted dominator D not in C, and let C' = C − I + D.
   - Cost is unchanged, so the budget still holds.
   - Relevant stats are ≥ in every term.
   - Set s's distinct-def count cannot drop. Either dD = dI, or dD is new to C − I within set s and replaces at most the lost dI. Other sets are untouched, so every piece threshold and every lock (`five` / `twoPlusTwo`) still holds.
   - The main-slot carriers available in C' include those of C. A carrier I is only replaced by its own def, and main-slot bonuses are non-negative.
   - So score(C') ≥ score(C). This assumes the existing premise of dominance pruning: score is non-decreasing in each relevant stat and in set bonuses.
2. **Availability.** Each echo E in C − I blocks at most one counted dominator.
   - (a) members are blocked only by membership in C.
   - A (b) slot for def d is blocked either by membership or by any set-s echo with def d in C − I.
   - E therefore blocks itself (if counted) plus the (b) slot of its own def. When E is counted these are the same slot: either E has def dI and blocks no (b) slot, or E is the (b) slot of its def.
   - Only echoes of cost c block anything. A different-cost echo is never a dominator and never matches a (b) def, because each (b) def appears in set s only at cost c.
   - C holds at most k echoes of cost c, I included. So at most k − 1 counted dominators are blocked, and at least topN remain available.
3. **Top-N.** Counted dominators are already kept. So a combo with m dropped echoes reaches an all-kept combo in m swaps, and the last swap alone has ≥ topN distinct choices. That gives ≥ topN distinct all-kept combos, each scoring ≥ the original. So for every i ≤ topN, the pruned search has ≥ i kept combos scoring ≥ s_i (the i-th best unpruned score). A subset can't do better, so the i-th score is unchanged.
4. **Chains.** Only kept dominators count, so a pruned dominator is never relied on. Dominance is transitive, so its own dominators also dominate I and count directly. The sort is only a heuristic: in exact arithmetic dominance means a strictly larger sum. A float tie in the sum can only order a dominator later, which makes the rule more conservative, never unsound.

### Consequence
Pruning fires much less often now. For example, at budget 12 with topN 5 (the UI default), a 3-cost needs 7 counted dominators and a 1-cost needs 9.

### Verification
- `npx vitest run src/optimizer/`: 4 files, 49 tests passed.
- Sanity check against the old rule: I ran `prune.soundness.test.ts` with HEAD's `pruneDominated` mocked in, from my own scratchpad config, without editing the repo. All 5 tests failed. The property test failed on its first trial (budget 10, no lock, top-1): pruned `[]` vs unpruned `[660]`.
- Property coverage: 84 trials, pruning fired in 30. Of those, 21 also had non-empty results, spread over every budget × lock combination:

  | Budget | Lock | Trials | Pruned | Pruned with results |
  |---|---|---|---|---|
  | 10 | none | 14 | 8 | 7 |
  | 10 | five | 14 | 7 | 4 |
  | 10 | twoPlusTwo | 14 | 8 | 5 |
  | 12 | none | 14 | 2 | 2 |
  | 12 | five | 14 | 2 | 1 |
  | 12 | twoPlusTwo | 14 | 3 | 2 |

- The direct `npx tsx R/prune-*.ts` repro runs could not be re-run (see Unverified). Both scenarios are reproduced as vitest regressions instead.

## 3. Download URLs revoked too early
- `src/ui/download.ts` has three helpers:
  - `downloadBlob(blob, fileName)` appends the anchor, clicks it, removes it, then revokes the object URL after `REVOKE_DELAY_MS` = 40 000 ms, the FileSaver.js value;
  - `revokeObjectUrlLater(url)` does just the deferred revoke;
  - `downloadBackup()` calls `createBackup()` and saves `wuwa-optimizer-backup-<YYYY-MM-DD>.json`, the same name DataSafety used before.
- `revokeObjectUrlLater` binds `URL.revokeObjectURL` when it schedules the revoke, not when the timer fires.
- Used by BuildsPage (export), DataSafety (backup export), InventoryPage (Kamera export) and ErrorBoundary.
- **Verification:** `download.test.tsx` uses fake timers. The URL is not revoked at 39 999 ms and is revoked at 40 000 ms; the anchor is attached during the click and removed afterwards. The DatabasePage, InventoryPage and BuildsPage suites pass.

## 4. Error boundary
- `ErrorBoundary` is a class component.
  - `getDerivedStateFromError` stores the error.
  - `componentDidCatch` logs it with the component stack.
  - An optional `resetKey` prop clears the error when it changes.
  - The fallback is a `px-frame` section with `role="alert"`: the error message on `ember` tokens, plus **Export backup** (`downloadBackup()`, with done/failed status), **Try again** and **Reload** buttons. No raw hex.
- The fallback lives inside the class, which fixed the `react-refresh/only-export-components` warning a separate function component caused.
- Mounted in `main.tsx` around `<App />`.
- **For perf:** in `App.tsx`, wrap the per-section render as `<ErrorBoundary resetKey={activeSection}><ActiveSection section={activeSection} /></ErrorBoundary>`, inside the `key={activeSection}` div. Then a broken section keeps the nav and footer alive and recovers on navigation.
- **Verification:** `ErrorBoundary.test.tsx`, 3/3 passed:
  - children render normally;
  - a throwing child shows the message and Reload, and Export backup downloads a `wuwa-optimizer-backup-YYYY-MM-DD.json` whose JSON `format` is `wuwa-optimizer-backup`;
  - a `resetKey` change recovers.

## Tests added and changed

### Added
- `src/optimizer/prune.soundness.test.ts`, 5 tests:
  - **co-occurrence repro:** f/a/b/u/w/v, no sets, budget 12. Hand-computed top-3 is [360, 340, 340], best `{a,b,f,v,w}`, nothing pruned.
  - **5pc duplicate-def repro:** x1/y/x2/z/w/v. Hand-computed builds are `{v,w,x1,y,z}` = 360 and `{v,w,x2,y,z}` = 310; y is kept; top-1 is 360.
  - **main-slot carrier:** Kerasaur, budget 10, `max-stat dmgBonus:Aero`. The carrier is kept, its combo wins by 0.42 − 0.31 = 0.11, and `mainEchoId` is `k`.
  - **still prunes where sound:** budget 10, top-1, 4-cost. `weak` is pruned and the best score is 150+100+10+30+30 = 320.
  - **seeded property test** (mulberry32, seed `0x5eed`): budgets 10/12 × locks none/five/twoPlusTwo × 14 reps = 84 trials. Each has 10–14 echoes over 2–3 sets (biased to the first set), duplicate defs, about 10% cross-cost defs, `kerasaur` carriers, topN ∈ {1, 2, 3, 5}, and objectives max-stat ATK / expected liberation damage. It asserts pruned top-N scores equal unpruned top-N scores, and that pruning fires at both budgets with ≥ 10 trials pruning with results.
- `src/optimizer/prune.test.ts`, new cases:
  - `maxSameCostInCombo` table for budgets 12 and 10, plus the 0 case;
  - one 4-cost dominator at budget 12 is not enough;
  - a 3-cost at budget 12 needs 3 dominators;
  - topN raises the bar;
  - foreign-def dominators sharing a def count once;
  - a def that also appears at another cost in the set is ignored;
  - a carrier is kept against a different-def dominator but pruned by a same-def one;
  - chain order is independent of input order.
- `src/state/store.test.ts`: cold-open capture (via `vi.resetModules`), the link survives `setActiveSection('builds')`, `resolveShareLink` sets `#builds` and keeps path and query, and a pasted link is captured via `hashchange`.
- `src/ui/pages/BuildsPage.test.tsx`: preview, then Import (DB 0 → 1, hash `#builds`); Dismiss (DB 0); corrupt link shows an error and can be dismissed.
- `src/App.share.test.tsx`: 2 App-level regressions (see §1).
- `src/ui/download.test.tsx`: 1 test. `src/ui/components/ErrorBoundary.test.tsx`: 3 tests.

### Changed because they encoded the unsound rule
- `src/optimizer/prune.test.ts`:
  - "drops a strictly-dominated same-cost echo": now 4-cost, budget 10, top-1.
  - "ignores stats outside the relevant set": now 4-cost, budget 10.
  - The cost-tier, cross-set and ties tests now pass options and fillers. Their expectations are unchanged.
- `src/optimizer/search.test.ts`, "prunes by default and reports dropped echoes":
  - Old: budget 12, top-10, expected pruned `e1, e7, e8`, 4 builds. That result disagreed with the unpruned top-10.
  - New: budget 10, top-1. Hand-computed: pruned `e1, e8`; `e7` is kept because up to five 1-costs fit; 6 combos evaluated; winner `{e2,e3,e6,e7,e9}` = 650.
  - Added "does not prune when a dominator could share the combo (top-10, budget 12)": nothing is pruned, and the scores equal the unpruned run.
- `src/state/store.test.ts`: "reserves #b= share links for BuildsPage" (expected `null`) became "opens Builds for #b= share links" (expects `'builds'`).
- `src/ui/pages/BuildsPage.test.tsx`: "imports a build from the URL hash on mount" was removed, because auto-import is now the bug. The preview, Dismiss and corrupt-link tests replace it.

## What the App.test.tsx failure turned out to be
- **Observed:** in one full `npm run test`, `src/App.test.tsx > App shell > opens on the inventory section` failed with "Unable to find role="heading" and name `/echo inventory/i`", after 1231 ms. The default `findByRole` timeout is 1000 ms.
- **Alone:** `npx vitest run src/App.test.tsx` passed 6/6.
- **Final full run:** it passed (923/923).
- **Conclusion:** a load-dependent timeout. Under full-suite parallel load, the Inventory heading took longer than 1 s to appear.
- **Root cause not established.** `src/App.tsx` and `src/App.test.tsx` both had uncommitted changes from another agent (perf) at the time. Perf may be lazy-loading sections, which would add async latency before the heading renders. My changes don't touch that test's path: its `beforeEach` sets `activeSection: 'inventory'`, and the hash is `/`.
- **Suggestion for perf:** if sections are lazy now, give that `findByRole` a longer timeout, or await the lazy chunk.

## Unverified items
- **Repro scripts:** `npx tsx R/prune-cooccur.ts` and `R/prune-sound.ts` now crash before the search runs, at `loadBundledSnapshot` (`src/data/index.ts:26`), with `SyntaxError: "[object Object]" is not valid JSON`. `src/data/index.ts` has uncommitted edits I didn't make (likely perf's snapshot-parsing change), so its tsx/CLI path may be broken. That needs checking by whoever owns it. Vitest loads the snapshot fine.
- **Browser behaviour:** I didn't check the deferred-revoke fix or the share-link flow in a real browser, including Safari/Firefox download behaviour. jsdom only.
- **Old code vs App.share.test.tsx:** I didn't run the new App test against the old code (see §1).
- **minStats edge case:** `searchExhaustive` applies `minStats` to the sheet of the best-scoring main echo, not to the best sheet that passes. A swap that changes which main echo wins could make a kept combo fail a min-stat that the original pruned combo passed, through that combo's main bonus. This needs main-slot presets that touch a min-stat key. The property test uses no `minStats`, so this isn't covered. The fix would be in `search.ts`, which perf owns: filter per main-echo candidate, or keep carriers out of pruning whenever `minStats` is set.
- **Monotonicity premise:** score is assumed non-decreasing in each relevant stat and in set bonuses. This is the existing premise of dominance pruning; I didn't re-audit it per objective.

## Open questions
1. Is the weaker pruning (k + topN − 1) acceptable for performance? The alternative is a search-time approach that is exact for top-N, such as branch-and-bound. That's perf's area.
2. Should a share link carry more than the sender's Echo IDs (for example the Echoes' stats), or should the preview offer "re-optimize with my Echoes"? I left the format unchanged as briefed.
3. Should navigating away while a share preview is pending discard it? Right now it stays until Import/Dismiss, which survives a detour and a reload.
4. Perf: should `ErrorBoundary` be mounted per section in `App.tsx` as proposed in §4?
5. Perf: the "Scaling" doc comment on `searchExhaustive` in `search.ts` still says pruning is same-cost-and-set-only. It should mention the k + topN − 1 rule, and its benchmark numbers predate the change.

## Proposed doc updates (for the coordinator to integrate)

**AGENTS.md, Code Map → "UI dynamics" (section routing):**
> Section routing (`#section`) lives in `src/state/store.ts`. A `#b=` share link opens Builds and is held as `useAppStore.shareLink` (captured at load and on `hashchange`; `syncHash` won't overwrite it). BuildsPage only previews it; nothing is written until the user clicks Import. Import or Dismiss calls `resolveShareLink()`, which leaves the URL at `#builds`.

**AGENTS.md, Architecture → Optimizer layer (after the pruning sentence):**
> Dominance pruning (`optimizer/prune.ts`) must never change the top-N result. An Echo is dropped only with ≥ k + topN − 1 counted same-cost, same-set dominators, where k = `maxSameCostInCombo` (most Echoes of that cost in one legal combo under the budget). Def rules: see the `pruneDominated` comment; main-slot carriers need same-def dominators. `prune.soundness.test.ts` (seeded pruned-vs-unpruned property test) is the regression gate.

**AGENTS.md, Code Map (new bullet):**
> File downloads go through `src/ui/download.ts` (`downloadBlob`, `downloadBackup`): object URLs are revoked after a delay, never right after `click()`. `src/ui/components/ErrorBoundary.tsx` wraps the app in `main.tsx`; its fallback offers Export backup and Reload.

**docs/WUWA_GAME_REFERENCE.md §7 (step 2, dominance pruning), if it describes the one-dominator rule:** replace that description with the counting rule above, and note why one dominator is unsound: several same-cost Echoes share a combo, and duplicate defs don't add Sonata pieces.

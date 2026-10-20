# perf — Phase B report (optimizer scale, plus phase A follow-ups)

Status: Phase B is done. Nothing is committed.
- `npm run lint` and `npx tsc -b` are clean, and `npm run build` succeeds.
- `npm run test`: **942/945 pass**. The 3 failures are in `src/ui/pages/CalculatorPage.test.tsx`, which isn't my file. It has a mock fixture without the new `SearchResult` fields; a 2-line fix is below.
- `prune.ts` is unchanged.

## Results (`npm run bench`, Jiyan liberation expected damage, top 5, budget 12)

### Method
- Each "new" run is the full `searchExhaustive` call on one thread.
- "8 workers" runs 8 shards on Node `worker_threads` and merges them with `mergeShardResults`. That time includes about 0.4 s of tsx start-up per worker.
- The brute-force reference was timed where it is affordable (up to n=50). Every row was checked against it there, and every 8-worker run was checked against the single-thread run. **All matched.**
- "Before" figures above n=50 are extrapolations: legal combos divided by the reference's measured rate at n=50 (about 54k/s synthetic, about 23k/s realistic). They are not measurements.
- Machine: 12 logical cores. Other agents ran tests at times, so expect roughly ±30% noise.

### Synthetic inventory
The original generator: any main stat at any cost, 2–4 random substats.

| n | pruned | legal combos | scored | new, 1 thread | new, 8 workers | reference (before) |
|---|---|---|---|---|---|---|
| 30 | 0 | 84,018 | 1,122 | 0.06 s | — | 1.6 s |
| 50 | 2 | 1,027,824 | 1,649 | 0.18 s | — | 19 s (brief: 24.5 s) |
| 100 | 13 | 20.7 M | 29,867 | 7.2 s | 2.4 s | ≈ 6.4 min (extrapolated) |
| 200 | 46 | 398 M | 24,370 | 30.3 s | 8.9 s | ≈ 2 h (extrapolated) |
| 300 | 82 | 2.15 B | 30,945 | 90.4 s | 28.2 s | ≈ 11 h (extrapolated) |

### Realistic Lv25 inventory
New in the bench; values come from the repo's data tables:
- main stats from `MAIN_STAT_POOLS` at their `MAIN_STAT_RANGES` maximum;
- the fixed secondary from `SECONDARY_MAIN_STAT_MAX`;
- 5 substats at random `SUB_STAT_TIERS` tiers;
- 4 Sonata sets and 8 defs, including Jiyan main-slot carriers.

| n | pruned | legal combos | scored | new, 1 thread | new, 8 workers | reference (before) |
|---|---|---|---|---|---|---|
| 30 | 0 | 84,018 | 418 | 0.03 s | — | 3.8 s |
| 50 | 0 | 1.23 M | 2,345 | 0.13 s | — | 53 s |
| 100 | 0 | 43.5 M | 17,421 | 0.77 s | 0.93 s | ≈ 31 min (extrapolated) |
| 200 | 0 | 1.46 B | 21,246 | 1.38 s | 1.35 s | ≈ 18 h (extrapolated) |
| 300 | 0 | 11.3 B | 31,500 | 2.73 s | 2.01 s | ≈ 5.7 days (extrapolated) |

Realistic inventories in the 100–300 range now finish in a few seconds or less, with exact results. The synthetic generator is the hard case: it gives every cost any main stat, so per-stat maxima are loose. There, n=300 takes about 28 s on 8 workers. Dominance pruning (bugfix's sound rule) removes 0–82 echoes, so nearly all of the speed comes from the search itself, as you anticipated.

## How the new search works (`src/optimizer/search.ts`)

- **Same answer as brute force, by construction.**
  - Brute force keeps the first-found combo on ties, so its result is the top N by (score descending, then lexicographic order of kept indices).
  - The new search ranks with exactly that comparator (`Leaderboard`), so enumeration order doesn't affect the result.
  - Every combo that could enter the top N is re-scored through the same exact scorer the reference uses (`prepare().scoreCombo`, with the combo in kept-index order). Scores, sheets, warnings and main-echo choice are therefore bit-identical.
- **The old loop is kept as `searchReference`.** It is used as the oracle by the tests and the bench.
- **Cost patterns.**
  - `costPatterns(costs, budget)` derives every multiset of 5 pool costs that fits the budget. For {4,3,1}: 8 patterns at budget 12, 5 at budget 10. Tests hand-list them.
  - Cost-illegal combos are never generated.
  - A 5-piece lock narrows the pool to that set (5 distinct defs are required).
  - A 2+2 lock is enforced at each node with a "slots still needed" check.
- **Decomposition, without new formulas in the optimizer.**
  - The `computeStats` sheet is: the fixed character/weapon sheet, plus one vector per echo, plus one per (set, distinct-piece count 1–5), plus one per main-slot def.
  - These vectors are derived by calling `computeStats` itself with the echo alone, with blank stat-less virtual pieces of a set, or with an empty combo plus a main.
  - The decomposition is verified on one sample combo per pattern up front, and again on every combo that gets exactly re-scored. Any mismatch throws internally, and the search re-runs with exact scoring for every combo.
- **Branch and bound.** At a partial combo, the bound sheet is the sum of:
  - the current sum;
  - per stat, the sum of the top-j values among the echoes the remaining slots can still take (suffix tables per cost group);
  - per set, the gain if every remaining slot went to it, plus the best split of the remaining slots across other sets (a small per-stat knapsack, `newSetGain`);
  - the largest main-slot gain.

  It is scored once. The subtree is skipped when bound + 1e-9·|bound| is below the current N-th score, or when a minStat can't be reached.
- **What the bound relies on.**
  - Sonata and main gains are non-decreasing and non-negative. This is checked at runtime; if it fails, bounds are switched off.
  - The objective score never decreases when a sheet stat rises. This is the same monotonicity the prune's swap step relies on, extended to all stats. It isn't checked at runtime and is documented in the comment.
- **Clusters and chunks.** Each cost list is ordered as main-stat clusters (best first), and within a cluster by solo score. "Rest of this cluster" and "this chunk of 8" are bounded as one unit each, which removes most per-leaf work.
- **Shards.** `searchExhaustive(..., shard)` splits the work into units of (pattern × first echo), assigned round-robin. Each shard returns its own top N, and `mergeShardResults` merges them in the same order.
- **Updated the "Scaling" comment** (your item 3) with the numbers above.
- **minStats edge case** (item 2). Minimums are now checked for each main-slot choice: the build is the best-scoring main among those whose sheet meets every minimum. The baseline (no main bonus) is a candidate. The reference uses the same scorer.
  - This makes pruning sound with minStats. The swap keeps the main's def, and minStat keys are already in the relevant set.
  - Test: Kerasaur (+12% Aero main) against Reactor Husk (+10% ER main) with an ER minimum. The run keeps the combo with the Husk main and the expected Aero/ER values.
  - Before the fix, that combo was dropped because the Kerasaur main failed the minimum.

### Result and progress semantics (behaviour change)
- `SearchResult.evaluated` now means combos covered: every cost-legal combo of the searched pool, each either scored or proven unable to place. It equals `total` at the end.
  - With no Sonata lock this is the same number as before (still 45 in the old tests).
  - With a 5-piece lock it counts the set-narrowed, cost-legal space, which includes duplicate-def combos that fail the lock.
- New fields: `scored` (combos actually assembled) and `total`.
- Progress: `total` now counts only cost-legal combos, and `evaluated` reaches it, so "Checked X of Y" completes.
- `createProgressTracker` now fires when a step boundary is crossed, because bounded subtrees jump the count. `progressStep(total)` gives about 200 updates per run, never finer than 1000 combos.

### Workers (`worker.ts`, `optimizer.worker.ts`, `protocol.ts`)
- `runOptimization` starts `defaultConcurrency(poolSize, navigator.hardwareConcurrency)` workers: 1 below 40 echoes, otherwise cores − 1, capped at 8.
- Each worker gets its `shard` in the `RunMessage`. Progress is summed across workers.
- When every shard has finished, the results are merged; with a single worker the result passes through unchanged.
- Any error rejects the run and terminates all workers, as does cancel.
- `isWorkerOut` now also requires `result.total`.

### UI (`RotationOptimizer.tsx`)
- Candidate filters through the new pure `selectCandidates` in the optimizer layer:
  - "Skip echoes equipped on other characters" (an echo on this character is kept);
  - "Minimum echo level" (0–25, validated).
- The defaults are unchecked and 0, so the whole inventory is searched as before.
- It shows "Searching X of Y echoes" and disables the run below 5 candidates.
- Progress reads "Checked X of Y combos…". The final line is "Checked N combos (M scored in full)".

## Phase A follow-ups
4. **ErrorBoundary per section:**
   - `App.tsx` wraps `<ActiveSection>` in `<ErrorBoundary resetKey={activeSection}>` inside the keyed div.
   - React.lazy remembers a failed load forever, so a failed page chunk now swaps in a fresh lazy wrapper. Its "Try again" button or navigating back then retries the load.
   - Test: `vi.doMock` makes the Roster chunk throw. The alert shows, the nav survives, and Inventory then renders. Removing the boundary makes the test fail (checked).
5. **App test flake.** Page headings now use `findByRole(..., { timeout: 4000 })` (`PAGE_LOAD`). That stays inside the 5 s test timeout; the flaky case took 1.2 s.
6. **tsx/Node `?raw` regression.**
   - New `snapshotFromBundledSource(source)` accepts a string (Vite) or an already-parsed object (tsx). A test covers both.
   - Smoke check: `npx tsx -e "import('./src/data/index.ts')…"` prints 60 characters.

## Files changed (Phase B + follow-ups)
- `src/optimizer/search.ts`: new search, reference, shards, `costPatterns`, `selectCandidates`, `mergeShardResults`, minStats per main.
- `src/optimizer/search.test.ts`: added tests only.
- `src/optimizer/worker.ts`, `src/optimizer/optimizer.worker.ts`, `src/optimizer/protocol.ts`, `src/optimizer/worker.test.ts`.
- `src/ui/components/RotationOptimizer.tsx` and the new `src/ui/components/RotationOptimizer.test.tsx`.
- `scripts/bench-optimizer.ts`: reference comparison, realistic inventory, `WORKERS`/`INVENTORY`/`REFERENCE_MAX`, sizes up to 300.
- `src/App.tsx`, `src/App.test.tsx`, `src/data/index.ts`, `src/data/index.test.ts`.

## Tests added
**`search.test.ts`:**
- `costPatterns`: budgets 12 and 10, and a pool missing a cost (hand-listed).
- Progress: the final update is {45, 45}.
- An invalid shard throws.
- The minStats per-main case.
- `selectCandidates`: 3 tests.
- **Equivalence:**
  - 40 seeded random inventories (n 9–14) against `searchReference`. They cover random requests (4 objective kinds, budgets 10/12, top 1/3/10, none/5pc/2+2 locks, random critRate minimums, `prune:false`) and real Sonata sets, including a 3-piece set, duplicate defs and Jiyan carriers.
  - Each compares builds, prunedEchoes and (when unlocked) evaluated, checks that 3 shards merged equal the single run, and checks that the bounds skipped work.
  - Plus an n=22 case where fewer than 1/4 of the combos are scored, still with an identical result.
  - Mutation checks: dropping the main-gain term or the set-gain term from the bound makes the equivalence test fail.

**`worker.test.ts`:**
- Shard dispatch, summed progress, merge with a tie broken by input order, one failing shard rejecting and terminating all, cancel terminating all.
- `defaultConcurrency`, `progressStep`, and crossing-boundary tracker semantics.

**`RotationOptimizer.test.tsx`:** the default pool, the filters, a minimum-level validation error, and the progress and result text.

**`App.test.tsx`:** the chunk-failure ErrorBoundary test. **`index.test.ts`:** the string or object source test.

## Gate results
- `npm run lint`: clean. `npx tsc -b`: clean. `npm run build`: succeeds. The optimizer worker chunk is 274.9 kB (was 267.3) and the entry chunk 26.8 kB.
- `npm run test`: 86 files, **945 tests: 942 passed, 3 failed**. All 3 are in `src/ui/pages/CalculatorPage.test.tsx` (not my file). Its `vi.mock('../../optimizer/worker.ts')` canned `SearchResult` predates `scored`/`total`, and the UI now prints `result.scored.toLocaleString()`.
  - **Fix:** at `src/ui/pages/CalculatorPage.test.tsx:26`, after `evaluated: 1,` add `scored: 1,` and `total: 1,`.
  - With that change on a temporary copy, all 18 tests in that file pass (verified; the copy is deleted).

## Not verified
- I haven't run real Web Workers in a browser. The Node `worker_threads` bench runs the identical shard code, but `optimizer.worker.ts` itself is only covered by the build and the unit-tested protocol. I didn't check `navigator.hardwareConcurrency` behaviour on phones.
- I didn't test the decomposition-mismatch fallback directly. No real domain input triggers it, and there's no injection hook. It is plain re-run code.
- The score's monotonicity in every sheet stat is assumed, not checked (see above). If a future objective decreases with some stat, both the bounds and the prune's swap step (for relevant stats) would be wrong. The equivalence test only samples the objectives that exist today.
- Phone timings: not measured.

## Open questions
1. **minStats semantics.** Checking each main-slot choice is a small behaviour change for combos with several carriers: a combo can now qualify through a lower-scoring main. I think that is what users mean (they choose slot 1). OK?
2. **`evaluated` meaning** under a 5-piece lock (cost-legal space of the set, not lock-valid combos). Only the UI text uses it. OK?
3. **The synthetic n=300 case still takes about 28 s on 8 workers.** Going further would need a tighter, structure-aware bound: a domain-provided upper bound of the damage formula over a stat box (for example McCormick-style bounds per multiplicative term). That would mean a new domain function, which I didn't add (not my files, and it needs its own tests).
4. **`prune.ts`:** no problems found. It is sound but weak here (0–82 of up to 300 echoes), and the bounds make up for it, so I'm not asking for changes.

## Proposed doc updates
- **AGENTS.md → Architecture → Optimizer layer.** Replace "Naive brute force is fine… add pruning… once it's correct" with:
  > Exact search: `searchExhaustive` (cost-pattern enumeration + branch-and-bound over an additive decomposition derived from `computeStats`, verified at runtime) must return exactly what `searchReference` (brute force) returns — `search.test.ts` holds a seeded equivalence suite; keep it green for any search change. Runs in `defaultConcurrency` Web Workers as deterministic shards (`SearchShard`), merged by `mergeShardResults`. Domain math stays in `src/domain`; the optimizer only adds/compares vectors `computeStats` produced.
- **AGENTS.md → commands.** `npm run bench`: "optimizer benchmark vs brute-force oracle (synthetic + realistic inventories, n = 12..300; `WORKERS=k`, `INVENTORY=`, `REFERENCE_MAX=`)."
- **AGENTS.md → Code Map.** `src/optimizer/` holds `search.ts` (exact search, `selectCandidates`), `prune.ts` (dominance), `worker.ts` (sharded host), `protocol.ts`.
- **reference doc §7** (if it tracks the "branch-and-bound deferred" note): mark step 3 as done. I haven't read §7 in full; please check its wording against the paragraph above.

## Background refresh: proposal (no code written)

### Today
- `snapshotStore.ensureLoaded()` runs one provider refresh per session whenever the active snapshot is more than 7 days old (`isSnapshotStale`).
- That refresh is `fetchFreshSnapshot()`, the shared `providerSync.ts` pipeline: about 370 sequential requests to `api-v2.encore.moe`, with a politeness delay between them.
- The bundled snapshot is dated 2026-10-03. Since 2026-10-10, every first-time visitor triggers a full sync, and so does every returning visitor whose cache is stale.
- Progress isn't saved. If the tab closes mid-sync, the next session starts over.
- A refresh is adopted if it passes zod and is strictly newer. It never gets the human review a CLI sync gets: no diff, no test run, no `index.test.ts` gate.

### Proposal: reviewed same-origin data plus a tiny manifest
1. **Scheduled CI sync.**
   - A GitHub Actions workflow (weekly cron plus `workflow_dispatch`) runs `npm run sync`, i.e. the same `providerSync.ts` pipeline, then `npm run test` (which includes the snapshot gate) and `npm run build`.
   - It opens a PR with the `snapshot.json` diff and a short summary: counts, added and removed ids.
   - A maintainer merges it. Optionally, auto-merge when only the data changed and every check passes.
2. **Publish manifest and payload.**
   - The deploy step also writes `dist/gamedata/manifest.json`: `{ snapshotVersion, fetchedAt, checksum, path, bytes }`.
   - It writes `dist/gamedata/snapshot-<checksum>.json`: the same validated payload, minified and content-addressed, so it can be cached forever.
3. **Client refresh.**
   - Fetch the manifest once per session. It is one small same-origin GET, and the service worker can serve it `NetworkFirst`.
   - Using the existing rules (`shouldAdoptCandidate`, newer-than-app handling), decide whether its version/time is newer than the active snapshot.
   - If it is, fetch the one payload file, check the checksum, zod-validate, `writeCachedSnapshot`, then swap in place.
   - "Check for updates" does the same thing, on demand.
4. **Provider sync on the client.**
   - Drop it from the automatic path.
   - `providerSync.ts` stays as the CLI/CI pipeline. A browser escape hatch ("fetch directly from encore.moe") is optional and only if wanted.

### Tradeoffs
- **Pros:**
  - The fan-run API gets about 1 request per week from CI, instead of about 370 per visitor.
  - Clients make 1–2 same-origin requests and can't be hit by provider CORS changes, rate limits or outages.
  - Every adopted snapshot went through the same review and test gate as a CLI sync.
  - Updates are atomic: one file, nothing half-done to restart.
  - The CSP `connect-src` can drop `https://api-v2.encore.moe`. `img-src` keeps encore.moe for art.
- **Cons:**
  - Freshness waits for the CI cadence plus a merge, so new-patch data can lag a few days unless the workflow is dispatched by hand.
  - It needs a workflow with `contents: write` / `pull-requests: write` (`GITHUB_TOKEN` is enough) and someone to merge.
  - Every merge redeploys Pages. The code chunks stay cached because the snapshot is its own chunk; returning visitors re-download only about 0.4 MB of gzip data.
- **Simpler variant:**
  - Skip the manifest and runtime fetch entirely. A data update is just a deploy, and the existing `UpdatePrompt` reload delivers it.
  - Cost: data then only arrives on reload, via the prompt. Open tabs and users who dismiss the prompt keep old data.
  - The manifest route updates in the background without a reload.

### What would change in AGENTS.md's runtime contract
- Fallback order is unchanged (validated IndexedDB cache -> bundled `snapshot.json`). The third step becomes: "opportunistic background revalidation against the same-origin manifest `<base>gamedata/manifest.json` (never blocks load; at most one manifest fetch per session plus the manual check); a newer payload is fetched from `<base>gamedata/snapshot-<checksum>.json`, checksum- and zod-validated, then adopted only if strictly newer."
- Replace "The CLI sync and the browser refresh share one pipeline (`data/providerSync.ts`)" with: "`data/providerSync.ts` is the only provider pipeline; it runs in the CLI and in the scheduled CI sync, never automatically in browsers. Browsers only consume the reviewed, published snapshot."
- The 7-day `SNAPSHOT_STALE_AFTER_DAYS` gate can go away for the manifest check, since it is cheap. If kept, it only throttles the manifest GET.
- The Hosting section gains the `gamedata/` output. The service worker should precache neither file: the manifest is `NetworkFirst`, and the payload goes into the IndexedDB cache that `activeSnapshot.ts` already owns.

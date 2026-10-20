# Brief: perf (two phases)

Read `00-ground-rules.md` (same folder) first.

**Phase A owns (start now):**
- `src/data/index.ts`
- `src/data/activeSnapshot.ts` (+test)
- `src/state/snapshotStore.ts` (+test)
- `src/App.tsx`, except the footer paragraph (`secpriv` rewrites it)
- `src/App.test.tsx`
- `vite.config.ts`, the `build:` block only. `secpriv` edits the workbox
  font routes and the CSP, and the file has uncommitted scanner work;
  preserve it.
- `scripts/bench-optimizer.ts`

**Phase B owns:**
- `src/optimizer/search.ts` (+test)
- `src/optimizer/worker.ts`, `optimizer.worker.ts`, `protocol.ts` (+tests)
- `src/ui/components/RotationOptimizer.tsx` (+test)

DO NOT touch `src/optimizer/` or `RotationOptimizer` until the coordinator
messages you "phase B go". `bugfix` is fixing dominance pruning in
`prune.ts` right now. When phase A is done, report and stop.

`bugfix` may add an ErrorBoundary component and ask for it to be mounted
per section in `App.tsx`. If the coordinator relays that, it's yours to do.

## Phase A — startup cost

### The problem

The bundled snapshot loads in full on every page load, even when the
IndexedDB cache wins:
- Source: `src/data/generated/snapshot.json`, 4.6 MB of JSON (60
  characters, 124 weapons, 37 sets, 199 Echo defs), shipped as a 2 MB chunk.
- It is downloaded, parsed and zod-validated at `src/data/index.ts:19`, via
  the synchronous seed in `snapshotStore.ts`.
- When the cache wins, the cache copy is then validated again and
  checksummed.

Measured in Node:

| Step | Time |
|---|---|
| `JSON.parse` | 32 ms |
| first zod parse | 117 ms |
| warm zod parse | 58 ms |
| stringify | 14 ms |

Expect several times that on phones.

### What to do

Measure first (build plus a reproducible timing), then cut the cost.

Constraints:
- `docs/toddo.md`, "Data freshness", decision (a): pages seed synchronously
  from the bundled snapshot, so there's no flash and the sync-render tests
  keep working. Don't regress that without a written reason.
- zod parse applies defaults and transforms (e.g. `.default(...)`). Skipping
  validation is only safe if the bundled file is already the parsed output;
  verify that, and keep the validation in a test or build check.

Options to evaluate:
- Trust the bundled snapshot at runtime, since it's validated at sync/test
  time.
- Validate the cache once per (app build, checksum) instead of on every read.
- Ship the snapshot as `JSON.parse('…')` or as a fetched asset.
- Move cache validation off the main thread.

### Route-level code splitting

`App.tsx` statically imports all six pages, and the main chunk is about
506 KB. Lazy-load pages with `React.lazy` + `Suspense`, with a minimal
fallback that fits the Pixel Arcade UI. Keep the App tests green.

Report before/after numbers: chunk sizes from `npm run build`, plus your
timing method and results.

## Phase B — optimizer scale (after "phase B go")

### The problem

- The optimizer receives the entire inventory (`RotationOptimizer.tsx:88`).
- It enumerates every C(n,5) combo and only then checks cost
  (`search.ts:159`).
- 50 Echoes means 2.1M combos; 200 means 2.5B.
- The bench (`npm run bench`) stops at n=50, at about 65k scored combos/s.

### Goal

Make realistic inventories (100–300 Echoes) usable while keeping results
EXACT: the top-N must be identical to brute force.

Approaches:
- Enumerate by legal cost pattern per budget. For budget 12 that includes
  4-3-3-1-1, 4-4-1-1-1, 3-3-3-1-1, 4-3-1-1-1 and more; derive the patterns
  in code, don't hand-list them.
- Prefilter by Sonata lock.
- Accumulate Echo contributions incrementally down the loop, instead of
  recomputing from scratch, where the domain allows. Domain math stays in
  `src/domain`; no formulas in the optimizer.
- Consider branch-and-bound with a provable upper bound.
- Split work across `navigator.hardwareConcurrency` workers, with cancel and
  a merged top-N.

Use bugfix's pruning as-is. Don't change `prune.ts`; report problems instead.

### Also in phase B

- **Progress display:** `total` (`search.ts:141`) counts cost-invalid combos
  but `evaluated` doesn't, so "Evaluated X of Y" never reaches Y. Fix it.
- **Candidate filters in the RotationOptimizer UI:** exclude Echoes equipped
  on other characters (`OwnedEcho.equippedTo`), and a minimum level. Keep
  the defaults identical to today's behaviour.
- **Benchmark:** extend `scripts/bench-optimizer.ts` to n=100/200/300 and
  report before/after.
- **Equivalence test:** seeded random inventories, proving the new search
  returns the same results as the old brute force.

### Background refresh (proposal only — no code, no new workflows)

Current behaviour (`src/state/snapshotStore.ts:98` and
`src/data/activeSnapshot.ts`):
- Every visitor whose snapshot is more than 7 days old fires about 370
  sequential requests at the fan-run encore.moe API. Right now that's every
  new visitor, because the bundled snapshot is from 2026-10-03.
- If the visitor leaves before it finishes, it starts over next session.
- It adopts the provider data without the review the CLI sync gets.

Propose an alternative, for example: a scheduled CI sync publishes a
reviewed snapshot plus a small manifest on Pages, and clients fetch one
same-origin file. Put the proposal in your phase B report, with the
tradeoffs and what would change in AGENTS.md's runtime contract.

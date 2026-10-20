# phase B go — coordinator notes

Phase A is reviewed and accepted. Your open-question answers:
- (2) A header plus skeleton on a cold first visit is fine.
- (4) Keep the memo out of `state/backup.ts`.
- (5) The worker for the cache read can wait.

`bugfix` is done. Its pruning fix has landed, so `src/optimizer/` and
`RotationOptimizer` are yours now, together with the phase A files.

## Context for phase B

1. **The new pruning rule** (`src/optimizer/prune.ts`; the soundness proof
   is in the `pruneDominated` comment): an Echo is dropped only with at least
   `k + topN − 1` counted dominators, where
   `k = maxSameCostInCombo(cost, budget, poolCosts)`. It prunes far less than
   before.
   - `npm run bench` now gives n=50 → 1,027,824 combos in 24.5 s
     (about 42k/s). The old, unsound rule did about 92k combos in 1.4 s.
   - Exact scaling therefore has to come from the search itself:
     enumeration by cost pattern, bounds, and workers.
   - Don't change the pruning semantics in `prune.ts`. If you think the rule
     is wrong or too weak, report it.
   - `bugfix` edited `src/optimizer/search.test.ts`: it rewrote "prunes by
     default…" and added "does not prune when a dominator could share the
     combo". Re-read the file before editing.
2. **minStats edge case** (found by `bugfix`): `searchExhaustive` applies
   `minStats` to the sheet of the best-scoring main Echo. A swap that changes
   which main Echo wins could make a kept combo fail a min-stat that the
   pruned combo passed. Handle it while you're in `search.ts`, e.g. check
   minStats per main-Echo candidate, or exclude carriers from pruning when
   minStats is set. Add a test.
3. **Stale doc comment:** the "Scaling" comment on `searchExhaustive` still
   describes the old pruning rule and its benchmark numbers. Update it.

## Phase A follow-ups (your files)

4. **Mount the ErrorBoundary per section in `App.tsx`.** `bugfix` added
   `src/ui/components/ErrorBoundary.tsx`; it already wraps the app in
   `main.tsx`. Use:
   `<ErrorBoundary resetKey={activeSection}><ActiveSection section={activeSection} /></ErrorBoundary>`
   inside the `key={activeSection}` div. A failed lazy chunk then keeps the
   nav alive. Add a test where a page chunk import rejects.
5. **`App.test.tsx` flake:** "opens on the inventory section" timed out once
   during a full-suite run. `findByRole` waits up to 1000 ms, and the heading
   took 1231 ms because the page is now a lazy chunk. Make it robust.
6. **tsx/Node regression in `src/data/index.ts`:** outside Vite, the `?raw`
   import yields an object, so `JSON.parse` throws
   `"[object Object]" is not valid JSON`. Any tsx script that imports
   `src/data/index.ts` crashes (repo scripts don't, but ad-hoc ones do).
   Make `loadBundledSnapshot` tolerate both forms (a string, or an
   already-parsed object), and add a test.

Then do the phase B brief as written. Finish with a report file at
`/tmp/claude-1000/-home-userman-Projects-WuwaC/a73243ee-af07-45c6-9ab5-7af4a0e6afb9/scratchpad/reports/perf-phaseB.md`,
and reply with its path plus a 5-line summary.

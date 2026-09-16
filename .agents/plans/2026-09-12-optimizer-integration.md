## Goal

Make the optimizer score what the game actually does: Sonata set bonuses with transcribed numbers, wielder weapon passives, Echo main-slot bonuses, and imported team buffs must all affect Echo rankings — with the calculator and optimizer agreeing on every loadout by construction.

## Success Criteria

- A 5-piece Sierra Gale (or any transcribed 5pc) combo outranks an otherwise identical off-set combo by exactly its transcribed bonus in optimizer results.
- Optimizer DPR for a winning build equals the calculator DPR for the same 5 echoes (same buffs/blocks), so "Apply to loadout" never surprises.
- No dominated-echo pruning can ever drop an echo that a Sonata threshold needs (proven by a regression test that fails on the old code).
- Every assumed full-uptime/stack effect is listed next to the score it influenced — no silent optimism.
- `npm run test`, `lint`, `build` pass; `bench` shows the added scoring cost stays interactive on mixed inventories.

## Context And Current Facts

- Search scores each 5-combo via `computeStats` + `scoreSheet` (`src/optimizer/search.ts:124-158`). `computeStats` today applies only `kind === 'stat'` Sonata bonuses and weapon passives; all 54 `custom` Sonata bonuses and all 122 `custom` weapon passives are warned-and-skipped (`src/domain/stats.ts:185-220`). Echo main-slot bonuses are never applied anywhere. Result: the optimizer systematically undervalues 5pc sets, signature weapons' riders, and main-slot carriers.
- `computeStats` has exactly two callers: the calculator path (`src/domain/rotation.ts:127`) and the optimizer (`src/optimizer/search.ts:127`). Auto-applying transcriptions inside `computeStats` therefore fixes both surfaces at once, with zero protocol changes (the worker bundles by static import — `src/optimizer/optimizer.worker.ts`).
- Team buffs already reach the optimizer when imported in the calculator: `rotation-dpr` carries `buffs`/`globalBuffIds` across the worker boundary (`src/domain/objectives.ts:74-92`) and `RotationOptimizer` forwards the calculator's live buff lists (`src/ui/components/RotationOptimizer.tsx:83`). This needs a verification test, not new plumbing.
- `expected-damage` / `max-stat` objectives have no UI surface (only schema/domain/search reference them), so no spec changes are needed for them.
- **Pre-existing soundness bug (found during planning):** `pruneDominated` compares raw main/sub stats within equal cost only (`src/optimizer/prune.ts:97-118`) and ignores Sonata identity — but set bonuses are combo-composition-dependent, so swapping a pruned echo for its dominator can lose a 2pc/5pc threshold and lower the score. Pruning is already unsound for today's auto-applied 2pc stats; auto-applying 5pc customs would widen the hole. Existing prune tests all use one Sonata (`prune.test.ts` hardcodes `sierra-gale`), so a same-set restriction breaks no pinned behavior.
- Transcription sources already exist and are tested: `BUFF_PRESETS` (Echo main-slot, 9 Sonata customs, weapon rank series) and the team table. The plan reuses them as the single source of truth rather than re-transcribing.
- `sonataLock` is fully implemented in search (`search.ts:202-208`, tested) but the UI hardcodes `{ mode: 'none' }` (`RotationOptimizer.tsx:82`).

## Constraints And Non-goals

- Follow `AGENTS.md`: one-way dependency, strict TS, no `any` in domain/optimizer, hand-computed domain tests, no stat math in `.tsx`.
- No new numbers from memory: every auto-applied value comes from the existing transcribed catalogs (snapshot-text provenance).
- Non-goals: per-second buff windows (still blocked by the timestamp-less block model — full-uptime assumptions stay, now disclosed per result); branch-and-bound search (still deferred per the `search.ts` scaling note); new objective kinds; UI for `expected-damage`/`max-stat`; re-scoring already-saved builds (they carry their spec and score; see Risks).

## Key Decisions

1. **Auto-apply inside `computeStats`, not in the search loop.** Both callers inherit identical math, so calculator and optimizer agree by construction. Rejected: optimizer-only application (would reintroduce calculator/optimizer divergence on every 5pc loadout).
2. **Restrict dominance pruning to same (cost, sonataId).** The minimal soundness restoration: within one set, swapping pruned-for-dominator preserves set counts exactly. Rejected: keeping cross-set pruning (provably drops set-completing echoes) and disabling pruning (throws away the interactive scaling the bench documents).
3. **Explicit `mainEcho` input, not an ordering convention.** `computeStats` gains an optional `mainEcho` param; the calculator passes slot 1 explicitly. Rejected: "echoes[0] is the main slot" (implicit, breaks the optimizer's unordered combos silently).
4. **Best-main rescoring bounded to transcribed carriers.** For each combo the search scores the baseline plus one rescore per combo member carrying a transcribed main-slot bonus, keeping the max and reporting which echo was main. Rejected: single arbitrary main (wrong rankings), all-5 rescore (5x cost on every combo), and ignoring main-slot bonuses (leaves the 4-cost choice mis-ranked).
5. **Remove auto-covered entries from the manual preset catalog.** Once `computeStats` applies wielded-weapon and met-threshold Sonata effects, the matching `BUFF_PRESETS` entries (and only those — team/incoming variants stay) are deleted so they cannot double-apply. Rejected: label-matching dedup (fragile) and keeping both (guaranteed double-counts).
6. **Disclose via a new `appliedAssumptions` result field.** `ComputeStatsResult` gains `appliedAssumptions: string[]` (e.g. "Verdant Summit R5, full stacks (2)"), rendered next to warnings in results. Rejected: stuffing into `warnings` (they are not problems) and silence (violates the honest-labeling rule the catalog established).

## Recommended Approach

Fix the search's correctness foundation first (pruning), then move the transcriptions into the shared math (`computeStats`), then remove the now-duplicate manual entries, then teach the search about main-slot choice, and finally expose the already-built Sonata lock in the UI. Each step is verifiable in isolation and ordered so no step depends on a later one.

## Work Plan

1. **Sound pruning.** Restrict `pruneDominated` to same cost AND same `sonataId`; add a regression test with a hand-computed inventory where the old code prunes a set-completing echo and misses the optimum (assert the optimum survives and the old behavior is gone). Update the `prune.ts` doc comment (soundness invariant) and the scaling note if bench numbers move.
2. **Auto-apply in `computeStats`.** Apply transcribed Sonata customs at met piece thresholds (piece-count rule unchanged: distinct defs), the wielded weapon's preset at `roster.weaponRank` (`target === 'wielder'` only — team/incoming variants never touch the wielder's sheet), and `mainEcho`'s transcribed main-slot bonus via the new optional input. Add `appliedAssumptions: string[]` to the result; keep warnings for still-unstructured effects. Hand-computed tests: 5pc Sierra Gale combo gains exactly 0.30 Aero; Verdant Summit R1 vs R5 deltas; main-slot Lorelei adds Havoc+Basic only when passed as `mainEcho`. Audit every `ComputeStatsResult` destructurer/`toEqual` for the new field.
3. **Catalog dedup.** Delete auto-covered Sonata-5pc and wielder-weapon entries from `BUFF_PRESETS` (team/incoming entries stay); update the preset tests that pin removed ids (e.g. switch spot-checks to surviving entries) and the module doc. Extend `resolvePresetMods` tests if the helper changes.
4. **Best-main search.** In `searchExhaustive`, score baseline + one rescore per transcribed carrier in the combo; store the winning main echo id on `RankedBuild` and show it ("main: Lorelei") in results. Test: a combo whose optimum requires a specific main ranks first with that main recorded. Run `npm run bench` before/after — mixed inventories must stay interactive; report the multiplier.
5. **UI + verification.** Expose the Sonata lock (none / 5-piece / 2+2) in `RotationOptimizer`; render `appliedAssumptions` on each result; add a test proving calculator-imported team buffs change optimizer ranking (import Lynae buffs → ranking shifts vs no-buff run on the same inventory). Update the stale "311 list entries" Database copy if touched files neighbor it (do not expand scope beyond that line).
6. **Docs.** Update `AGENTS.md`/`docs/WUWA_GAME_REFERENCE.md` §7-adjacent wording only where it contradicts the new behavior (pruning invariant, auto-applied effects, Team v2 landed). One short pass, no rewrite.

## Validation Plan

- New focused tests: prune soundness regression (fails pre-fix — verify by stashing the fix once); `computeStats` auto-apply hand-computed values; catalog/sourceRef consistency; best-main ranking; team-buff ranking shift; Sonata-lock UI select.
- `npm run test` (full suite), `npm run lint`, `npm run build`.
- `npm run bench` before/after step 4: assert mixed-inventory runtime stays within ~3x of baseline and exactness is preserved (no caps introduced).
- Manual: run "Find best builds" on a seeded inventory with a 5pc-capable pool; confirm a completed 5pc set wins where the bonus dictates, assumptions render, and "Apply to loadout" reproduces the optimizer DPR in the calculator header.
- Highest-risk check: the prune regression test — it must fail on the old code (demonstrating the real miss) and pass on the new code; if it passes pre-fix, the soundness claim is wrong and the plan stops for re-analysis.

## Risks / Rollback

- Calculator numbers change wherever assumptions now auto-apply (previously warned/skipped). Mitigated by per-result `appliedAssumptions` disclosure; rollback is reverting the `computeStats` change (single module, catalog deletions revert with it).
- Saved builds carry old scores that won't match re-scored DPR. No migration: scores are labeled snapshots of their spec; accepted and documented in the plan (not silent).
- Bench regression on adversarial dense inventories: bounded by carrier-only rescoring; if mixed inventories exceed the interactivity budget, gate best-main behind an option (default on) rather than capping exactness.
- No worker-protocol or schema-migration risk: all changes are inside existing bundled modules; `appliedAssumptions` is additive.

## Open Questions

None.

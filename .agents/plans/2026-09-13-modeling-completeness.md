## Goal

Close the remaining damage-modeling gaps so the optimizer and calculator score complete builds: transcribe the rest of the Sonata set bonuses with live-source values, settle the RES-shred sign convention and apply shred riders, model coordinated attacks, and score slot-1 Echo skill damage in rotations.

## Success Criteria

- Every Sonata bonus with a knowable numeric value is transcribed and auto-applied at its threshold; anything still `custom` cites why (unknowable, gated, or non-sheet mechanic).
- A stated, tested RES-shred convention exists, and at least Phoebe's Outro + Woodland Aria's rider flow through it.
- Coordinated-attack kits (Jiyan, Yinlin) and bonuses (Hecate, Youhu) score through a documented bucket instead of warning.
- A rotation can include the slot-1 Echo's skill damage as a block.
- `npm run test`, `lint`, `build` pass; no calculator/optimizer divergence on any loadout using the new coverage.

## Context And Current Facts

- Just merged (`feat/optimizer-integration` → `main`): `computeStats` auto-applies transcribed weapon passives, met Sonata thresholds, and slot-1 Echo bonuses via `BUFF_PRESETS` + `isAutoApplied`, disclosed in `appliedAssumptions` (`src/domain/stats.ts`, `src/data/buffPresets.ts`).
- Current transcription state (verified last session): 9 of 62 Sonata bonuses transcribed (all classic 5pc effects); the rest are `custom` notes, many newer sets using `{0}` placeholders with no values in the provider text. All such values must come from a live source (wiki set pages), never memory.
- Deliberately skipped riders awaiting conventions: RES-shred wordings (Phoebe Outro 10% Spectro shred, Woodland Aria Aero shred, Suisui Havoc RES rider) — `resistancePenetration` exists on the sheet but its shred-sign convention is unsettled; coordinated-attack bonuses (Hecate +40%, Youhu +100%, Jiyan Outro) — no sheet bucket exists.
- Echo skills: only main-slot passive bonuses are modeled; active skill damage (motion values, cooldown) is not scorable, and no rotation block kind represents it.
- Non-goals carry over: per-second buff windows (blocks still timestamp-less), branch-and-bound, new objective kinds.

## Constraints And Non-goals

- Follow `AGENTS.md`: one-way dependency, strict TS, no `any` in domain/optimizer, hand-computed domain tests, no stat math in `.tsx`.
- No numbers from memory: every new value traces to snapshot text or an inspected live source with provenance.
- Non-goals: timed rotation model, branch-and-bound, objective UI for `expected-damage`/`max-stat`, re-scoring saved builds.

## Key Decisions

1. **Extend the catalogs; don't build a second pipeline.** New transcriptions go into `BUFF_PRESETS` (with `sonataPieceCount` / gates as established) so auto-apply, disclosure, and picker filtering keep working unchanged. Rejected: a parallel table (splits the source of truth the last branch just unified).
2. **Settle RES-shred by reading `computeResMultiplier`, not by vote.** The convention must match how the term consumes the sheet value; the plan's first verification step is a hand-computed test proving shred lowers enemy resistance with the chosen sign. Rejected: guessing the sign from the schema comment alone.
3. **Coordinated attacks get an explicit design decision before code.** Either a new `dmgBonus:coordinated` additive bucket or inclusion in an existing term — decided from the reference formula tree (§6), documented, then implemented. Rejected: silently mapping to `dmgBonus:echo` (a coordinated attack is not an Echo skill).
4. **Echo skill damage enters as a rotation block kind, not a sheet stat.** Cooldown-gated active damage is per-rotation math, so it belongs in blocks/scoring with the Echo's motion values, reusing the existing buff/bucket machinery. Rejected: sheet-level approximation (can't represent cooldowns or per-cast crit).

## Recommended Approach

Do the mechanical transcription wave first (Sonata values — high volume, low risk, exercises the existing pipeline), then the two convention decisions (shred sign, coordinated bucket), then Echo-skill blocks last since they touch rotation scoring. Each phase lands independently.

## Work Plan

1. **Sonata transcription wave.** For each untranscribed set bonus with a knowable value, fetch the numbers from an inspected live source, add `BUFF_PRESETS` entries with `sonataPieceCount`, and extend the sourceRef/piece-threshold tests. Sets whose values are genuinely unknowable stay `custom` with a dated comment. Spot-check 5pc-vs-2pc stacking on two sets by hand.
2. **RES-shred convention.** Read `computeResMultiplier` + callers, state the sign convention in the schema comment, add a hand-computed test (shred lowers effective resistance by exactly X), then transcribe the Phoebe/Woodland-Aria/Suisui riders and flip their "excluded" notes to applied.
3. **Coordinated attacks.** Decide the bucket per Decision 3 (document in reference §6-adjacent note), add the sheet key + formula term if new, wire Jiyan/Yinlin kit mods and the Hecate/Youhu transcriptions, remove their exclusion notes. Hand-computed test on a Yinlin-style sheet.
4. **Echo-skill blocks.** Add an Echo-skill block kind carrying the slot-1 Echo's motion values/cooldown, score it through the existing damage pipeline, expose "add Echo skill" in the rotation UI, and cover with a hand-computed rotation test. Optimizer picks up the math automatically via shared scoring.
5. **Docs + gates.** Update the preset catalog headers (exclusion lists shrink), reference §6/§7 notes where behavior changed, then `npm run test`, `lint`, `build`, and a bench sanity check (new terms must not move per-combo cost materially).

## Validation Plan

- New tests: Sonata threshold spot-checks (hand-computed); shred sign test (fails if the sign flips); coordinated bucket test; Echo-skill block rotation test; existing consistency tests extended, never weakened.
- `npm run test`, `lint`, `build`; `npm run bench` sanity (flag only if per-combo cost regresses).
- Manual: build a Phoebe team (shred applies), a Yinlin rotation (coordinated scores), a Lorelei-main rotation with its skill as a block; confirm `Assumes:` lines and no new warnings on covered effects.
- Highest-risk check: the shred-sign test — if the chosen sign can't be proven by a hand-computed resistance test, stop and re-analyze rather than shipping a guess.

## Risks / Rollback

- Live-source values can be wrong or version-skewed: mitigate with per-entry provenance (URL + date) and the existing sourceRef tests; rollback is reverting catalog entries (data-only).
- Formula-tree change (coordinated bucket) ripples through damage/rotation/optimizer tests: additive keys keep it contained; any red test is a contract to satisfy, not to rewrite.
- Scope creep across ~25 sets: timebox phase 1 to value-bearing bonuses; cosmetic/unknowable notes stay `custom` by explicit decision, not by drift.

## Open Questions

None for the receiving session to ask upfront — the plan's first step in phases 2–3 is reading the code the decision rests on.

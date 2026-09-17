## Goal

Transcribe the transcribable subset of Resonance Chain ranks (S1–S6) from display text into scored mechanics, so raising a roster chain rank changes computed stats and rotation damage instead of only emitting warnings.

## Success Criteria

- A `CHAIN_PRESETS`-style curated catalog exists; every entry cites its snapshot character + rank, and a test asserts every entry still resolves.
- Sheet-scope ranks (stat/DMG-bonus/crit/RES-shred wordings) apply in `computeStats` for ranks ≤ the roster rank, with full-uptime assumptions surfaced in `appliedAssumptions`.
- Motion-scope ranks ("DMG multiplier increased by X%", "deals N% more DMG") multiply the named motions only, via a data-driven path in `characterSkillMods`.
- Skill-scoped crit ranks apply per-skill; team-scope ranks surface through the team-buff layer with rank gating.
- An every-node-accounted test pins all 348 ranks (58 characters × 6) as cataloged, module-covered, or dated-note — zero silent gaps, zero unaccounted nodes.
- All existing gates stay green (`test`, `lint`, `build`); chain coverage grows wave by wave without breaking S0 baselines.

## Context And Current Facts

- All 348 chain nodes in the bundled snapshot are `effect.kind === 'custom'` ("Unstructured kit effect") — sync deliberately does not structure them (`scripts/sync-gamedata.ts:331-333`, fabrication guardrail).
- `computeStats` already gates ranks by `roster.resonanceChain` and warns per unapplied rank (`src/domain/stats.ts:256-260`); the rank 0–6 input already exists in the Roster and Calculator pages. Only transcription is missing — no new plumbing for sheet-scope ranks.
- Corpus shape (regex census over the snapshot this session; multi-counted, approximate): "DMG multiplier" wordings 85, crit 42, "DMG Bonus +N%" 36, team buffs 41, self ATK% 20, "more DMG" 13, DEF-ignore/RES-shred 11, energy/concerto 26, heal/shield/HP 31, cooldown 13, duration-gated 126 (overlaps others), HP-gated 2, guaranteed-crit 1, extra-cast 2, regen 1.
- Precedents to mirror: `BUFF_PRESETS` (`src/data/buffPresets.ts`: `sourceRef` resolution test, full-uptime assumptions, dated exclusion notes, R5 ≤ 25% gated-DEF rule), `TEAM_BUFFS` (`src/data/teamBuffs.ts`: every-character-accounted test, negative-penetration shred convention), per-character motion modules (`src/domain/zani.ts` + dispatcher `src/domain/characterMods.ts`, `ResolvedSkillMods`).
- Motion names exist per motion (`characterSkillSchema.motionValues[].name`), so data-driven motion matching is possible; `EnemyProfile` has no HP% input (`src/domain/damage.ts:44-56`).

## Constraints And Non-goals

- Provenance over memory: every value transcribed from the snapshot description; no meta/popularity guessing, no structuring beyond what the wording states.
- Strict TS, no `any`; formulas in `src/domain`; every domain function gets a hand-computed unit test (AGENTS.md).
- Non-goals: sync-time structuring (the fabrication guardrail stays — catalog is curated, like `BUFF_PRESETS`); new enemy model inputs (HP% gating resolves by assumption, D4); rebalancing existing per-character modules (they stay; the catalog is additive); cooldown/extra-cast/duration/energy/concerto/ATK-SPD mechanics (no sheet or scoring bucket — dated notes).

## Key Decisions

- **D1 — One catalog, four scopes.** `src/data/chainPresets.ts` with entries keyed by `{ characterId, rank }` and `scope: 'sheet' | 'motion' | 'team' | 'note'`, mirroring `BuffPreset` (`sourceRef`, `mods`, `assumption`). One every-node-accounted test instead of three. Rejected: three separate catalogs (triple accounting tests) and stuffing chains into `BUFF_PRESETS` (different key shape, rank-gated application).
- **D2 — Data-driven motion entries for uniform wordings.** The 85 "DMG multiplier" + 13 "more DMG" wordings become `{ skillKind?, motionNameIncludes, multiplier, minRank }` rows consumed generically by `characterSkillMods`. Per-character modules stay only for stack/counter mechanics that data cannot express (existing zani/chisa/xuanling/aemeath untouched). Rejected: one module per character (~50 modules for a uniform pattern). Matching is case-insensitive substring, never regex-in-data; a test fails any pattern matching zero motions.
- **D3 — Skill-scoped crit extends `ResolvedSkillMods`.** Add `critRateExtra` / `critDmgExtra` consumed at skill scoring (taoqi S2, sanhua S5, mortefi S3); guaranteed crit (chixia S1) is `critRateExtra` clamped to 1 at the seam. The exact consumption seam in `rotation.ts` is verified in Wave 1 — if invasive, skill-crit drops to dated notes rather than forcing a scoring refactor.
- **D4 — HP-gated ranks (n=2) take the gate-met assumption.** Sanhua S3 / Chixia S3 transcribe at full value with an `assumption` string ("target below N% HP"), matching the buff-preset stacking convention. Rejected: a new `enemyHpPercent` input for two nodes.
- **D5 — Category batches beat popularity batches.** No reliable most-played source exists in-repo, so after the pilot wave, transcription proceeds by wording category across all 58 characters (multiplier wordings first — 85 nodes, biggest value), not by character popularity.
- **D6 — Coverage grows behind an explicit set.** The accounted test asserts full coverage only for characters in `CHAIN_COVERAGE` (pilot set first, expanded per wave) so Wave 1 lands green with 4 pilots and each later wave is independently reviewable.

## Recommended Approach

Wave 1 builds the framework on 4 pilot characters chosen for span, not popularity: yangyang (sheet + team + multiplier wordings across S1–S6), chixia (guaranteed crit, HP gate, ammo/cooldown mechanics — exercises the crit path and the notes path), jiyan (heaviest existing test coverage), zani (proves catalog ↔ existing-module coexistence). Waves 2+ transcribe category by category; the final wave sweeps remaining notes to reach 348/348 accounted.

## Work Plan

- **Wave 1a — Catalog + sheet scope (pilots).** New `src/data/chainPresets.ts` (types, `CHAIN_COVERAGE = ['yangyang', 'chixia', 'jiyan', 'zani']`, sheet-scope pilot entries, e.g. Yangyang S1/S3, Rover-Spectro-style regen where present in pilots). `computeStats` applies sheet entries at ranks ≤ roster rank; assumptions join `appliedAssumptions`; note-scope ranks warn with their reason.
- **Wave 1b — Motion scope.** Generic motion-entry consumption in `characterSkillMods` + dead-pattern test (every `motionNameIncludes` matches ≥1 snapshot motion). Pilot motion entries (Yangyang S4/S5, Jiyan/Zani multiplier ranks not already module-covered).
- **Wave 1c — Skill-crit + team scope.** Verify the rotation scoring seam; add `critRateExtra`/`critDmgExtra` (+ clamp) and Chixia S1; surface team-scope pilot entries (Yangyang S6 team ATK) through the manual team-buff path with rank gating. Pilot note entries for the rest (Chixia ammo/cooldown, Jiyan Resolve/counters).
- **Wave 2 — Multiplier batch.** Transcribe all ~85 "DMG multiplier" + ~15 "more DMG"/"damage increased" wordings across the roster into motion entries. Largest single scoring-value step.
- **Wave 3 — Sheet batch.** All crit (42), DMG-bonus (36), ATK% (20), shred (11), regen/HP% wordings into sheet entries, reusing the buff-preset conventions (full-uptime, shred-sign, gated-DEF rule).
- **Wave 4 — Team batch + notes sweep.** Team-scope ranks (41) into team entries; everything remaining (cooldown, extra-cast, duration, energy/concerto, heal-intake, shields) into `scope: 'note'` with dated reasons; expand `CHAIN_COVERAGE` to all 58. Update the game-reference doc's chain section.

## Validation Plan

- New tests, all hand-computed: S0-vs-Sn sheet diffs per pilot (exact expected values); motion entries multiply the named motion only (sibling motion unchanged); skill-crit entries shift only the named skill; dead-pattern test; `sourceRef` (character + rank) resolution test; every-node-accounted test over `CHAIN_COVERAGE`.
- Regression: existing S0 baselines unchanged (catalog entries only apply at rank ≥ 1); full `npm run test`, `npm run lint`, `npm run build` green per wave; `npm run bench` smoke (chain application must not regress optimizer throughput — it runs once per candidate loadout, same as today).
- Manual: Calculator page at S0 vs S6 for a pilot shows changed score + visible assumptions; warnings list shrinks accordingly.
- Highest-risk step: Wave 1c's rotation-seam verification for skill-scoped crit — if the seam is invasive, that sub-scope converts to dated notes and the wave still lands.

## Risks / Rollback

- **Motion-name drift:** chain prose names ("Heavy Attack Cloudy Frenzy") may not exactly match snapshot motion names; mitigated by the dead-pattern test (fails loud, not silent) plus per-entry substring review during transcription.
- **Re-sync staleness:** a future `npm run sync` can rewrite descriptions under frozen transcriptions — same accepted risk as `BUFF_PRESETS`; the resolution test catches deleted ranks, and values re-verify against the new snapshot on sync (note in the sync docs).
- **Semantics disputes** ("damage dealt increased" multiplicative vs additive): default multiplicative per-motion (matches the D4 status-amp analysis); ambiguous cases stay notes, never guesses.
- **Rollback:** the catalog is additive — deleting `chainPresets.ts` + its `computeStats`/`characterSkillMods` call sites restores today's warn-and-skip behavior exactly.

## Open Questions

None — pilot choice, batch order, and all semantics defaults are decided above; Wave 1c confirms the crit seam by inspection, not by asking.

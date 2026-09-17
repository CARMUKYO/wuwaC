## Goal

Close six known-approximate behaviors with small, high-trust fixes: verify the forteLevel → motion-value mapping, track weapon ascension and forte unlock state, settle the multi-hit scoring question by inspection, and fix last turn's three findings (Tune Break stale display, expected-damage kit context, custom-buff shred entry).

## Success Criteria

- The forteLevel → array-index mapping is verified against provider evidence with a pinning test; the TODO is gone.
- Weapon ascension and forte node unlocks are tracked roster state that flows into `computeStats`; previous behavior (all nodes active, pre-ascension weapon) remains the default, never a silent change.
- Multi-hit scoring has a documented, tested decision (score-once is correct — ratios are hit-totals).
- Tune Break blocks no longer show a false "not on kit" alert and their coefficient editor is reachable.
- Optimizer `expected-damage` scoring receives character/chain context (and optional kit state) instead of scoring context-free.
- A custom buff can express RES shred (negative penetration) with a discoverable hint; echo forms still reject negatives.

## Context And Current Facts

- `resolveMotion` (`src/domain/damage.ts:219-232`) assumes index = forteLevel − 1 over ~20-entry arrays; UI forte levels cap at 10 (`RotationTimeline.tsx:332`).
- Live provider check this session (`/character/1402`): every `DamageList[].RateLv` has exactly 10 entries matching `SkillAttributes.values[0..9]` (Yangyang Stage 1 Lv10 = 44.73% at index 9). Entries 10–19 are an unlabeled second track the combat formula never addresses.
- `parseMotionText` (`src/data/encore.ts:53-54`) folds hit counts into the ratio (`11.33%*8` → 0.9064 total), so `values[]` are hit-totals; `motion.hits` is only rendered (`RotationTimeline.tsx:102`), never scored.
- Character ascension is tracked and used (`getBaseStatsAtLevel`, `stats.ts:60-82`); weapon ascension is not (`rosterEntry` has no weapon-ascension field; `lookupCurve` with integer levels never selects the `.5` post-ascension tiers). Forte nodes apply unconditionally (`stats.ts:274-275`); provider `SkillTree` nodes carry Id/Title/Describe/Icon/Consume only — no unlock or ascension gating to sync.
- `isBlockStale` (`rotation.ts:110-116`) exempts `negativeStatus`/`echoSkill` but not `tuneBreak`, whose blocks carry `skillId: ''` — every Tune Break block renders the amber "not on kit" alert, which also hides its coefficient editor (details element is in the else branch, `RotationTimeline.tsx:286-305`). `tuneRupture` blocks carry real skill/motion ids and are unaffected.
- `scoreSheet` `expected-damage` (`objectives.ts:61-72`) calls `computeDamage` without `characterId`/`resonanceChain`/kit inputs, although `search.ts:130-139` already puts character/chain context into `ScoreContext` — the branch drops it.
- `parseDisplayValue` (`ui/format.ts:23-30`) throws on any negative input, but RES shred is modeled as negative `resistancePenetration` — so no custom buff can express shred. The parser is shared with `EchoForm`, where negatives must stay invalid.

## Constraints And Non-goals

- Strict TS, no `any`; math stays in `src/domain`; hand-computed unit tests for domain changes (AGENTS.md).
- No behavior change without a test pinning old-vs-new; defaults preserve current scores (all nodes on, pre-ascension weapon, absent kit state = zeros).
- Non-goals: consuming motion-value entries 10–19 (unverified second track); inferring forte unlocks from ascension tiers (unsourced — manual toggles instead); kit-state UI for the optimizer (rotation-dpr remains the kit-aware objective); per-hit crit-variance modeling.
- No backend/account changes; local-first untouched.

## Key Decisions

- **D1 — Mapping verified, keep index = forteLevel − 1.** Provider `RateLv` (10 levels, the combat-formula source) matches `values[0..9]` exactly. Replace the TODO with the verified doc + a pinning test on a known Lv10 value. Rejected: consuming entries 10–19 (unlabeled, unused by the formula) — document as explicitly ignored.
- **D2 — Weapon ascension mirrors character ascension; forte unlocks are manual toggles.** Provider weapon curves already carry `.5` post-ascension tiers, so add `roster.weaponAscension` (0–6, default 0) + selection logic + UI control. Provider forte nodes carry no gating data, so unlock state can only be user-declared: `roster.forteUnlockedIds` (absent = all active, current behavior) + checkboxes. Rejected: ascension-tier heuristic for forte nodes (fabrication).
- **D3 — Multi-hit scores once, by construction.** Ratios are hit-totals at parse time, so multiplying by `hits` at scoring would 8× damage — wrong. Keep scoring, document in `resolveMotion` + reference doc, pin with a test (`11.33%*8` → 0.9064 scores once). Display keeps `×N` as an informational suffix.
- **D4 — Exempt `tuneBreak` in `isBlockStale`.** One-line root-cause fix: these blocks are character-independent by design (like `negativeStatus`/`echoSkill`). Rejected: giving them fake skillIds (lies to the resolver).
- **D5 — Pass context through `scoreSheet`, add optional kit fields, no new UI.** Thread `characterId`/`resonanceChain` (already in `ScoreContext`) into the `expected-damage` branch; add optional kit-state fields (`conviction`, `blazesConsumed`, `targetStatusStacks`, `tuneStrainStacks`, …) to `ScoreContext` and the worker request, defaulting absent. Rejected: optimizer kit-state UI (scope creep for a cleanup wave).
- **D6 — Signed-stat allowlist in `parseDisplayValue`.** Permit negatives for `resistancePenetration` only (the shred convention's home); every other stat keeps the non-negative guard, so `EchoForm` behavior is unchanged. Add a one-line hint near the custom-buff stat select ("RES shred = negative RES Penetration"). Rejected: blanket negatives (would let echoes/buffs take nonsense values).

## Recommended Approach

Six independent micro-units in dependency order (D4/D6/D3 first — pure fixes; D1/D5 next — verify + thread; D2 last — touches stored roster shape). Each unit is one behavior + its test + its doc-line; land in a single working tree, no split needed. Two items (D1, D3) are already decided by inspection — their work is pin + document, not investigate.

## Work Plan

- **U1 — Tune Break stale exemption.** `rotation.ts`: return false for `damageKind === 'tuneBreak'` in `isBlockStale` (audit comment for `tuneRupture`'s real-id path). Test: tuneBreak block with `skillId: ''` is not stale; kit block with unknown motion still is.
- **U2 — Custom-buff shred entry.** `ui/format.ts`: signed-stat allowlist (`resistancePenetration`), updated doc + error text; hint line in the buff form (`RotationTimeline.tsx` buff section). Tests: `-10` parses to `-0.1` for penetration; still throws for `atkPct`, `critRate`, flats.
- **U3 — Multi-hit decision record.** Doc comment in `resolveMotion` + reference-doc line (§6 motions): ratios are hit-totals, score-once is correct. Test: `parseMotionText('11.33%*8')` → ratio 0.9064/hits 8, and `computeDamage` on it equals the single-hit total (no ×8).
- **U4 — Forte mapping verification.** Replace TODO with verified rationale (RateLv cross-check); pinning test: Yangyang basic Stage 1 forte 10 resolves 0.4473 (index 9), forte 1 resolves 0.225; document entries 10–19 as intentionally ignored. Optional hardening: sync-time assertion that `values[0..9]` match `DamageList.RateLv` where joinable — only if the join is exact, else skip.
- **U5 — Expected-damage kit context.** `objectives.ts`: pass `characterId`/`resonanceChain` (+ existing context) into the `expected-damage` branch; extend `ScoreContext` and the optimizer request with optional kit-state fields, forwarded when present. Tests: chain-gated mechanic (e.g. Zani S2 motion at rank ≥2 vs 0) now differs through `scoreSheet`; absent kit fields reproduce today's numbers exactly.
- **U6 — Weapon ascension + forte unlocks.** Schema: `rosterEntrySchema` gains `weaponAscension` (0–6, default 0) and optional `forteUnlockedIds` (absent = all active). Domain: weapon curve selection honors ascension (mirror `getBaseStatsAtLevel` semantics for `.5` tiers); `computeStats` gates forte nodes by the id set. State/UI: roster controls (ascension stepper, node checkboxes on Roster/Calculator page). Tests: ascended vs unascended weapon bases differ by the tier delta; deselected node drops its stat; defaults reproduce today's sheet. Storage is zod-parsed at load, so old entries without the new fields keep working.

## Validation Plan

- `npm run test` (full suite — every unit adds hand-computed tests; no existing test may change meaning — only U5/U6 add branches, defaults pinned), `npm run lint`, `npm run build`.
- U1: `RotationTimeline.test.tsx`-style render check that a tuneBreak block shows its coefficient editor, not the alert.
- U2: unit tests on `parseDisplayValue` bounds per stat; manual: type `-10` into a custom buff with RES Penetration selected → accepted; with ATK% → rejected.
- U3/U4: new domain tests with the exact values cited above (0.9064; 0.225/0.4473).
- U5: differential test (context vs no-context scores differ exactly by the chain mechanic; empty context identical to today).
- U6: differential tests on weapon tiers + node gating; manual: Roster page toggles change the Calculator sheet and persist across reload.
- Highest-risk step: U6's roster-shape extension (stored-data compat) — verify an old IndexedDB entry (no new fields) loads and scores identically.

## Risks / Rollback

- U6 touches the stored roster shape — mitigated by optional-with-default fields and a load-compat check; rollback is revert + the new fields are ignored by old code.
- U5 changes optimizer scores for kit-sensitive characters (intended) — rotation-dpr results are unaffected (blocks already carried kit state); single-motion objectives gain accuracy, never lose it.
- U4's optional sync assertion could fail on provider drift — keep it out if the RateLv join isn't exact; the unit pin is the real gate.
- All other units are additive or display-scoped; full rollback is a plain revert with no data migration to unwind.

## Open Questions

None — every item resolved to a concrete change from workspace evidence plus one inspected provider record.

## Sources

- https://api-v2.encore.moe/api/en/character/1402

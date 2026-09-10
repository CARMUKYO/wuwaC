## Goal

Establish how Negative Status damage (and the adjacent Tune Break / Tune Rupture / Tune Strain systems) actually works, and define how to implement all of it properly in this project — generalizing the current Cartethyia-only implementation to every status dealer, including dual-Resonance-Mode characters like Aemeath.

## Success Criteria

- The six negative statuses' damage rules are documented from inspected sources (not memory), with explicit gaps where sources are silent.
- Every negative-status dealer is enumerated from the wiki combat-role rosters, cross-checked against the 58 snapshot characters.
- The plan defines: a shared status core replacing Cartethyia hardcoding, per-character module pattern reuse, Havoc Bane's non-damage handling, Resonance Mode selection design, and Tune pipeline scope — phased so each step ships independently tested.
- No fabricated multipliers: every number traces to an inspected source or is labeled assumption/TODO per AGENTS.md guardrails.

## Context And Current Facts

**Mechanics (all from inspected wiki pages + live encore.moe probes this run):**

- Base formula (all damaging statuses): `Base DMG = Level Multiplier × 1.25078 × Stack Multiplier`. No Crit, no attribute/action DMG buckets; only status-specific Amplify modifies it; Resistances apply as normal except Elemental Reduction is *unknown*. Ticks every 3s after the first stack; damage attributed to the last applier.
- Known tables: Level 10→16, 50→229, 80→2005, 90→3674. Frazzle stacks 1–10: 0.240 / 0.4355 / 0.6298 / 0.8251 / 1.020 / 1.216 / 1.409 / 1.605 / 1.800 / 1.995. Erosion stacks 1–6: 0.360 / 0.899 / 1.799 / 2.698 / 3.597 / 4.497. No published tables for Fusion Burst / Electro Flare / Glacio Chafe (gap G1).
- Per-status behavior differs fundamentally: Spectro Frazzle = periodic DoT, −1 stack per tick, cap 10. Aero Erosion = periodic DoT, stacks decay every 15s, cap 6. Fusion Burst = no DoT; at max stacks (10) all stacks detonate in an AoE explosion; bigger stacks = bigger boom. Glacio Chafe = damage on each inflict, move-speed slow per stack, freeze + clear at 10. Electro Flare = periodic DoT, loses *half* its stacks per tick, overflow becomes stackable Electro Rage (up to 10) boosting the next trigger. **Havoc Bane deals no damage at all** — it is a DEF shred (3 cap, −2% DEF per stack).
- Full dealer roster from wiki combat-role pages, all present in snapshot: Erosion {Cartethyia, Ciaccona, Rover: Aero}, Frazzle {Phoebe, Rover: Spectro, Zani}, Bane {Chisa, Yangyang: Xuanling}, Burst {Aemeath, Denia}, Flare {Buling, Rover: Electro}, Chafe {Hiyuki, Lucilla, Suisui}. Verified NOT status dealers despite type match: Phrolova (Echo/Hecate kit), Brant, Augusta.
- Zani (live encore `SkillDescribe`): Frazzle detonates and converts to Heliacal Embers; her Heavy Slashes are normal ATK-scaling ability damage merely *tagged* "considered both Heavy Attack DMG and Spectro Frazzle DMG" (matters for set/buff applicability, not the formula).
- Tune system (3.x): attacks build enemy Off-Tune Level → full = Mistuned → active Resonator's Tune Break Skill deals DMG and clears it. Specialists inflict *Shifting* states; a Break on a Shifted target converts to *Interfered* (Rupture 8s, Strain 30s, Hack 8s). Tune Rupture: the Shifting mark detonates for one massive instance, then responders (Aemeath Starburst, Mornye Particle Jet, Lynae Spectral Analysis; 8s ICD) fire. Tune Strain: per-stack total-DMG amp scaling with Tune Break Boost (0.12% per boost point per stack; Qingxiao, Luuk Herssen, Lynae, Denia, Mornye). Hack (Lucy, Rebecca) mirrors Rupture. Tune Rupture DMG and Tune Break DMG formulas are unpublished on the wiki (gaps G2/G3).
- Resonance Mode = the dual-mode mechanic: "switch between applying different statuses/dealing different damage types." Exactly 4 users: Aemeath (Fusion Burst ↔ Tune Rupture), Denia (Fusion Burst ↔ Tune Strain — second mode to verify), Lucilla (Glacio Chafe ↔ ? — to verify), Lynae (Tune Rupture ↔ Tune Strain). Aemeath's kit (encore prose + S2/S3/S6 chain text): Rupture mode applies Shifting + Seraphic Duet deals 5 (10 in Stardust Resonance) Tune Rupture DMG instances at +4% MV per Rupturous Trail stack; Burst mode builds Fusion Trail and detonates at max limit *without* consuming at +10% per trail (+200% in Stardust); S6 grants fixed 80% rate / 275% dmg crit to her Tune Rupture DMG (Burst-side fixed values truncated in snapshot — must re-read live). Switching mode resets her Between-the-Stars stacks, so mode is stable across a rotation, not per-block.

**Codebase (read this run):**

- `src/domain/damage.ts`: `computeNegativeStatusDamage` is hardcoded to Aero Erosion + Cartethyia (S2 cap, target multiplier, S6 1.4×). Base matches the wiki formula. Three assumptions to re-verify: level-curve anchor `[1, 0]` (wiki table starts at 10→16), Elemental Reduction applied (wiki: unknown), and Cartethyia "S1" conviction-crit in `cartethyiaMotionMultiplier`/`cartethyiaConvictionCritDmg` vs snapshot S1 prose, which describes Zeal, not Conviction (gap G5).
- `src/domain/cartethyia.ts` is the per-character module precedent (tables, S-rank motion multipliers, state inputs). `src/domain/rotation.ts` scores `negativeStatus` blocks with `statusType: 'aeroErosion'` literal and S4 infliction tracking; `src/data/schema.ts` has `damageKind/statusType/statusStacks/targetStatusStacks/conviction` on `RotationBlockSpec` and a shared `negativeStatusAmplify` StatKey.
- Data gap: sync drops `SkillDescribe` (stack/mode/detonation rules), all Inherent Skills, and all Tune Break skills — verified present in raw API responses for Zani (1507), Aemeath (1210), Lingyang (1104). Per-character mechanics therefore cannot be derived from the snapshot today; they must be hand-modeled with citations (cartethyia.ts precedent).
- UI precedent: `RotationTimeline.tsx` Cartethyia-gated status-block adder + target-stacks + conviction inputs — the pattern to generalize, currently hardcoded to one character/status.
- Sonata 5pc status effects (Eternal Radiance, Gusts of Welkin, Windward Pilgrimage, Thread of Severed Fate, Trailblazing Star, etc.) are unresolved `{0}` prose → manual rotation buffs only, already supported; auto-deriving them is out of scope.

## Constraints And Non-goals

- AGENTS.md: one-way architecture (UI → optimizer → domain → data), no `any` in domain/optimizer, every domain function unit-tested with hand-computed values, no fabricated kit numbers presented as fact (placeholder + TODO instead).
- This workspace is not a git repo, so snapshot regeneration has no versioned rollback — keep a backup copy of `snapshot.json` before any resync.
- Non-goals: auto-deriving sonata/weapon status triggers from prose; simulating DoT tick timelines (blocks stay explicit user-placed detonation events); team/rotation-layer multi-character applier tracking (single-character calculator assumption stands); Hack-state modeling (Lucy/Rebecca deferred with Tune).

## Key Decisions

- **D1 — Shared status core.** New `src/domain/negativeStatus.ts`: `NegativeStatusType` union of 6, per-status table (element, default cap, stack multipliers where published, tick/decay notes), shared level curve. `computeNegativeStatusDamage` generalizes over it; `cartethyia.ts` keeps only Cartethyia kit mods and imports shared tables. Rejected: cloning cartethyia.ts per character (tables would drift) and stuffing all six kits into damage.ts (violates small-module precedent).
- **D2 — Havoc Bane is not a damage block.** It is an enemy DEF modifier. Model as per-block `targetHavocBaneStacks` input feeding the DEF term (assumption: additive 2%/stack to verify; Xuanling S3/Chisa cap extensions per-character). Chisa/Xuanling damage comes from kit consumption modeled in per-character modules, like Cartethyia's consume-based liberation multiplier.
- **D3 — Zani pattern.** Frazzle detonation blocks through the status pipeline (Frazzle table) + existing ability motions unchanged + a `consideredAs: 'spectroFrazzle'` motion tag for future buff applicability (tag only; no math change while buffs are manual).
- **D4 — Resonance Mode is a per-rotation input.** New optional `resonanceMode` on the rotation spec/UI, required when the character has modes; mode gates legal block types and switches per-character multipliers. Per-block modes rejected: Aemeath's kit resets stacks on mode switch, so mid-rotation switching is not a real rotation. Character capability registry (`negativeStatus?`, `resonanceModes?`) in the domain layer replaces `character.id === 'cartethyia'` gating.
- **D5 — Tune is separate damage kinds, not negativeStatus.** `tuneRupture` response instances modeled provisionally as ATK×MV ability damage with a tune tag, no base crit, and a fixed-crit override hook (for Aemeath S6) — all marked assumption pending spike G2. `tuneStrain` as total-DMG multiplier `1 + 0.0012 × tuneBreakBoost × strainStacks` (needs new `tuneBreakBoost` StatKey + enemy strain-stacks input). Tune Break hit itself gated on spike G3.
- **D6 — Sync captures prose, never auto-structures mechanics.** Extend sync/schema to store stripped `SkillDescribe` per skill, map `Tune Break` to a new skill kind (no MVs expected; renders as buff-carrier), and capture Inherent Skill prose; bump `SNAPSHOT_VERSION` and regenerate. Structuring stays hand-written per character with wiki citations.
- **D7 — Ship order.** Shared core + Frazzle + Bane first (sources complete) → Zani/Xuanling/Chisa modules → sync prose capture → Resonance Mode + Aemeath → Tune pipeline → Electro/Glacio last (blocked on G1). Each phase independently tested and usable.

## Recommended Approach

Keep the proven shape: one shared formula core plus one hand-verified `src/domain/<character>.ts` module per dealer, with the calculator UI driven by a character-capability registry instead of Cartethyia special-cases. Detonation events stay explicit user-placed rotation blocks (stack count chosen by the user); tick rates and decay rules inform how many blocks a rotation contains, not the damage function — this bounds scope while staying honest about what the calculator knows. Run the three research spikes first (timeboxed): if G1/G2/G3 come back empty, the affected phases ship with clearly-labeled provisional models or wait, and Frazzle/Bane/Aero still land complete. Fix the three Cartethyia verification items (G5) in the first phase since the shared core touches that code anyway.

## Work Plan

- **Phase 0 — Research spikes (timeboxed, before Phase 3/5/6).** G1: Fusion/Electro/Glacio stack-multiplier tables (community testing sources, cross-checked; record empty if none). G2/G3: Tune Rupture DMG and Tune Break DMG formulas (kit pages, calculator cross-checks). G5: Cartethyia S1 prose-vs-code, S6 full text (live API re-read, snapshot is truncated), Aemeath S6 Burst-side fixed crit values, level-curve sub-50 shape, Elemental Reduction applicability. Output: filled or explicitly-empty evidence log; gates Phase 4–6 scope.
- **Phase 1 — Shared status core.** `src/domain/negativeStatus.ts` (types, Erosion+Frazzle tables, caps, level curve with L10 anchor, Bane DEF helper, fixed-crit override type); generalize `computeNegativeStatusDamage` + `NegativeStatusDamageContext.status`; apply G5 fixes; hand-computed tests mirroring the existing Erosion test (Frazzle worked example, Bane DEF math, cap errors).
- **Phase 2 — Frazzle + Bane dealers.** `zani.ts` (Heliacal conversion notes, consume multipliers from chain), `xuanling.ts`, `chisa.ts` (Bane application/consumption per kit); `consideredAs` motion tag; generalize `RotationTimeline.tsx` status section by capability (status type, cap, stacks); Phoebe/Rover variants work via shared core with no module. Docs: extend reference §6 status section.
- **Phase 3 — Sync prose capture.** Schema: `CharacterSkill.description?`, skill kind `tunebreak`, `CharacterData.inherentSkills?`; sync: capture stripped `SkillDescribe`, map Tune Break kind; bump `SNAPSHOT_VERSION`; back up and regenerate `snapshot.json`; snapshot schema tests.
- **Phase 4 — Resonance Mode + Aemeath.** Capability registry; `resonanceMode` on rotation spec, worker protocol, and UI selector (4 characters); `aemeath.ts` both modes (Trail scaling, Stardust Resonance, S6 fixed crit); Denia/Lynae/Lucilla modes per spike results.
- **Phase 5 — Tune pipeline.** `tuneBreakBoost` StatKey; `tuneRupture`/`tuneStrain` block kinds + scoring; Strain/Tune UI inputs; provisional-model labels where G2/G3 are empty.
- **Phase 6 — Electro/Glacio statuses.** Tables + Buling/Rover-Electro/Hiyuki/Lucilla/Suisui support once G1 resolves; Erosion-side Ciaccona/Aero-Rover support anytime via shared core.

## Validation Plan

- Every new domain function: vitest with hand-computed expected values (repo rule), e.g. Frazzle 10-stack L90 detonation `3674 × 1.25078 × 1.995 × resistances × (1+amplify)`; Bane 3-stack DEF term; Strain `1 + 0.0012 × boost × stacks`; Aemeath mode-switch multiplier selection.
- `npm run test`, `npx tsc -b`, `npm run lint` after each phase.
- Calculator manual checks: Zani rotation with Frazzle blocks scores and shares sum to DPR; Xuanling rotation with Bane stacks changes the DEF term only; Aemeath rotation requires a mode before scoring and rejects Rupture blocks in Burst mode.
- Highest-risk validation: the Phase 0 spikes — an empty result must explicitly gate (not silently shrink) Phases 4–6, with provisional models labeled assumption per guardrails.

## Risks / Rollback

- Wiki staleness (Negative Status page still claims only Frazzle/Erosion are character-accessible): mitigate by cross-checking role rosters against live encore kit prose per character; never trust one source for a kit.
- Unpublished tables/formulas (G1–G3) could stall Phases 4–6: mitigated by phase order — Phases 1–2 deliver standalone value.
- Schema/snapshot migration (Phase 3) has no git rollback here: back up `snapshot.json` first; `SNAPSHOT_VERSION` bump makes staleness loud.
- Scope creep into team simulation (last-applier attribution, off-field detonations): explicitly out; single-character assumption documented per phase.

## Open Questions

- G1: published Fusion Burst / Electro Flare / Glacio Chafe stack-multiplier tables? (Spike; none on wiki.)
- G2/G3: Tune Rupture DMG and Tune Break DMG exact formulas? (Spike; Rupture page describes triggers, not math.)
- G4: in-game Resonance Mode switching UX (combat vs loadout)? Noted only — calculator treats mode as rotation input regardless.
- G5: Cartethyia S1 code-vs-prose mismatch; S6/Aemeath-S6 truncated chain text; sub-50 level curve; Elemental Reduction on status damage? (Spike + live API re-read.)
- G6: Denia's second mode and Lucilla's second mode (Fusion Burst? Glacio Chafe? per role pages — verify against kit prose).

Assumption (reversible, stated per planning rules): full 6-status + Tune + dual-mode scope, phased as above. If you want a smaller cut (e.g. Frazzle/Bane/Aemeath only), say so at approval and I will trim Phases 5–6.

## Sources

- https://wutheringwaves.fandom.com/wiki/Negative_Status
- https://wutheringwaves.fandom.com/wiki/Damage
- https://wutheringwaves.fandom.com/wiki/Aero_Erosion
- https://wutheringwaves.fandom.com/wiki/Spectro_Frazzle
- https://wutheringwaves.fandom.com/wiki/Havoc_Bane
- https://wutheringwaves.fandom.com/wiki/Fusion_Burst
- https://wutheringwaves.fandom.com/wiki/Electro_Flare
- https://wutheringwaves.fandom.com/wiki/Glacio_Chafe
- https://wutheringwaves.fandom.com/wiki/Tune_Break
- https://wutheringwaves.fandom.com/wiki/Tune_Rupture
- https://wutheringwaves.fandom.com/wiki/Resonance_Mode
- https://wutheringwaves.fandom.com/wiki/Aemeath
- https://api-v2.encore.moe/api/en/character/1507
- https://api-v2.encore.moe/api/en/character/1210
- https://api-v2.encore.moe/api/en/character/1104

## Execution Log (2026-09-09, approved → executed same session)

- Phase 0 spikes closed: G5 verified against live encore prose (Cartethyia S1 conviction-crit confirmed in full chain text; snapshot truncation noted in code). G1 EMPTY for Fusion/Electro/Glacio (no published tables anywhere found). G2/G3 EMPTY on wiki; community simulator `jhlee33957-maker/ww-dps-simulator-2` (`simulator/damage_formula.py`, inspected, UNVERIFIED) gave the provisional Tune Break shape (base 10000, no crit/level) and corroborated additive Bane (stacks × 0.02). G4 noted as non-blocking (mode = rotation input). G6 half-resolved in Phase 6: Lucilla modes are Glacio Chafe ↔ Echo (encore character 1109).
- Phase 1: `src/domain/negativeStatus.ts` (6-status tables, caps registry, Bane helper, level curve with L10 anchor fix); generalized `computeNegativeStatusDamage`; Bane → DEF term; fixed-crit hook.
- Phase 2: `zani.ts`, `xuanling.ts`, `chisa.ts`, `characterMods.ts` dispatcher + capabilities; block-spec kit-state fields; capability-driven RotationTimeline.
- Phase 3: schema v3 (`SkillKind` + `tunebreak`, skill `description?`, `inherentSkills`); snapshot regenerated live (58 chars, 58 Tune Break skills, 118 inherent entries, 408/408 skills with prose, 185 echoes with phantoms/unreleased gone). Backup: `/tmp/snapshot.v2.backup.json`. Incidental: EchoForm test 2→1 Chest Mimic (phantom exclusion working as intended). Note: `tsx` cannot run in this sandbox (IPC socket EPERM) — sync verified runnable via plain `node scripts/sync-gamedata.ts`.
- Phase 4: `aemeath.ts` (S2/S3/S6); `RESONANCE_MODES` registry (Aemeath, Denia, Lynae); `resonanceMode` required for mode characters, plumbed rotation → objectives → optimizer SearchData → UI radio selector.
- Phase 5: `tuneBreakBoost` StatKey (+ token mapping, flat-points form entry); `tuneRupture`/`tuneBreak` block kinds; strain amp in ability pipeline; provisional rupture/break scorers with explicit labels; strain/response/break UI inputs.
- Phase 6: Erosion blocks for Ciaccona + Rover:Aero; Lucilla registered NOWHERE (justified deviation: modes verified but nothing in scoring consumes them yet — register with Chafe table or lucilla.ts). Electro/Glacio detonations correctly throw (G1 empty).
- Deferred follow-ups (out of plan scope): Hiyuki S-rank ability module, Xuanling S1 summon + Chisa S1 fixed-DMG motions (no snapshot motion data), per-element RES-penetration stat (Chisa S2), Hack-state modeling.
- Final gates: 326/326 tests, `tsc -b` clean, `eslint` clean. Changes left UNCOMMITTED for your review — say the word and I will commit (per-phase commits available since the repo now exists).

## Goal

Make every weapon passive buff accurate: close the remaining transcription gaps, fix confirmed mis-transcriptions (notably Boson Astrolabe's dropped base ATK), reconcile inconsistent branch/gate calls under single stated rules, and pin the result with an every-weapon-accounted test so no weapon is silently unhandled.

## Success Criteria

- Every one of the 122 snapshot weapons is either transcribed (wielder and/or team preset) or explicitly excluded with a dated reason; a test pins the full accounting.
- Boson Astrolabe scores base + branch ATK; Stellar Symphony and Firstlight's Herald have wielder HP presets; pistols-26 is transcribed; Wildfire Mark's team Fusion stays manual AND joins the wielder preset (D1).
- One stated rule governs gated defensive terms, one governs same-value dual branches, one governs team riders — existing presets reconciled to them, inconsistencies gone.
- `npm run test`, `lint`, `build` pass; no calculator/optimizer divergence (shared `computeStats` path, no search changes).

## Context And Current Facts

- Prior sessions transcribed far more than the "13" previously assumed: **105 of 122** weapons have presets (115 entries, zero multi-wielder collisions). The gap is small and known exactly (verified by script against `snapshot.json` + `buffPresets.ts`).
- True gaps: **pistols-26** (ATK stacks — the only transcribable weapon with no preset); **stellar-symphony** and **firstlight-s-herald** (team presets exist, wielder HP presets missing); **16 energy/heal-only** weapons with no matching sheet bucket (5 Ceaseless Aria, 5 Voyager/Crusade/Long Journey, 5 Originite, beguiling-melody).
- Confirmed bugs/inconsistencies found while researching this plan (all verified against snapshot text this run):
  1. **Boson Astrolabe drops its base 12–24% ATK** — preset carries only the 12–18% branch series. Correct R1–R5: [0.24, 0.285, 0.33, 0.375, 0.42]. Not pinned by any test.
  2. **Wildfire Mark's team Fusion branch was assumed missing — it is not** (re-check found `weapon-wildfire-mark-team`). What remains: under D1 the wearer-received Fusion also belongs in the wielder preset (currently liberation-only).
  3. **Red Spring's Concerto rider (40–80% Basic)** excluded while the abbreviated-bucket precedent (wildfire-mark "Liberation DMG" → `dmgBonus:liberation`) says "Basic DMG Bonus" maps to `dmgBonus:basic`.
  4. **Gated DEF-ignore split with no rule**: excluded in glint-of-clouds, spectral-trigger, solsworn-ciphers, daybreaker-s-spine, azure-oath, lux-umbra, frostburn (10–24% R5); included in Suisui (Havoc-gated 6%/12%) and blazing-justice (ungated 8–16%, correctly).
  5. **Team-rider asymmetry**: sonata team presets auto-apply to the wearer; weapon team presets are manual-only, so wearers silently miss team ATK/Fusion/Echo they receive (skull-thrasher, freeze-frame, kumokiri, forged-dwarf-star, spectrum-blaster, emerald-sentence, wildfire-mark) unless they hand-add the manual preset.
  6. **Defier's Thorn note says "team amp"** — the text is enemy-side ("DMG taken by the target is Amplified"), which has no attacker-sheet mechanism. Exclusion correct, wording wrong.
  7. **solar-flame params series 1 has 4 values, not 5** (provider quirk in a stack-count series). Its preset correctly uses only 5-series, but no test guards `valuesByRank` length.
- Consistent precedents to keep: same-value dual branches score once (ages-of-harvest, unflickering-valor); different-valued branches stack (skull-thrasher); mutually exclusive branches take the on-field one with a note (rime-draped-sprouts); character-gated branches stay manual (bloodpact-s-pledge team); off-field bonuses excluded under on-field scoring (stringmaster); no-bucket effects (energy, concerto, healing, shields, Dodge-Counter DMG) excluded with notes (gauntlets-21d, rectifier-25).
- All weapon values live in snapshot text (no `{N}` placeholders) — no live sources needed. `rank()` requires a 5-tuple, so the type system already blocks transcribing short series.

## Constraints And Non-goals

- Follow `AGENTS.md`: one-way dependency, strict TS, no `any` in domain/optimizer, hand-computed domain tests, no stat math in `.tsx`.
- No numbers from memory: every value traces to snapshot text; stack/branch judgments disclosed in assumptions.
- Non-goals: resonance chains (separate catalog design); new sheet buckets; auto-applying team presets (would need picker/dedup redesign — explicitly rejected in D1); re-scoring saved builds; touching optimizer search/pruning.

## Key Decisions

1. **Wearer-total convention for weapon team riders (reconciles finding 5).** When a team rider's wording includes the wielder ("all Resonators in the team", "Resonators in the team"), its mods join the wielder preset (auto-applied) AND stay as the manual team preset for teammates — mirroring sonata team presets (rejuvenating-glow). No double-apply path exists: team import only covers character outros, and the picker only lists manual presets. Riders excluding the wielder ("party members", stellar-symphony) stay manual-only. Rejected: status quo (wearers silently miss received buffs) and auto-applying team presets (removes them from the picker, breaks the teammate path).
2. **Gated defensive terms: transcribe at R5 ≤ 25% with the gate disclosed; exclude above.** Keeps Suisui/blazing-justice/lethean-elegy, adds azure-oath (24%), daybreaker (20%), spectral-trigger (20%), solsworn-ciphers (20%), glint-of-clouds (20%), lux-umbra (16%), frostburn (20%); keeps moongazer-s-sigil (60%), thunderflare-dominion (60%), everbright-polestar (64%) excluded. The line is documented-arbitrary but consistent: small riders approximate honestly, large ones would corrupt every non-gated action. Rejected: exclude-all (loses Suisui's tested behavior) and include-all (60%+ global DEF-ignore mis-scores).
3. **Branch stacking: same bucket + same value + different triggers scores once (ages/unflickering precedent kept); different values stack (skull precedent); abbreviated bucket names map to buckets (wildfire precedent) — so Red Spring's Concerto rider transcribes.** Rejected: stacking same-value branches (unprovable concurrency) and dropping abbreviated names (contradicts wildfire-mark).
4. **Weapon status amps: frostburn's Chafe amp (wielder-active-gated) joins its wielder preset as `negativeStatusAmplify`; luminous-hymn's Frazzle amp (incoming-active-gated aura) becomes a new manual team preset.** The bucket exists precisely for wielder-scored status blocks. Rejected: continued exclusion (leaves real damage unmodeled) and auto-applying the aura (wrong recipient).
5. **Fix, don't grandfather, confirmed errors.** Boson Astrolabe base ATK, Wildfire Mark wearer-total Fusion, Defier's Thorn wording, pistols-26, and the two wielder HP presets are treated as bug fixes with hand-checked R1/R5 values, not contract changes — none are pinned by tests except via generic consistency checks.
6. **Bulk-exclude the 16 energy/heal-only weapons** with one dated header note (Ceaseless Aria / Voyager-family / Originite / beguiling-melody have no sheet bucket) pinned by the every-weapon-accounted test — same pattern as the echo parser's zero-hit set.

## Recommended Approach

Audit-first, batched by rarity: verify every existing weapon preset against its full snapshot text (catching more boson-class summation errors), apply decisions D1–D4 as reconciliations, then close the gaps (pistols-26, two HP presets, wildfire team preset, luminous team preset) and pin the 16 exclusions. Test hardening (every-weapon-accounted, rank-length-5, new spot checks) lands with the code, not after. Continue on the current branch — the work is independent of coordinated-bucket math and nothing is committed anywhere yet.

## Work Plan

1. **Gap closure (mechanical).** Add pistols-26 wielder preset (full stacks 2× ATK); stellar-symphony + firstlight-s-herald wielder HP presets (ATK joins firstlight's in step 3); luminous-hymn team Frazzle-amp preset; fix stellar team label (`team heal` → `team ATK`). Spot-check R1/R5 resolutions in `buffPresets.test.ts`.
2. **Confirmed fixes.** Boson Astrolabe ATK → base+branch series; Defier's Thorn wording → enemy-side; Red Spring Concerto rider added per D3. Each with an R1/R5 assertion.
3. **Wearer-total rollout (D1).** Add received team-rider mods to wielder presets: skull-thrasher + freeze-frame + forged-dwarf-star + kumokiri + spectrum-blaster (amplify) + emerald-sentence (echo) + wildfire-mark (Fusion) + firstlight-s-herald (HP + ATK). Update assumptions ("includes the party-wide X the wearer receives; teammates add the team preset"). Verify no double-apply: picker hides auto-applied, team import covers outros only — assert in test.
4. **Gated-DEF reconciliation (D2).** Add disclosed small riders to azure-oath, daybreaker-s-spine, spectral-trigger, solsworn-ciphers, glint-of-clouds, lux-umbra, frostburn (Liberation-gated 20%); confirm moongazer/thunderflare/everbright exclusions with dated notes.
5. **Status-amp reconciliation (D4).** frostburn Chafe amp → wielder preset; luminous-hymn Frazzle amp → team preset.
6. **Bulk audit.** Read every remaining weapon preset against full text in rarity batches (5★ → 4★ → 3★/2★/1★), verifying series values, stack multipliers, and branch calls; fix boson-class errors found, note judgment calls. (Optional: fan out read-only audit batches per AGENTS.md delegation rules; parent verifies every number and owns all edits.)
7. **Test hardening + docs.** Every-weapon-accounted test (transcribed XOR explicitly-excluded, exclusion list honest); `valuesByRank` length-5 test (solar-flame guard); `computeStats` rank test on one reconciled weapon; header exclusion-list updates; reference §7 note only if behavior wording contradicts.

## Validation Plan

- New/updated tests: weapon spot checks (R1/R5 hand-verified per touched preset); every-weapon-accounted (fails if any weapon is neither transcribed nor listed); rank-length-5; wearer-total no-double-apply (wielder preset auto-applied AND team preset still listed manual); one `computeStats` hand-computed test with Boson Astrolabe R1 vs R5 proving base+branch.
- `npm run test` (full suite), `npm run lint`, `npm run build`. No bench impact expected (catalog-only changes + O(1) lookups); run `npm run bench` once to confirm.
- Manual: equip Boson Astrolabe R1/R5 in the calculator and confirm ATK moves 24%/42%; equip Skull Thrasher and confirm Assumes lists the team ATK without manual adds; equip a Ceaseless Aria weapon and confirm the untranscribed warning (exclusion pinned + dated in catalog header/test).
- Highest-risk check: the wearer-total rollout (D1) — verify on two weapons that the wearer's auto score includes the team rider while a teammate rotation still needs (and gets, via picker) the manual preset, with no double-count in either direction.

## Risks / Rollback

- Calculator/optimizer numbers move wherever under-transcriptions are fixed (Boson +12–24% ATK, team riders newly auto). Mitigated by per-result `appliedAssumptions` disclosure; rollback is reverting the catalog hunks (data-only, no code paths change except tests).
- D1–D4 change existing preset mods/assumptions: no test pins the touched values (verified — only autumntrace/verdant-summit/static-mist-outro/woodland-aria are pinned), so no contract conflict; still reported explicitly on delivery.
- Audit volume (~100 presets to re-read) risks fatigue errors; mitigated by rarity batches, script-assisted value extraction (authoritative text stays the snapshot), and the accounted-test forcing conscious disposition of each.

## Open Questions

None — all values are in the snapshot and all rules have workspace precedents. If the audit surfaces a weapon whose branches are genuinely ambiguous (rime-class mutual exclusivity with no on-field branch), it will be brought back as a decision rather than guessed.

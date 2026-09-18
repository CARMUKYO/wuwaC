## Goal

Re-read every excluded team-buff case against the buckets that exist today (coordinated, signed shred, DEF ignore, amplify, status amplify) and either convert it into a `TEAM_BUFFS` entry with snapshot provenance or record a verified per-character reason it stays out.

## Success Criteria

- All 20 excluded characters in `src/data/teamBuffs.test.ts` plus the 3 partial exclusions in the module doc (Denia Fusion-Burst branch, Roccia Liberation, Suisui status-cap rider) have a re-read verdict dated to this pass: converted with a `skillId`-cited entry, or excluded with a recorded reason.
- Every converted entry transcribes a concrete number from snapshot skill text into an existing `StatKey` bucket, with its gate/condition disclosed in `assumption` (Phoebe/Youhu precedent).
- The coverage test still passes with zero unaccounted characters, and the exclusion record cannot silently drift from the test again.
- No chain-preset, scorer, or bucket changes: converts use only existing buckets.

## Context And Current Facts

- `TEAM_BUFFS` (`src/data/teamBuffs.ts:48-95`) covers 38 of 58 snapshot characters. The other 20 are enumerated in the test's exclusion set (`src/data/teamBuffs.test.ts:24-30`): yangyang, chixia, rover-spectro, encore, jiyan, camellya, calcharo, lingyang, yuanwu, rover-havoc, jinhsi, xiangli-yao, carlotta, galbrena, chisa, luuk-herssen, sigrika, rover-aero, qingxiao, jingran. The "23" in the request is these 20 plus the 3 partial exclusions named in the module doc (`src/data/teamBuffs.ts:19-30`).
- Table scope already includes non-Outro team buffs with concrete numbers (`kind: 'other'` precedent: Lynae Liberation, Shorekeeper Stellarealm, Lupa Pack Hunt, Rover-Electro Overshock, Suisui Landscape). The re-read must scan full kits, not just outros.
- Scoping sample done during planning (all 20 outro texts + a kit-wide keyword scan for coordinat/shred/penetrat/amplif/team wordings):
  - 14 outros are damage-only or off-field damage (chixia, encore, camellya, calcharo, lingyang, rover-havoc, xiangli-yao, carlotta, galbrena, luuk-herssen, sigrika, qingxiao, jingran, plus jiyan's Heavy-triggered lance dealing its own 313.40% ATK damage — damage, not an amp, so the coordinated bucket does not convert it). Yuanwu's outro is Vibration-Strength (stagger) utility with no bucket.
  - Genuine unknowns needing full-text reads: Jinhsi's Eras in Unity second effect (`1002007`, party-gain wording truncated in the sample), Yuanwu's team-shared Lightning Infused (`1001603`, likely interrupt-resist only per `1001607`), Luuk's Golden Rule (`1004707`, self-directed setup).
  - Cap-raise family: rover-aero (+3 Aero Erosion cap), chisa (+3 Negative Status/Electro Rage cap), luuk-herssen and qingxiao (+1 Tune Strain–Interfered cap each).
- Why the cap family almost certainly stays out: `maxStatusStacks` (`src/domain/negativeStatus.ts:149`) is consumed only as a validation clamp in `computeNegativeStatusDamage` (`src/domain/damage.ts:355-358`) — damage scales with user-entered stacks, and cap extensions resolve only from the scoring character's own id/chain. No `StatKey` carries stack caps, team buffs resolve exclusively to `StatKey` mods (`src/domain/teamBuffs.ts:54-60`), and Tune-strain caps have no scorer model at all (only a 0–10 UI clamp). Plumbing team-raised caps through would be a feature (new key + scorer + UI-clamp threading), not an audit fix.
- Self-scaling stays out by the established Roccia-Liberation principle (module doc): effects scaling off the ally's own stats (flat points off Crit Rate, Qingxiao's self-only Mindlock amp per the `1005807` sample) are not wearer-sheet buffs.

## Constraints And Non-goals

- Values from snapshot skill text only, never memory; every entry cites `skillId` (existing table rule).
- Existing buckets only — no new `StatKey`, no scorer changes, no `CHAIN_PRESETS` changes (Wave 4 owns chain transcription; `note`/`appliedElsewhere` ranks are out of scope).
- Off-field damage is not a team buff (needs the ally's stats); energy/heal/shield/crowd-control/utility effects stay out — no models consume them.
- Non-goal: the team-raised stack-cap feature (rover-aero/chisa/Tune +1s) — recorded as a follow-up if the audit confirms the wordings.

## Key Decisions

- **D1 — Convert iff concrete number + existing bucket + team/wearer-directed.** A team rider with a percentage or flat stat that lands on the wearer (or the incoming resonator, the `target` field's existing semantics) transcribes; anything needing the ally's stats, a nonexistent bucket, or an unmodeled system documents as excluded. Rejected: converting off-field damage outros into pseudo-buffs (fabricates wearer stats for ally damage).
- **D2 — Cap-raise effects stay excluded, with per-character reasons.** Mechanical, not epistemic: the numbers (+3/+1) are concrete but there is no bucket and no scorer input path, and the cap is validation-only so a clamp-raise would barely score. Rejected: growing a cap bucket inside the audit (feature-sized, needs its own design for per-status keys and UI-clamp threading).
- **D3 — Damage-only outros stay excluded, confirmed by full-text read.** Jiyan's coordinated-attack wording does not convert: the coordinated bucket amplifies the wearer's coordinated hits (Youhu precedent), while Jiyan's lance deals its own damage off Jiyan's ATK. Rejected: treating "coordinated" wording as automatically transcribable.
- **D4 — Exclusions become a shared id→reason map.** The test's inline set and the module doc's grouped prose can drift (they already describe the same 20 characters in two places). Move to one exported `TEAM_BUFF_EXCLUSIONS` record in `teamBuffs.ts` (id → one-line reason + re-read date); the test asserts coverage from the map. Rejected: leaving two parallel lists (the drift that motivated this audit).

## Recommended Approach

One careful re-read pass over full kit texts (outro + Liberation + Forte + inherent/passive skills — team riders hide outside outros), recording a verdict per character; then a small convert-and-document change. Sampling suggests 0–2 converts — Jinhsi's second effect is the only live unknown with convert potential — so the durable value is verified per-character reasons replacing the grouped comment, not a convert count. Do the reads from the bundled snapshot JSON (same source the table cites), and quote the deciding wording in each reason.

## Work Plan

- **U1 — Re-read pass (all 20 + 3 partials).** For each excluded character, read the outro plus every skill whose text mentions team/ally/nearby/coordinated/amplified/cap wording; for Denia read the Fusion-Burst branch, for Roccia the Liberation, for Suisui the status-cap rider. Record a verdict table: convert (entry sketch: kind/label/skillId/mods/assumption) or excluded (one-line reason quoting the deciding wording). Resolve the three sampling unknowns from full text: Jinhsi `1002007` second effect, Yuanwu `1001603`/`1001607` Lightning Infused, Luuk `1004707` Golden Rule.
- **U2 — Convert, document, pin.** Add `TEAM_BUFFS` entries for converts (existing buckets only, `assumption` discloses every gate); add the shared `TEAM_BUFF_EXCLUSIONS` map with dated per-character reasons and repoint the coverage test at it; rewrite the module doc's exclusion paragraph to point at the map. Tests: coverage test unchanged in force (zero unaccounted, every excluded id real); one pin per convert in the Phoebe/Youhu style (mods + skillId + target); if zero convert, a test asserting the map covers exactly the uncovered roster (no silent drift either direction).

## Validation Plan

- `npm run test` (full suite — converts add table pins; the coverage test must still report zero unaccounted), `npm run lint`, `npm run build`.
- U1 evidence: the verdict table itself (posted in the working summary / commit message, not committed as a file unless converts are disputed).
- U2 evidence: new pins pass; `resolveTeamBuffs` warning test for an excluded member still holds for a still-excluded character.
- Manual (only if converts exist): import-team-buffs flow on the Calculator page shows the new entry with its window/assumption label.

## Risks / Rollback

- Snapshot wording ambiguity (e.g. "DMG Amplified" without a scope): transcribe to the additive bucket per the table's existing mapping rules, or keep excluded with the ambiguity quoted — never resolve ambiguity by guessing a number.
- A convert with a conditional gate (mark/consumption/state) follows the Phoebe pattern: full-value mods + `assumption` disclosing the condition; the buff still scores full-rotation like every other team buff (documented resolver behavior, `src/domain/teamBuffs.ts:14-16`).
- Rollback is a plain revert; the change is additive data + a test refactor, no stored-shape or scorer impact.

## Open Questions

None — every scoping question was answered from the workspace; the remaining unknowns are the verdicts themselves, which are the work.

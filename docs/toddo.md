# TODO — next audit targets & reminders

## Next audit targets (not started)
- [ ] **Weapon audits** — all 122 weapons systematically checked (stats, passives,
      transcription vs snapshot). Character audits (waves 1–4) are done; weapons
      never got the same treatment.
- [ ] **Echo defs + Sonata sets** — 193 echo defs and 34 sonata sets: costs,
      set bonuses, echo skills vs snapshot.
- [ ] **Buff presets / team buffs pass** — dedicated audit of buffPresets.ts and
      teamBuffs.ts values and exclusions (touched piecemeal during wave 4, never
      fully swept).

## In progress
- [ ] **Rotation presets** — per-character preset rotations (Prydwen-sourced),
      transcribed by the auditors. See brief in orchestrator session.

## Sync follow-ups (found during preset review 2026-09-19)
- [ ] **All-zero motion rows**: 8 snapshot rows with 20 zero values (danjin
      Chaoscleave Healing, brant Healing + Waves of Acclaims Healing,
      galbrena Hellstride DMG, luuk-herssen Ichor Blade, rebecca second
      Heavy Attack - Guts DMG, xuanling Wraith of Sound, jingran Shadow
      Step). They show in the picker as 0% motions. Decide: drop at sync
      or flag. No preset maps one.
- [ ] **Jianxin preset missing**: Prydwen page has only prose priority
      bullets, no step-by-step rotation — no preset file (correctly left
      unresolved).

## User-side reminders
- [ ] **Chisa ring-bonus units** — needs in-game tooltip observation; no citable
      source exists.
- [ ] **`.agents/` untracked dir** — planner output; keep or delete.
- [ ] **README `Agents.md` link fix** — trivial, pending.

## Prior roadmap (preserved 2026-09-19)

(Items 1–4 from the original list — chain transcription, weapon passives,
correctness cleanups, team-buff audit — are done and committed; see git log.)

1. Timestamps/buff windows — DONE 2026-09-18 (rotation-timestamps project, all 6 phases): per-block durations with derived
starts, per-buff windows with union resolution, team/outro/preset lengths as real t=0 windows, manual rotationTime + Σ warning,
old-spec compat verified. (Plan: .agents/plans/2026-09-18-rotation-timestamps.md.)

2. Search scaling (defer). Branch-and-bound stays deferred per search.ts — bench shows ~60k combos/s with
exactness intact. Revisit only if real inventories outgrow exhaustive search.

3. Data freshness. Snapshot is 2026-09-12; new characters/weapons since then are simply absent. A re-sync +
placeholder-verification pass (placeholders.ts TODO) is cheap maintenance that keeps everything else honest.

# TODO — next audit targets & reminders

## Next audit targets (sweeps complete 2026-09-19, reviewed, pending commit)
- [x] **Weapon audits (auditor-1)** — all 122 checked; 3 fixes in
      (Ages of Harvest stack sum, Bloodpact wielder preset, Pistols#26
      label); 5 live-vs-snapshot conflicts reported (below).
- [x] **Echo defs + Sonata sets (auditor-2)** — 34/34 sonatas clean; 2 new
      echo outro presets + 1 assumption; prism cost drift reported (below).
- [x] **Buff presets / team buffs pass (auditor-3)** — 7 new team-buff
      converts (Ciaccona/Qiuyuan×2/Buling/Iuno/Lynae/Mornye), Luuk S4
      window fix, exclusion re-read. Orchestrator added the Hyvatia
      outro preset (audit miss, same windowed pattern); Jué stays
      untranscribed (wielder cast-buffs can't carry windows — model gap).

## In progress
- [x] **Rotation presets** — per-character preset rotations (Prydwen-sourced),
      transcribed by the auditors. See brief in orchestrator session.

## Sync follow-ups (found during preset review 2026-09-19)
- [x] **All-zero motion rows**: triaged 2026-09-19 — the 7 kept rows all
      carry flat values (3 heals + 4 fixed-damage), so no blind drop rule.
      Implemented: same-name duplicate drop (Rebecca STA row gone) +
      all-zero-ratio audit warning + 3 considered-Basic retypes
      (Hellstride, Wraith of Sound, Shadow Step).
- [ ] **Fixed-damage buff immunity**: 4 rows' prose says immune to DMG
      Bonus ("not affected by any DMG Bonus") — the calculator has no
      immunity term and overstates them. Needs domain design.
- [ ] **Jianxin preset missing**: Prydwen page has only prose priority
      bullets, no step-by-step rotation — no preset file (correctly left
      unresolved).
- [x] **Prism echo costs**: decided cost 1 (Game8 1-cost ×4 opened,
      Rarity 0, CD-8s cohort, Aero sibling). Implemented as
      ECHO_COST_OVERRIDES + regen 2026-09-19 (4 costs + pools only).
- [x] **Weapon live-conflicts**: arbitrated 2026-09-19 — 4/5 were
      wiki-wrong (provider + Game8 agree; snapshot stands, no code change).
- [ ] **Comet Flare R5** (in-game check): only genuinely ambiguous
      conflict — wiki/Comet pages disagree on the R5 value and no source
      shows S4/S5. Read it in-game; contingent override drafted in
      auditor-1's report.
- [x] **Starfield `{Cus:...}` markup**: fixed in stripHtml 2026-09-19
      (Ipt→PC wording, Sap→X(s), unterminated fragments, unknown dropped;
      regen verified zero tokens remain).
- [x] **Echo pool cross-check**: closed 2026-09-19 — Prydwen echo-stats
      page corrected the model: 1-cost primary is HP%/ATK%/DEF%-only with
      fixed flat-HP secondary (flats are secondary-only). Pools, Kamera
      importer, docs, and 85 echo defs updated; placeholders TODO resolved.

## User-side reminders
- [ ] **Chisa ring-bonus units** — needs in-game tooltip observation; no citable
      source exists.
- [ ] **`.agents/` untracked dir** — planner output; keep or delete.
- [x] **README `Agents.md` link fix** — done 2026-09-19.

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

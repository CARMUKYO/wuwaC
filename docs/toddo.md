# Roadmap — remaining items

(Items 1–4 from the original list — chain transcription, weapon passives,
correctness cleanups, team-buff audit — are done and committed; see git log.)

1. Timestamps/buff windows — DONE 2026-09-18 (rotation-timestamps project, all 6 phases): per-block durations with derived
starts, per-buff windows with union resolution, team/outro/preset lengths as real t=0 windows, manual rotationTime + Σ warning,
old-spec compat verified. (Plan: .agents/plans/2026-09-18-rotation-timestamps.md.)

2. Search scaling (defer). Branch-and-bound stays deferred per search.ts — bench shows ~60k combos/s with
exactness intact. Revisit only if real inventories outgrow exhaustive search.

3. Data freshness. Snapshot is 2026-09-12; new characters/weapons since then are simply absent. A re-sync +
placeholder-verification pass (placeholders.ts TODO) is cheap maintenance that keeps everything else honest.

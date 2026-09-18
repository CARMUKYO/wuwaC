
  Done 1. Resonance Chain transcription system — the biggest coverage gap. Every S1–S6 on every character warns-and-skips (~400 nodes).
  Don't hand-transcribe all of them; mirror the BUFF_PRESETS playbook: a chain-preset catalog for the transcribable subset (flat
  sheet stats, multipliers with clear semantics), per-character modules for the weird ones, dated notes for the rest. Start with
  the most-played characters' chains.

  Done 2. Weapon passive wave — same playbook, high value. Only 13 passives transcribed; everything else warns. Signature-weapon riders
  define builds, so each transcription directly moves optimizer rankings. The sonata-wave workflow (snapshot text → preset +
  provenance + spot tests) transfers directly.

  Done 3. Correctness cleanups (small, high-trust). Several known-approximate behaviors deserve closing: the forteLevel → array-index
  mapping is still an unverified TODO; forte unlock state and ascension are untracked (all nodes count as active); multi-hit hits
  are display-only in scoring (an 8-hit motion scores once — worth a conscious decision either way); plus last turn's findings
  (Tune Break stale display, expected-damage lacking kit context, no custom-buff shred entry).

  Done 4. Team-buff exclusion audit. 23 characters remain excluded in teamBuffs.test.ts; some are genuinely untranscribable
  (Roccia-style self-scaling), but others may have become transcribable now that the shred/coordinated buckets exist. A re-read
  pass would probably convert a few.

  5. Timestamps/buff windows — the expensive one. Repeatedly non-goal'd across four plans because blocks carry no timestamps, so
  all buffs score full-uptime. This is the largest architectural unlock (real rotation sim, trigger pacing, windowed outros), but
  it's a multi-session redesign of the rotation model, worker protocol, and UI — I'd only take it on as an explicit project, not a
  side quest.

  6. Search scaling (defer). Branch-and-bound stays deferred per search.ts, and rightly so — bench shows ~60k combos/s with
  exactness intact. Revisit only if real inventories outgrow exhaustive search.

  7. Data freshness. Snapshot is 2026-09-12; new characters/weapons since then are simply absent. A re-sync +
  placeholder-verification pass (placeholders.ts TODO) is cheap maintenance that keeps everything else honest.

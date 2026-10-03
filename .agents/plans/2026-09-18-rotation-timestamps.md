## Goal

Thread real timing through the rotation model so buffs score only over the windows they actually cover, instead of every buff scoring at full uptime. Blocks gain durations (start times derive from order), buffs gain optional time windows, windowed buffs auto-apply to the blocks that fall inside them, and the worker protocol, calculator store, and UI all carry the timing through. Multi-session project; each phase below is independently verifiable and leaves the app working.

User decisions recorded in this plan (answered 2026-09-18): strict per-block window containment, per-block durations with derived starts, single-character scope first.

## Success Criteria

- A buff with a time window applies at full value to blocks inside the window and zero outside; burst alignment changes scores.
- Rotations without any timing input score byte-identical to today (backward compatibility pinned by differential tests).
- The optimizer's rotation objective respects windows and ranks builds accordingly, with no search-algorithm rewrite.
- The calculator lets users enter block durations and buff windows, shows derived start times and window coverage, and warns on inconsistent timing (durations overflowing rotation time).
- Imported team/outro buffs carry their known window lengths as real windows instead of label text.
- `docs/toddo.md` item 5 is closed and the reference doc's "blocks carry no timestamps yet" statements are updated.

## Context And Current Facts

- **Block spec has no time fields.** `rotationBlockSpecSchema` (`src/data/schema.ts:441-496`) carries skill/motion/kit-state/echo inputs; the echo-cooldown comment states the status quo explicitly: "Cooldown is display-only — blocks carry no timestamps (non-goal)" (`:487`).
- **Buff spec has no window.** `rotationBuffSpecSchema` (`src/data/schema.ts:499-510`) is id/label/source/mods only.
- **Scoring is binary per block.** `scoreRotationBlocks` (`src/domain/rotation.ts:198-376`) builds one `globalSheet` from `globalBuffIds` (`:214`) and per block adds `activeBuffIds` (`:222`) via `applyBuffs` (`:89-107`). The only order-dependent logic is the Cartethyia S4 flag (`:241-242`). Global buffs are full-uptime by construction (`:55`).
- **One global clock.** `RotationInput.rotationTime` (`src/domain/rotation.ts:57-58`) is a single seconds value; `dps = dpr / rotationTime` (`:163`). Store default 10s, max 3600 (`src/state/calculator.ts:24-25,182-188`).
- **Windows exist as display text only.** `windowSeconds` is recorded on team outro overrides (`src/data/schema.ts:574`), ~40 `TEAM_BUFFS` entries (6–35s, `src/data/teamBuffs.ts:52-98`), and in chain/preset assumption prose (`src/data/chainPresets.ts:11,52`; `src/data/buffPresets.ts:20,86`). `resolveTeamBuffs` documents the behavior: "every buff scores full-rotation like any other global buff; the window stays visible in the label" (`src/domain/teamBuffs.ts:13-16,56,72`). The buffs UI renders "— full uptime" (`src/ui/components/RotationTimeline.tsx:846`); echo cooldown renders "shown, not simulated — blocks carry no timestamps" (`:444`).
- **Team import goes global.** `CalculatorPage.tsx:56-70` imports resolved team buffs and toggles each global, i.e. full-uptime by construction.
- **Worker boundary rides on the spec.** `RunMessage` (`src/optimizer/protocol.ts:8-13`) carries `SearchData` + `OptimizeRequest`; the rotation-dpr objective embeds blocks/buffs/globalBuffIds/crit (`src/data/schema.ts:524-530`, built at `src/ui/components/RotationOptimizer.tsx:90-101`). Timing fields added to the spec cross the worker for free; the worker entry is thin by design (`src/optimizer/optimizer.worker.ts:19-41`). The search scores every combo through `scoreSheet` → `scoreRotationBlocks` (`src/optimizer/search.ts:157-206`, `src/domain/objectives.ts:98-116`); "DPS ranks identically (time is constant)" (`objectives.ts:102`) still holds since windows don't change rotation time.
- **Window resolution is cheap relative to damage math.** Resolving which buffs hit which blocks is O(blocks × buffs) numeric compares with no sheet dependence, versus a full `computeDamage` per block per combo — no search restructure or pruning change is expected (scaling baseline: ~65k combos/s, `src/optimizer/search.ts:91-103`).
- **UI is an ordered list, not a timeline.** Blocks render in array order with up/down moves (`RotationTimeline.tsx:229-280`), per-block buff checkboxes (`:610-628`), and the page wires store → `calculateRotation` → results (`CalculatorPage.tsx:170-194,519-546`).
- **No provider timing data.** The sync deliberately drops "cooldowns, stamina costs, concerto regen, durations" (`src/data/encore.ts:65-66`) — durations/starts must be user-entered or hand-curated, never synced.
- **Saved builds embed the spec.** `buildSchema.objective` (`src/data/schema.ts:549`) persists rotation objectives, so timing fields must be optional (old specs keep parsing and scoring identically).
- **Deferral history.** `docs/toddo.md:20-23` (item 5) deferred this as "a multi-session redesign of the rotation model, worker protocol, and UI"; the 2026-09-13 plan non-goal'd "per-second buff windows (blocks still timestamp-less)" and the "timed rotation model" (`2026-09-13-modeling-completeness.md:19,25`); the chain plan excluded "cooldown/extra-cast/duration/energy/concerto/ATK-SPD mechanics" (`2026-09-17-chain-transcription.md:26`). Reference doc §5 (`docs/WUWA_GAME_REFERENCE.md:150-155`) and §6 (`:257-262`) pin the current full-rotation/cooldown-display behavior.
- **Checkout constraint.** Another agent is implementing import/export in the same tree; this project touches the plan file only until implementation is scheduled.

## Constraints And Non-goals

- Strict TS, no `any` in domain/optimizer; math stays in `src/domain`; every domain function gets a hand-computed unit test (AGENTS.md).
- One-way dependency (UI → optimizer → domain → data) is not violated: window-resolution helpers live in `src/domain`, the UI only edits/displays timing.
- Backward compatibility is a hard gate: absent timing reproduces today's numbers exactly (differential tests per phase); old saved builds and old specs parse unchanged.
- Non-goals for this project: full 3-character team sim with swaps and off-field time (single-character windows first, per user scope answer); Concerto-gauge simulation; cooldown *enforcement* (echo cooldowns may become warnings, never hard errors, in this project); DoT tick simulation for status damage; auto-derived animation durations from unverified sources (fabrication guardrail); branch-and-bound (stays deferred per toddo item 6).
- No backend/account changes; local-first untouched. No copyrighted art. Plan file only until implementation is explicitly scheduled (import/export agent shares the checkout).

## Key Decisions

- **D1 — Strict window containment (user-answered).** A buff with a window applies at full value to blocks inside `[start, start + duration)` and zero outside. Rejected: uptime-averaged scaling (buff value × covered fraction) — simpler, but burst alignment would never matter, which defeats the project's purpose.
- **D2 — Per-block durations, derived starts (user-answered).** Each block declares `durationSeconds`; block *i*'s start is the cumulative sum of durations before it. Rejected: absolute per-block timestamps — more flexible, but gaps/overlaps need validation rules and every reorder forces re-entry.
- **D3 — Single-character windows first (user-answered).** This project windows buffs against one character's action list. Full team rotation with swap points, incoming/outgoing handoffs, and off-field coverage is the follow-up project, not a phase here.
- **D4 — Timing is opt-in and additive.** New schema fields are optional; a block without `durationSeconds` and a buff without a window behave exactly as today. This makes every phase backward compatible and every differential test meaningful. Rejected: required timing with a migration — would break saved builds and the import/export work in flight.
- **D5 — Windowed buffs auto-apply by time; manual mechanisms stay.** A buff carrying a window applies to in-window blocks without toggles. `globalBuffIds` (full-uptime auras) and per-block `activeBuffIds` toggles keep today's meaning for untimed buffs. A buff with both a window and manual toggles applies by union (window OR toggle). Rejected: replacing toggles with windows outright — untimed/conditional buffs still need them.
- **D6 — A block scores at its start time; windows are start-inclusive, end-exclusive.** Point-in-window test uses the block's derived start. Zero-duration windows never apply. Blocks starting at or past `rotationTime` still score, with a warning (never silently drop damage). Rejected: midpoint testing (false precision) and clamping/dropping out-of-range blocks (silent damage loss).
- **D7 — `rotationTime` stays the manual DPS denominator.** It represents loop time including downtime/swap gaps the single-character model doesn't itemize. The UI warns when summed durations exceed it. Deriving the denominator from durations (or a toggle) is Phase 6, after real usage. Rejected: forcing denominator = sum(durations) now — would redefine DPS for every existing rotation.
- **D8 — No search/worker-protocol restructure.** Timing rides inside the existing `rotation-dpr` spec; `scoreSheet`'s per-combo cost grows by O(blocks × buffs) compares only. Rejected: precomputing buff maps per search (premature — bench first; the compares are noise next to `computeDamage`).

## Phased Implementation Breakdown

### Phase 1 — Schema timing fields + domain window resolution

- **Goal:** blocks carry durations, buffs carry windows, `scoreRotationBlocks` resolves them; untimed specs score identically.
- **Work:** `src/data/schema.ts`: add optional `durationSeconds` (nonnegative) to `rotationBlockSpecSchema`, optional window (`windowStartSeconds`, `windowDurationSeconds`, both nonnegative) to `rotationBuffSpecSchema`; keep everything else untouched. `src/domain/rotation.ts`: pure helpers `blockStartTimes(blocks)` (cumulative sum, missing duration = 0 contribution… see Open Q4) and `buffAppliesAt(buff, timeSeconds)` implementing D6; thread through `applyBuffs`/scorer per D5 (union of global + toggled + in-window). `BlockResult`/`ScoredBlock` gain the derived `startSeconds` for UI display.
- **Verification:** new `rotation.test.ts` cases with hand-computed values: window covering a subset of blocks changes exactly those blocks' damage; boundary block at exactly window-end excluded, at window-start included; zero-duration window applies nowhere; differential test — a realistic multi-buff rotation scores identical before/after with no timing fields. `npm run test`, `npm run lint`.

### Phase 2 — Optimizer pass-through + ranking proof

- **Goal:** prove windowed objectives cross the worker and move rankings, with no perf work.
- **Work:** no protocol change expected (spec embeds timing); add a `search.test.ts` case where a windowed rotation objective ranks two echo combos differently than the same rotation untimed (hand-computed or differential). Confirm `RotationOptimizer.tsx:99` needs no change beyond passing through specs that now may contain timing.
- **Verification:** new search test green; `npm run bench` within noise of the ~65k combos/s baseline (D8); `worker.test.ts` still green (protocol untouched). `npm run build` (worker chunk bundles).

### Phase 3 — Calculator store timing state

- **Goal:** session-local timing state with the store's existing clamp conventions.
- **Work:** `src/state/calculator.ts`: `setBlockDuration(id, seconds)` (clamp 0–3600, ignore non-finite like `setRotationTime`), `setBuffWindow(id, start, duration)` (+ clear-window action); `addBlock`/`addBuff` accept the new optional fields. Derived-start selector for the UI.
- **Verification:** `calculator.test.ts` additions: clamps, non-finite ignored, window set/clear, derived starts (`[0, d0, d0+d1, …]`). Full suite green.

### Phase 4 — Timeline and buff-window UI

- **Goal:** users can enter durations/windows and *see* coverage on the timeline.
- **Work:** `RotationTimeline.tsx`: per-block duration input (details element, next to forte); buff rows gain window start/duration inputs; block rows show derived `@Ns`; buff-checkbox rows indicate auto-applied-in-window state (checked-but-disabled with a "window" tag vs manual check); rotation header shows Σdurations vs rotation time with an amber warning when Σ exceeds it (D7); echo-cooldown line (`:444`) stays display-only. `CalculatorPage.tsx`: nothing structural — the existing wiring already passes blocks/buffs through; only copy updates if needed.
- **Verification:** `RotationTimeline.test.tsx` render tests: derived starts shown; in-window buff auto-checks its blocks; Σ warning appears/doesn't; untimed rotations render exactly as today. Manual checklist: build a 3-block rotation, window a buff over blocks 1–2, confirm DPR changes and block 3's damage doesn't.

### Phase 5 — Curated windows for team/outro data

- **Goal:** known window lengths become real windows instead of label suffixes.
- **Work:** `resolveTeamBuffs` attaches `windowDurationSeconds` from `TEAM_BUFFS.windowSeconds` (start per Open Q1 — default t=0 until decided); team outro overrides (`schema.ts:574`) likewise. Audit `BUFF_PRESETS`/`CHAIN_PRESETS` timed assumptions ("Ns window" prose) and add structured durations to the unambiguous subset only; ambiguous ones keep prose + stay untimed (fabrication guardrail). Calculator team import (`CalculatorPage.tsx:56-70`) keeps working — imported buffs now arrive windowed instead of global where durations are known.
- **Verification:** `teamBuffs.test.ts`: imported Verina Outro carries a 30s window and scores only in-window blocks; every-character-accounted and sourceRef tests still green; assumption-prose audit list (entry → structured or reason-kept-prose) reviewed in the diff.

### Phase 6 — rotationTime interplay, saved-build compat, docs

- **Goal:** close the loop on the DPS denominator question and ship the docs.
- **Work:** decide Open Q2 with usage evidence from Phase 4 (recommendation: keep manual `rotationTime` + Σ warning; add an optional "derive from durations" toggle only if users ask). Compat pass: parse old saved builds/specs (no timing fields) and confirm identical scores; confirm the import/export agent's format carries the optional fields or ignores them cleanly. Docs: update reference doc §5 (`:150-155`) and §6 echo-skill note (`:257-262`), close `docs/toddo.md` item 5.
- **Verification:** old-spec differential test (a Phase-0-era serialized objective parses and scores identically); manual: load a pre-change saved build, confirm DPR unchanged; `npm run test`, `npm run lint`, `npm run build` all green; docs diff reviewed.

## Open Questions

1. **Imported team-buff window starts.** `TEAM_BUFFS.windowSeconds` gives lengths, not starts. Default to t=0 (rotation opens with the outgoing character's Outro, matching the common rotation shape) or anchor to the first Intro/Outro buff-carrier block when one exists? Leaning t=0 default with user-editable start (Phase 4 editors make this cheap to adjust).
2. **DPS denominator long-term.** Keep manual `rotationTime` + Σ warning permanently, or add a "derive from durations" toggle in Phase 6? Leaning keep-manual unless Phase 4 usage shows the warning firing constantly.
3. **Default block durations.** No provider source exists (`encore.ts:65-66` drops durations). Start blank (user must enter; missing = 0 for start derivation, all blocks stack at t=0 with a hint) or ship hand-estimated per-skill defaults? The latter risks fabrication-guardrail violations — leaning blank-with-hint, plus optional user-settable per-skill presets later.
4. **Missing-duration start derivation.** If some blocks lack durations, do later blocks stack at the last known time (missing = 0 contribution) or does the UI require durations before windows resolve (windows inert until fully timed)? Leaning missing = 0 with a visible "untimed blocks" hint — preserves D4's never-drop-damage rule.

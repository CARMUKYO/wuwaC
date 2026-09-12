## Goal

Three improvements, delivered as three workstreams: (1) a Sonata-set filter on the Echo Inventory page plus fixing the missing-echo gap in synced echo data (e.g. Reminiscence: Fleurdelys); (2) a preset buff library for the calculator Buffs section covering buffs that Echoes, Sonata sets, and weapons provide (manual custom buffs stay); (3) Team v2 — derive Outro-skill and other team buffs (e.g. Lynae's Liberation) from saved teams and apply them in the calculator.

## Success Criteria

- Inventory page offers a Sonata dropdown ("All sets" default) that filters the echo list; counts update.
- `npm run sync -- --echoes` produces Reminiscence: Fleurdelys, Threnodian - Leviathan, Denia, and Threnodian - Voidborne Construct as echo defs with verified costs, and a provider-vs-snapshot audit shows no other unexplained gaps.
- Buffs section offers one-click preset buffs grouped by source (Echo / Sonata / Weapon / Team) with honest full-uptime labeling; custom buff creation still works and supports multi-stat buffs.
- Picking a team in the calculator imports that team's Outro + team buffs as toggleable buffs that flow through the existing `calculateRotation` buff path; Lynae contributes her Outro (15% All DMG Amp + 25% Liberation bonus, 14s window noted) and her Liberation (24% team DMG, 30s window noted).
- All new domain logic has hand-computed unit tests (repo rule); `npm run test`, `lint`, and `build` pass.

## Context And Current Facts

- Inventory (`src/ui/pages/InventoryPage.tsx`, 137 lines) has no filtering at all. `src/ui/filter.ts` has a `filterByName` helper; `EchoList.tsx` already displays each echo's Sonata name. Snapshot has 34 Sonata sets; `OwnedEcho.sonataId` is the filter key.
- Echo data: snapshot (`src/data/generated/snapshot.json`, fetched 2026-09-09) has 185 echo defs. Sync list source is `GET /echo`, details `GET /echo/:id` (`scripts/sync-gamedata.ts:662-704`); cost prefers Handbook intensity with a detail-Rarity fallback `{0:1, 1:3, 2:4}`, and "Rarity 3+ still skips" (script header + `normalizeEchoDef`).
- Missing-echo root cause, verified live this run: the provider list contains `Reminiscence: Fleurdelys` (Id 6000106, PhantomType 1, i.e. a primary record that should sync), plus `Threnodian - Leviathan` (6000167), `Denia` (6000200), `Threnodian - Voidborne Construct` (6000199) — none in the snapshot. Detail records show `Rarity: 3` with empty/missing Handbook (`/echo/6000106` has `"Intensity":""`; `/echo/6000167` has no Handbook key), so the sync's Rarity-3 skip drops them. In-game these are 4-cost Calamity-class echoes, but that mapping must be verified per echo at implementation time, not assumed.
- Buffs today: `RotationBuffSpec {id, label, source, mods[]}` (`src/data/schema.ts:453`); buffs apply as additive sheet deltas per block or globally (`src/domain/rotation.ts` `applyBuffs`); UI entry is a manual single-stat form in `RotationTimeline.tsx:641+`; per-block toggles and `globalBuffIds` exist. `statKeySchema` already includes `amplify` (attacker-side all-DMG amp, multiplicative via `computeDmgAmplifyTotal`).
- Buff source text already in the snapshot: 54 of 62 Sonata bonuses are `custom` notes (e.g. Moonlit Clouds 5pc "ATK of the next Resonator by 22.5% for 15s", Rejuvenating Glow 5pc "ATK of all party members by 15% for 30s"); all 122 weapons carry `passive {name, description, paramsByRank}`; echo `skillDescription`s contain main-slot bonuses ("equipped in the main slot gains 12.00% ... DMG Bonus").
- https://www.wutheringtools.com/ could not be inspected: it is a JS SPA and a fetch returned only the app shell. Its buff section is treated as an evidence gap; the preset library is instead designed from the snapshot text above, which already contains the same underlying buff wordings.
- Team v1: `teamSonataCoverage` counts equipped echoes per member (`src/domain/teams.ts`); `teamSchema` already reserves optional `outroBuffs[] {fromCharacterId, effect, windowSeconds?}` marked "Display-only in v1; drives rotation modeling in v2" (`src/data/schema.ts:522-531`); `src/state/calculator.ts:14` notes "team outro-buff integration is a later follow-up". Reference doc §5 defines v2 as Outro effects modeled as timed buffs on the incoming character's sheet.
- Lynae (in snapshot, verified): Outro "next incoming Resonator gain 15% All DMG Amplification and 25% Resonance Liberation DMG Amplification for 14s"; Liberation "increases the DMG dealt by all nearby Resonators in the team by 24% for 30s".
- Rotation model constraint: `rotationTime` is one global number and blocks carry no timestamps/durations, so per-second buff windows cannot be scored precisely — full-uptime global buffs are the honest approximation and already the established semantic of `globalBuffIds`.

## Constraints And Non-goals

- Follow `AGENTS.md`: one-way dependency (UI → optimizer → domain → data), strict TS, no `any` in domain/optimizer, hand-computed domain tests, no stat math in `.tsx`.
- No fabricated kit numbers: preset/curated values are transcribed from synced snapshot strings with provenance (source id + snapshot date); anything untranscribable stays a `custom` note with a warning, never a guessed number.
- Non-goals: per-second rotation simulation with buff windows (blocked by the timestamp-less block model — windows are recorded and displayed, scored as full-uptime); touching optimizer search/pruning; changing the sync provider; bundling art; backend/accounts.

## Key Decisions

1. **Missing echoes: extend the Rarity fallback, don't blanket-map.** Add explicit handling for Rarity-3 detail records (expected: cost 4 for Calamity/Reminiscence-class, verified per echo against a live echo reference at implementation time), keep Handbook-first priority, keep the cross-check warning, and add a provider-primary-list-vs-snapshot audit to the sync output so future gaps are visible. Rejected: silently mapping all Rarity 3 → 4 (Kronaclaw proves Reminiscence echoes are not uniformly 4-cost — it synced at cost 3 via Handbook).
2. **Buff presets: curated-with-provenance, not regex-parsed.** A data-layer preset file transcribes values from snapshot strings (sonata notes, weapon `paramsByRank`, echo main-slot lines), each entry citing its source record. Tests assert every referenced id exists in the snapshot. Rejected: regex-parsing descriptions at runtime (brittle across 54 free-text notes) and hand-typing from memory (violates the no-fabrication guardrail).
3. **Preset scope: full-uptime simplifications, honestly labeled.** Weapon passives and stacking buffs enter as full-stack/full-uptime presets with the assumption in the label (e.g. "Autumntrace P5 (5 stacks, full uptime)"). Rejected: modeling stacks/triggers per block (no timestamp model to hang it on).
4. **Team buffs enter as derived global buffs, windows as metadata.** A pure domain function resolves a team's buffs (Outro of each member + other team buffs + provider-member Sonata team buffs already in the preset library) into `RotationBuff`s the user imports/toggles; `windowSeconds` is preserved on the buff label/metadata and displayed, scored full-rotation. Rejected: automatic silent application (user must see and toggle what is assumed) and per-block window math (no block timestamps).
5. **Typed "X DMG Amplification" maps to the additive bucket; only "All DMG Amplify" maps to `amplify`.** The reference formula (§6) has one global `DmgAmplifyTotal` and no per-type amplify term, so Lynae's 25% Liberation amp scores as `dmgBonus:liberation` with a documented-approximation note, while her 15% All DMG amp uses `amplify`. Rejected: inventing a per-type amplify multiplier (contradicts the formula tree) and dropping the typed portion silently.
6. **`teamSchema.outroBuffs` becomes derived data with manual overrides.** The resolver populates it from the curated table at team-pick time; users can still add/edit entries for untranscribed kits. Rejected: a second parallel store for team buffs.

## Recommended Approach

Workstream 1 (inventory filter + echo sync fix) first — small and independent. Workstream 2 (preset buff library + Buffs UI) second — it builds the source-typed preset catalog Workstream 3 reuses for team-provided Sonata/weapon buffs. Workstream 3 (team buff resolution + calculator import, Lynae included) last. Data-layer preset tables live in `src/data/` (plain data + provenance, no math); resolution stays pure in `src/domain/teams.ts` (or a small `teamBuffs.ts` beside it); UI only renders and toggles.

## Work Plan

### WS1 — Echo inventory filter + missing echoes

1. **Sonata filter on InventoryPage.** Add a "Sonata set" `<select>` (All sets + 34 snapshot sets, with per-set owned counts) above `EchoList`; filter `echoes` by `sonataId`; keep the flagged/re-link banner computed on the full list. Extend `InventoryPage.test.tsx` (filter selects subset; "All sets" restores).
2. **Rarity-3 echo support in sync.** In `src/data/encore.ts` + `scripts/sync-gamedata.ts`: accept Rarity-3 detail records with an explicit, per-echo-verified cost (verify Fleurdelys/Leviathan/Denia/Voidborne costs against a live echo reference during implementation); main-stat pool falls back to the existing cost-tier pool with the existing fallback logging; keep Handbook-first and the cost-mismatch warning. Add `encore.test.ts` cases using the recorded detail payloads (Rarity 3 + empty/missing Handbook → def with verified cost).
3. **Re-sync + audit.** Run `npm run sync -- --echoes`; assert the four Reminiscence echoes appear with sane costs/pools/sonatas; add a sync-summary diff (provider primary entries vs emitted defs, with skip reasons) and clear any other unexplained gap the audit surfaces. Verify `echoDefIssues`/re-link flow still passes on the new snapshot.

### WS2 — Preset buff library + Buffs section

4. **Preset catalog data (`src/data/buffPresets.ts` + test).** Source-typed entries `{id, label, source: 'Echo' | 'Sonata' | 'Weapon', sourceRef, mods: {stat, value}[], assumption?}` transcribed from snapshot strings: (a) echo main-slot bonuses for all defs carrying them; (b) transcribable Sonata 2pc/5pc effects (unconditional or full-uptime-assumed; the rest stay out with a comment); (c) weapon passives as full-stack/full-uptime presets. Test: every `sourceRef` resolves in the bundled snapshot; spot-check values against the source strings.
5. **Buffs UI upgrade (`RotationTimeline.tsx`).** Add a grouped preset picker (by source, with assumption text) with one-click add; extend the custom form to multiple stat mods; show buff mods inline on each buff row. Keep per-block toggles and globals untouched. Component tests for add-from-preset and multi-mod custom buff.

### WS3 — Team v2: Outro + team buffs in the calculator

6. **Curated team-buff table (`src/data/teamBuffs.ts` + test).** Per character: Outro structured mods + window, plus other team buffs (start with Lynae's Liberation 24%/30s and any sibling cases found while transcribing; all 58 characters' Outros transcribed, untranscribable ones as notes). Values cited to snapshot skill text; test asserts character ids + skill ids exist in the snapshot.
7. **Domain resolver.** Pure `resolveTeamBuffs(team, snapshot, presets): RotationBuff[]` (window preserved in label/metadata; Decision 5 mapping for typed amplify) with hand-computed tests incl. the Lynae numbers; wire `teamSchema.outroBuffs` as derived-plus-override.
8. **Calculator team import.** Team picker on `CalculatorPage` (or rotation section): "Import team buffs" adds resolved buffs to the registry and enables them as globals, visibly tagged by provider (e.g. "[Lynae Outro]"); user can toggle off per block or globally. Teams page shows each member's provided team buffs under their Sonata coverage. Tests: import → DPR changes by the hand-computed delta; toggle-off restores baseline.

## Validation Plan

- `npm run test` (full suite incl. new `encore.test.ts`, preset/teamBuffs, domain, and UI tests), `npm run lint`, `npm run build`.
- WS1: `npm run sync -- --echoes` exits 0 with the four Reminiscence defs present; sync summary lists every skipped primary entry with a reason; Inventory filter test covers subset + restore + counts.
- WS2: preset test asserts 100% `sourceRef` resolution against the bundled snapshot; UI test adds a Moonlit-Clouds-5pc-equivalent preset and a multi-mod custom buff and scores them.
- WS3: hand-computed DPR test — Lynae Outro + Liberation on a fixture rotation equals baseline × 1.15-amplify × (liberation-bucket and 24%-team-DMG terms) within rounding; highest-risk check is the Decision-5 mapping, so the test asserts each Lynae mod lands on the expected stat key (`amplify` vs `dmgBonus:liberation` vs team-DMG term) explicitly.
- Manual: load dev server, filter inventory by two Sonata sets; add an echo-form entry for Fleurdelys (def present in dropdown); import a Lynae team in the calculator and toggle buffs.

## Risks / Rollback

- Provider data drift (new Rarity meanings, renamed echoes): mitigated by the new sync audit output and `sourceRef` tests failing loudly; rollback is re-running sync from the committed snapshot (partial syncs carry categories over).
- Transcription errors in presets/team table: mitigated by provenance fields + snapshot-resolution tests + hand-computed DPR tests; a wrong value is a data one-liner fix.
- Window-as-full-uptime overestimates damage for short windows: accepted and labeled (Decision 4); labels always show the real window so users can judge.
- No migration risk: `outroBuffs` is already optional in the schema; inventory filter is stateless UI.

## Open Questions

None — wutheringtools.com could not be inspected (JS SPA shell only), so preset content is sourced from the snapshot's own buff wordings instead; if its buff list has categories beyond Echo/Sonata/Weapon/Team effects (e.g. enemy debuffs), say so and the catalog gains a section.

## Sources

- https://api-v2.encore.moe/api/en/echo (provider echo list: Fleurdelys Id 6000106 PhantomType 1 present; also Leviathan 6000167, Denia 6000200, Voidborne Construct 6000199)
- https://api-v2.encore.moe/api/en/echo/6000106 (Fleurdelys detail: Rarity 3, empty Handbook Intensity)
- https://api-v2.encore.moe/api/en/echo/6000167 (Leviathan detail: Rarity 3, no Handbook key)
- https://www.wutheringtools.com/ (attempted; returned SPA shell only — no content claims made)

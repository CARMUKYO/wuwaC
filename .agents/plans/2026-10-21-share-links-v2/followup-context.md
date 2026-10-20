# Follow-up for bugfix: save roster context with each build (approved 2026-10-21)

The user accepted the default answers to your 5 open questions:
- **Q1:** do this follow-up.
- **Q2–Q5:** keep today's behaviour.
  - Q2: Save as reference is the v2 import; nothing adds the sender's
    Echoes to the inventory.
  - Q3: the link stays pending after Optimize.
  - Q4: the caps are unchanged.
  - Q5: forte levels are capped at 10 in links.

## Task

Today, Copy link takes level, chain, forte and weapon context from the
sender's *current* Roster entry, and refuses when the weapon differs. Make
links faithful to the build as saved:

1. **Store a context snapshot when a build is saved.** Use the optimizer's
   save path in `src/ui/components/RotationOptimizer.tsx`. The snapshot is
   the character and weapon context the run actually used (`lastRun.data`:
   roster entry, weapon, level, ascension, rank, forte and nodes). That may
   be a calculator draft or manual input rather than the Roster, so capture
   what was used, not what the Roster says now.
2. **Add an optional, unindexed `context` field on `buildSchema`.** Use the
   same reasoning as `reference`: no Dexie version bump, and backup v1 stays
   a superset. Re-check that `state/backup.ts` and JSON export/import keep
   the field, and add a test that a v1 backup without it still parses.
3. **`sharedBuildFromLibrary()`.**
   - Prefer `build.context`.
   - Fall back to the current Roster entry only for older builds without it,
     keeping today's refusal rules on that path.
   - A context value outside the share schema (e.g. forte 11) still gets a
     readable error.
4. **Tests.**
   - A saved build carries the run's context.
   - Copy link uses the saved context even after the Roster changed, with a
     different level and weapon.
   - Old builds fall back as before.
   - Backup and export round-trip the field.

## Coordination

`secpriv` is doing the origin move in the same tree, so `BuildsPage.tsx` is
off-limits to you. If it needs a change, describe it in your report.

**You own:**
- `src/state/share.ts` (+test)
- `src/data/schema.ts`: `buildSchema` and the share schemas only
- `src/ui/components/RotationOptimizer.tsx` (+test)
- `src/state/library.test.ts`
- `src/state/backup.test.ts`

Yesterday's ground rules apply: no git state changes, no dependency changes,
and propose doc text instead of editing it. Re-read files before every edit.

Gates: `npm run lint`, `npx tsc -b`, `npm run test`, `npm run build`. Report
failures in `secpriv`'s files rather than fixing them.

## Report

Append a "Follow-up: saved context" section to
`.agents/plans/2026-10-21-share-links-v2/report.md`. Reply with a 3-line
summary.

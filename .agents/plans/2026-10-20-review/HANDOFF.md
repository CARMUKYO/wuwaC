# 2026-10-20 review: handoff for the next session

On 2026-10-20 we reviewed the whole project. Three Claude agents then worked
in Herdr's `auditors` tab (`bugfix`, `secpriv`, `perf`), all in the same
working tree on `main`. The coordinator session reviewed each agent's diff.

All changes are uncommitted on `main`, mixed in with the user's
uncommitted Echo-scanner work. `main` auto-deploys on push, so commit on a
branch.

- Briefs: `briefs/`
- Each agent's full report: `reports/`

## State at stop

- `npm run lint`: clean.
- `npx tsc -b`: clean.
- `npm run test`: 942 of 945 pass. All 3 failures are in
  `src/ui/pages/CalculatorPage.test.tsx`: its mocked `SearchResult` predates
  the new `scored` and `total` fields. Fix: at line 26, after `evaluated: 1,`,
  add `scored: 1,` and `total: 1,`. `perf` verified this on a copy.
- `npm run build`: passed in `perf`'s final run; not re-run by the
  coordinator.

## Done (reviewed by the coordinator)

### bugfix

- **Share links:** a `#b=` link opens Builds with a preview, and nothing is
  saved until the user clicks Import. Store fields: `shareLink`,
  `resolveShareLink`.
- **Pruning:** the `prune.ts` rule is now sound (k + topN − 1 counted
  dominators). The coordinator checked the proof. `prune.soundness.test.ts`
  has a property test against the unpruned search.
- **Downloads:** a deferred `revokeObjectURL` (`src/ui/download.ts`).
- **ErrorBoundary:** fallback offers Export backup. Mounted in `main.tsx`,
  plus per section in `App.tsx` (done by `perf`).
- **zod jitless:** `src/data/zodConfig.ts` is the first import of `schema.ts`.

### secpriv

- `npm audit fix` (dev-only advisories).
- Self-hosted fonts via `@fontsource`.
- A build-only `<meta>` CSP plugin in `vite.config.ts`.
- Referrer policy `no-referrer`.
- Footer copy corrected.
- CI: deploy permissions moved to the deploy job; actions pinned to SHAs
  (the coordinator verified them with `git ls-remote`); `dependabot.yml`;
  production audit step in CI.

### perf

- **Phase A, startup:**
  - The bundled snapshot is read with `JSON.parse` and isn't
    zod-validated at runtime. The `index.test.ts` gate keeps that safe.
  - The cache-read validation is memoised per (build, checksum).
  - Pages are lazy-loaded; the entry chunk went from 507 kB to 27 kB.
- **Phase B, optimizer:** an exact search with cost-pattern enumeration,
  branch-and-bound and sharded workers. A seeded equivalence suite checks it
  against `searchReference`.
  - Realistic 100–300 Echo inventories take about 1–3 s.
  - The synthetic worst case at n=300 takes about 28 s on 8 workers.
- **Also:**
  - `minStats` is checked for each slot-1 choice.
  - The progress count now reaches its total.
  - Optimizer UI filters for equipped Echoes and minimum level.
  - tsx can import `src/data/index.ts` again.

## Next steps (in order)

1. Fix the `CalculatorPage.test.tsx` mock (above). Re-run all gates,
   including `npm run build`.
2. Ask `secpriv` (or do it directly) to re-run the headless-Chromium CSP
   check on the final build. Expect zero violations; the zod eval probe
   should be gone. Its playwright-core harness lived in its own
   session-scoped scratchpad, which may be gone by now.
3. Integrate the proposed doc updates into `AGENTS.md`, `docs/toddo.md`, and
   reference doc §7. They're in the "Proposed doc updates" section of each
   report.
4. Review the full diff once more, then commit on a branch, not `main`.
   Separate commits:
   - the user's scanner work
   - bugfix
   - secpriv
   - perf

## Open decisions for the user

- **Share links:** should they carry the Echoes' stats (today they hold only
  the sender's Echo IDs)? Should a pending preview survive navigating away
  (today it does, until Import or Dismiss)?
- **Background refresh:** `perf` proposes a CI sync that publishes a
  reviewed `gamedata/manifest.json`, replacing the ~370 browser requests to
  encore.moe per stale visitor. See `reports/perf-phaseB.md`. Not
  implemented.
- **Shared github.io origin:** other Pages repos on the account can poison
  this app's caches. The real fix is a custom domain or a dedicated
  account/org (`reports/secpriv.md`, item 7).
- **perf's minor questions:**
  - Should minStats be met by any slot-1 choice? (Implemented that way.)
  - What should `evaluated` mean under a 5-piece lock?
- **Feature ideas from the review:**
  - upgrade advisor
  - Echo locks and team-wide allocation
  - unused-Echo finder
  - build detail and compare page
  - persist calculator drafts
  - undo on delete

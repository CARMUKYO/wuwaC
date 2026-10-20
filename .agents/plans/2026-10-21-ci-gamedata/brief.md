# Brief: perf — CI-published, reviewed game data (approved 2026-10-21)

The user approved your Phase B proposal, "reviewed same-origin data plus a
tiny manifest" (`.agents/plans/2026-10-20-review/reports/perf-phaseB.md`,
section "Background refresh: proposal"). Implement it.

You're the only agent working now; `bugfix` and `secpriv` are stopped. The
ground rules in `.agents/plans/2026-10-20-review/briefs/00-ground-rules.md`
still apply, with one exception: file ownership. You may edit any file this
task needs. These rules still hold:
- Preserve the user's uncommitted scanner work.
- No git state changes, commits, pushes, or workflow runs.
- No dependency changes without asking first (in your report).
- Don't edit `AGENTS.md`, `README.md`, or `docs/`. Propose the text instead.

## Scope

1. **Build output.** At build time, emit:
   - `gamedata/manifest.json`: `{ snapshotVersion, fetchedAt, checksum, path, bytes }`
   - `gamedata/snapshot-<checksum>.json`: the bundled snapshot, minified and
     content-addressed

   Do this with a Vite plugin, so `npm run build` and `npm run preview`
   produce the files and deploy needs no extra step. Use `checksumJson`, over
   the same canonical JSON the IndexedDB cache checksums. Put the
   manifest-building logic in a pure, tested function.

2. **Client refresh.** Replace the automatic provider sync. Once per session,
   plus the manual "Check for updates":
   - Fetch `<base>gamedata/manifest.json` (same-origin, bypassing the HTTP
     cache).
   - Decide with the existing rules: `shouldAdoptCandidate`, and holding out
     snapshots newer than the app.
   - Fetch the payload only when it's newer. Verify checksum and zod, call
     `writeCachedSnapshot`, then swap in place.
   - On failure, keep serving silently; the manual check reports the outcome.

   Keep the fallback order and the version, age and adoption rules. Drop or
   repurpose `SNAPSHOT_STALE_AFTER_DAYS` as your proposal says. Browsers must
   no longer call encore.moe's API at all, with no escape hatch.
   `providerSync.ts` stays the single provider pipeline, used by the CLI and
   CI.

3. **Service worker.** Never precache or runtime-cache `gamedata/**`; the
   IndexedDB cache owns it. Confirm in the built `dist/sw.js`.

4. **CSP and copy.**
   - `connect-src` drops `https://api-v2.encore.moe` and keeps `'self'`.
   - `img-src` keeps `https://api.encore.moe` for game art.
   - Update the footer in `App.tsx`: game data now comes from this site; only
     game art comes from encore.moe.

5. **Scheduled sync workflow:** `.github/workflows/sync-gamedata.yml`, weekly
   cron plus `workflow_dispatch`.
   - **Job 1, read-only** (`contents: read`): `npm ci`, `npm run sync`,
     lint, test, build. If `src/data/generated/snapshot.json` changed, upload
     it as an artifact together with a change summary. The summary lists
     counts and added/removed/changed ids per category, and comes from a
     small, pure, tested script under `scripts/`.
   - **Job 2, write** (`contents: write`, `pull-requests: write`): runs no
     npm or install scripts. It downloads the artifact, commits it to a fixed
     branch (e.g. `data/gamedata-sync`), pushes, and opens or updates a PR
     with the summary. Splitting the jobs keeps install scripts away from the
     write token.
   - Use only first-party actions, pinned to full commit SHAs like
     `ci.yml`/`deploy.yml`. Verify each SHA with `git ls-remote`.
   - Open the PR with the preinstalled `gh` CLI and `GITHUB_TOKEN`, not a
     third-party action. Add a `concurrency` group.
   - No auto-merge. A merge made with `GITHUB_TOKEN` wouldn't trigger the
     deploy, and human review is the point.
   - PRs opened with `GITHUB_TOKEN` don't trigger `ci.yml`. Job 1 already ran
     the gates; say so in the PR body.
   - The user must enable "Allow GitHub Actions to create and approve pull
     requests" in the repo settings. Document this; don't change settings.
   - Don't run or dispatch the workflow. Don't run a full `npm run sync`
     locally (that's about 370 requests to the fan-run API). Test the summary
     script with fixtures.

6. **Stale test mock.** Fix it in `src/ui/pages/CalculatorPage.test.tsx`
   (add `scored`/`total`) so the suite is green.

## Tests and verification

Tests:
- the manifest builder
- the client refresh cases:
  - newer snapshot: adopt
  - same or older: keep
  - checksum mismatch
  - zod-invalid payload
  - newer-than-app
  - network or HTTP failure
  - once per session
  - manual-check outcome
- the summary script
- the workflow YAML parses

Gates: `npm run lint`, `npx tsc -b`, `npm run test`, `npm run build`.

Then run `npm run preview` and verify in headless Chromium if you can
(`/usr/bin/chromium` exists; `secpriv` drove it with playwright-core
installed in a scratchpad, not the repo):
- the manifest fetch works under the CSP, with no violations
- no request goes to `api-v2.encore.moe`
- a newer manifest is adopted

Say exactly what you could and couldn't verify.

## Report

Write `.agents/plans/2026-10-21-ci-gamedata/report.md` covering:
- files changed
- design notes
- tests
- gate results
- what's unverified
- **user actions required** (the repo setting, merging sync PRs)
- proposed `AGENTS.md` text: the runtime contract, Hosting, and commands

Reply with the path and a 5-line summary.

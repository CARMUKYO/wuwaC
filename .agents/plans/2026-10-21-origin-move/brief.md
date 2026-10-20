# Brief: origin move to wuwa-opt.github.io (approved 2026-10-21)

**Queued.** Start only after `perf` (CI game data) and `bugfix` (share
links v2) have finished and been reviewed. This touches files both of them
own today.

## Why

`carmukyo.github.io` is shared with 11 other Pages repos on the user's
account. Any of them can read and write this app's IndexedDB and Cache
Storage, including poisoning cached JS
(`.agents/plans/2026-10-20-review/reports/secpriv.md`, item 7). The user
chose a free GitHub organization, **`wuwa-opt`**. The new canonical
address is **`https://wuwa-opt.github.io/wuwaC/`**. The repo stays named
`wuwaC`, so `base: '/wuwaC/'` doesn't change.

## Key constraint: users' data doesn't move by itself

Browser storage belongs to an origin, so existing users' Echoes, roster,
builds and teams stay at `carmukyo.github.io/wuwaC/`.

- **Do NOT transfer the repo.** That would stop the old Pages site, and
  users could no longer open it to export.
- Do this instead:
  - The new repo `wuwa-opt/wuwaC` gets the code and becomes the canonical
    deploy.
  - The old repo `carmukyo/wuwaC` deploys one final **"moved" build** and
    stays up as a migration page for a long time.

## Code changes (one codebase, two deploy modes)

1. **Moved mode, set at build time** (e.g. `VITE_MOVED_TO=https://wuwa-opt.github.io/wuwaC/`).
   The old repo's `deploy.yml` sets it from a repo variable.
   - Show a persistent banner: "WuWa Optimizer has moved to … Export your
     data here, then import it there." Include an **Export backup** button
     (`src/ui/download.ts` `downloadBackup`) and a link to the new site.
   - The app keeps working normally, so nobody is stranded.
   - Opening a `#b=` share link on the old site also offers "Open on the new
     site". That link keeps the same fragment (it's client-side only), and
     the target URL must be exactly `VITE_MOVED_TO`.
   - Validate `VITE_MOVED_TO` at build time: an `https:` URL ending in `/`.
     Never derive it from the page.
2. **New site, first run.** If the user's DB is empty, show a dismissible
   hint: "Coming from carmukyo.github.io/wuwaC? Import your backup" →
   the existing DataSafety restore. Remember the dismissal per browser,
   under the existing prefixed `wuwa-*` key convention.
3. **Canonical URLs.** Point `index.html`'s canonical, `og:url` and
   `og:image` at the new origin from ONE constant, not hand-copied twice.
4. **Workflows.**
   - Guard the CI game-data sync workflow with
     `if: github.repository == 'wuwa-opt/wuwaC'`, so the old repo never
     opens sync PRs.
   - `deploy.yml` works in both repos. In the old repo it builds moved mode.
   - Keep the SHA pins and least-privilege permissions.
5. **No storage renames.** IndexedDB and localStorage names stay exactly the
   same, so the new origin's data starts fresh under the same names.

**Proposal only, don't build:** a one-click postMessage handoff from the old
origin to the new one. It needs strict `event.origin` checks on both sides.
Write it up in the report.

## Tests

- Moved-mode banner: renders only when the flag is set, and Export works.
- "Open on the new site" keeps the fragment and uses only the configured
  URL.
- Build-time validation of `VITE_MOVED_TO`.
- Empty-DB import hint: shows when the DB is empty; hides after dismissal or
  once data exists.
- The canonical-URL constant is used in the built `index.html`.
- The workflow guards are present.

Gates: `npm run lint`, `npx tsc -b`, `npm run test`, `npm run build`; also
`VITE_MOVED_TO=… npm run build`.

## User actions (for the coordinator to walk through; not for the agent)

1. Create the `wuwa-opt` org (Free plan) in the GitHub web UI. It can't be
   done through the API.
2. Create the repo `wuwa-opt/wuwaC`. The coordinator does this with `gh`,
   after the user confirms.
3. In the new repo:
   - set Pages → Source to "GitHub Actions"
   - enable "Allow GitHub Actions to create and approve pull requests"
4. Push the code to the new repo, check the deploy, then set the old repo's
   `MOVED_TO` variable and redeploy the old site in moved mode.
5. Later: decide how long the old site stays up. Months, not weeks.

## Report

Write `.agents/plans/2026-10-21-origin-move/report.md` covering:
- files changed
- how the two modes are selected
- tests
- gate results
- what's unverified
- the postMessage proposal
- proposed `AGENTS.md`/`README.md` text (the Hosting block and the
  shared-origin note)

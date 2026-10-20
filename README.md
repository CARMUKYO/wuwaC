# WuWa Optimizer

**Live:** https://wuwa-opt.github.io/wuwaC/

Local-first web app for Wuthering Waves: a personal Echo inventory plus a
solver that searches your own Echoes for the best build per character —
the Genshin Optimizer loop, translated to Echoes/Sonatas and (v2) teams.

Project memory and architecture rules: [`AGENTS.md`](AGENTS.md).
Game-mechanics ground truth: [`docs/WUWA_GAME_REFERENCE.md`](docs/WUWA_GAME_REFERENCE.md).

```bash
npm run dev      # local dev server
npm run test     # vitest (single run)
npm run build    # tsc + production build (also emits the service worker)
npm run preview  # serve dist/ at http://localhost:4173/wuwaC/
npm run lint     # eslint
```

Game data is sourced from the encore.moe community API by a sync script
(`npm run sync`, run weekly in CI; every update is a reviewed pull request)
and never hand-typed from memory. Browsers only download the reviewed copy
this site publishes, and load game art from encore.moe. No backend,
no accounts: user data lives in IndexedDB (Dexie.js), in each visitor's own
browser. **Database → Your data → Export everything** is the only durable
copy — clearing site data erases it.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml` (lint → test → build →
GitHub Pages). Other branches and PRs run `ci.yml` (same checks, no deploy).

- `base` in `vite.config.ts` must match the repo name (`/wuwaC/`). The
  canonical address is the one `CANONICAL_URL` constant in `src/site.ts`
  (`index.html` is filled from it); update both if the repo is renamed or moved.
- `.github/workflows/sync-gamedata.yml` syncs game data weekly and opens a PR
  for review. It needs "Allow GitHub Actions to create and approve pull
  requests" enabled in the repo settings, and only runs in `wuwa-opt/wuwaC`.
- The build ships a service worker (vite-plugin-pwa): the app works offline
  and is installable. Open tabs show a "new version available" banner after a
  deploy rather than swapping code underneath the user.

## Moving from the old address

WuWa Optimizer now lives at **https://wuwa-opt.github.io/wuwaC/**. Browsers
store data per web address, so your Echoes, roster, builds and teams did not
move automatically:

1. Open the old site, https://carmukyo.github.io/wuwaC/. It still works and
   shows a "moved" banner.
2. Click **Export backup** and save the file.
3. Open the new site, go to **Database → Restore from backup…**, and pick the
   file (Merge keeps anything already there; Replace overwrites it).

Shared build links (`#b=…`) keep working: on the old site, use "Open this
shared build on the new site".

Fan-made tool; not affiliated with or endorsed by Kuro Games.

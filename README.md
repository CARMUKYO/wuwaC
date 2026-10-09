# WuWa Optimizer

**Live:** https://carmukyo.github.io/wuwaC/

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

Game data is sourced from the encore.moe community API via an offline sync
script (`scripts/`, Phase 1+) — never hand-typed from memory. No backend,
no accounts: user data lives in IndexedDB (Dexie.js), in each visitor's own
browser. **Database → Your data → Export everything** is the only durable
copy — clearing site data erases it.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml` (lint → test → build →
GitHub Pages). Other branches and PRs run `ci.yml` (same checks, no deploy).

- `base` in `vite.config.ts` must match the repo name (`/wuwaC/`); update it,
  plus the canonical/Open Graph URLs in `index.html`, if the repo is renamed.
- The build ships a service worker (vite-plugin-pwa): the app works offline
  and is installable. Open tabs show a "new version available" banner after a
  deploy rather than swapping code underneath the user.

Fan-made tool; not affiliated with or endorsed by Kuro Games.

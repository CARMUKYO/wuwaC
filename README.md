# WuWa Optimizer

Local-first web app for Wuthering Waves: a personal Echo inventory plus a
solver that searches your own Echoes for the best build per character —
the Genshin Optimizer loop, translated to Echoes/Sonatas and (v2) teams.

Project memory and architecture rules: [`Agents.md`](Agents.md).
Game-mechanics ground truth: [`docs/WUWA_GAME_REFERENCE.md`](docs/WUWA_GAME_REFERENCE.md).

```bash
npm run dev      # local dev server
npm run test     # vitest (single run)
npm run build    # tsc + production build
npm run lint     # eslint
```

Game data is sourced from the encore.moe community API via an offline sync
script (`scripts/`, Phase 1+) — never hand-typed from memory. No backend,
no accounts: user data lives in IndexedDB (Dexie.js).

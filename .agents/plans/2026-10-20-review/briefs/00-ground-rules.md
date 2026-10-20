# Ground rules (shared by all three agents)

- You are one of three Claude agents working at the same time in the SAME
  working tree: `/home/userman/Projects/WuwaC`, branch `main`. The agents:
  `bugfix` (bugs), `secpriv` (security & privacy), `perf` (performance &
  scale). A coordinator session assigned the work and will review it.
- Stay inside the files your brief says you own. If you need a change in a
  file you don't own, don't make it: describe it in your final report.
- Re-read a file immediately before each edit. Another agent may have
  changed a shared file since you last read it.
- The working tree holds the user's uncommitted Echo-scanner work:
  `src/scanner/`, `src/state/scanStore*`, `src/ui/components/EchoScanner*`,
  `scripts/scan-*`, `src/vite-env.d.ts`, `.agents/`, plus edits in
  `vite.config.ts`, `src/data/echoStats.ts`, `src/ui/pages/InventoryPage.tsx`,
  `AGENTS.md`, `.gitignore`, `package.json`, `package-lock.json`. Preserve all of it.
- No git commands that change state: no commit, stash, checkout, reset,
  restore, rebase, branch switch, or push. Leave your changes uncommitted.
  (`main` auto-deploys on push.)
- Only `secpriv` may run `npm install` / `npm audit fix` or edit
  `package.json` / `package-lock.json`. Everyone else: no dependency
  changes. If you need one, report it.
- Don't edit `AGENTS.md`, `README.md`, or `docs/`. Put proposed doc updates
  in your final report; the coordinator integrates them.
- Read `AGENTS.md` first and follow it: one-way architecture, no `any` in
  domain/optimizer, hand-computed test expectations, Dexie migration rules,
  no fabricated game values. `docs/WUWA_GAME_REFERENCE.md` wins over your
  background knowledge about the game.
- Gates: while working, run only targeted tests (`npx vitest run <paths>`),
  because other agents' half-finished edits can break unrelated suites. At
  the end run `npm run lint`, `npx tsc -b`, and `npm run test`. If a failure
  is in a file you don't own, report it rather than fixing it.
- Repro scripts from the coordinator's review are in
  `/tmp/claude-1000/-home-userman-Projects-WuwaC/a73243ee-af07-45c6-9ab5-7af4a0e6afb9/scratchpad/repro/`.
  Read them; don't edit them (copy anything you want to reuse into the repo).
- Finish with a short report in chat: files changed, tests added, how you
  verified each fix (command + result), anything left unverified, open
  questions, and proposed doc updates.

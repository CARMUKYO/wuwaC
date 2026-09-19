# Agents.md — WuWa Optimizer

This file is project memory. Read it at the start of every
session. Full game-mechanics detail lives in
`docs/WUWA_GAME_REFERENCE.md` — read that too before touching anything in
the domain/calculation layer. Where this file and your own background
knowledge about Wuthering Waves disagree, this file (and the reference
doc) win — the game patches often and your training data may predate the
current patch.

## What this project is

A local-first, client-only web app for Wuthering Waves that mirrors what
frzyc's Genshin Optimizer does for Genshin: a personal Echo/character
database plus a solver that searches the user's own Echo inventory for the
best gear combination for a given character and objective. No backend, no
account system — everything lives in the browser (IndexedDB).

## Tech stack & commands

- React + TypeScript (Vite), strict mode.
- Zustand for state, Dexie.js over IndexedDB for persistence.
- Tailwind for styling.
- Vitest for tests.
- Optimizer search runs inside a Web Worker.

```
npm run dev       # local dev server
npm run test       # vitest
npm run build       # production build
npm run lint       # eslint
npm run sync       # offline encore.moe -> src/data/generated/ (manual)
npm run bench      # optimizer scaling benchmark (manual, not a unit test)
```

(Update this block as the real scripts are set up — keep it accurate.)

## Architecture — one-way dependency, do not violate

```
UI (React components)
   -> Optimizer layer (worker-hosted search)
      -> Domain/calculation layer (pure TS functions, no React)
         -> Data layer (static character/weapon/echo/sonata data)
```

- **Data layer**: character/weapon/echo/Sonata data is sourced from the
  encore.moe API (`https://api-v2.encore.moe/api/en`) via an offline sync
  step, not hand-typed — see `docs/WUWA_GAME_REFERENCE.md` section 8 for
  the full fetch-validate-cache-fallback pipeline. What the rest of the
  app actually reads at runtime is a bundled/cached snapshot, never a
  direct blocking fetch on page load. Beyond that sync step, this layer
  is plain data — no game-math functions live here.
- **Domain layer**: pure functions, e.g. `computeStats(character, weapon,
  echoes, sonataBonuses) -> StatSheet` and `computeDamage(statSheet,
  skill, enemy) -> number`. Fully unit-testable without rendering
  anything. This is where the formulas from
  `docs/WUWA_GAME_REFERENCE.md` live.
- **Optimizer layer**: takes the domain layer's pure functions and
  searches combinations of Echoes. Runs off the main thread. Naive
  brute force is fine for a first correctness pass; add pruning
  (branch-and-bound / per-slot scoring heuristics to cut the search
  space) once it's correct, since a full cartesian product across 5 echo
  slots gets large fast for a real inventory.
- **UI layer**: rendering and user input only. If you find yourself
  writing a stat formula inside a `.tsx` file, stop — it belongs in the
  domain layer.

## Core data model (adjust field names as the schema firms up, but keep this shape)

```ts
type Attribute = "Glacio" | "Fusion" | "Electro" | "Aero" | "Spectro" | "Havoc";

interface StatSheet {
  hp: number; atk: number; def: number;
  critRate: number; critDmg: number; energyRegen: number;
  healingBonus: number;
  attributeDmgBonus: Record<Attribute, number>;
  // basic/heavy/skill/liberation DMG bonus buckets, def ignore/shred,
  // resistance shred, etc. — see reference doc's stat list.
}

interface Character {
  id: string; name: string; attribute: Attribute; weaponType: string;
  baseStatsByLevel: /* curve or formula */ unknown;
  forteTree: unknown;         // skill tree, levels, passive unlocks
  resonanceChain: unknown[];  // S1..S6 effects
  skills: { id: string; motionValue: number; damageType: string }[];
  // TODO per character: verify against a live source before shipping,
  // see docs/WUWA_GAME_REFERENCE.md "Data sources"
}

interface Echo {
  id: string; setId: string; cost: 1 | 3 | 4;
  level: number; rarity: number;
  mainStat: { stat: keyof StatSheet | string; value: number };
  substats: { stat: string; value: number }[]; // up to 5
}

interface EchoSet {
  id: string; name: string;
  bonuses: { pieceCount: 2 | 3 | 5; effect: string /* structured later */ }[];
}

interface Build {
  id: string; characterId: string; weaponId: string;
  echoIds: string[]; // exactly 5, respecting cost budget
  notes?: string;
}

interface Team {
  id: string; name: string; characterIds: [string, string, string];
}
```

## Game-mechanics cheat sheet (see reference doc for full detail)

- **Stats**: HP, ATK, DEF, Crit Rate (base 5%), Crit DMG (base 150%),
  Energy Regen, Healing Bonus, and per-attribute DMG bonus (one of the 6
  elements), plus Basic/Heavy/Skill/Liberation DMG bonus buckets.
- **Echoes**: 5 slots, each Cost 1/3/4; a full loadout is normally capped
  at 12 total cost (commonly 1×4 + 2×3 + 2×1). Only slot 1's Echo skill is
  usable in combat; the rest are pure stat sticks. Main stat pool depends
  on cost (1-cost primary is HP%/ATK%/DEF%-only with a fixed flat-HP
  secondary; 4-cost has the widest pool including Crit Rate/Crit
  DMG/Healing Bonus). Up to 5 substats, unlocked
  by "Tuning," fixed once rolled.
- **Sonata sets**: equipping same-Sonata Echoes grants bonuses at 2 and 5
  pieces (a few sets instead use 1/3). You can run one 5-piece set, or mix
  two different 2-piece sets, across the 5 slots.
- **Forte tree**: per-character skill-upgrade tree (passive stat/damage
  nodes + active skill leveling).
- **Resonance Chain**: character's duplicate-copy upgrade track, S0–S6,
  each rank changing the kit (Genshin's Constellation equivalent).
- **Concerto Energy / Intro & Outro Skills**: each character has a
  Concerto gauge filled by basic attacks/dodges/skills; swapping
  characters at full gauge fires the outgoing character's Outro Skill and
  the incoming character's Intro Skill simultaneously — this is where
  cross-character buffs and off-field damage come from, and it's the
  mechanic the v2 team/rotation layer needs to model.
- **Damage formula** (source: the Wuthering Waves Fandom wiki's Damage
  page — see `docs/WUWA_GAME_REFERENCE.md` section 6 for the full,
  authoritative derivation; don't approximate from memory):
  `Damage = BaseDamage × Resistances × Bonuses`, where `Resistances =
  ResMultiplier × DefMultiplier × DmgReductionTotal × ElemReductionTotal`
  and `Bonuses = DmgBonusPercent × DmgAmplifyTotal × SpecialDmgPercent ×
  CritMultiplier` — these are each independent multiplicative terms, not
  one summed bucket. Implement one small pure function per term.

## Coding conventions

- TypeScript strict mode; no `any` in the domain/optimizer layers.
- Every function in the domain layer gets a unit test with a
  hand-computed expected value — not just a snapshot test.
- File layout mirrors the architecture: `src/data/`, `src/domain/`,
  `src/optimizer/`, `src/ui/` (or `src/components/` + `src/pages/`).
- Prefer small, pure, composable functions in the domain layer over one
  large `calculateEverything()` function — it needs to be testable piece
  by piece.

## Guardrails

- Never fabricate a specific character's exact multipliers/stats and
  present them as fact. If a real source isn't available, use a
  clearly-labeled placeholder and leave a TODO citing what needs
  verification.
- Don't add a backend, analytics, or account system without asking first
  — this is meant to stay a local-first, offline-capable app.
- Don't bundle copyrighted character art in the repo; reference official
  image URLs at runtime or use placeholders.
- When in doubt about a mechanic, check `docs/WUWA_GAME_REFERENCE.md`
  before guessing.

## Code Map

- `src` — application source
- `docs` — project documentation

## Conventions

- Use ESM `import`/`export` with explicit `.ts`/`.tsx` extensions in relative paths.

## Subagent delegation

Default to working inline — a lookup one `search`/`read` answers stays
inline. Spawn child agents when the work splits into genuinely independent
units:

- **Fan-out transcription/audit**: N same-shaped units (per-Sonata-set
  values, per-character/per-weapon checks, provider-vs-snapshot diffs).
  One child per batch, not per keyword; cap width to the units at hand.
- **Bounded read-only research**: snapshot/API/live-source lookups with a
  crisp question that needs no session context.

Never delegate cross-cutting design, final integration, or verification.
Children are read-only researchers: they return evidence (file:line,
values, exact URLs inspected), and the parent does all edits, runs the
gates, and owns correctness. A child result you haven't verified is a
lead, not a fact — especially numbers, which re-enter the
no-fabrication guardrail at integration time.

Reusable child briefs (paste into the spawn prompt, scoped to the task):

- **data-transcriber**: "Transcribe these snapshot records into
  `BUFF_PRESETS`/`TEAM_BUFFS` entry text: <ids>. Rules: values only from
  the quoted source strings; flag ambiguities instead of guessing; return
  entries + one-line provenance each. Do not edit files."
- **source-scout**: "Find current numeric values for <items> from live
  sources. Inspect underlying page content (search snippets don't count);
  return value + exact URL per item, or 'unresolved' with what you tried.
  Do not edit files."
- **mechanics-checker**: "Review <diff/plan> against
  `docs/WUWA_GAME_REFERENCE.md` (it wins over background knowledge).
  Return each contradiction with doc section + file:line, or 'no
  contradictions found'. Do not edit files."

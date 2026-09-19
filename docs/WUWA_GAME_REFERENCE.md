# Wuthering Waves — Game Mechanics Reference

Ground truth for the domain/calculation layer. This is a mechanics
reference, not a stats database — it deliberately contains no specific
character kit numbers, since those change with patches. When the data
layer needs real numbers, pull them from a live source (see "Data
sources" at the end) rather than from memory/training data.

## 1. Stats

Every character has these stats, each with a base value plus contributions
from level curve, weapon, Echoes, Resonance Chain, and Forte tree:

- **HP, ATK, DEF** — flat and percentage-bonus variants both exist.
- **Crit Rate** — base 5%.
- **Crit DMG** — base 150%.
- **Energy Regen** — affects how fast the Resonance Liberation (ultimate)
  gauge fills.
- **Healing Bonus**.
- **Attribute (elemental) DMG Bonus** — one bucket per element: Glacio,
  Fusion, Electro, Aero, Spectro, Havoc. A character only benefits from
  their own attribute's bucket.
- **Damage-type buckets**: Basic Attack DMG Bonus, Heavy Attack DMG Bonus,
  Resonance Skill DMG Bonus, Resonance Liberation DMG Bonus — these stack
  additively with the Attribute bucket, not with each other's category,
  when both apply to a given hit (see formula below).
- **DEF Ignore / DEF Reduction (on enemy)**, **Resistance Reduction (on
  enemy)** — reduce the enemy-side multipliers.

Model all of these as an aggregatable `StatSheet` in the domain layer; the
optimizer's whole job is choosing Echoes that push this sheet toward the
user's chosen objective.

## 2. Echoes (the gear system)

- 5 Echo slots per character.
- Each Echo has a **Cost** of 1, 3, or 4, determined by its Class (roughly:
  small monsters = 1-cost, mid monsters = 3-cost, bosses/"Calamity" class
  = 4-cost).
- A character's total Cost budget is 10 by default, upgradable to 12 via
  Data Bank progression. The common loadout shape is **one 4-cost + two
  3-cost + two 1-cost = 12**, but other splits are valid as long as the
  budget isn't exceeded — the optimizer should not hardcode the 1/2/2
  split as a rule, only as a default/common case.
- Only the Echo in **slot 1** has its active Echo Skill usable in combat;
  the other 4 slots are pure stat pieces regardless of order.
- **Main stats**: every Echo has 2 main stats fixed at drop (not
  rerollable), which scale up as the Echo is leveled (max level depends on
  rarity, up to +25 for 5★): a randomized primary plus a fixed secondary
  (flat HP on 1-cost, flat ATK on 3/4-cost — flats are secondary-only).
  The primary *pool* depends on Cost:
  - 1-cost: small pool — HP%/ATK%/DEF% only, no Crit stats.
  - 3-cost: adds Attribute DMG Bonus and Energy Regen to the pool, plus a
    fixed flat-ATK secondary main stat.
  - 4-cost: the widest pool, including Crit Rate, Crit DMG, and Healing
    Bonus, plus a fixed flat-ATK secondary main stat. This is normally the
    highest-value slot to get right.
- **Substats**: up to 5 per Echo, unlocked one at a time via "Tuning"
  (every 5 Echo levels, capped by rarity), each a random roll from the
  shared substat pool (ATK%/flat, HP%/flat, DEF%/flat, Crit Rate, Crit
  DMG, Energy Regen, and a few others). No duplicate substats on one
  Echo. Substats cannot be changed once rolled — model them as fixed data
  on the Echo, not as something the optimizer can adjust; the optimizer
  only chooses *which owned Echoes* to equip, never their rolls.

## 3. Sonata sets (set bonuses)

- Each Echo belongs to a **Sonata**. Equipping multiple Echoes of the same
  Sonata on one character grants a bonus at 2 pieces and a stronger bonus
  at 5 pieces (a handful of sets instead trigger at 1 or 3 pieces — treat
  piece-count thresholds as per-set data, not a hardcoded 2/5 rule).
- A character can run one full 5-piece set, or two different 2-piece sets
  simultaneously (2+2+1, where the 5th Echo is off-set), or a 2+3 split of
  the same set for the 2-piece bonus plus extra flexibility on main
  stats. Duplicate copies of the exact same Echo do **not** count twice
  toward the piece count.
- The 2-piece bonus is typically small and unconditional (a flat stat or
  small elemental DMG bonus). The 5-piece bonus is where the real payoff
  is — usually a conditional multiplier tied to a rotation action (e.g.
  bonus DMG after using a Liberation, or a stacking buff from
  basic/heavy attacks).
- Model `EchoSet` as: an id/name, and a list of `{ pieceCount, effect }`
  entries, where `effect` is structured enough for the domain layer to
  apply it (e.g. `{ type: "attributeDmgBonus", value: 0.1 }` or a
  conditional variant with a trigger condition) rather than a free-text
  description.

## 4. Character progression systems

- **Forte tree**: a per-character skill tree that levels up Basic Attack,
  Resonance Skill, Resonance Liberation, and Intro/Outro skills
  individually, and unlocks passive stat/effect nodes along the way
  (comparable to Genshin's talent + constellation-adjacent passive
  nodes combined). Model as leveled nodes that each contribute either a
  skill-multiplier increase or a flat/percentage stat bonus.
  Node unlock state is user-declared (the provider ships no gating
  data): `roster.forteUnlockedIds` gates which nodes apply, and an
  absent set keeps the legacy all-active behavior.
- **Resonance Chain**: the duplicate-copy system, S0 (no dupes) through
  S6, each rank altering the kit (stat bonus, new effect, or multiplier
  increase). Functionally analogous to Genshin's Constellations. The sync
  step keeps every rank as unstructured prose (never invent structure);
  the hand-curated `CHAIN_PRESETS` catalog transcribes the transcribable
  subset instead — all 348 ranks (58 characters × 6) accounted as
  `sheet` (auto-applied stat mods), `motion` (per-motion multipliers,
  skill-scoped crit, motion-scoped DEF ignore, matched by skill kind /
  motion-name substring / scored bucket), `team` (rank-gated manual
  team buffs, always paired with the wielder's own sheet part), or
  `note` (dated reason; `appliedElsewhere` cites the per-character
  module that scores the rank instead). Stacking and timed effects
  transcribe at full stacks / full uptime with a disclosed assumption;
  energy, cooldown, shield, revive, ammo, interrupt, and extra-hit
  mechanics stay notes. Motion-scoped "Amplified" wordings score as
  per-motion multipliers; per-element RES shred scores sheet-wide as
  negative penetration; "All DMG Amplification" maps to the amplify
  term. Skill-named wordings apply skill-wide, motion-named wordings to
  the named motion only.
- **Weapon**: each weapon type (Sword, Broadblade, Pistols, Gauntlets,
  Rectifier) has a base ATK curve, one secondary stat, and a passive
  effect that scales with refinement rank (1–5, from owning duplicates).
  Weapon ATK/secondary curves carry post-ascension `.5` tiers at the
  20/40/…/80 breakpoints; `roster.weaponAscension` (0–6, default 0)
  selects the tier with the same rank semantics as character
  ascension (`lookupAscendedCurve`).

## 5. Team mechanics (needed for the v2 rotation layer)

- Teams are 3 characters; only one is active/on-field at a time.
- **Concerto Energy**: a per-character gauge filled by landing basic
  attacks, dodges, and skills. It's separate from the Resonance
  Liberation (ultimate) gauge.
- **Intro Skill / Outro Skill**: when a character's Concerto gauge is
  full and the player swaps to another character, the outgoing character
  fires their Outro Skill and the incoming character simultaneously fires
  their Intro Skill — both deal damage and/or apply buffs, and for a brief
  window both characters are effectively acting. This handoff, not any
  single character's raw stat sheet, is the core skill-expression and
  damage-optimization lever in real play.
- **Coordinated Attacks**: some kits trigger an off-field ally to jump in
  and attack automatically under certain conditions, independent of the
  Intro/Outro handoff. Coordinated-attack DMG bonuses (Hecate, Youhu
  Outro, Empyrean Anthem, ...) score in the additive
  `dmgBonus:coordinated` bucket, consumed only by hits flagged as
  coordinated attacks (registry in `domain/characterMods.ts` plus
  Jiyan's outro lance in `domain/jiyan.ts`) — see the §6
  `DmgBonusPercent` note for why the bucket is additive.
- **Roles**: teams are typically built as Main DPS (spends most on-field
  time, receives the team's buffs) + Sub-DPS (brief on-field window,
  often applies a debuff or its own burst) + Support/Healer (buffs,
  shields, healing, and Concerto-gauge utility).
- For v1, it's enough to model a team as 3 characters with visible Sonata
  coverage. For v2 (implemented): each character's transcribed Outro and
  team buffs resolve via `resolveTeamBuffs` into calculator buffs and flow
  through the rotation objective into the optimizer. Rotation blocks carry
  optional durations (starts derive cumulatively) and buffs carry optional
  time windows; known team/outro lengths attach as real windows defaulting
  to t=0 (the rotation-opening swap) and score by block coverage, while
  untimed buffs keep full-uptime meaning. `rotationTime` stays the manual
  DPS denominator (loop time including unmodeled downtime); the UI warns
  when summed durations exceed it.

## 6. Damage formula

Source: the Wuthering Waves Fandom wiki's Damage page
(`https://wutheringwaves.fandom.com/wiki/Damage`, CC-BY-SA community
content), cross-checked against its ATK and Crit. DMG pages. This
supersedes any earlier/simplified version of the formula in this doc —
implement the formula tree exactly as broken out below, as a set of small
pure functions rather than one large expression, so each piece can be
unit tested independently.

**Top level:**

```
Damage = BaseDamage × Resistances × Bonuses
```

**BaseDamage:**

```
BaseDamage        = BaseAbilityDamage + FlatDamage + FlatBonusPercent
BaseAbilityDamage = AbilityAttributeStat × MotionValuePercent
```

`AbilityAttributeStat` is whichever stat the skill scales off (ATK for
almost every skill, unless the specific skill's data says otherwise).
`MotionValuePercent` ("MV") is the skill's own multiplier, part of that
skill's kit data — this is exactly the kind of number that must come from
the encore.moe data sync (section 8), never be guessed. Synced MVs are
hit-totals (the parser folds `N%*k` hit counts into the ratio), so each
motion scores exactly once; the displayed hit count is informational.
Forte level N maps to array index N−1 over skill levels 1–10 (verified
against the provider's 10-entry `DamageList.RateLv` combat track).

Total ATK itself is derived, not a single stored number:

```
ATK = (BaseATK_character + BaseATK_weapon) × (1 + BonusATKPercent) + FlatBonusATK
```

**Resistances** (this is a set of independent multipliers, not a single
sum — model each as its own pure function):

```
Resistances = ResMultiplier × DefMultiplier × DmgReductionTotal × ElemReductionTotal
```

- `ResTotal = enemyBaseResistance + attackerResistancePenetration` for
  the attack's element. Most non-boss enemies have a base resistance of
  10% per element; bosses with an element-specific resistance add
  another 30%, for 40% total. These are per-enemy data, not constants to
  hardcode into the formula itself. Sign convention: penetration is
  positive, RES shred is NEGATIVE — shred lowers effective resistance by
  exactly its magnitude (pinned by the shred-sign test). The sheet key
  is element-agnostic, so element-gated kit shred (Phoebe Spectro,
  Woodland Aria Aero, Suisui Havoc) is transcribed with its gate
  disclosed in the assumption.
- `ResMultiplier` — piecewise on `ResTotal`:
  - if `ResTotal < 0`: `1 − ResTotal / 2`
  - if `0 ≤ ResTotal < 0.8`: `1 − ResTotal`
  - if `ResTotal ≥ 0.8`: `1 / (1 + 5 × ResTotal)`
- `DefMultiplier`: enemy DEF scales with enemy level as
  `enemyDef = 8 × enemyLevel + 792` (a default curve; specific enemies
  can override it). Any flat DEF Reduction on the enemy is applied to
  `enemyDef` *before* the ratio below. Then:
  ```
  DefMultiplier = (800 + 8 × attackerLevel)
                  / (800 + 8 × attackerLevel + enemyDef × (1 − defIgnore))
  ```
  The wiki notes this ratio is capped at a maximum of 200% — i.e. with
  enough DEF Ignore it's possible to end up amplifying rather than
  reducing damage, but the multiplier can't exceed that cap. Clamp for
  it explicitly rather than assuming the formula self-limits.
- `DmgReductionTotal = 1 − (dmgReductionBase + dmgReductionAdditional)`
  and `ElemReductionTotal = 1 − (elemReductionBase + elemReductionAdditional)`
  — both are enemy/target-side reduction stats, independent of RES and
  DEF, and independent of each other. Don't fold these into the RES or
  DEF calculation.

**Bonuses** (also a product of independent multipliers, not one summed
bucket):

```
Bonuses = DmgBonusPercent × DmgAmplifyTotal × SpecialDmgPercent × CritMultiplier
```

- `DmgBonusPercent = 1 + AllDmgBonus`, where `AllDmgBonus` is the sum of
  every applicable %DMG bonus for that specific hit — the matching
  Attribute (element) bonus plus the matching action-type bonus (Basic
  Attack / Heavy Attack / Resonance Skill / Resonance Liberation /
  Intro Skill), from character kit, Forte nodes, Resonance Chain,
  weapon, Echo main/substats, and Sonata bonuses. This additive sum is
  exactly the `attributeDmgBonus` / damage-type-bucket aggregation
  described in section 1 — implement it as one function that sums the
  relevant buckets for a given hit. Coordinated attacks additionally
  consume `dmgBonus:coordinated` in the same sum: the formula tree has
  no separate multiplicative term for named damage subtypes (only
  attribute/action buckets plus global amplify), so "Coordinated Attack
  DMG +X%" joins `AllDmgBonus` additively, gated on the hit being a
  coordinated attack. A coordinated attack is not an Echo skill — never
  map these bonuses to `dmgBonus:echo`.
- Echo skills score as rotation blocks carrying the slot-1 Echo's parsed
  motion value, damage element, and scaling (`computeEchoSkillDamage`):
  the echo's own attribute bucket plus the `dmgBonus:echo` bucket, one
  block per hit. Echo blocks take durations like any other block;
  cooldowns are carried for display only (shown, not simulated against
  the timeline — there is no cooldown-clock model). Element-less echoes
  whose skill text reads Physical DMG are unscorable (no Physical RES
  term exists).
- `DmgAmplifyTotal = 1 + (dmgAmplifyTarget + dmgAmplifyAttacker)` — a
  separate multiplier from an uncommon buff type ("DMG Amplify"), which
  can be negative (a reduction) as well as positive. Keep this as its
  own field/multiplier rather than merging it into `AllDmgBonus`,
  since it composes multiplicatively, not additively, with the bucket
  above.
- `SpecialDmgPercent = 1 + specialBase + specialBonus` — a further
  independent multiplier the wiki itself flags as not currently
  surfaced anywhere in-game and not currently used by any live kit as of
  the wiki's last update. Model the field for completeness/future-proofing
  but expect it to be 0 for every character today; don't spend effort
  wiring UI for it until something actually uses it.
- `CritMultiplier`: for a single resolved hit, `%CritDMG` if it crits,
  else `1`. For an *expected-value* scoring mode (useful for the
  optimizer, since Crit Rate above 100% is wasted potential the search
  should recognize as such):
  ```
  ExpectedCritMultiplier = CritRate × CritDMG + (1 − CritRate) × 1
  ```
  with `CritRate` clamped to `[0, 1]` before use. Base Crit Rate is 5%
  and base Crit DMG is 150% before any bonuses.

**Implementation note:** structure the domain layer's damage code as one
small pure function per named quantity above (`computeAtk`,
`computeBaseAbilityDamage`, `computeResMultiplier`, `computeDefMultiplier`,
`computeDmgReductionTotal`, `computeElemReductionTotal`,
`computeDmgBonusPercent`, `computeDmgAmplifyTotal`, `computeCritMultiplier`,
composed by a top-level `computeDamage`). Each one has a small, testable
input/output contract and matches one term in the formula tree above
one-to-one, which makes it straightforward to unit test against
hand-computed examples and to keep correct as individual mechanics get
buffed/reworked in future patches.

### Negative Status damage

Negative Status damage is not a normal ability motion. `Base DMG = Level
Multiplier × 1.25078 × Stack Multiplier` (level table: 10→16, 50→229,
80→2005, 90→3674). It still passes through target RES/DEF and target-side
reductions, but does not use Crit or ordinary attribute/action DMG bonuses —
only Negative Status DMG Amplify applies. The calculator exposes Negative
Status DMG Amplify separately. Status actions are represented as explicit
rotation events carrying a stack count, so sequence-node effects that depend
on target stacks or rotation order can be resolved while the rotation is
scored.

The six statuses behave differently and need different modeling:

- **Spectro Frazzle** — periodic DoT, loses 1 stack per tick, cap 10.
  Published 1–10 stack table. Detonation blocks through the status
  pipeline (Zani, Phoebe, Spectro Rover).
- **Aero Erosion** — periodic DoT with its own decay timer, cap 6
  (chain effects can extend it). Published 1–6 stack table (Cartethyia,
  Ciaccona, Aero Rover).
- **Havoc Bane** — deals NO damage. Enemy DEF −2% per stack (additive),
  default cap 3. Modeled as a per-block target-stack input into the DEF
  term; dealer damage (Chisa, Yangyang: Xuanling) comes from kit
  consumption multipliers in per-character modules.
- **Fusion Burst** — no DoT; detonates its full stack (cap 10) in one
  AoE explosion. No published stack table (as of the Phase 0 spike), so
  detonations throw rather than guess.
- **Electro Flare** — periodic DoT losing half its stacks per tick, with
  overflow converting to Electro Rage. No published stack table.
- **Glacio Chafe** — damage on each inflict plus slow; freeze + clear at
  10. No published stack table.

Per-character application/consumption rules live in kit prose, not in
synced motion values — model them in one hand-verified
`src/domain/<character>.ts` module each (see `cartethyia.ts`), citing
the inspected source. Kit effects that are timed stat buffs or team
buffs stay manual rotation buffs; do not fabricate multipliers.

### Tune Break / Tune Rupture / Tune Strain (3.x combat)

Attacks build the enemy's Off-Tune Level; full gauge = Mistuned, and the
active Resonator's Tune Break Skill deals DMG and clears it. Specialists
inflict *Shifting* states; a Break on a Shifted target converts to a
timed *Interfered* state (Rupture 8s, Strain 30s, Hack 8s). Tune Rupture
detonates the mark for one large instance, then responders
(Aemeath/Mornye/Lynae) fire extra instances on an 8s ICD. Tune Strain is
a per-stack total-DMG amp scaling with Tune Break Boost. Tune Rupture
DMG and Tune Break DMG formulas are unpublished (Phase 0 spikes G2/G3) —
model response instances as labeled assumptions, never as verified
formula. **Resonance Mode** (Aemeath, Denia, Lynae — plus Lucilla
in-game, but she stays unregistered until scoring consumes her mode)
switches a character between applying different statuses/dealing
different damage types; treat it as a per-rotation calculator input,
since switching resets kit resources.

## 7. Optimizer search — practical notes

- The search space for one character is the cartesian product of "which
  owned Echo goes in each of the 5 slots," constrained by total Cost ≤
  budget and (optionally) a locked Sonata-set target. For a modest
  inventory this is already large enough that naive brute force will be
  slow; don't assume it's fine to skip pruning just because a first
  implementation "works."
- A reasonable incremental path: (1) exhaustive search, correct but slow,
  to validate the domain-layer math against hand-computed cases; (2) group
  candidate Echoes per slot and prune dominated options (an Echo that's
  worse on every relevant stat than another Echo of the same cost/slot
  can never be part of an optimal build, so it can be dropped before the
  search); (3) branch-and-bound using a fast upper-bound estimate per
  partial build to cut branches early; (4) move the whole thing into a Web
  Worker (or a worker pool, sharding by locked Sonata set) so the UI stays
  responsive.
- Soundness rule (implemented): dominance pruning must compare within the
  same Sonata set, not just the same cost — set bonuses depend on combo
  composition, so a cross-set swap of a pruned Echo for its dominator can
  lose a 2pc/5pc threshold and lower the score.
- Transcribed `conditional`/`custom` effects (wielded weapon passive at the
  roster rank, met Sonata thresholds, slot-1 Echo bonus) auto-apply in
  `computeStats` at full stacks/uptime so the calculator and optimizer
  agree by construction; every applied effect is disclosed via
  `appliedAssumptions`, and untranscribed effects still warn. Sonata
  notes that ship `{N}` placeholders transcribe from an inspected live
  source (per-entry `liveSource` in the catalog); genuinely dynamic
  effects (Halo 5pc's Buildup-scaling ATK) stay `custom` by decision.
  Echo-skill and coordinated-lance rotation blocks carry their own
  damage inputs, so the optimizer scores them through the shared
  rotation path with no search changes.
- Score builds against a user-chosen objective function, not just raw
  ATK — expected damage for a specific skill, a specific stat threshold
  ("maximize ATK subject to Crit Rate ≥ 70%"), etc. Design the objective
  as a pluggable function over `StatSheet -> number` so new objectives
  don't require touching the search algorithm itself.

## 8. Data sources

Do not hand-type full character kits from memory. Options, roughly in
order of how structured/reliable they are for programmatic use:

### 8.1 Primary source — encore.moe API

**`https://api-v2.encore.moe/api/en`** is the API behind encore.moe (the
"Wuthering Waves Database from Black Shores" community site) and is the
primary data source for this project — use it for character, weapon, and
echo data rather than typing kit numbers by hand.

- Hitting the base URL returns a JSON envelope with a `currentLanguage`
  field and a `routes` array listing the available top-level resources.
  As of this writing that list includes (among others): `character`,
  `weapon`, `echo`, `monster`, `item`, `namecard`, `title`, `toa`, `term`,
  `story`, `info`, `rogue`, `fotg`, `dpmatrix`, `tracker`, `achievement`.
  Treat this as a starting point, not a frozen contract — **probe the
  actual endpoints yourself** (e.g. `GET
  https://api-v2.encore.moe/api/en/character`,
  `.../en/weapon`, `.../en/echo`) and inspect the real response shape
  before writing the adapter/parser, since the exact per-resource schema
  wasn't verified as part of this doc. You
  have live network access to do this directly; do it before building
  the ingestion layer, not after.
- The `/en` segment is a locale — other language codes are likely
  supported the same way `currentLanguage` suggests; default to `en` for
  this project unless asked otherwise.
- encore.moe is a fan-run community database, not an official Kuro Games
  API. Check its terms/attribution expectations before shipping anything
  that redistributes its data at meaningful scale, and consider crediting
  it in-app (e.g. an "About / Data sources" footer).

### 8.2 Fetch-and-cache strategy (don't depend on the API being up at runtime)

The whole point of using a live API is to avoid hand-maintaining game
data — but the app itself should **not** have a hard runtime dependency
on `api-v2.encore.moe` staying up, keeping its current shape, or being
reachable from the user's browser. Build this as an explicit sync
pipeline with layered fallbacks, not a direct fetch-on-page-load:

1. **Sync step** (a script, run manually or on a schedule/CI — not part
   of the client bundle's normal runtime path): fetches
   `character`/`weapon`/`echo` (and any other needed routes) from the
   API, validates each response against a schema (e.g. Zod) before
   trusting it, maps it into this project's internal `Character` /
   `Weapon` / `Echo` / `EchoSet` types, and writes the result to a
   versioned JSON snapshot committed under something like
   `src/data/generated/`. This snapshot — not a live API call — is what
   ships with the app and is what the data layer reads by default. This
   keeps the "local-first, no runtime backend dependency" principle from
   `Agents.md` intact even though the *source* of the data is now a live
   API.
2. **Runtime cache**: additionally persist the fetched data into
   IndexedDB (the same Dexie database the rest of the app already uses)
   alongside a `fetchedAt` timestamp and a source/version tag, so the app
   can offer an in-app "Refresh game data" action that re-syncs without a
   rebuild/redeploy.
3. **Fallback order** when the app needs game data at runtime: (a) the
   IndexedDB cache if present and reasonably fresh, else (b) the bundled
   generated JSON snapshot shipped with the app, else, only if the user
   explicitly triggers a refresh, (c) a live call to the API — and if
   that live call fails (network error, non-2xx, schema-validation
   failure), fall back to (a)/(b) and surface a non-blocking warning
   rather than breaking the page. The API being down or reshaped should
   degrade to "data might be a patch behind," never to a broken app.
4. **Validate, don't trust blindly**: schema-validate every API response
   before it touches the domain layer. Third-party APIs can change shape
   without notice; a silently-wrong field (e.g. a substat value parsed
   into the wrong stat) is worse than a visible sync failure. Log/flag
   validation failures per-record so one bad character entry doesn't
   block the whole sync.
5. **Be a polite client**: cache aggressively client-side, don't refetch
   on every page load, and don't hammer the API in a loop — a manual
   refresh action plus an optional periodic (e.g. daily) background sync
   is enough for a game that patches roughly every 6 weeks.

### 8.3 Secondary/cross-check sources

- **Community scrapers** such as `scrape_balls_cli` on GitHub, which pull
  structured build data (recommended weapon, Sonata set, main stats,
  substat priority, endgame stat targets) from sites like Prydwen.gg —
  useful for cross-checking encore.moe data or as a one-time seed if a
  given field is missing from the API.
- **Local export tools** such as `WuWa_Inventory_Kamera`, which scan a
  player's own game window and emit a JSON file of that player's actual
  characters/echoes/weapons — worth studying its JSON shape even before
  building an import feature, since matching a well-established schema
  makes future import/export interoperate with the wider community
  toolset.
- Whatever source you use, treat it as an input to the data layer, not as
  something to bake into the domain/optimizer layers — the whole point of
  the data-layer separation is that patch updates should mean "re-run the
  sync step," never "touch calculation code."

Confirm licensing/terms-of-use for any third-party data source before
shipping something that redistributes its content.

import type { Attribute, DamageType, StatKey } from './schema.ts';

/**
 * Data layer: encore.moe response adapter.
 *
 * Pure parsing/normalization helpers shared by the offline sync script.
 * Every helper is strict — unparseable input throws a descriptive error so
 * the sync step fails visibly instead of writing silently-wrong data
 * (reference doc §8.2). Prose that cannot be structured honestly returns
 * `null` so the caller can fall back to a `custom` effect with the raw text.
 */

/** Round to 6 decimals — keeps /100 division noise out of snapshots. */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** "19.04%" -> 0.1904. Rejects placeholders like "{0}" and bare numbers. */
export function parsePercentText(text: string): number {
  const match = /^\s*([\d.]+)\s*%\s*$/.exec(text);
  if (!match) throw new Error(`not a percent value: ${JSON.stringify(text)}`);
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    throw new Error(`not a percent value: ${JSON.stringify(text)}`);
  }
  return round6(value / 100);
}

/**
 * Motion-value expression -> ratio + flat parts + hit count.
 * Terms are `P%[*N]` (ratio of the scaling stat) or `F[*N]` (flat addition),
 * joined by `+`:
 * - "71.88%*2+215.64%" -> { ratio: 3.594, flat: 0, hits: 3 }
 * - "500+11.33%" (healer formula) -> { ratio: 0.1133, flat: 500, hits: 1 }
 */
export function parseMotionText(text: string): { ratio: number; flat: number; hits: number } {
  const terms = text.split('+').map((t) => t.trim());
  if (terms.length === 0 || terms.some((t) => t === '')) {
    throw new Error(`not a motion value: ${JSON.stringify(text)}`);
  }
  let ratio = 0;
  let flat = 0;
  let hits = 0;
  let hasBareTerm = false;
  for (const term of terms) {
    const match = /^([\d.]+)(%)?(?:\*(\d+))?$/.exec(term);
    if (!match) throw new Error(`not a motion value: ${JSON.stringify(text)}`);
    const amount = Number(match[1]);
    const termHits = match[3] === undefined ? 1 : Number(match[3]);
    if (!Number.isFinite(amount) || !Number.isInteger(termHits) || termHits < 1) {
      throw new Error(`not a motion value: ${JSON.stringify(text)}`);
    }
    if (match[2] === '%') ratio += (amount / 100) * termHits;
    else flat += amount * termHits;
    // Suffixed terms are repeated instances; bare terms jointly form one.
    if (match[3] === undefined) hasBareTerm = true;
    else hits += termHits;
  }
  if (hasBareTerm) hits += 1;
  return { ratio: round6(ratio), flat, hits };
}

/**
 * Whether a skill attribute is a scaling component (damage/healing) as
 * opposed to rotation metadata (cooldowns, stamina costs, concerto regen,
 * durations). Only scaling components become motion values.
 */
export function isScalingAttribute(attributeName: string): boolean {
  return /dmg|damage|healing/i.test(attributeName);
}

/** Strip provider markup ("<span …>12%</span>" -> "12%"). */
export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Verdant Summit" -> "verdant-summit". */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug === '') throw new Error(`cannot slugify: ${JSON.stringify(name)}`);
  return slug;
}

const ATTRIBUTE_NAMES: readonly string[] = [
  'Glacio',
  'Fusion',
  'Electro',
  'Aero',
  'Spectro',
  'Havoc',
];

/** Validate an API element name against the canonical Attribute union. */
export function parseAttribute(name: string): Attribute {
  const found = ATTRIBUTE_NAMES.find((a) => a === name);
  if (found === undefined) throw new Error(`unknown attribute: ${JSON.stringify(name)}`);
  return found as Attribute;
}

const SKILL_KINDS: Record<string, DamageType | 'forte' | 'tunebreak'> = {
  'Normal Attack': 'basic',
  'Resonance Skill': 'skill',
  'Resonance Liberation': 'liberation',
  'Intro Skill': 'intro',
  'Outro Skill': 'outro',
  'Forte Circuit': 'forte',
  'Tune Break': 'tunebreak',
};

/**
 * API skill type -> optimizer skill kind.
 * Returns null for Inherent Skill passives only (skipped by sync, counted,
 * but captured as inherentSkills prose). Tune Break maps to `tunebreak`.
 */
export function skillKindFromType(skillType: string): DamageType | 'forte' | 'tunebreak' | null {
  return SKILL_KINDS[skillType] ?? null;
}

/**
 * Provider per-hit `DamageList[].Type` -> optimizer bonus bucket.
 * This is the "corresponding Type Bonus" from the Fandom wiki Damage page
 * ("On hit, the attack will use its corresponding Type Bonus") — NOT the
 * parent SkillType. Verified examples: Luuk Herssen's Liberation hits are
 * typed `Basic Attack`; Jiyan's Liberation hits are typed `Heavy Attack`;
 * Brant's Returned from Ashes is `Basic Attack` DMG; Aalto's Mist Bullets
 * are `Resonance Skill` DMG.
 * Returns null for unknown types (caller falls back loudly, never guesses).
 */
export function bonusKindFromDamageType(type: string): DamageType | 'forte' | null {
  switch (type.trim()) {
    case 'Basic Attack':
      return 'basic';
    case 'Heavy Attack':
      return 'heavy';
    case 'Resonance Skill':
      return 'skill';
    case 'Resonance Liberation':
      return 'liberation';
    case 'Intro Skill':
      return 'intro';
    case 'Outro Skill':
      return 'outro';
    case 'Echo Skill':
      return 'echo';
    case 'Forte Circuit':
      return 'forte';
    default:
      return null;
  }
}

/** True for healing motions (scores 0 damage, never scales an objective). */
export function isHealingAttribute(attributeName: string): boolean {
  return /healing/i.test(attributeName);
}

/** Provider `DamageList[].PropertyName` -> scaling stat. Null for mechanics (Energy Regen, shields). */
export function scalingFromPropertyName(name: string): 'ATK' | 'HP' | 'DEF' | null {
  return name === 'ATK' || name === 'HP' || name === 'DEF' ? name : null;
}

export interface DamageScalingEntry {
  propertyName: string;
  /** Level-1 rate text, e.g. "43.36%" (used for motion<->hit matching). */
  rateLevelOne: string;
}

/**
 * Resolve one motion's scaling stat from the skill's DamageList entries.
 * Only ATK/HP/DEF entries participate — other PropertyNames (Energy Regen,
 * shield/stamina mechanics) never describe a scored motion. Unanimous or
 * empty entries use the skill fallback; mixed entries match per-motion by
 * level-1 rates (same scheme as resolveMotionBonusKind), else majority wins.
 */
export function resolveMotionScaling(
  levelOneText: string,
  damageEntries: DamageScalingEntry[],
  fallback: 'ATK' | 'HP' | 'DEF',
): 'ATK' | 'HP' | 'DEF' {
  const known: { scaling: 'ATK' | 'HP' | 'DEF'; rate: number | null }[] = [];
  for (const e of damageEntries) {
    const scaling = scalingFromPropertyName(e.propertyName);
    if (scaling === null) continue;
    known.push({ scaling, rate: ratePercentOf(e.rateLevelOne) });
  }
  if (known.length === 0) return fallback;
  if (new Set(known.map((k) => k.scaling)).size === 1) return known[0].scaling;

  const terms = percentTermsOf(levelOneText);
  const matched = new Set<'ATK' | 'HP' | 'DEF'>();
  for (const term of terms) {
    for (const k of known) {
      if (k.rate !== null && Math.abs(k.rate - term) < 1e-9) matched.add(k.scaling);
    }
  }
  if (matched.size === 1) return [...matched][0];

  const counts = new Map<'ATK' | 'HP' | 'DEF', number>();
  for (const k of known) counts.set(k.scaling, (counts.get(k.scaling) ?? 0) + 1);
  let best: 'ATK' | 'HP' | 'DEF' = fallback;
  let bestCount = -1;
  for (const k of known) {
    const c = counts.get(k.scaling) ?? 0;
    if (c > bestCount) {
      bestCount = c;
      best = k.scaling;
    }
  }
  return best;
}

export interface DamageListEntry {
  type: string;
  /** Level-1 rate text, e.g. "13.36%" (used for motion<->hit matching). */
  rateLevelOne: string;
}

/** Numeric percent terms in a motion's level-1 text ("13.36%*5+44.53%" -> [13.36, 44.53]). */
export function percentTermsOf(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/([\d.]+)\s*%/g)) {
    const v = Number(m[1]);
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

/** Numeric value of a "12.34%" rate string, or null when not a percent. */
export function ratePercentOf(text: string): number | null {
  const m = /^\s*([\d.]+)\s*%\s*$/.exec(text);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

/**
 * Resolve one motion's bonus bucket from the skill's DamageList entries.
 *
 * - Empty/unmapped DamageList -> parent SkillType kind (honest fallback).
 * - Unanimous Type -> that bucket for every motion of the skill.
 * - Mixed Types -> match the motion's level-1 percent terms against each
 *   entry's level-1 rate; unanimous match wins, otherwise the skill's
 *   majority-Type bucket wins. All fallbacks are deterministic; the sync
 *   caller warns whenever per-motion matching fails so mixed skills stay
 *   auditable.
 */
export function resolveMotionBonusKind(
  skillType: string,
  levelOneText: string,
  damageEntries: DamageListEntry[],
): DamageType | 'forte' {
  const kind = skillKindFromType(skillType);
  // Tune Break skills carry no bonus bucket; their motions (none expected)
  // score attribute-only, like the unknown-type fallback.
  const fallback = kind === null || kind === 'tunebreak' ? 'forte' : kind;
  const known: { kind: DamageType | 'forte'; rate: number | null }[] = [];
  for (const e of damageEntries) {
    const kind = bonusKindFromDamageType(e.type);
    if (kind === null) continue;
    known.push({ kind, rate: ratePercentOf(e.rateLevelOne) });
  }
  if (known.length === 0) return fallback;
  if (new Set(known.map((k) => k.kind)).size === 1) return known[0].kind;

  const terms = percentTermsOf(levelOneText);
  const matched = new Set<DamageType | 'forte'>();
  for (const term of terms) {
    for (const k of known) {
      if (k.rate !== null && Math.abs(k.rate - term) < 1e-9) matched.add(k.kind);
    }
  }
  if (matched.size === 1) return [...matched][0];

  // Majority-Type fallback for ambiguous motions (deterministic: first max).
  const counts = new Map<DamageType | 'forte', number>();
  for (const k of known) counts.set(k.kind, (counts.get(k.kind) ?? 0) + 1);
  let best: DamageType | 'forte' = fallback;
  let bestCount = -1;
  for (const k of known) {
    const c = counts.get(k.kind) ?? 0;
    if (c > bestCount) {
      bestCount = c;
      best = k.kind;
    }
  }
  return best;
}

/**
 * API property name -> StatKey. Percent-formatted values map to the ratio
 * variant (the API names Cosmic Ripples' ATK% secondary just "ATK", so the
 * value format disambiguates). Returns null when unmapped.
 */
export function statKeyFromPropertyName(
  name: string,
  isPercent: boolean,
): StatKey | null {
  switch (name) {
    case 'ATK':
      return isPercent ? 'atkPct' : 'atk';
    case 'HP':
      return isPercent ? 'hpPct' : 'hp';
    case 'DEF':
      return isPercent ? 'defPct' : 'def';
    case 'Crit. Rate':
      return 'critRate';
    case 'Crit. DMG':
      return 'critDmg';
    case 'Energy Regen':
      return 'energyRegen';
    case 'Healing Bonus':
      return 'healingBonus';
    default:
      return null;
  }
}

/**
 * Forte-tree node title -> StatKey. Strict allowlist: node describes carry
 * the "%" sign for ratio nodes, so every mapped key is a ratio stat.
 * Covers three provider naming families ("ATK+", "HP Up", "Aero DMG Bonus+"
 * — all verified percent-style in their describes). Returns null when
 * unmapped (caller warns and skips).
 */
export function statKeyFromForteTitle(title: string): StatKey | null {
  const plus: Record<string, StatKey> = {
    'ATK+': 'atkPct',
    'HP+': 'hpPct',
    'DEF+': 'defPct',
    'Crit. Rate+': 'critRate',
    'Crit. DMG+': 'critDmg',
    'Healing Bonus+': 'healingBonus',
    'Energy Regen+': 'energyRegen',
    'ATK Up': 'atkPct',
    'HP Up': 'hpPct',
    'DEF Up': 'defPct',
    'Crit. Rate Up': 'critRate',
    'Crit. DMG Up': 'critDmg',
    'Healing Bonus Up': 'healingBonus',
    'Energy Regen Up': 'energyRegen',
  };
  if (title in plus) return plus[title];
  const element = /^(Glacio|Fusion|Electro|Aero|Spectro|Havoc) DMG Bonus\+$/.exec(title);
  if (element) return `dmgBonus:${element[1] as Attribute}`;
  return null;
}

const BONUS_TYPE_NAMES: Record<string, DamageType> = {
  'Basic Attack': 'basic',
  'Heavy Attack': 'heavy',
  'Resonance Skill': 'skill',
  'Resonance Liberation': 'liberation',
  'Intro Skill': 'intro',
  'Outro Skill': 'outro',
};

/**
 * Simple "<Stat> +<N>%" bonus line (Sonata 2pc) -> structured effect.
 * Handles "ATK +10%", "Aero DMG + 10%.", "Resonance Skill DMG + 10%".
 * Returns null for templated ("Energy Regen + {0}.") or conditional text —
 * the caller keeps those as `custom` with the raw description.
 */
export function statEffectFromBonusLine(
  line: string,
): { stat: StatKey; value: number } | null {
  const match = /^\s*([A-Za-z. ]+?)\s*\+\s*([\d.]+)\s*%\s*\.?\s*$/.exec(line);
  if (!match) return null;
  const name = match[1].trim();
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;

  const element = /^(Glacio|Fusion|Electro|Aero|Spectro|Havoc) DMG$/.exec(name);
  if (element) return { stat: `dmgBonus:${element[1] as Attribute}`, value: round6(value / 100) };

  const bucket = /^(Basic Attack|Heavy Attack|Resonance Skill|Resonance Liberation|Intro Skill|Outro Skill) DMG$/.exec(name);
  if (bucket) {
    return { stat: `dmgBonus:${BONUS_TYPE_NAMES[bucket[1]]}`, value: round6(value / 100) };
  }

  const flat: Record<string, StatKey> = {
    ATK: 'atkPct',
    HP: 'hpPct',
    DEF: 'defPct',
    'Crit. Rate': 'critRate',
    'Crit. DMG': 'critDmg',
    'Energy Regen': 'energyRegen',
    'Healing Bonus': 'healingBonus',
  };
  const stat = flat[name];
  if (stat === undefined) return null;
  return { stat, value: round6(value / 100) };
}

/**
 * Handbook `Intensity` -> echo Cost. Verified against populated records:
 * Common = 1-cost, Elite = 3-cost, Overlord/Calamity = 4-cost.
 * Returns null for empty/missing/unknown intensities (newer records and all
 * PhantomType-2 variants carry no Handbook data) — the caller skips those
 * records with a reason instead of guessing a cost.
 */
export function echoCostFromIntensity(intensity: string): 1 | 3 | 4 | null {
  switch (intensity) {
    case 'Common Class':
      return 1;
    case 'Elite Class':
      return 3;
    case 'Overlord Class':
    case 'Calamity Class':
      return 4;
    default:
      return null;
  }
}

/**
 * Expected-exclusion check for echo list names. Returns a skip reason when
 * the entry must not enter the snapshot, `null` when it should sync
 * normally:
 * - `Phantom: ...` entries are shiny cosmetic variants of a regular echo,
 *   not separately farmable echoes — including them would duplicate the
 *   base echo in the optimizer's pool.
 * - `MonsterInfo_<id>_Name` entries are stay-tuned/unreleased echoes whose
 *   only name is an unlocalized string key (no Handbook data, so they would
 *   otherwise slip in via the Rarity-fallback cost) — not obtainable
 *   in-game yet.
 */
export function echoSkipReasonForName(name: string): string | null {
  if (name.startsWith('Phantom:')) {
    return 'phantom shiny variant (same echo as the non-Phantom record)';
  }
  if (/^MonsterInfo_\d+_Name$/.test(name)) {
    return 'unreleased echo (unlocalized placeholder name)';
  }
  return null;
}

/**
 * Detail-record `Rarity` -> echo Cost, mirroring wuwaCalcu's
 * COST_FROM_RARITY table. Cross-checked during sync against every
 * Handbook-derived cost (Hooscamp Rarity 0 = 1-cost, Hoochief Rarity 1 =
 * 3-cost); mismatches keep the Handbook value and warn loudly.
 * Rarity 3 = 4-cost (Calamity/Reminiscence class): verified against the
 * 2026-09-12 provider detail records for Reminiscence: Fleurdelys,
 * Threnodian - Leviathan, Denia, and Threnodian - Voidborne Construct
 * (all Rarity 3, no Handbook data), which share MainProp.RandGroupId 501
 * with the Rarity-2 4-cost echo Reminiscence: Fenrico, while the 3-cost
 * Reminiscence: Kronaclaw (Rarity 1) uses RandGroupId 502. The sync also
 * cross-checks RandGroupId against the resolved cost and warns loudly.
 * Rarity 4+ has no verified mapping — returns null so the caller skips
 * instead of guessing.
 */
export function echoCostFromRarity(rarity: number): 1 | 3 | 4 | null {
  switch (rarity) {
    case 0:
      return 1;
    case 1:
      return 3;
    case 2:
      return 4;
    case 3:
      return 4;
    default:
      return null;
  }
}

/**
 * Handbook main-stat pool token (bracket content of `Descrtption1`) ->
 * candidate StatKeys. `[Element] DMG Bonus`, Crit, Energy Regen and Healing
 * Bonus map 1:1; bare ATK/HP/DEF map to BOTH flat and percent variants
 * because the pool text does not distinguish them (e.g. a 4-cost's ATK%
 * main vs a 1-cost's flat ATK).
 * Returns null for unknown tokens. Kept as a tested parser only — the sync
 * writes cost-tier pools instead of parsing Handbook text.
 */
export function statKeysFromMainStatToken(token: string): StatKey[] | null {
  switch (token) {
    case 'ATK':
      return ['atk', 'atkPct'];
    case 'HP':
      return ['hp', 'hpPct'];
    case 'DEF':
      return ['def', 'defPct'];
    case 'Crit. Rate':
      return ['critRate'];
    case 'Crit. DMG':
      return ['critDmg'];
    case 'Energy Regen':
      return ['energyRegen'];
    case 'Healing Bonus':
      return ['healingBonus'];
    case 'Tune Break Boost':
      return ['tuneBreakBoost'];
    default: {
      const element = /^(Glacio|Fusion|Electro|Aero|Spectro|Havoc) DMG Bonus$/.exec(token);
      if (element) return [`dmgBonus:${element[1] as Attribute}`];
      // 'Physical DMG Bonus' is intentionally unmapped: the game has no
      // Physical element, so no such stat exists.
      return null;
    }
  }
}

import type { Attribute } from '../data/schema.ts';

/**
 * Domain layer: shared Negative Status model (reference: Fandom wiki
 * Negative Status page — Base DMG = Level Multiplier × 1.25078 × Stack
 * Multiplier; per-status behavior below paraphrases that page).
 *
 * Per-character kit mechanics (who applies/consumes what, chain
 * extensions beyond the entries in STATUS_CAP_BONUSES) live in
 * per-character modules (`cartethyia.ts`, `zani.ts`, …), never here.
 */

export const NEGATIVE_STATUSES = [
  'aeroErosion',
  'spectroFrazzle',
  'havocBane',
  'fusionBurst',
  'electroFlare',
  'glacioChafe',
] as const;

export type NegativeStatusType = (typeof NEGATIVE_STATUSES)[number];

export interface NegativeStatusDef {
  type: NegativeStatusType;
  label: string;
  /** Element used for the target-resistance term of status detonations. */
  element: Attribute;
  /** Base stack cap before character-specific extensions. */
  defaultMaxStacks: number;
  /**
   * Stack → damage multiplier, 1-indexed by position (index 0 = 1 stack).
   * `null` means no published table exists, so detonations cannot be
   * modeled honestly — callers must throw instead of guessing.
   */
  stackMultipliers: readonly number[] | null;
  /** Whether the status itself deals damage (Havoc Bane does not). */
  dealsDamage: boolean;
}

const STATUS_DEFS: Record<NegativeStatusType, NegativeStatusDef> = {
  aeroErosion: {
    type: 'aeroErosion',
    label: 'Aero Erosion',
    element: 'Aero',
    defaultMaxStacks: 6,
    // Wiki Stack Multiplier column (1–6). Periodic Aero DoT; stacks decay
    // on their own timer rather than per detonation.
    stackMultipliers: [0.36, 0.899, 1.799, 2.698, 3.597, 4.497],
    dealsDamage: true,
  },
  spectroFrazzle: {
    type: 'spectroFrazzle',
    label: 'Spectro Frazzle',
    element: 'Spectro',
    defaultMaxStacks: 10,
    // Wiki Stack Multiplier column (1–10). Periodic Spectro DoT that
    // removes 1 stack per damage instance.
    stackMultipliers: [0.24, 0.4355, 0.6298, 0.8251, 1.02, 1.216, 1.409, 1.605, 1.8, 1.995],
    dealsDamage: true,
  },
  havocBane: {
    type: 'havocBane',
    label: 'Havoc Bane',
    element: 'Havoc',
    defaultMaxStacks: 3,
    // No damage — a DEF shred debuff. Detonation blocks for Havoc Bane
    // are a modeling error; use havocBaneDefReduction instead.
    stackMultipliers: null,
    dealsDamage: false,
  },
  fusionBurst: {
    type: 'fusionBurst',
    label: 'Fusion Burst',
    element: 'Fusion',
    defaultMaxStacks: 10,
    // No DoT: at max stacks every stack detonates in one Fusion explosion.
    // Phase 0 spike G1 found no published stack-multiplier table, so this
    // stays null until one is verified — never extrapolated.
    stackMultipliers: null,
    dealsDamage: true,
  },
  electroFlare: {
    type: 'electroFlare',
    label: 'Electro Flare',
    element: 'Electro',
    defaultMaxStacks: 10,
    // Periodic Electro DoT that loses half its stacks per instance, with
    // overflow converting to Electro Rage. Phase 0 spike G1 found no
    // published stack-multiplier table (one unverified community linear
    // fit exists — deliberately not encoded), so this stays null.
    stackMultipliers: null,
    dealsDamage: true,
  },
  glacioChafe: {
    type: 'glacioChafe',
    label: 'Glacio Chafe',
    element: 'Glacio',
    defaultMaxStacks: 10,
    // Damage on each inflict plus a move-speed slow; max stacks freeze
    // the target and clear. Phase 0 spike G1 found no published
    // stack-multiplier table, so this stays null.
    stackMultipliers: null,
    dealsDamage: true,
  },
};

export function negativeStatusDef(status: NegativeStatusType): NegativeStatusDef {
  return STATUS_DEFS[status];
}

/** Damage multiplier for a detonation at the given stack count. */
export function statusStackMultiplier(status: NegativeStatusType, stacks: number): number {
  const def = STATUS_DEFS[status];
  if (!def.dealsDamage) {
    throw new Error(`${def.label} deals no damage — model it as enemy DEF reduction, not a detonation`);
  }
  if (def.stackMultipliers === null) {
    throw new Error(`${def.label} has no published stack-multiplier table — refusing to guess one`);
  }
  if (!Number.isInteger(stacks) || stacks < 1 || stacks > def.stackMultipliers.length) {
    throw new Error(
      `${def.label} stacks must be an integer from 1 to ${def.stackMultipliers.length}, got ${stacks}`,
    );
  }
  return def.stackMultipliers[stacks - 1];
}

interface StatusCapBonus {
  status: NegativeStatusType;
  /** Minimum resonance chain rank that grants the bonus. */
  minChain: number;
  bonusStacks: number;
}

/**
 * Character-specific stack-cap extensions, each cited to inspected kit
 * prose. Cartethyia S2 ("increases the max stack limit of Aero Erosion
 * … by 3 stacks", encore.moe character 1409). Yangyang: Xuanling S3
 * ("increase the maximum Havoc Bane stacks on targets … by 3",
 * committed snapshot chain text).
 */
const STATUS_CAP_BONUSES: Record<string, StatusCapBonus[]> = {
  cartethyia: [{ status: 'aeroErosion', minChain: 2, bonusStacks: 3 }],
  'yangyang-xuanling': [{ status: 'havocBane', minChain: 3, bonusStacks: 3 }],
};

/** Effective stack cap for a status, including chain extensions. */
export function maxStatusStacks(
  status: NegativeStatusType,
  characterId?: string,
  resonanceChain = 0,
): number {
  const def = STATUS_DEFS[status];
  const bonus = (characterId !== undefined ? (STATUS_CAP_BONUSES[characterId] ?? []) : [])
    .filter((b) => b.status === status && resonanceChain >= b.minChain)
    .reduce((sum, b) => sum + b.bonusStacks, 0);
  return def.defaultMaxStacks + bonus;
}

/**
 * Havoc Bane DEF reduction as a ratio of enemy DEF removed. Each stack
 * removes 2% (wiki Havoc Bane entry; corroborated by an independent
 * community simulator's `stacks * 0.02`). Additive across stacks.
 */
export function havocBaneDefReduction(stacks: number): number {
  if (!Number.isInteger(stacks) || stacks < 0) {
    throw new Error(`Havoc Bane stacks must be a non-negative integer, got ${stacks}`);
  }
  return stacks * 0.02;
}

/**
 * Negative Status level multipliers (wiki Level Multiplier table).
 * Anchors below level 10 are an assumption pinned by test — the wiki's
 * lowest known point is 10 → 16; attacker levels under 10 ramp from 0.
 */
const NEGATIVE_STATUS_LEVEL_MULTIPLIERS: readonly [number, number][] = [
  [1, 0],
  [10, 16],
  [50, 229],
  [80, 2005],
  [90, 3674],
];

/** Resolve the status level curve without treating status damage as a skill MV. */
export function negativeStatusLevelMultiplier(level: number): number {
  if (!Number.isFinite(level) || level < 1) {
    throw new Error(`attacker level must be at least 1, got ${level}`);
  }
  const clamped = Math.min(90, level);
  for (let i = 1; i < NEGATIVE_STATUS_LEVEL_MULTIPLIERS.length; i += 1) {
    const [lowerLevel, lowerValue] = NEGATIVE_STATUS_LEVEL_MULTIPLIERS[i - 1];
    const [upperLevel, upperValue] = NEGATIVE_STATUS_LEVEL_MULTIPLIERS[i];
    if (clamped <= upperLevel) {
      const fraction = (clamped - lowerLevel) / (upperLevel - lowerLevel);
      return lowerValue + (upperValue - lowerValue) * fraction;
    }
  }
  return NEGATIVE_STATUS_LEVEL_MULTIPLIERS.at(-1)![1];
}

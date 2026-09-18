import type { StatKey } from './schema.ts';

/**
 * Echo stat pools by cost tier.
 *
 * Pools are cost-determined, never per-Echo: encore.moe's per-Echo Handbook
 * pool text is unreliable (wrong Handbook names, a single own-element bonus
 * where the game allows any element), so the sync writes these tier pools
 * verbatim onto every Echo def of that cost. Primary pools below are
 * transcribed from docs/echostats.md §1; the substat pool from §2.
 *
 * TODO: cross-check against a live source on the next sync pass — the
 * 1-cost flats and the fixed flat-ATK secondary on 3/4-cost Echoes follow
 * the mechanics reference (docs/WUWA_GAME_REFERENCE.md §2), not the guide.
 */

/** Main-stat pool per Echo cost tier (docs/echostats.md §1). */
export const MAIN_STAT_POOLS: Record<1 | 3 | 4, { primary: StatKey[]; secondary: StatKey | null }> = {
  // 1-cost: small pool — flats plus HP%/ATK%/DEF%; no Crit, ER, or elementals.
  1: {
    primary: ['hp', 'atk', 'def', 'hpPct', 'atkPct', 'defPct'],
    secondary: null,
  },
  // 3-cost: % stats + Energy Regen + all six elementals, plus fixed flat-ATK secondary.
  3: {
    primary: [
      'hpPct',
      'atkPct',
      'defPct',
      'energyRegen',
      'dmgBonus:Glacio',
      'dmgBonus:Fusion',
      'dmgBonus:Electro',
      'dmgBonus:Aero',
      'dmgBonus:Spectro',
      'dmgBonus:Havoc',
    ],
    secondary: 'atk',
  },
  // 4-cost: % stats + Crit Rate / Crit DMG / Healing Bonus, plus fixed flat-ATK secondary.
  4: {
    primary: [
      'hpPct',
      'atkPct',
      'defPct',
      'critRate',
      'critDmg',
      'healingBonus',
    ],
    secondary: 'atk',
  },
};

/** Shared substat pool (docs/echostats.md §2) — fixed per Echo once rolled. */
export const SUBSTAT_POOL: StatKey[] = [
  'hp',
  'hpPct',
  'atk',
  'atkPct',
  'def',
  'defPct',
  'critRate',
  'critDmg',
  'energyRegen',
  'dmgBonus:basic',
  'dmgBonus:heavy',
  'dmgBonus:skill',
  'dmgBonus:liberation',
];

/** Valid team cost budgets: 10 default, 12 via Data Bank (reference doc §2). */
export const COST_BUDGETS = [10, 12] as const;

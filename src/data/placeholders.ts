import type { StatKey } from './schema.ts';

/**
 * Explicitly-unverified Echo tables.
 *
 * encore.moe `/echo` carries no Cost and no main-stat pools, and no second
 * source has been wired up yet — so per-Echo costs and the exact main-stat
 * pools below come from the mechanics reference (docs/WUWA_GAME_REFERENCE.md
 * §2: pool shape per cost tier), NOT from a live dataset.
 *
 * TODO: verify each table against a live source (echo detail endpoint or a
 * community dataset) and move the verified result into the sync pipeline.
 * Nothing here may be presented to users as sourced game data.
 */

/** Main-stat pool shape per Echo cost tier (reference doc §2). */
export const MAIN_STAT_POOLS: Record<1 | 3 | 4, { primary: StatKey[]; secondary: StatKey | null }> = {
  // 1-cost: small pool, flat stats only — no Crit stats.
  1: {
    primary: ['hp', 'atk', 'def', 'hpPct', 'atkPct', 'defPct'],
    secondary: null,
  },
  // 3-cost: adds attribute DMG bonus + Energy Regen, plus fixed flat-ATK secondary.
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
  // 4-cost: widest pool incl. Crit Rate / Crit DMG / Healing Bonus, plus fixed flat-ATK secondary.
  4: {
    primary: [
      'hpPct',
      'atkPct',
      'defPct',
      'critRate',
      'critDmg',
      'healingBonus',
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
};

/** Shared substat pool (reference doc §2) — fixed per Echo once rolled. */
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
];

/** Valid team cost budgets: 10 default, 12 via Data Bank (reference doc §2). */
export const COST_BUDGETS = [10, 12] as const;

import type { StatKey } from './schema.ts';

/**
 * Echo stat reference tables, transcribed from `wuwaCalcu/echostats.md`
 * (5-star, max-level reference values). Used to bound the inventory form's
 * sliders — never for damage math, which only reads stored echo rows.
 *
 * Coverage is intentionally partial: pairs the reference does not list
 * (fixed secondaries, `dmgBonus:coordinated`, …) fall back to free numeric
 * input in the form. Ratios are decimals, flats are raw.
 */

export interface StatRange {
  min: number;
  max: number;
}

/** Main-stat slider bounds per echo cost. 5★ Lv25 reference — captioned as such in the UI. */
export const MAIN_STAT_RANGES: Record<1 | 3 | 4, Partial<Record<StatKey, StatRange>>> = {
  1: {
    hpPct: { min: 0.045, max: 0.228 },
    atkPct: { min: 0.036, max: 0.18 },
    defPct: { min: 0.036, max: 0.18 },
  },
  3: {
    hpPct: { min: 0.06, max: 0.3 },
    atkPct: { min: 0.06, max: 0.3 },
    defPct: { min: 0.076, max: 0.38 },
    'dmgBonus:Glacio': { min: 0.06, max: 0.3 },
    'dmgBonus:Fusion': { min: 0.06, max: 0.3 },
    'dmgBonus:Electro': { min: 0.06, max: 0.3 },
    'dmgBonus:Aero': { min: 0.06, max: 0.3 },
    'dmgBonus:Spectro': { min: 0.06, max: 0.3 },
    'dmgBonus:Havoc': { min: 0.06, max: 0.3 },
    energyRegen: { min: 0.064, max: 0.32 },
  },
  4: {
    hpPct: { min: 0.066, max: 0.33 },
    atkPct: { min: 0.066, max: 0.33 },
    defPct: { min: 0.083, max: 0.415 },
    critRate: { min: 0.044, max: 0.22 },
    critDmg: { min: 0.088, max: 0.44 },
    healingBonus: { min: 0.052, max: 0.26 },
  },
};

/**
 * Substat discrete roll tiers (level-independent — rolled values, not
 * scaled). The form snaps to these exact values. Stats without tiers
 * (healingBonus, action-bucket bonuses outside the shared pool) keep free
 * numeric input.
 */
export const SUB_STAT_TIERS: Partial<Record<StatKey, readonly number[]>> = {
  atkPct: [0.064, 0.071, 0.079, 0.086, 0.094, 0.101, 0.109, 0.116],
  hpPct: [0.064, 0.071, 0.079, 0.086, 0.094, 0.101, 0.109, 0.116],
  'dmgBonus:basic': [0.064, 0.071, 0.079, 0.086, 0.094, 0.101, 0.109, 0.116],
  'dmgBonus:heavy': [0.064, 0.071, 0.079, 0.086, 0.094, 0.101, 0.109, 0.116],
  'dmgBonus:skill': [0.064, 0.071, 0.079, 0.086, 0.094, 0.101, 0.109, 0.116],
  'dmgBonus:liberation': [0.064, 0.071, 0.079, 0.086, 0.094, 0.101, 0.109, 0.116],
  defPct: [0.081, 0.09, 0.1, 0.109, 0.118, 0.128, 0.138, 0.147],
  energyRegen: [0.068, 0.076, 0.084, 0.092, 0.1, 0.108, 0.116, 0.124],
  critRate: [0.063, 0.069, 0.075, 0.081, 0.087, 0.093, 0.099, 0.105],
  critDmg: [0.126, 0.138, 0.15, 0.162, 0.174, 0.186, 0.198, 0.21],
  hp: [320, 360, 390, 430, 470, 510, 540, 580],
  atk: [30, 40, 50, 60],
  def: [40, 50, 60, 70],
};

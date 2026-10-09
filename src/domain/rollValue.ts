import { SUB_STAT_TIERS } from '../data/echoStats.ts';
import type { StatKey } from '../data/schema.ts';

/**
 * Substat roll quality. Pure and unweighted: it ranks a rolled value inside
 * the stat's discrete tier table (`SUB_STAT_TIERS`) and says nothing about
 * how useful that stat is for a particular character.
 */

export interface SubstatRoll {
  /** 1-based tier the value snaps to (1 = lowest roll). */
  tier: number;
  /** How many tiers this stat has. */
  tiers: number;
}

/**
 * Snap `value` to the nearest tier of `stat` (ties go to the lower tier).
 * Null for stats without a tier table (e.g. healingBonus).
 */
export function substatRoll(stat: StatKey, value: number): SubstatRoll | null {
  const table = SUB_STAT_TIERS[stat];
  if (table === undefined || table.length === 0) return null;
  let best = 0;
  for (let i = 1; i < table.length; i++) {
    if (Math.abs(table[i] - value) < Math.abs(table[best] - value)) best = i;
  }
  return { tier: best + 1, tiers: table.length };
}

/** Number of blocks on the 4-block tier meter: ceil(tier / tiers * 4), 1..4. Null if untiered. */
export function substatTierBlocks(stat: StatKey, value: number): number | null {
  const roll = substatRoll(stat, value);
  return roll === null ? null : Math.ceil((roll.tier / roll.tiers) * 4);
}

/**
 * Roll value of an Echo, 0..100: the mean of `tier / tiers` over its tiered
 * substats, ×100. Untiered substats are ignored; null when none are tiered.
 */
export function echoRollValue(substats: readonly { stat: StatKey; value: number }[]): number | null {
  let sum = 0;
  let count = 0;
  for (const sub of substats) {
    const roll = substatRoll(sub.stat, sub.value);
    if (roll === null) continue;
    sum += roll.tier / roll.tiers;
    count += 1;
  }
  return count === 0 ? null : (sum / count) * 100;
}

/** Filled blocks (0..10) on the 10-block roll-value meter: round(score / 10). */
export function rollValueBlocks(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score / 10)));
}

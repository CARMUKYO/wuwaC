import type { CharacterSkill } from '../data/schema.ts';

/**
 * Domain layer: Zani kit mechanics (Spectro Frazzle DPS).
 *
 * Sources: snapshot character 1507 skill/chain prose (Forte "There Will
 * Be A Light", Liberation "Between Dawn and Dusk") plus the live
 * Nightfall per-Blaze table below. Stacking convention: separately
 * worded multiplier increases compose multiplicatively (base per-Blaze
 * × S6 flat × S6 per-Blaze), matching the module's established reading.
 */

export const ZANI_STATUS = 'spectroFrazzle' as const;

/** Blaze bounds from the Forte text (100 base, 150 in Inferno Mode). */
export const ZANI_MAX_BLAZES = 150;

/** Nightfall consumes at most 40 Blazes on hit (Forte text). */
export const ZANI_MAX_NIGHTFALL_BLAZES = 40;

/**
 * Base-kit Nightfall "Additional Multiplier Per Blaze" by Forte level
 * (index 0 = level 1). The provider prose states the mechanic but no
 * rate; values from https://Wuthering.wiki/character_1507.html (Forte
 * table, Lv 1–10, inspected 2026-09-18), Lv1 corroborated by
 * https://wutheringwaves-builds.com/character/zani/ (5.00%). The same
 * table's Nightfall DMG column sums to the snapshot motion values
 * exactly (Lv10: 135.20% + 262.43% = 397.63% = snapshot 3.9763),
 * confirming the table tracks the shipped kit.
 */
export const ZANI_NIGHTFALL_PER_BLAZE: readonly number[] = [
  0.05, 0.0541, 0.0582, 0.064, 0.0681, 0.0728, 0.0794, 0.0859, 0.0925, 0.0995,
];

export interface ZaniModInputs {
  /** Cumulative Blazes consumed — S3 scales The Last Stand off it. */
  blazesConsumed?: number;
  /** Blazes consumed by this Nightfall hit — base kit and S6 scale off it. */
  nightfallBlazes?: number;
  /** Forte level selecting the per-Blaze rate (default 10, chisa.ts convention). */
  forteLevel?: number;
}

/**
 * Multiplicative motion modifier for Zani's sequence nodes:
 * - Base kit: Nightfall MV +per-Blaze rate (forte-level table above) per
 *   Blaze consumed on hit (up to 40).
 * - S2: Targeted Action / Forcible Riposte MV +80%.
 * - S3: The Last Stand MV +8% per Blaze consumed, bonus capped at +1200%
 *   (150-Blaze Inferno cap × 8% lands exactly on the stated cap).
 * - S5: Rekindle MV +120%.
 * - S6: all four Heavy Slashes MV +40%, plus Nightfall +40% per Blaze
 *   consumed on hit.
 *
 * NOT modeled (documented, not silently dropped): S1's 50% Spectro bonus
 * and S2's 20% Crit Rate (auto-applied chainPresets sheet entries), S4's
 * team ATK (chainPresets wearer-total + team preset), S6's Blaze-restore
 * and survive-fatal-blow clauses (re-synced snapshot text is now
 * complete — "remain standing with at least 1 HP" — but neither scores
 * damage; chainPresets note cites), the outro's own Heliacal-scaling
 * damage (150% + 10%/stack, no motion values — buff carrier; its 20%
 * team amp lives in the teamBuffs catalog).
 */
export function zaniMotionMultiplier(
  characterId: string | undefined,
  resonanceChain: number,
  skillKind: CharacterSkill['kind'],
  motionName: string,
  inputs: ZaniModInputs = {},
): number {
  if (characterId !== 'zani') return 1;
  let multiplier = 1;

  if (resonanceChain >= 2 && /targeted action|forcible riposte/i.test(motionName)) {
    multiplier *= 1.8;
  }
  if (
    resonanceChain >= 3 &&
    skillKind === 'liberation' &&
    /the last stand/i.test(motionName)
  ) {
    const consumed = Math.min(Math.max(inputs.blazesConsumed ?? 0, 0), ZANI_MAX_BLAZES);
    multiplier *= 1 + 0.08 * consumed;
  }
  if (resonanceChain >= 5 && /rekindle/i.test(motionName)) {
    multiplier *= 2.2;
  }
  if (/heavy slash - nightfall/i.test(motionName)) {
    const index = Math.min(
      Math.max((inputs.forteLevel ?? 10) - 1, 0),
      ZANI_NIGHTFALL_PER_BLAZE.length - 1,
    );
    const onHit = Math.min(Math.max(inputs.nightfallBlazes ?? 0, 0), ZANI_MAX_NIGHTFALL_BLAZES);
    multiplier *= 1 + ZANI_NIGHTFALL_PER_BLAZE[index] * onHit;
  }
  if (resonanceChain >= 6 && /heavy slash - (daybreak|dawning|nightfall|lightsmash)/i.test(motionName)) {
    multiplier *= 1.4;
    if (/heavy slash - nightfall/i.test(motionName)) {
      const onHit = Math.min(Math.max(inputs.nightfallBlazes ?? 0, 0), ZANI_MAX_NIGHTFALL_BLAZES);
      multiplier *= 1 + 0.4 * onHit;
    }
  }
  return multiplier;
}

/**
 * Zani's Inferno Heavy Slashes deal Spectro DMG "considered both Heavy
 * Attack DMG and Spectro Frazzle DMG" (Forte text). They score through the
 * normal ability pipeline (ATK motion values already in the snapshot);
 * this tag exists so future buff-applicability logic can treat them as
 * Frazzle damage. No math consumer yet.
 */
export function zaniMotionCountsAs(motionName: string): 'spectroFrazzle' | null {
  return /heavy slash - (daybreak|dawning|nightfall|lightsmash)/i.test(motionName)
    ? 'spectroFrazzle'
    : null;
}

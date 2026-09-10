import type { CharacterSkill } from '../data/schema.ts';

/**
 * Domain layer: Zani kit mechanics (Spectro Frazzle DPS).
 *
 * Sources: encore.moe character 1507 `SkillDescribe` prose (Forte
 * "There Will Be A Light", Liberation "Between Dawn and Dusk") and the
 * committed snapshot's resonance-chain text. Timed effects (S1's 14s
 * Spectro bonus, Blaze economy) and team buffs (S4) stay manual rotation
 * buffs or documented TODOs — see notes below.
 */

export const ZANI_STATUS = 'spectroFrazzle' as const;

/** Blaze bounds from the Forte text (100 base, 150 in Inferno Mode). */
export const ZANI_MAX_BLAZES = 150;

/** Nightfall consumes at most 40 Blazes on hit (Forte text). */
export const ZANI_MAX_NIGHTFALL_BLAZES = 40;

export interface ZaniModInputs {
  /** Cumulative Blazes consumed — S3 scales The Last Stand off it. */
  blazesConsumed?: number;
  /** Blazes consumed by this Nightfall hit — S6 scales off it. */
  nightfallBlazes?: number;
}

/**
 * Multiplicative motion modifier for Zani's sequence nodes:
 * - S2: Targeted Action / Forcible Riposte MV +80%.
 * - S3: The Last Stand MV +8% per Blaze consumed, bonus capped at +1200%
 *   (150-Blaze Inferno cap × 8% lands exactly on the stated cap).
 * - S5: Rekindle MV +120%.
 * - S6: all four Heavy Slashes MV +40%, plus Nightfall +40% per Blaze
 *   consumed on hit.
 *
 * NOT modeled (documented, not silently dropped): the base-kit's
 * per-Blaze Nightfall increase (no rate in the provider prose — TODO
 * once verified), S1's timed Spectro bonus and S2's Crit Rate (manual
 * rotation buffs), S4's team ATK (team layer), S6's truncated "Within 8s"
 * clause (TODO).
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

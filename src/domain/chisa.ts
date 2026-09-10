import type { CharacterSkill } from '../data/schema.ts';

/**
 * Domain layer: Chisa kit mechanics (Havoc Bane applier, Chainsaw DPS).
 *
 * Sources: encore.moe character 1508 `SkillDescribe` prose (Forte "Sight
 * of Unraveling - Oblivion", Liberation "Moment of Nihility") and the
 * committed snapshot's resonance-chain text.
 */

export interface ChisaModInputs {
  /** Woven Myriad - Convergence active (15s after Liberation cast). */
  wovenMyriad?: boolean;
  /** Rings of Chainsaw consumed for this Eradication hit. */
  ringsConsumed?: number;
  /** Forte level, for the per-Ring bonus motion lookup. */
  forteLevel?: number;
}

export interface ChisaSkillMods {
  motionMultiplier: number;
  /** S5 grants her Liberation +100% DMG Bonus (additive bucket). */
  dmgBonusExtra: number;
}

const SAW_MOTIONS = /sawring - blitz|chainsaw mode - dodge counter|sawring - eradication/i;

/**
 * - Liberation state and S3 each grant the Sawring trio +120% MV
 *   (×2.2), mutually stackable (×4.84 with both).
 * - Eradication additionally scales with consumed Rings: per-Ring bonus
 *   from the snapshot's "Bonus DMG Multiplier per Ring of Chainsaw"
 *   motion. COMPOSITION ASSUMPTION (flagged TODO): the +120% effects
 *   scale the ring bonus the same way they scale the base MV. The
 *   provider prose does not state the composition order.
 * - S5: her Liberation motions gain +100% DMG Bonus (additive bucket).
 *
 * NOT modeled: S1's fixed 61803 Havoc DMG on Snare application (fixed
 * damage with bonus-ignoring semantics — TODO), S1's Snare ATK +30% and
 * S2's 10% Havoc RES ignore (manual rotation buffs / no per-element
 * resPen stat — TODO), S4's 1s trigger pacing (rotation realism, user),
 * S6 Finality amplifications (manual buffs: +0.30 status amplify,
 * +0.40 attacker amplify), Thread of Bane's 18% DEF ignore (conditional
 * on Snare — manual buff).
 */
export function chisaSkillMods(
  characterId: string | undefined,
  resonanceChain: number,
  skill: CharacterSkill,
  motionName: string,
  inputs: ChisaModInputs = {},
): ChisaSkillMods {
  if (characterId !== 'chisa') return { motionMultiplier: 1, dmgBonusExtra: 0 };
  let motionMultiplier = 1;
  let dmgBonusExtra = 0;
  const sawMotion = SAW_MOTIONS.test(motionName);

  const stateMult = inputs.wovenMyriad === true ? 2.2 : 1;
  const s3Mult = resonanceChain >= 3 ? 2.2 : 1;
  if (sawMotion) motionMultiplier *= stateMult * s3Mult;

  if (/sawring - eradication/i.test(motionName)) {
    const rings = Math.max(inputs.ringsConsumed ?? 0, 0);
    if (rings > 0) {
      const perRingMotion = skill.motionValues.find((m) => /bonus dmg multiplier per ring of chainsaw/i.test(m.name));
      if (perRingMotion) {
        const index = Math.min(Math.max((inputs.forteLevel ?? 10) - 1, 0), perRingMotion.values.length - 1);
        // Composition assumption — see doc comment above.
        motionMultiplier *= 1 + perRingMotion.values[index] * rings * stateMult * s3Mult;
      }
    }
  }
  if (resonanceChain >= 5 && skill.kind === 'liberation') {
    dmgBonusExtra += 1;
  }
  return { motionMultiplier, dmgBonusExtra };
}

import type { CharacterSkill, MotionBonusKind } from '../data/schema.ts';

/**
 * Domain layer: Aemeath kit mechanics (Fusion Burst / Tune Rupture DPS).
 *
 * Sources: encore.moe character 1210 `SkillDescribe` prose (Forte "To
 * Sculpt the Silence", Liberation "Towards the Daybreak") and the
 * committed snapshot's resonance-chain text. Resonance Mode selection
 * (Tune Rupture vs Fusion Burst) is a per-rotation input — see
 * characterResonanceModes in characterMods.ts.
 */

/** Fixed crit for Aemeath S6 Tune Rupture / Fusion Burst damage (Phase 5 hook). */
export const AEMEATH_S6_FIXED_CRIT = { rate: 0.8, dmg: 2.75 } as const;

export interface AemeathSkillMods {
  motionMultiplier: number;
  /** S6: targets take 40% more Resonance Liberation DMG (bucket). */
  dmgBonusExtra: number;
}

/**
 * - S2: Seraphic Duet Overture / Encore MV +100% (×2).
 * - S3: Heavenfall Edict Finale MV +100% (×2), Overdrive +40% (×1.4).
 * - S6: her Liberation motions gain +40% Liberation DMG Bonus.
 *
 * NOT modeled: Rupturous/Fusion Trail scaling and Stardust Resonance
 * instance counts (Phase 5 Tune pipeline — needs trail inputs),
 * S1's +300% Charged Crit DMG and Inherent "Before All Sounds" +200%
 * Amplify (timed-state manual buffs), "Between the Stars" Crit DMG and
 * Finale amp (team-infraction manual buffs), Outro team amps (team
 * layer). The "Seraphic Duet Bonus DMG (Per Instance)" snapshot motion
 * is left untouched — its Tune Rupture semantics belong to Phase 5.
 */
export function aemeathSkillMods(
  characterId: string | undefined,
  resonanceChain: number,
  skill: CharacterSkill,
  motionName: string,
  motionDmgType: MotionBonusKind,
): AemeathSkillMods {
  if (characterId !== 'aemeath') return { motionMultiplier: 1, dmgBonusExtra: 0 };
  let motionMultiplier = 1;
  let dmgBonusExtra = 0;

  if (resonanceChain >= 2 && /seraphic duet: (overture|encore)/i.test(motionName)) {
    motionMultiplier *= 2;
  }
  if (resonanceChain >= 3 && /heavenfall edict: finale/i.test(motionName)) {
    motionMultiplier *= 2;
  }
  if (resonanceChain >= 3 && /heavenfall edict: overdrive/i.test(motionName)) {
    motionMultiplier *= 1.4;
  }
  // "Considered Liberation DMG" motions (Heavy Charged) count too.
  if (resonanceChain >= 6 && (skill.kind === 'liberation' || motionDmgType === 'liberation')) {
    dmgBonusExtra += 0.4;
  }
  return { motionMultiplier, dmgBonusExtra };
}

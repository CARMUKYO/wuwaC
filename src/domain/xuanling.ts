import type { CharacterSkill, MotionBonusKind } from '../data/schema.ts';

/**
 * Domain layer: Yangyang: Xuanling kit mechanics (Havoc Bane DPS).
 *
 * Sources: committed snapshot resonance-chain text (S1–S6) and motion
 * names. Havoc Bane itself deals no damage — the Bane cap extension lives
 * in the shared registry (negativeStatus.ts) and the DEF shred flows
 * through targetHavocBaneStacks; this module covers her consumption
 * multipliers.
 */

export interface XuanlingModInputs {
  /** Voice Flux active (gained 30s after inflicting Havoc Bane, S6). */
  voiceFlux?: boolean;
}

export interface XuanlingSkillMods {
  motionMultiplier: number;
  /** S3 amplifies Liberation through the Amplify term, not the MV. */
  amplifyExtra: number;
}

/**
 * - S2: the listed Heavy / Mid-air Feather Fall / Havoc-in-Bloom motions
 *   deal +100% damage (×2).
 * - S3: Liberation damage Amplified by 175% (attacker Amplify +1.75).
 * - S6: while Voice Flux is active, her Heavy Attack DMG +40% (×1.4).
 *
 * NOT modeled: S1's Shadow of Xuanling summon (337.98% ATK as Heavy —
 * no motion data in the snapshot, TODO), S4's team ATK (team layer),
 * Still as Withered Wood (effect unknown from the truncated chain text,
 * TODO).
 */
export function xuanlingSkillMods(
  characterId: string | undefined,
  resonanceChain: number,
  skillKind: CharacterSkill['kind'],
  motionName: string,
  motionDmgType: MotionBonusKind,
  inputs: XuanlingModInputs = {},
): XuanlingSkillMods {
  if (characterId !== 'yangyang-xuanling') return { motionMultiplier: 1, amplifyExtra: 0 };
  let motionMultiplier = 1;
  let amplifyExtra = 0;

  if (
    resonanceChain >= 2 &&
    (/heavy attack - (azure|feather) sword stance/i.test(motionName) ||
      /feather fall/i.test(motionName) ||
      /havoc in bloom/i.test(motionName))
  ) {
    motionMultiplier *= 2;
  }
  if (resonanceChain >= 3 && skillKind === 'liberation') {
    amplifyExtra += 1.75;
  }
  if (resonanceChain >= 6 && inputs.voiceFlux === true && motionDmgType === 'heavy') {
    motionMultiplier *= 1.4;
  }
  return { motionMultiplier, amplifyExtra };
}

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
 * Unbroken Vow (inherent skill 1005404, always on): attacker-side DMG
 * Amplify from target Havoc Bane stacks — 1–3 stacks grant +10% per stack
 * (cap 30%); 4–6 grant +12% per stack capped at 36% total, i.e. a flat
 * 0.36 (4 × 12% already exceeds the cap). Applies to all her damage, so
 * `computeDamage` adds it to the attacker-Amplify term next to S3's share.
 * Reaching 4+ stacks needs the S3 cap extension (negativeStatus.ts).
 */
export function xuanlingBaneTargetAmplify(targetHavocBaneStacks: number): number {
  if (
    !Number.isInteger(targetHavocBaneStacks) ||
    targetHavocBaneStacks < 0 ||
    targetHavocBaneStacks > 6
  ) {
    throw new Error(`target Havoc Bane stacks must be an integer from 0 to 6, got ${targetHavocBaneStacks}`);
  }
  if (targetHavocBaneStacks <= 3) return targetHavocBaneStacks * 0.1;
  return Math.min(targetHavocBaneStacks * 0.12, 0.36);
}

/**
 * - S2: the listed Heavy / Mid-air Feather Fall / Havoc-in-Bloom motions
 *   deal +100% damage (×2).
 * - S3: Liberation damage Amplified by 175% (attacker Amplify +1.75).
 * - S6: while Voice Flux is active, her Heavy Attack DMG +40% (×1.4).
 *
 * Summon hits score as their own rotation blocks: "Shadow of Xuanling
 * DMG" (liberation skill) carries full motion values — 3.3798 at forte
 * 10, exactly the quoted 337.98% ATK as Heavy — covering the S1
 * Unfaltering, S2 Strung Notes, and S6 Still as Withered Wood summons.
 * Trigger timing (after Sword Stance Flow casts; after teammate status
 * inflicts for S6) is rotation-layer. S6's guaranteed crit is
 * unexpressible (rotation crit is global, no per-block override), so
 * that variant scores uncritted. S4's team ATK resolves through the
 * team layer (chainPresets sheet + team entries via resolveTeamBuffs),
 * not this module. Still as Withered Wood's full rules are known
 * (snapshot S6 text: 30s state, 1s ICD, 5 charges, 25s CD) but
 * off-field triggers + charges have no rotation model.
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

import type { CharacterSkill } from '../data/schema.ts';

/**
 * Domain layer: Xiangli Yao Outro (Chain Rule) damage.
 *
 * Source: snapshot skill 1002309 — "Xiangli Yao will call down a laser
 * beam upon the first target the incoming Resonator's Basic Attack hits,
 * dealing Electro DMG equal to 237.63% of Xiangli Yao's ATK to an area.
 * This effect lasts for 8s and can be triggered once every 2s, up to 3
 * times." Corroborated by
 * https://www.eurogamer.net/wuthering-waves-xiangli-yao-materials-ascension-forte-kit-resonance-chain
 * (237.63%, once every two seconds, up to three times; inspected
 * 2026-09-18) and the S5 wording by
 * https://theriagames.com/guide/wuthering-waves-ultimate-1-xiangli-yao-guide/
 * (End of Stars: Chain Rule +222%, Cogitation Model +100%; inspected
 * 2026-09-18). The outro ships no motion values, so Chain Rule is scored
 * from this prose spec (one block = one laser trigger, up to 3 blocks),
 * mirroring the Jiyan lance / Camellya Twining seam in damage.ts /
 * rotation.ts.
 *
 * Buckets: the kit states no "considered as" action type, so Chain Rule
 * scores attribute-bucket-only — the conservative default for unstated
 * types, mirroring the `forte` fallback. It is NOT a coordinated attack
 * (no coordinated wording in kit), so the coordinated bucket stays out
 * (unlike the lance).
 *
 * NOT modeled: the incoming-basic trigger condition and the 8s/2s/up-to-3
 * pacing (team context — the rotation scores each trigger block
 * unconditionally). S5's +222% applies to the scored base only.
 */

/** Chain Rule base motion value: 237.63% of Xiangli Yao's ATK (skill 1002309 prose). */
export const XIANGLIYAO_CHAIN_RULE_MV = 2.3763;

/** S5 "The DMG Multiplier of Outro Skill Chain Rule is increased by 222%". */
export const XIANGLIYAO_S5_CHAIN_RULE_MULTIPLIER = 3.22;

export interface XiangliyaoOutroChainRuleSpec {
  motionValue: number;
}

/**
 * Whether this (character, skill, motion) triple is Xiangli Yao's Chain
 * Rule — i.e. a buff-carrier-shaped outro block that actually scores
 * damage. Outro blocks always carry an empty motion name. The S5 chain
 * multiplier folds into the returned motion value (detection callers
 * pass rank 0).
 */
export function xiangliyaoOutroChainRuleSpec(
  characterId: string | undefined,
  skill: CharacterSkill,
  motionName: string,
  resonanceChain = 0,
): XiangliyaoOutroChainRuleSpec | null {
  if (characterId !== 'xiangli-yao') return null;
  if (skill.kind !== 'outro') return null;
  if (motionName !== '') return null;
  return {
    motionValue: XIANGLIYAO_CHAIN_RULE_MV * (resonanceChain >= 5 ? XIANGLIYAO_S5_CHAIN_RULE_MULTIPLIER : 1),
  };
}

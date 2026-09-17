import type { CharacterSkill } from '../data/schema.ts';

/**
 * Domain layer: Jiyan Outro coordinated-lance damage.
 *
 * Source: snapshot skill 1001109 ("Discipline") description — "Jiyan will
 * summon a lance to launch a coordinated attack, dealing Aero DMG equal
 * to 313.40% of Jiyan's ATK. This attack lasts for 8s and can be
 * triggered once every 1s, up to 2 times." The outro ships no motion
 * values, so the lance is scored from this prose spec (one block = one
 * lance; the user adds a second block for the second trigger).
 *
 * Buckets: the kit states no "considered as" action type (unlike Yinlin's
 * "Judgement Strike deals Resonance Skill DMG" or Calcharo S6's
 * "considered Resonance Liberation DMG"), so the lance scores
 * attribute-bucket-only plus the coordinated bucket — the conservative
 * default for unstated types, mirroring the `forte` fallback.
 *
 * NOT modeled: the Heavy-hit trigger condition (team context — the
 * rotation scores the lance unconditionally).
 */

/** Outro-lance motion value: 313.40% of Jiyan's ATK (skill 1001109 prose). */
export const JIYAN_OUTRO_LANCE_MV = 3.134;

/** S5 "Outro Skill Discipline gains an additional DMG Multiplier of 120%". */
export const JIYAN_S5_OUTRO_MULTIPLIER = 2.2;

export interface JiyanOutroLanceSpec {
  motionValue: number;
}

/**
 * Whether this (character, skill, motion) triple is Jiyan's outro lance —
 * i.e. a buff-carrier-shaped outro block that actually scores damage.
 * Outro blocks always carry an empty motion name. The S5 chain multiplier
 * folds into the returned motion value (detection callers pass rank 0).
 */
export function jiyanOutroLanceSpec(
  characterId: string | undefined,
  skill: CharacterSkill,
  motionName: string,
  resonanceChain = 0,
): JiyanOutroLanceSpec | null {
  if (characterId !== 'jiyan') return null;
  if (skill.kind !== 'outro') return null;
  if (motionName !== '') return null;
  return {
    motionValue: JIYAN_OUTRO_LANCE_MV * (resonanceChain >= 5 ? JIYAN_S5_OUTRO_MULTIPLIER : 1),
  };
}

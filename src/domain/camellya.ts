import type { CharacterSkill } from '../data/schema.ts';

/**
 * Domain layer: Camellya Outro (Twining) damage.
 *
 * Source: snapshot skill 1001309 — "Attack the target, dealing Havoc
 * DMG equal to 329.24% of Camellya's ATK", corroborated by
 * https://wuthering.gg/characters/camellya (Twining section, inspected
 * 2026-09-18). The outro ships no motion values, so Twining is scored
 * from this prose spec (one block = one Twining), mirroring the Jiyan
 * lance seam in damage.ts / rotation.ts.
 *
 * Buckets: the kit states no "considered as" action type, so Twining
 * scores attribute-bucket-only — the conservative default for unstated
 * types, mirroring the `forte` fallback. It is NOT a coordinated
 * attack, so the coordinated bucket stays out (unlike the lance).
 *
 * NOT modeled: the Ephemeral-primed bonus (+459.02% on the next Twining
 * after activating Ephemeral) — it needs pre-outro rotation-order state
 * with no input plumbing. S5's +68% applies to the scored base only.
 */

/** Twining base motion value: 329.24% of Camellya's ATK (skill 1001309 prose). */
export const CAMELLYA_TWINING_MV = 3.2924;

/** S5 "Outro Skill Twining is increased by 68%". */
export const CAMELLYA_S5_TWINING_MULTIPLIER = 1.68;

export interface CamellyaOutroTwiningSpec {
  motionValue: number;
}

/**
 * Whether this (character, skill, motion) triple is Camellya's Twining —
 * i.e. a buff-carrier-shaped outro block that actually scores damage.
 * Outro blocks always carry an empty motion name. The S5 chain multiplier
 * folds into the returned motion value (detection callers pass rank 0).
 */
export function camellyaOutroTwiningSpec(
  characterId: string | undefined,
  skill: CharacterSkill,
  motionName: string,
  resonanceChain = 0,
): CamellyaOutroTwiningSpec | null {
  if (characterId !== 'camellya') return null;
  if (skill.kind !== 'outro') return null;
  if (motionName !== '') return null;
  return {
    motionValue: CAMELLYA_TWINING_MV * (resonanceChain >= 5 ? CAMELLYA_S5_TWINING_MULTIPLIER : 1),
  };
}

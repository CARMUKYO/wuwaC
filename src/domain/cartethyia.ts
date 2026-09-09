import type { CharacterSkill } from '../data/schema.ts';

/** The status used by Cartethyia's kit. */
export const CARTETHYIA_STATUS = 'aeroErosion' as const;

/** Base cap, plus Cartethyia S2's three-stack increase. */
export function maxAeroErosionStacks(resonanceChain: number): number {
  return resonanceChain >= 2 ? 9 : 6;
}

/**
 * Aero Erosion's status-damage multiplier by stack count.
 *
 * The first six values are the game's Negative Status table. S2 can raise
 * Aero Erosion's cap by three, so the final three entries continue the
 * provider's 0.899-ish per-stack progression.
 */
const AERO_EROSION_MULTIPLIERS: readonly number[] = [
  0,
  0.360,
  0.899,
  1.799,
  2.698,
  3.597,
  4.497,
  5.396,
  6.296,
  7.195,
];

export function aeroErosionMultiplier(stacks: number): number {
  if (!Number.isInteger(stacks) || stacks < 1 || stacks >= AERO_EROSION_MULTIPLIERS.length) {
    throw new Error(`Aero Erosion stacks must be an integer from 1 to 9, got ${stacks}`);
  }
  return AERO_EROSION_MULTIPLIERS[stacks];
}

/**
 * Negative-status target amplification from Cartethyia's inherent skill:
 * 1–3 stacks take 30% more damage; stacks 4–6 add 10% per extra stack.
 */
export function cartethyiaStatusTargetMultiplier(targetStacks: number): number {
  if (!Number.isInteger(targetStacks) || targetStacks < 0 || targetStacks > 9) {
    throw new Error(`target Aero Erosion stacks must be an integer from 0 to 9, got ${targetStacks}`);
  }
  if (targetStacks === 0) return 1;
  return 1.3 + 0.1 * Math.min(Math.max(targetStacks - 3, 0), 3);
}

/** S1: +25% Crit DMG at each 30 Conviction threshold, up to four stacks. */
export function cartethyiaConvictionCritDmg(
  characterId: string | undefined,
  resonanceChain: number,
  skill: CharacterSkill,
  conviction: number,
): number {
  if (characterId !== 'cartethyia' || resonanceChain < 1 || skill.kind !== 'forte') return 0;
  if (!Number.isInteger(conviction) || conviction < 0 || conviction > 120) {
    throw new Error(`Conviction must be an integer from 0 to 120, got ${conviction}`);
  }
  return Math.floor(conviction / 30) * 0.25;
}

/**
 * Multipliers that are unconditionally expressible from Cartethyia's
 * sequence descriptions. State-dependent effects (Conviction, Sword
 * Shadows, and the S4/S6 trigger timing) stay in the rotation layer.
 */
export function cartethyiaMotionMultiplier(
  characterId: string | undefined,
  resonanceChain: number,
  skill: CharacterSkill,
  motionName: string,
  targetStatusStacks = 0,
): number {
  if (characterId !== 'cartethyia') return 1;

  let multiplier = cartethyiaStatusTargetMultiplier(targetStatusStacks);

  // S2: Cartethyia's Basic/Heavy/Dodge Counter/Intro are +50%; her
  // mid-air attack is +200%. These attacks are represented by the normal
  // attack and intro rows in the generated kit.
  if (resonanceChain >= 2 && (skill.kind === 'basic' || skill.kind === 'intro')) {
    multiplier *= /mid-air/i.test(motionName) ? 3 : 1.5;
  }

  // S3: Blade of Howling Squall's multiplier is increased by 100%.
  if (
    resonanceChain >= 3 &&
    skill.kind === 'liberation' &&
    /blade of howling squall/i.test(motionName)
  ) {
    multiplier *= 2;
  }

  // Blade of Howling Squall consumes Aero Erosion at S0–S5 and amplifies
  // its damage by 20% per removed stack, capped at five stacks. S6 keeps the
  // stacks instead, so this consume-based multiplier no longer applies.
  if (
    resonanceChain < 6 &&
    skill.kind === 'liberation' &&
    /blade of howling squall/i.test(motionName)
  ) {
    multiplier *= 1 + 0.2 * Math.min(targetStatusStacks, 5);
  }

  // S6: targets take 40% more damage from Fleurdelys. Her transformed
  // attacks live under the Forte Circuit skill in the generated snapshot.
  if (
    resonanceChain >= 6 &&
    (skill.kind === 'forte' || /blade of howling squall/i.test(motionName))
  ) multiplier *= 1.4;

  return multiplier;
}

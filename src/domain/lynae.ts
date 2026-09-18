import type { CharacterSkill } from '../data/schema.ts';

/**
 * Domain layer: Lynae S3 Premixed Hue (Spectro Pistols, Kaleidoscopic Parade).
 *
 * Sources: snapshot S3 text ("For One Brilliant Moment" — 25 stacks max,
 * +55% Spectro DMG Bonus of Additive Color per stack) plus the snapshot
 * skill motion "Additive Color DMG" (1004502), cross-checked against the
 * Game8 Lynae guide (S3 table matches the provider text verbatim):
 * https://game8.co/games/Wuthering-Waves/archives/568211
 */

export interface LynaeSkillMods {
  motionMultiplier: number;
  /** S3 Premixed Hue at full stacks: +1375% Spectro bonus, Additive Color only. */
  dmgBonusExtra: number;
}

/** Max Premixed Hue stacks (S3 text: "up to 25 stacks"). */
export const LYNAE_S3_PREMIXED_MAX_STACKS = 25;

/** Per-stack Spectro DMG Bonus for Additive Color (S3 text: 55%). */
export const LYNAE_S3_PREMIXED_PER_STACK = 0.55;

/** Full-stack additive bonus: 25 x 55% = 1375% (exact literal — the product carries float dust). */
export const LYNAE_S3_PREMIXED_FULL_STACKS = 13.75;

/**
 * - S3, second paragraph: each Premixed Hue stack grants Additive Color
 *   +55% Spectro DMG Bonus. Transcribed at max stacks (25 x 55% =
 *   +1375%) per the stacking convention, applied as motion-scoped
 *   `dmgBonusExtra` on the Additive Color motion only.
 *
 * The generic motion scope has no additive-bonus field (motionMultiplier /
 * skill-scoped crit / DEF ignore only), which is why this paragraph needs
 * a module instead of a motion entry. The S3 x1.9 Visual Impact /
 * Iridescent Splash motion entries stay in the catalog — this module
 * returns a neutral motion multiplier and never overlaps them.
 *
 * NOT modeled: the Lumiflow >= 120 gain gate and the remove-all-stacks
 * reset when Additive Color ends — the full-stack transcription assumes
 * the 25-stack cast, disclosed in the catalog assumption.
 */
export function lynaeSkillMods(
  characterId: string | undefined,
  resonanceChain: number,
  skill: CharacterSkill,
  motionName: string,
): LynaeSkillMods {
  if (characterId !== 'lynae') return { motionMultiplier: 1, dmgBonusExtra: 0 };
  const additiveColor = skill.kind === 'skill' && /additive color/i.test(motionName);
  const dmgBonusExtra = resonanceChain >= 3 && additiveColor ? LYNAE_S3_PREMIXED_FULL_STACKS : 0;
  return { motionMultiplier: 1, dmgBonusExtra };
}

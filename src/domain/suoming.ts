/**
 * Domain layer: Suoming kit mechanics (Unison Sword sub-DPS).
 *
 * Sources: the committed snapshot's skill/chain prose (Forte "Bound
 * Obsession, Forged Mind", inherent "Sunken Seal, Forged Lock"). No
 * Resonance Modes (Unison is a team mechanic here, not her mode).
 */

export interface SuomingModInputs {
  /** Seal Master active (12s after spending Unison on Rift Cleaver). */
  sealMaster?: boolean;
}

export interface SuomingSkillMods {
  motionMultiplier: number;
  dmgBonusExtra: number;
}

/**
 * Matches the Seal Master rows only: Basic Attack - Unfurled Canopy
 * (Stages 1-4) and its Whirling Thunder stages. Dodge Counter -
 * Unfurled Canopy, the Unfurled intro rows, and Crimson Gleam /
 * Unforsaken Mind are NOT named by Seal Master and stay excluded.
 */
const SEAL_MASTER_MOTIONS = /basic attack - unfurled canopy/i;

/**
 * - Seal Master: the Unfurled Canopy + Whirling Thunder motion values are
 *   each increased by 100% (×2) while active — a per-block boolean input
 *   on the Chisa Woven Myriad pattern (state timing is user-arranged).
 *
 * NOT modeled: Seal Master's +5 Concerto per stage (utility, no bucket)
 * and its Crit DMG +100% / +300% at S6 (manual rotation buff, 12s
 * window); Rain-Soaked Covenant (Electro DMG Bonus +50% 15s — manual
 * rotation buff; Concerto rider is utility); the S6 Unison Boon +50%
 * effect rider (no Boon catalog entry — manual amplify buff); Aligned
 * Seals outro riders (team layer); Thunder Crest pacing (1/s, up to 6 —
 * one block per trigger).
 */
export function suomingSkillMods(
  characterId: string | undefined,
  motionName: string,
  inputs: SuomingModInputs = {},
): SuomingSkillMods {
  if (characterId !== 'suoming') return { motionMultiplier: 1, dmgBonusExtra: 0 };
  const active = inputs.sealMaster === true && SEAL_MASTER_MOTIONS.test(motionName);
  return { motionMultiplier: active ? 2 : 1, dmgBonusExtra: 0 };
}

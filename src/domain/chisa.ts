import type { CharacterSkill } from '../data/schema.ts';

/**
 * Domain layer: Chisa kit mechanics (Havoc Bane applier, Chainsaw DPS).
 *
 * Sources: encore.moe character 1508 SkillDescribe prose (Forte "Sight
 * of Unraveling - Oblivion", Liberation "Moment of Nihility"), the
 * SkillAttributes motion rows, the DamageList combat tiers, and the
 * committed snapshot's resonance-chain text. Kit wording cross-checked
 * against two independent transcriptions (Prydwen Chisa guide, updated
 * 2026-09-15; wuthering.gg Chisa page) — both match the provider text
 * verbatim, including the 61803 fixed damage and the 61.80% HP clause.
 */

export interface ChisaModInputs {
  /** Woven Myriad - Convergence active (15s after Liberation cast). */
  wovenMyriad?: boolean;
  /** Rings of Chainsaw consumed for this Eradication hit. */
  ringsConsumed?: number;
  /** Forte level, for the Eradication / per-Ring motion lookup. */
  forteLevel?: number;
}

export interface ChisaSkillMods {
  motionMultiplier: number;
  /** S5 grants her Liberation +100% DMG Bonus (additive bucket). */
  dmgBonusExtra: number;
}

const SAW_MOTIONS = /sawring - blitz|chainsaw mode - dodge counter|sawring - eradication/i;
const RING_BONUS_MOTION = /bonus dmg multiplier per ring of chainsaw/i;
/** Max Rings counted toward one Eradication (Forte text: "Up to 100 points"). */
const MAX_RINGS_COUNTED = 100;

/**
 * - Liberation state and S3 each grant the Sawring trio +120% MV, and the
 *   two stack ADDITIVELY (x3.4 with both, not x4.84): the provider
 *   DamageList ships every Sawring rate in x1 / x2.2 / x2.2 / x3.4 tiers
 *   (e.g. Eradication 25.92% -> 57.03% -> 88.13%), and the only two +120%
 *   sources in her kit are Woven Myriad and S3, so the top tier is
 *   1 + 1.2 + 1.2. Verified live 2026-09-18:
 *   https://api-v2.encore.moe/api/en/character/1508
 * - Eradication additionally scales with consumed Rings. The per-Ring
 *   row ("Bonus DMG Multiplier per Ring of Chainsaw", 1.30% at L1) is an
 *   ABSOLUTE motion-value addition in the same units as the base MV —
 *   the Forte says each consumed Ring "increases the DMG Multiplier" by
 *   that bonus quantity (contrast relative wordings like "amplifies
 *   damage by X% per stack"), and the row means absolute MV points
 *   everywhere else it appears. Total: (M + r*n) x sM, where sM is the
 *   shared additive state/S3 factor above — the ring component scales
 *   exactly ONCE (both Eradication DamageList components share the same
 *   x2.2/x3.4 tier factor, so no second scaling of the ring term).
 * - S5: her Liberation motions gain +100% DMG Bonus (additive bucket).
 *
 * NOT modeled: S1's fixed 61803 Havoc DMG on Snare application — the
 * 61.80% HP cap needs enemy HP (unmodeled), "once per target" needs
 * rotation state, and crit behavior is unspecified; semantics pinned for
 * the record: it ignores %DMG-bonus buckets and carries the Basic Attack
 * damage-type tag. S4's 2s->1s Bane-pacing change is rotation realism
 * only (Bane stacks stay per-block user inputs — no scoring delta).
 * S6 Finality amplifications (manual buffs: +0.30 status amplify, +0.40
 * attacker amplify), Thread of Bane's 18% DEF ignore (conditional on
 * Snare — manual buff). S1's Snare ATK +30% and S2's 10% Havoc RES
 * ignore auto-apply via the chain catalog (chainPresets.ts) — do NOT
 * also add them as manual buffs.
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

  // Additive state/S3 stacking — see doc comment (x3.4 max, not x4.84).
  const sawMult =
    1 + (inputs.wovenMyriad === true ? 1.2 : 0) + (resonanceChain >= 3 ? 1.2 : 0);
  if (sawMotion) motionMultiplier *= sawMult;

  if (/sawring - eradication/i.test(motionName)) {
    const rings = Math.min(Math.max(inputs.ringsConsumed ?? 0, 0), MAX_RINGS_COUNTED);
    if (rings > 0) {
      const level = inputs.forteLevel ?? 10;
      const baseMotion = skill.motionValues.find((m) => m.name === motionName);
      const perRingMotion = skill.motionValues.find((m) => RING_BONUS_MOTION.test(m.name));
      // Same index convention as resolveMotion (forteLevel - 1, clamped).
      const base =
        baseMotion?.values[Math.min(Math.max(level - 1, 0), baseMotion.values.length - 1)] ?? 0;
      const perRing =
        perRingMotion?.values[Math.min(Math.max(level - 1, 0), perRingMotion.values.length - 1)] ?? 0;
      // Absolute-points composition: (M + r*n) x sM. Both rows are
      // required and the base must be positive; otherwise the ring term
      // is skipped rather than producing NaN.
      if (baseMotion !== undefined && perRingMotion !== undefined && base > 0) {
        motionMultiplier *= (base + perRing * rings) / base;
      }
    }
  }
  if (resonanceChain >= 5 && skill.kind === 'liberation') {
    dmgBonusExtra += 1;
  }
  return { motionMultiplier, dmgBonusExtra };
}

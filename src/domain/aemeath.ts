import type { CharacterSkill, MotionBonusKind } from '../data/schema.ts';

/**
 * Domain layer: Aemeath kit mechanics (Fusion Burst / Tune Rupture DPS).
 *
 * Sources: encore.moe character 1210 `SkillDescribe` prose (Forte "To
 * Sculpt the Silence", Liberation "Towards the Daybreak") and the
 * committed snapshot's resonance-chain text, cross-checked against the
 * Prydwen Aemeath guide (updated 2026-09-15 — all S1–S6 values, trail
 * rates, and the Outro branches match the provider text verbatim).
 * Resonance Mode selection (Tune Rupture vs Fusion Burst) is a
 * per-rotation input — see characterResonanceModes in characterMods.ts;
 * both modes are confirmed by the Forte ("In Resonance Mode - Tune
 * Rupture ... / ... Fusion Burst ...") and Outro prose. The effects
 * modeled below carry no mode gate in kit text, so this module
 * deliberately takes no mode input.
 */

/** Fixed crit for Aemeath S6 Tune Rupture / Fusion Burst damage (Phase 5 hook). */
export const AEMEATH_S6_FIXED_CRIT = { rate: 0.8, dmg: 2.75 } as const;

export interface AemeathSkillMods {
  motionMultiplier: number;
  /** S6: targets take 40% more Resonance Liberation DMG (bucket). */
  dmgBonusExtra: number;
}

/**
 * - S2: Seraphic Duet Overture / Encore MV +100% (×2). No mode gate.
 * - S3: Heavenfall Edict Finale MV +100% (×2), Overdrive +40% (×1.4).
 *   No mode gate.
 * - S6: targets take +40% Resonance Liberation DMG from Aemeath, scored
 *   as +40% Liberation DMG Bonus on liberation-kind and
 *   liberation-considered motions (Heavy Charged I/II, Seraphic Duet —
 *   "considered Resonance Liberation DMG" counts as Liberation DMG for
 *   type checks). No mode gate.
 *
 * NOT modeled: S2's Tune branch (+20% x5 stacking on Seraphic Duet's
 * additional Tune Rupture instances — needs the instance pipeline) and
 * Fusion branch (Stardust 400%, 15%/stack trail rate — Fusion Burst
 * detonations have no published table, so they throw); S3's replaced
 * Between the Stars (Crit DMG +60% -> critDmg manual buff, Finale
 * "Amplified by 25%" -> dmgBonus:liberation manual buff per the
 * qualified-Amplify mapping rule) and Instant-Response infliction
 * (utility); S6's trail doubling, 60 stack cap, and Seraphic Duet
 * trail-infliction riders (trail stack engine); S1's Sealed Trail state
 * (S1's +300% Charged Crit DMG auto-applies via motion catalog
 * entries); base Between the Stars and Before All Sounds (manual
 * buffs); Outro team amps (team layer).
 *
 * Tune-pipeline boundary (verified 2026-09-18, flagged follow-up, NOT
 * changed — the Tune Rupture formula is unpublished and the pipeline is
 * explicitly provisional): the +4%/stack Rupturous Trail scaling in kit
 * text belongs to Seraphic Duet's 5 additional Tune Rupture DMG
 * instances (the "Seraphic Duet Bonus DMG (Per Instance)" motion), NOT
 * to Starburst (the 8s-ICD Interfered response, which has no trail
 * scaling in kit text) — but computeTuneRuptureDamage applies trail
 * scaling to Starburst blocks, while the per-instance motion scores as
 * a plain Liberation-bucket hit with no trail scaling, no 5/15
 * instance count, and no S6 fixed crit. Starburst-as-plain-block also
 * inherits the S6 Liberation bucket below via its provider Liberation
 * typing despite being "considered Tune Rupture DMG" — coherent only
 * with the Tune-pipeline path, which never consults this module.
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

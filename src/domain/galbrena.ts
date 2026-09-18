/**
 * Domain layer: Galbrena kit mechanics (Fusion Pistols, Demon Hypostasis DPS).
 *
 * Sources: encore.moe character 1208 SkillDescribe prose (Forte "Beyond
 * Threshold", Liberation "Hellfire Absolution") and the committed
 * snapshot's resonance-chain text, cross-checked against the Prydwen
 * Galbrena guide (updated 2026-09-15 — all S1-S6 values match the
 * provider text verbatim).
 */

export interface GalbrenaSkillMods {
  motionMultiplier: number;
  /** S6 grants the Demon quintet Fusion DMG Amplification (additive bucket). */
  dmgBonusExtra: number;
}

/** Demon Hypostasis quintet, including Purgatory Scourge (see below). */
const S6_QUINTET =
  /seraphic execution|flamewing verdict|hellsent barrage|ravage|purgatory scourge/i;

/**
 * - S6, second paragraph: when casting Ascent of Malice, each consumed
 *   Afterflame point grants the Demon quintet (Seraphic Execution,
 *   Flamewing Verdict, Hellsent Barrage, Ravage, Purgatory Scourge)
 *   0.875% Fusion DMG Amplification, up to 35%. Transcribed at max
 *   stacks (40 Afterflame x 0.875% = 35%) per the stacking convention.
 *   "Fusion DMG Amplification" is element-qualified, so it lands in the
 *   additive dmgBonus:Fusion bucket (reference doc section 6; same
 *   mapping as Lynae Outro's "Liberation Amplification"). Like the S6
 *   x1.6 motion entries, this assumes Eternal Hypostasis is up.
 * - Purgatory Scourge is name-matched but has NO snapshot motion (no MV
 *   anywhere): verified absent at the primary source 2026-09-18
 *   (https://api-v2.encore.moe/api/en/character/1208 — Purgatory
 *   appears only in SkillDescribe prose, zero DamageList hits), so the
 *   branch is dormant until provider data completes. The Liberation 85%
 *   state and S1/S6 Purgatory riders stay flagged for the same reason.
 *
 * The generic motion scope has no dmgBonus field, which is why this
 * paragraph needs a module instead of a motion entry. Everything else
 * S6 (x1.6 trio) stays in motion entries — this module returns a
 * neutral motion multiplier and never overlaps them.
 *
 * NOT modeled: Liberation 85% state + Afterflame 1.5%/pt scaling
 * (need timed-state/stack inputs — spec-and-flagged; note Prydwen's
 * review reads Afterflame as enemy DMG-Taken, which a future
 * implementation must resolve against the kit text); Burning Drive
 * base (timed manual buff) and S2's 350% raise of it (still manual);
 * Fated End stacks (timed manual buffs); Hellstride fixed damage (the
 * amount is unpublished — "a fixed amount", L10 MV 0 — and it ignores
 * DMG buffs); S1 interruption immunity; S6 stagnation/CC riders.
 */
export function galbrenaSkillMods(
  characterId: string | undefined,
  resonanceChain: number,
  motionName: string,
): GalbrenaSkillMods {
  if (characterId !== 'galbrena') return { motionMultiplier: 1, dmgBonusExtra: 0 };
  // S6 second paragraph at max Afterflame: 40 x 0.875% = 35%.
  const dmgBonusExtra = resonanceChain >= 6 && S6_QUINTET.test(motionName) ? 0.35 : 0;
  return { motionMultiplier: 1, dmgBonusExtra };
}

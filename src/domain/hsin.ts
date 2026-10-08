import type { CharacterSkill, MotionBonusKind } from '../data/schema.ts';

/**
 * Domain layer: Hsin kit mechanics (Electro Flare / Unison Rectifier DPS).
 *
 * Sources: the committed snapshot's skill/chain prose (Forte "Forms Turn,
 * Heart Abides", Liberation "Nexus Alight", Outro "Herself a Thousand
 * Lanterns"). Resonance Modes (Unison / Electro Flare) stay UNREGISTERED
 * (Lucilla precedent): no scored math consumes the mode — mode-specific
 * intro rows are user-picked snapshot motions, and the Unison-gated S1/S3
 * chain branches transcribe with gate-met assumptions in chainPresets.ts.
 */

export interface HsinSkillMods {
  motionMultiplier: number;
  /** S6: targets take 40% more Resonance Skill DMG (additive bucket). */
  dmgBonusExtra: number;
}

/**
 * - S6 "Targets take 40% more Resonance Skill DMG from Hsin" scores as
 *   +40% skill-bucket bonus on skill-typed motions (Aemeath S6 precedent:
 *   typed taken goes additive; "considered Resonance Skill DMG" rows —
 *   Pillars, Manifold Unison, Realm, Beholding/Stilling — count via their
 *   provider skill typing). The S6 "ignores 20% DEF" rider transcribes as
 *   chain motion entries (defIgnoreExtra has a catalog bucket; this
 *   additive taken does not).
 *
 * NOT modeled: everything Electro Flare engine (Heart of Thunder
 * 35%/42% triggers, Thunderglow/Fleeting Thunder infliction, S3's 1500%
 * detonation rider) — detonations throw honestly for lack of a published
 * Flare table; Tides of Succession (ATK +50% 8s Unison / Electro bonus
 * stacks + Rover branch — manual rotation buffs); Gleaning Simple Joys
 * (Boon cap/grant enabler — feeds the S1/S3 full-stack assumptions);
 * Edict pacing (21 stacks, 1/s — one Soaring Pillar block per trigger);
 * Radiance Ward / damage-reduction / revive riders (no bucket); the
 * outro's Nightglow team amps (team layer).
 */
export function hsinSkillMods(
  characterId: string | undefined,
  resonanceChain: number,
  motionDmgType: MotionBonusKind,
): HsinSkillMods {
  if (characterId !== 'hsin') return { motionMultiplier: 1, dmgBonusExtra: 0 };
  return {
    motionMultiplier: 1,
    dmgBonusExtra: resonanceChain >= 6 && motionDmgType === 'skill' ? 0.4 : 0,
  };
}

/** Fixed crit for Hsin S6 Electro Flare damage (Phase 5 hook, no consumer yet). */
export const HSIN_S6_FIXED_CRIT = { rate: 0.8, dmg: 2.3 } as const;

/** Outro base motion value: 100% of Hsin's ATK (skill 1006109 prose). */
export const HSIN_OUTRO_MV = 1;

export interface HsinOutroSpec {
  motionValue: number;
}

/**
 * Whether this (character, skill, motion) triple is Hsin's damaging outro —
 * i.e. a buff-carrier-shaped outro block that actually scores damage
 * (Camellya Twining seam). Outro blocks always carry an empty motion name.
 * No chain rank scales the outro hit, so no rank parameter.
 */
export function hsinOutroSpec(
  characterId: string | undefined,
  skill: CharacterSkill,
  motionName: string,
): HsinOutroSpec | null {
  if (characterId !== 'hsin') return null;
  if (skill.kind !== 'outro') return null;
  if (motionName !== '') return null;
  return { motionValue: HSIN_OUTRO_MV };
}

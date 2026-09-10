import type { CharacterSkill, MotionBonusKind } from '../data/schema.ts';
import { aemeathSkillMods } from './aemeath.ts';
import { chisaSkillMods, type ChisaModInputs } from './chisa.ts';
import type { NegativeStatusType } from './negativeStatus.ts';
import { xuanlingSkillMods, type XuanlingModInputs } from './xuanling.ts';
import { zaniMotionMultiplier, type ZaniModInputs } from './zani.ts';

/**
 * Dual-mode (Resonance Mode) characters and their modes. Cited to
 * inspected wiki pages: Aemeath (Aemeath page: Tune Rupture vs Fusion
 * Burst modes), Denia (Fusion Burst combat-role roster + Tune_Break
 * page Resonance Mode - Tune Strain entry), Lynae (Tune_Break page:
 * inflicts/responds to both Rupture and Strain). Lucilla omitted until
 * G6 resolves her second mode.
 */
export const RESONANCE_MODES = {
  aemeath: ['tuneRupture', 'fusionBurst'],
  denia: ['fusionBurst', 'tuneStrain'],
  lynae: ['tuneRupture', 'tuneStrain'],
  // Lucilla verified Glacio Chafe ↔ Echo (encore.moe character 1109:
  // S2, Spotlight, Clear As Day, Slow Motion, Montage prose) but stays
  // unregistered: nothing in scoring consumes her mode yet (Chafe
  // detonations need the unpublished table; Echo-mode buffs are team
  // layer). Register her with the Chafe table or a lucilla.ts module.
} as const;

export type ResonanceMode = (typeof RESONANCE_MODES)[keyof typeof RESONANCE_MODES][number];

export function characterResonanceModes(characterId: string): ResonanceMode[] {
  return [...(RESONANCE_MODES[characterId as keyof typeof RESONANCE_MODES] ?? [])];
}

/**
 * Domain layer: per-character kit dispatcher and capability registry.
 *
 * Character-specific multipliers stay in their own modules; this file
 * routes to them (each module returns neutral values for other
 * characters) and answers UI questions ("which status blocks does this
 * character offer?") so components never hardcode character ids.
 * Phase 4 grows this into the Resonance Mode registry.
 */

export interface KitStateInputs extends ZaniModInputs, XuanlingModInputs, ChisaModInputs {}

export interface ResolvedSkillMods {
  motionMultiplier: number;
  dmgBonusExtra: number;
  amplifyExtra: number;
}

const NEUTRAL_MODS: ResolvedSkillMods = { motionMultiplier: 1, dmgBonusExtra: 0, amplifyExtra: 0 };

export function characterSkillMods(
  characterId: string | undefined,
  resonanceChain: number,
  skill: CharacterSkill,
  motionName: string,
  motionDmgType: MotionBonusKind,
  forteLevel: number,
  inputs: KitStateInputs = {},
): ResolvedSkillMods {
  if (characterId === undefined) return NEUTRAL_MODS;
  if (characterId === 'zani') {
    return {
      ...NEUTRAL_MODS,
      motionMultiplier: zaniMotionMultiplier(characterId, resonanceChain, skill.kind, motionName, inputs),
    };
  }
  if (characterId === 'yangyang-xuanling') {
    const mods = xuanlingSkillMods(characterId, resonanceChain, skill.kind, motionName, motionDmgType, inputs);
    return { motionMultiplier: mods.motionMultiplier, dmgBonusExtra: 0, amplifyExtra: mods.amplifyExtra };
  }
  if (characterId === 'chisa') {
    const mods = chisaSkillMods(characterId, resonanceChain, skill, motionName, { ...inputs, forteLevel });
    return { motionMultiplier: mods.motionMultiplier, dmgBonusExtra: mods.dmgBonusExtra, amplifyExtra: 0 };
  }
  if (characterId === 'aemeath') {
    const mods = aemeathSkillMods(characterId, resonanceChain, skill, motionName, motionDmgType);
    return { motionMultiplier: mods.motionMultiplier, dmgBonusExtra: mods.dmgBonusExtra, amplifyExtra: 0 };
  }
  return NEUTRAL_MODS;
}

/**
 * Detonation-block statuses a character can score. Only statuses with a
 * computable pipeline are offered — Havoc Bane users get the target-Bane
 * input instead, and table-less statuses unlock in Phases 4/6.
 */
const STATUS_BLOCK_CHARACTERS: Record<string, NegativeStatusType[]> = {
  cartethyia: ['aeroErosion'],
  ciaccona: ['aeroErosion'],
  'rover-aero': ['aeroErosion'],
  zani: ['spectroFrazzle'],
  phoebe: ['spectroFrazzle'],
  'rover-spectro': ['spectroFrazzle'],
};

export function characterStatusBlocks(characterId: string): NegativeStatusType[] {
  return STATUS_BLOCK_CHARACTERS[characterId] ?? [];
}

/** Characters whose rotations want a target Havoc Bane stack input. */
const HAVOC_BANE_CHARACTERS = new Set(['yangyang-xuanling', 'chisa']);

export function characterUsesHavocBane(characterId: string): boolean {
  return HAVOC_BANE_CHARACTERS.has(characterId);
}

/**
 * Tune Rupture response per-trail-stack MV rate. Only Aemeath's +4% per
 * Rupturous Trail is verified (Forte "To Sculpt the Silence", encore.moe
 * character 1210) — other responders (Mornye, Lynae) have no published
 * rate, so their blocks throw instead of guessing.
 */
const TUNE_RESPONSE_RATES: Record<string, number> = {
  aemeath: 0.04,
};

/** Verified per-stack rate, or null when no rate is published. */
export function tuneResponseStackRate(characterId: string | undefined): number | null {
  if (characterId === undefined) return null;
  return TUNE_RESPONSE_RATES[characterId] ?? null;
}

/** Response motion names offered as Tune Rupture blocks (verified MVs only). */
const TUNE_RUPTURE_RESPONSES: Record<string, string[]> = {
  aemeath: ['Tune Rupture Response - Starburst DMG'],
};

export function characterTuneRuptureResponses(characterId: string): string[] {
  return TUNE_RUPTURE_RESPONSES[characterId] ?? [];
}

/**
 * Tune Strain responders (total-DMG amp per Interfered stack). Cited to
 * the inspected Tune_Break wiki page: Mornye, Qingxiao, Luuk Herssen,
 * Lynae, and Denia in Tune Strain mode.
 */
const TUNE_STRAIN_CHARACTERS = new Set(['mornye', 'qingxiao', 'luuk-herssen', 'lynae', 'denia']);

export function characterUsesTuneStrain(characterId: string): boolean {
  return TUNE_STRAIN_CHARACTERS.has(characterId);
}

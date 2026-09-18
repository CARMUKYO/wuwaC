import { CHAIN_PRESETS, type ChainMotionPreset } from '../data/chainPresets.ts';
import type { CharacterSkill, MotionBonusKind, SkillKind } from '../data/schema.ts';
import { aemeathSkillMods } from './aemeath.ts';
import { chisaSkillMods, isChisaParameterMotion, type ChisaModInputs } from './chisa.ts';
import { galbrenaSkillMods } from './galbrena.ts';
import { jiyanOutroLanceSpec } from './jiyan.ts';
import { lynaeSkillMods } from './lynae.ts';
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
  /** Skill-scoped crit extras (chain motion entries). Rate clamps at the crit seam. */
  critRateExtra: number;
  critDmgExtra: number;
  /** Motion-scoped DEF ignore (chain motion entries). Adds to sheet defIgnore. */
  defIgnoreExtra: number;
}

const NEUTRAL_MODS: ResolvedSkillMods = {
  motionMultiplier: 1,
  dmgBonusExtra: 0,
  amplifyExtra: 0,
  critRateExtra: 0,
  critDmgExtra: 0,
  defIgnoreExtra: 0,
};

/** Motion-scope chain transcriptions by character (rank-gated at consumption). */
const CHAIN_MOTION = new Map<string, ChainMotionPreset[]>();
for (const preset of CHAIN_PRESETS) {
  if (preset.scope !== 'motion') continue;
  const list = CHAIN_MOTION.get(preset.characterId);
  if (list) list.push(preset);
  else CHAIN_MOTION.set(preset.characterId, [preset]);
}

/**
 * Whether a motion-scope chain entry targets this (skill kind, motion).
 * Case-insensitive substring on the snapshot motion name plus optional
 * skill-kind / scored-bucket filters; unset filters match everything.
 * Exported for the dead-pattern test — every catalog entry must match
 * at least one real motion.
 */
export function chainMotionEntryMatches(
  entry: ChainMotionPreset,
  skillKind: SkillKind,
  motionName: string,
  motionDmgType?: MotionBonusKind,
): boolean {
  if (entry.skillKind !== undefined && entry.skillKind !== skillKind) return false;
  if (entry.dmgType !== undefined && entry.dmgType !== motionDmgType) return false;
  if (
    entry.motionNameIncludes !== undefined &&
    !motionName.toLowerCase().includes(entry.motionNameIncludes.toLowerCase())
  ) {
    return false;
  }
  return true;
}

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
  let mods: ResolvedSkillMods;
  if (characterId === 'zani') {
    mods = {
      ...NEUTRAL_MODS,
      motionMultiplier: zaniMotionMultiplier(characterId, resonanceChain, skill.kind, motionName, { ...inputs, forteLevel }),
    };
  } else if (characterId === 'yangyang-xuanling') {
    const xuanling = xuanlingSkillMods(characterId, resonanceChain, skill.kind, motionName, motionDmgType, inputs);
    mods = {
      motionMultiplier: xuanling.motionMultiplier,
      dmgBonusExtra: 0,
      amplifyExtra: xuanling.amplifyExtra,
      critRateExtra: 0,
      critDmgExtra: 0,
      defIgnoreExtra: 0,
    };
  } else if (characterId === 'chisa') {
    const chisa = chisaSkillMods(characterId, resonanceChain, skill, motionName, { ...inputs, forteLevel });
    mods = {
      motionMultiplier: chisa.motionMultiplier,
      dmgBonusExtra: chisa.dmgBonusExtra,
      amplifyExtra: 0,
      critRateExtra: 0,
      critDmgExtra: 0,
      defIgnoreExtra: 0,
    };
  } else if (characterId === 'aemeath') {
    const aemeath = aemeathSkillMods(characterId, resonanceChain, skill, motionName, motionDmgType);
    mods = {
      motionMultiplier: aemeath.motionMultiplier,
      dmgBonusExtra: aemeath.dmgBonusExtra,
      amplifyExtra: 0,
      critRateExtra: 0,
      critDmgExtra: 0,
      defIgnoreExtra: 0,
    };
  } else if (characterId === 'galbrena') {
    const galbrena = galbrenaSkillMods(characterId, resonanceChain, motionName);
    mods = {
      motionMultiplier: galbrena.motionMultiplier,
      dmgBonusExtra: galbrena.dmgBonusExtra,
      amplifyExtra: 0,
      critRateExtra: 0,
      critDmgExtra: 0,
      defIgnoreExtra: 0,
    };
  } else if (characterId === 'lynae') {
    const lynae = lynaeSkillMods(characterId, resonanceChain, skill, motionName);
    mods = {
      motionMultiplier: lynae.motionMultiplier,
      dmgBonusExtra: lynae.dmgBonusExtra,
      amplifyExtra: 0,
      critRateExtra: 0,
      critDmgExtra: 0,
      defIgnoreExtra: 0,
    };
  } else {
    mods = { ...NEUTRAL_MODS };
  }
  // Generic chain motion entries stack multiplicatively on top of any
  // module mods; skill-scoped crit extras sum additively (rate clamps at
  // the crit seam in computeDamage). Catalog discipline keeps modules and
  // entries disjoint (module-covered ranks carry `appliedElsewhere`
  // notes, never motion entries), and the per-module ratio tests pin
  // their totals against double-application.
  for (const entry of CHAIN_MOTION.get(characterId) ?? []) {
    if (entry.rank > resonanceChain) continue;
    if (!chainMotionEntryMatches(entry, skill.kind, motionName, motionDmgType)) continue;
    if (entry.motionMultiplier !== undefined) mods.motionMultiplier *= entry.motionMultiplier;
    if (entry.critRateExtra !== undefined) mods.critRateExtra += entry.critRateExtra;
    if (entry.critDmgExtra !== undefined) mods.critDmgExtra += entry.critDmgExtra;
    if (entry.defIgnoreExtra !== undefined) mods.defIgnoreExtra += entry.defIgnoreExtra;
  }
  return mods;
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

/**
 * Motions proven by kit prose to be coordinated attacks. These consume
 * the `dmgBonus:coordinated` bucket on top of their typed buckets
 * (Decision 3, reference doc §6 note). Listed only when the motion is
 * EXCLUSIVELY a coordinated attack — trigger hits whose prose says
 * "triggers N Coordinated Attacks" are the trigger, not the damage:
 * - Yinlin "Judgment Strike Damage" (Forte 1001507: "triggering
 *   Coordinated Attacks ... Judgement Strike deals Resonance Skill DMG").
 * - Verina "Coordinated Attack DMG" (Liberation 1000303 Photosynthesis
 *   Mark; the Healing twin scores 0 regardless and is not listed).
 * - Yuanwu "Thunder Wedge Coordinated Attack DMG" (Skill 1001602 Thunder
 *   Field; DEF-scaling per its motion row).
 * - Mortefi "Marcato Damage" (Liberation 1001203: "launches a Coordinated
 *   Attack, firing 1 Marcato"; the cast hit is "Violent Finale Damage").
 * - Zhezhi "Inklit Spirit DMG" (Liberation 1002203, its only motion:
 *   "summoned to perform a Coordinated Attack ... considered as Basic
 *   Attack DMG").
 * - Cantarella "Diffusion DMG" (Liberation 1003103: "summon Dreamweavers
 *   to perform Coordinated Attack"; hits: 21 = max Dreamweavers).
 * - Baizhi "Remnant Entities Damage" (Liberation 1000403: stacks "are
 *   automatically consumed to perform Coordinated Attacks"; HP-scaling
 *   per its motion row; the Healing twin scores 0 and is not listed).
 * Deliberately unlisted (2026-09-17): Cantarella "Tidal Surge DMG" and
 * "Phantom Sting Stage 3 DMG" merely TRIGGER 3 coordinated attacks each
 * — Tidal/Ripple MV parity (0.85) proves the triggered damage is not
 * folded into the trigger's MV, and no separate MVs exist. Chain-gated
 * coordinated hits (Calcharo S6, Mortefi/Zhezhi chains) stay with the
 * untranscribed-chain warnings.
 * Jiyan's outro lance is not listed here — it has no motion values and
 * scores through jiyan.ts instead (see isBuffOnlySkill).
 */
const COORDINATED_MOTIONS: Record<string, string[]> = {
  yinlin: ['Judgment Strike Damage'],
  verina: ['Coordinated Attack DMG'],
  yuanwu: ['Thunder Wedge Coordinated Attack DMG'],
  mortefi: ['Marcato Damage'],
  zhezhi: ['Inklit Spirit DMG'],
  cantarella: ['Diffusion DMG'],
  baizhi: ['Remnant Entities Damage'],
};

export function characterCoordinatedMotions(characterId: string): string[] {
  return COORDINATED_MOTIONS[characterId] ?? [];
}

export function isCoordinatedMotion(characterId: string | undefined, motionName: string): boolean {
  if (characterId === undefined) return false;
  return (COORDINATED_MOTIONS[characterId] ?? []).includes(motionName);
}

/**
 * Whether a skill is damage-free for this character. Jiyan's outro looks
 * buff-carrier-shaped (no motion values) but scores its coordinated lance
 * — everything else with no motions is a true buff carrier.
 */
export function isBuffOnlySkill(characterId: string, skill: CharacterSkill): boolean {
  if (skill.motionValues.length > 0) return false;
  return jiyanOutroLanceSpec(characterId, skill, '') === null;
}

/**
 * Whether a snapshot motion row is a scaling parameter rather than a
 * scorable hit (offered by no rotation picker). Currently only Chisa's
 * per-Ring row; routed here so components never hardcode character ids.
 */
export function isParameterMotionRow(characterId: string, motionName: string): boolean {
  if (characterId === 'chisa') return isChisaParameterMotion(motionName);
  return false;
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

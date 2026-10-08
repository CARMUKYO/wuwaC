import {
  attributeSchema,
  type Attribute,
  type CharacterSkill,
  type DamageType,
  type MotionBonusKind,
} from '../data/schema.ts';
import { computeAbilityStat, computeAtk, type StatSheet } from './stats.ts';
import {
  aeroErosionMultiplier,
  cartethyiaConvictionCritDmg,
  cartethyiaMotionMultiplier,
  cartethyiaStatusTargetMultiplier,
} from './cartethyia.ts';
import { AEMEATH_S6_FIXED_CRIT } from './aemeath.ts';
import {
  characterResonanceModes,
  characterSkillMods,
  isCoordinatedMotion,
  tuneResponseStackRate,
  type ResonanceMode,
} from './characterMods.ts';
import { jiyanOutroLanceSpec } from './jiyan.ts';
import { camellyaOutroTwiningSpec } from './camellya.ts';
import { hsinOutroSpec } from './hsin.ts';
import { xiangliyaoOutroChainRuleSpec } from './xiangliyao.ts';
import {
  havocBaneDefReduction,
  maxStatusStacks,
  negativeStatusDef,
  negativeStatusLevelMultiplier,
  statusStackMultiplier,
  type NegativeStatusType,
} from './negativeStatus.ts';
import { xuanlingBaneTargetAmplify } from './xuanling.ts';

/**
 * Domain layer: damage formula (reference doc §6, Fandom wiki Damage page).
 * One small pure function per named quantity, composed by `computeDamage`.
 * No React. Ratios are decimals (0.1 = 10%).
 */

// --- Enemy / target ------------------------------------------------------------
/**
 * Enemy-side inputs. Per-enemy data — never hardcoded into the formula;
 * callers supply it (stock profiles below cover tests and v1 defaults).
 */
export interface EnemyProfile {
  name: string;
  level: number;
  baseResistance: Record<Attribute, number>;
  /** Override for the default `8 × level + 792` DEF curve. */
  enemyDefOverride?: number;
  dmgReductionBase: number;
  dmgReductionAdditional: number;
  elemReductionBase: number;
  elemReductionAdditional: number;
  /** Target-side DMG amplify (signed — can be a reduction). */
  amplifyTarget: number;
}

function zeroResistances(): Record<Attribute, number> {
  return Object.fromEntries(attributeSchema.options.map((a) => [a, 0])) as Record<Attribute, number>;
}

/** Generic non-boss enemy: 10% base resistance per element (doc §6). */
export function standardMob(level: number): EnemyProfile {
  const baseResistance = zeroResistances();
  for (const a of attributeSchema.options) baseResistance[a] = 0.1;
  return {
    name: `Level ${level} mob`,
    level,
    baseResistance,
    dmgReductionBase: 0,
    dmgReductionAdditional: 0,
    elemReductionBase: 0,
    elemReductionAdditional: 0,
    amplifyTarget: 0,
  };
}

/** Elemental boss: 40% in its element, 10% elsewhere (doc §6). */
export function elementalBoss(level: number, attribute: Attribute): EnemyProfile {
  const enemy = standardMob(level);
  enemy.name = `Level ${level} ${attribute} boss`;
  enemy.baseResistance[attribute] = 0.4;
  return enemy;
}

// --- Base ------------------------------------------------------------------------
/** BaseAbilityDamage = AbilityAttributeStat × MotionValuePercent. */
export function computeBaseAbilityDamage(abilityStat: number, motionPercent: number): number {
  return abilityStat * motionPercent;
}

/** BaseDamage = BaseAbilityDamage + FlatDamage + FlatBonusPercent. */
export function computeBaseDamage(
  baseAbilityDamage: number,
  flatDamage: number,
  flatBonusPercent: number,
): number {
  return baseAbilityDamage + flatDamage + flatBonusPercent;
}

// --- Resistances -------------------------------------------------------------------
/** Piecewise resistance multiplier on total resistance (doc §6). */
export function computeResMultiplier(resTotal: number): number {
  if (resTotal < 0) return 1 - resTotal / 2;
  if (resTotal < 0.8) return 1 - resTotal;
  return 1 / (1 + 5 * resTotal);
}

export interface DefMultiplierInput {
  attackerLevel: number;
  enemyLevel: number;
  enemyDefOverride?: number;
  defIgnore: number;
  defReduction: number;
  /**
   * Percentage of enemy DEF removed (e.g. Havoc Bane stacks). Applies to
   * the curved DEF after the flat reduction, before the ratio.
   */
  enemyDefPctReduction?: number;
}

/**
 * DEF multiplier. Flat DEF Reduction applies to enemy DEF before the ratio;
 * the ratio is capped at 200% (doc §6) — high DEF Ignore can amplify.
 */
export function computeDefMultiplier(input: DefMultiplierInput): number {
  const { attackerLevel, enemyLevel, enemyDefOverride, defIgnore, defReduction } = input;
  const enemyDef = enemyDefOverride ?? (8 * enemyLevel + 792);
  const pct = input.enemyDefPctReduction ?? 0;
  const effectiveDef = Math.max(0, enemyDef - defReduction) * Math.max(0, 1 - pct);
  const numerator = 800 + 8 * attackerLevel;
  const ratio = numerator / (numerator + effectiveDef * (1 - defIgnore));
  return Math.min(ratio, 2);
}

/** DmgReductionTotal = 1 − (base + additional). */
export function computeDmgReductionTotal(base: number, additional: number): number {
  return 1 - (base + additional);
}

/** ElemReductionTotal = 1 − (base + additional). Independent of the above. */
export function computeElemReductionTotal(base: number, additional: number): number {
  return 1 - (base + additional);
}

// --- Bonuses -------------------------------------------------------------------------
/**
 * DmgBonusPercent = 1 + AllDmgBonus: matching attribute bucket + matching
 * action-type bucket (doc §6, wiki: "On hit, the attack will use its
 * corresponding Type Bonus").
 *
 * The bucket comes from the motion's own `dmgType` (provider
 * DamageList.Type per hit), NOT the parent skill kind — e.g. Luuk
 * Herssen's Liberation scores against `dmgBonus:basic`, Jiyan's
 * Liberation against `dmgBonus:heavy`. `forte` is only the fallback for
 * genuinely unknown types and keeps the v1 attribute-only behavior.
 *
 * Coordinated attacks additionally consume `dmgBonus:coordinated` (Decision
 * 3, reference doc §6 note): same additive `AllDmgBonus` sum — the formula
 * tree has no separate multiplicative term for named damage subtypes.
 */
export function computeDmgBonusPercent(
  sheet: StatSheet,
  attribute: Attribute,
  kind: DamageType | 'forte',
  extra = 0,
  isCoordinated = false,
): number {
  const attributeBonus = sheet[`dmgBonus:${attribute}`];
  const bucketBonus = kind === 'forte' ? 0 : sheet[`dmgBonus:${kind}`];
  const coordinatedBonus = isCoordinated ? sheet['dmgBonus:coordinated'] : 0;
  return 1 + attributeBonus + bucketBonus + extra + coordinatedBonus;
}

/** DmgAmplifyTotal = 1 + (target + attacker). Signed — keep separate from the additive bucket. */
export function computeDmgAmplifyTotal(amplifyAttacker: number, amplifyTarget: number): number {
  return 1 + amplifyTarget + amplifyAttacker;
}

/**
 * SpecialDmgPercent = 1 + specialBase + specialBonus.
 * Zero for every live kit today; modeled for completeness (doc §6).
 */
export function computeSpecialDmgPercent(specialBase: number, specialBonus: number): number {
  return 1 + specialBase + specialBonus;
}

export type CritMode = 'expected' | 'crit' | 'nonCrit';

/**
 * Crit multiplier. `critDmg` is the ratio form (1.5 = 150%).
 * Expected mode clamps CritRate to [0, 1] — rate above 100% is wasted.
 */
export function computeCritMultiplier(
  critRate: number,
  critDmg: number,
  mode: CritMode,
): number {
  if (mode === 'crit') return critDmg;
  if (mode === 'nonCrit') return 1;
  const clamped = Math.min(1, Math.max(0, critRate));
  return clamped * critDmg + (1 - clamped) * 1;
}

// --- Motion resolution ---------------------------------------------------------------
export interface ResolvedMotion {
  name: string;
  ratio: number;
  flat: number;
  hits: number;
  dmgType: MotionBonusKind;
  scaling: 'ATK' | 'HP' | 'DEF';
  isHealing: boolean;
}

/**
 * Pick the motion component for (skill, forteLevel).
 *
 * Index mapping (verified 2026-09-17 against the live provider record
 * for Yangyang, encore id 1402): every `DamageList[].RateLv` — the
 * combat-formula source — carries exactly 10 entries matching
 * `SkillAttributes.values[0..9]` (Lv10 Stage 1 = 44.73% at index 9), so
 * index = forteLevel − 1 over levels 1–10. Entries 10–19 are an
 * unlabeled second track the formula never addresses; they are
 * intentionally ignored. Pinned by unit test.
 *
 * Multi-hit scoring decision: ratios are hit-TOTALS — the sync parser
 * folds the hit count into the ratio (`11.33%*8` → 0.9064), so each
 * motion scores exactly once. `hits` is informational (per-hit
 * crit-variance is not modeled; expected-mode averaging is exact for
 * totals regardless of hit count).
 */
export function resolveMotion(
  skill: CharacterSkill,
  motionName: string,
  forteLevel: number,
): ResolvedMotion {
  const component = skill.motionValues.find((m) => m.name === motionName);
  if (!component) {
    throw new Error(`skill "${skill.label}" has no motion component ${JSON.stringify(motionName)}`);
  }
  const index = Math.min(Math.max(forteLevel - 1, 0), component.values.length - 1);
  return {
    name: component.name,
    ratio: component.values[index],
    flat: component.flatValues?.[index] ?? 0,
    hits: component.hits,
    dmgType: component.dmgType ?? skill.kind,
    scaling: component.scaling ?? skill.scaling,
    isHealing: component.isHealing ?? /healing/i.test(component.name),
  };
}

// --- Top level ----------------------------------------------------------------------------
export interface DamageContext {
  sheet: StatSheet;
  baseAtk: { character: number; weapon: number };
  /** Character HP/DEF bases (no weapon base exists for either stat). */
  baseHp: { character: number };
  baseDef: { character: number };
  attackerLevel: number;
  skill: CharacterSkill;
  motionName: string;
  forteLevel: number;
  enemy: EnemyProfile;
  crit: CritMode;
  /** Flat damage added after ability scaling (default 0). */
  flatDamage?: number;
  /** Percent-sourced flat addition (default 0). */
  flatBonusPercent?: number;
  /** Character context for conditional sequence-node mechanics. */
  characterId?: string;
  resonanceChain?: number;
  /** Aero Erosion stacks currently on the target (Cartethyia passive/S6). */
  targetStatusStacks?: number;
  conviction?: number;
  /** Havoc Bane stacks on the target — percentage DEF reduction. */
  targetHavocBaneStacks?: number;
  /** Kit-state inputs for per-character modules (Zani Blazes, Xuanling Voice Flux, Chisa rings/state, Suoming Seal Master). */
  blazesConsumed?: number;
  nightfallBlazes?: number;
  ringsConsumed?: number;
  voiceFlux?: boolean;
  wovenMyriad?: boolean;
  sealMaster?: boolean;
  /** Tune Strain - Interfered stacks on the target (total-DMG amp). */
  tuneStrainStacks?: number;
}

export interface DamageResult {
  damage: number;
  baseDamage: number;
  resistances: number;
  bonuses: number;
}

/**
 * Fixed-crit override for status damage that can critically hit with
 * kit-specified values (e.g. Aemeath S6: 80% rate, 275% DMG). Applied as
 * an expected value — status detonations have no per-hit crit roll input.
 */
export interface FixedStatusCrit {
  rate: number;
  dmg: number;
}

export interface NegativeStatusDamageContext {
  sheet: StatSheet;
  status: NegativeStatusType;
  stacks: number;
  attackerLevel: number;
  enemy: EnemyProfile;
  /** Chain-gated cap extensions resolve via maxStatusStacks. */
  resonanceChain?: number;
  characterId?: string;
  /** Target stacks for Cartethyia's status-dependent incoming-damage bonus. */
  targetStatusStacks?: number;
  /** Havoc Bane stacks on the target — percentage DEF reduction. */
  targetHavocBaneStacks?: number;
  critOverride?: FixedStatusCrit;
}

/** Base damage for one Negative Status detonation. */
export function computeNegativeStatusBaseDamage(
  status: NegativeStatusType,
  attackerLevel: number,
  stacks: number,
): number {
  // Aero Erosion resolves through the Cartethyia module so S2's 7–9
  // extension applies; every other status uses its published table.
  const stackMult = status === 'aeroErosion'
    ? aeroErosionMultiplier(stacks)
    : statusStackMultiplier(status, stacks);
  return negativeStatusLevelMultiplier(attackerLevel) * 1.25078 * stackMult;
}

/** Expected-value multiplier for fixed-crit status damage. */
export function computeFixedStatusCritMultiplier(crit: FixedStatusCrit): number {
  const rate = Math.min(1, Math.max(0, crit.rate));
  return rate * crit.dmg + (1 - rate) * 1;
}

/**
 * Negative Status damage has its own rules: no Crit (unless a kit grants
 * fixed-crit via critOverride), no attribute/action DMG bonus, and only
 * Negative Status DMG Amplify from the stat sheet. It still uses the
 * target's RES/DEF and target-side reductions — including Elemental
 * Reduction, which the wiki flags as unconfirmed for status damage but
 * which stays in the pipeline pending contrary evidence (Phase 0, G5).
 */
export function computeNegativeStatusDamage(ctx: NegativeStatusDamageContext): DamageResult {
  const def = negativeStatusDef(ctx.status);
  if (!def.dealsDamage) {
    throw new Error(`${def.label} deals no damage — model it as enemy DEF reduction, not a detonation`);
  }
  const maxStacks = maxStatusStacks(ctx.status, ctx.characterId, ctx.resonanceChain ?? 0);
  if (ctx.stacks > maxStacks) {
    throw new Error(`${def.label} supports at most ${maxStacks} stacks at S${ctx.resonanceChain ?? 0}`);
  }

  const baseDamage = computeNegativeStatusBaseDamage(ctx.status, ctx.attackerLevel, ctx.stacks);
  const resTotal = ctx.enemy.baseResistance[def.element] + ctx.sheet.resistancePenetration;
  const resistances =
    computeResMultiplier(resTotal) *
    computeDefMultiplier({
      attackerLevel: ctx.attackerLevel,
      enemyLevel: ctx.enemy.level,
      enemyDefOverride: ctx.enemy.enemyDefOverride,
      defIgnore: ctx.sheet.defIgnore,
      defReduction: ctx.sheet.defReduction,
      enemyDefPctReduction: havocBaneDefReduction(ctx.targetHavocBaneStacks ?? 0),
    }) *
    computeDmgReductionTotal(ctx.enemy.dmgReductionBase, ctx.enemy.dmgReductionAdditional) *
    computeElemReductionTotal(ctx.enemy.elemReductionBase, ctx.enemy.elemReductionAdditional);
  const bonuses = (1 + ctx.sheet.negativeStatusAmplify) *
    (ctx.critOverride ? computeFixedStatusCritMultiplier(ctx.critOverride) : 1);
  const fleurdelysMultiplier = ctx.characterId === 'cartethyia' && (ctx.resonanceChain ?? 0) >= 6 ? 1.4 : 1;
  const targetMultiplier = ctx.characterId === 'cartethyia' && ctx.targetStatusStacks && ctx.targetStatusStacks > 0
    ? cartethyiaStatusTargetMultiplier(ctx.targetStatusStacks)
    : 1;

  return {
    damage: baseDamage * resistances * bonuses * targetMultiplier * fleurdelysMultiplier,
    baseDamage,
    resistances,
    bonuses: bonuses * targetMultiplier * fleurdelysMultiplier,
  };
}

/**
 * Damage = BaseDamage × Resistances × Bonuses (doc §6, Fandom wiki Damage).
 * BaseAbilityDamage = AbilityAttributeStat × MotionValuePercent, where the
 * stat is ATK/HP/DEF per the skill's scaling tag (wiki: "Abilities scale
 * with ATK unless specifically mentioned"). HP/DEF totals mirror the ATK
 * shape without a weapon base (wiki HP page). Healing motions score 0.
 */
export interface JiyanLanceDamageContext {
  sheet: StatSheet;
  /** Lance motion value from `jiyanOutroLanceSpec` (carries the S5 chain multiplier). */
  motionValue: number;
  baseAtk: { character: number; weapon: number };
  attackerLevel: number;
  enemy: EnemyProfile;
  crit: CritMode;
  /** Havoc Bane stacks on the target — percentage DEF reduction. */
  targetHavocBaneStacks?: number;
}

/**
 * Jiyan's Outro coordinated lance (jiyan.ts prose spec). Attribute bucket
 * plus the coordinated bucket, no action-type bucket (unstated in kit —
 * see jiyan.ts) and no kit mods; otherwise the standard formula tree.
 */
export function computeJiyanLanceDamage(ctx: JiyanLanceDamageContext): DamageResult {
  const { sheet, enemy } = ctx;
  const abilityStat = computeAtk(ctx.baseAtk.character, ctx.baseAtk.weapon, sheet);
  const baseDamage = computeBaseAbilityDamage(abilityStat, ctx.motionValue);
  const resTotal = enemy.baseResistance.Aero + sheet.resistancePenetration;
  const resistances =
    computeResMultiplier(resTotal) *
    computeDefMultiplier({
      attackerLevel: ctx.attackerLevel,
      enemyLevel: enemy.level,
      enemyDefOverride: enemy.enemyDefOverride,
      defIgnore: sheet.defIgnore,
      defReduction: sheet.defReduction,
      enemyDefPctReduction: havocBaneDefReduction(ctx.targetHavocBaneStacks ?? 0),
    }) *
    computeDmgReductionTotal(enemy.dmgReductionBase, enemy.dmgReductionAdditional) *
    computeElemReductionTotal(enemy.elemReductionBase, enemy.elemReductionAdditional);
  const bonuses =
    computeDmgBonusPercent(sheet, 'Aero', 'forte', 0, true) *
    computeDmgAmplifyTotal(sheet.amplify, enemy.amplifyTarget) *
    computeSpecialDmgPercent(sheet.specialBase, sheet.specialBonus) *
    computeCritMultiplier(sheet.critRate, sheet.critDmg, ctx.crit);
  return { damage: baseDamage * resistances * bonuses, baseDamage, resistances, bonuses };
}

export interface CamellyaTwiningDamageContext {
  sheet: StatSheet;
  /** Twining motion value from `camellyaOutroTwiningSpec` (carries the S5 chain multiplier). */
  motionValue: number;
  baseAtk: { character: number; weapon: number };
  attackerLevel: number;
  enemy: EnemyProfile;
  crit: CritMode;
  /** Havoc Bane stacks on the target — percentage DEF reduction. */
  targetHavocBaneStacks?: number;
}

/**
 * Camellya's Outro (Twining) damage (camellya.ts prose spec). Havoc
 * attribute bucket only — no action-type bucket is stated in kit, and
 * Twining is not a coordinated attack (unlike the Jiyan lance); no kit
 * mods; otherwise the standard formula tree.
 */
export function computeCamellyaTwiningDamage(ctx: CamellyaTwiningDamageContext): DamageResult {
  const { sheet, enemy } = ctx;
  const abilityStat = computeAtk(ctx.baseAtk.character, ctx.baseAtk.weapon, sheet);
  const baseDamage = computeBaseAbilityDamage(abilityStat, ctx.motionValue);
  const resTotal = enemy.baseResistance.Havoc + sheet.resistancePenetration;
  const resistances =
    computeResMultiplier(resTotal) *
    computeDefMultiplier({
      attackerLevel: ctx.attackerLevel,
      enemyLevel: enemy.level,
      enemyDefOverride: enemy.enemyDefOverride,
      defIgnore: sheet.defIgnore,
      defReduction: sheet.defReduction,
      enemyDefPctReduction: havocBaneDefReduction(ctx.targetHavocBaneStacks ?? 0),
    }) *
    computeDmgReductionTotal(enemy.dmgReductionBase, enemy.dmgReductionAdditional) *
    computeElemReductionTotal(enemy.elemReductionBase, enemy.elemReductionAdditional);
  const bonuses =
    computeDmgBonusPercent(sheet, 'Havoc', 'forte', 0, false) *
    computeDmgAmplifyTotal(sheet.amplify, enemy.amplifyTarget) *
    computeSpecialDmgPercent(sheet.specialBase, sheet.specialBonus) *
    computeCritMultiplier(sheet.critRate, sheet.critDmg, ctx.crit);
  return { damage: baseDamage * resistances * bonuses, baseDamage, resistances, bonuses };
}

export interface XiangliyaoChainRuleDamageContext {
  sheet: StatSheet;
  /** Chain Rule motion value from `xiangliyaoOutroChainRuleSpec` (carries the S5 chain multiplier). */
  motionValue: number;
  baseAtk: { character: number; weapon: number };
  attackerLevel: number;
  enemy: EnemyProfile;
  crit: CritMode;
  /** Havoc Bane stacks on the target — percentage DEF reduction. */
  targetHavocBaneStacks?: number;
}

/**
 * Xiangli Yao's Outro (Chain Rule) damage (xiangliyao.ts prose spec).
 * Electro attribute bucket only — no action-type bucket is stated in
 * kit, and Chain Rule is not a coordinated attack (unlike the Jiyan
 * lance); no kit mods; otherwise the standard formula tree.
 */
export function computeXiangliyaoChainRuleDamage(ctx: XiangliyaoChainRuleDamageContext): DamageResult {
  const { sheet, enemy } = ctx;
  const abilityStat = computeAtk(ctx.baseAtk.character, ctx.baseAtk.weapon, sheet);
  const baseDamage = computeBaseAbilityDamage(abilityStat, ctx.motionValue);
  const resTotal = enemy.baseResistance.Electro + sheet.resistancePenetration;
  const resistances =
    computeResMultiplier(resTotal) *
    computeDefMultiplier({
      attackerLevel: ctx.attackerLevel,
      enemyLevel: enemy.level,
      enemyDefOverride: enemy.enemyDefOverride,
      defIgnore: sheet.defIgnore,
      defReduction: sheet.defReduction,
      enemyDefPctReduction: havocBaneDefReduction(ctx.targetHavocBaneStacks ?? 0),
    }) *
    computeDmgReductionTotal(enemy.dmgReductionBase, enemy.dmgReductionAdditional) *
    computeElemReductionTotal(enemy.elemReductionBase, enemy.elemReductionAdditional);
  const bonuses =
    computeDmgBonusPercent(sheet, 'Electro', 'forte', 0, false) *
    computeDmgAmplifyTotal(sheet.amplify, enemy.amplifyTarget) *
    computeSpecialDmgPercent(sheet.specialBase, sheet.specialBonus) *
    computeCritMultiplier(sheet.critRate, sheet.critDmg, ctx.crit);
  return { damage: baseDamage * resistances * bonuses, baseDamage, resistances, bonuses };
}

export interface HsinOutroDamageContext {
  sheet: StatSheet;
  /** Outro motion value from `hsinOutroSpec` (100% ATK, no chain scaling). */
  motionValue: number;
  baseAtk: { character: number; weapon: number };
  attackerLevel: number;
  enemy: EnemyProfile;
  crit: CritMode;
  /** Havoc Bane stacks on the target — percentage DEF reduction. */
  targetHavocBaneStacks?: number;
}

/**
 * Hsin's Outro damage (hsin.ts prose spec). Electro attribute bucket only —
 * no action-type bucket is stated in kit, and the outro hit is not a
 * coordinated attack (unlike the Jiyan lance); no kit mods; otherwise the
 * standard formula tree.
 */
export function computeHsinOutroDamage(ctx: HsinOutroDamageContext): DamageResult {
  const { sheet, enemy } = ctx;
  const abilityStat = computeAtk(ctx.baseAtk.character, ctx.baseAtk.weapon, sheet);
  const baseDamage = computeBaseAbilityDamage(abilityStat, ctx.motionValue);
  const resTotal = enemy.baseResistance.Electro + sheet.resistancePenetration;
  const resistances =
    computeResMultiplier(resTotal) *
    computeDefMultiplier({
      attackerLevel: ctx.attackerLevel,
      enemyLevel: enemy.level,
      enemyDefOverride: enemy.enemyDefOverride,
      defIgnore: sheet.defIgnore,
      defReduction: sheet.defReduction,
      enemyDefPctReduction: havocBaneDefReduction(ctx.targetHavocBaneStacks ?? 0),
    }) *
    computeDmgReductionTotal(enemy.dmgReductionBase, enemy.dmgReductionAdditional) *
    computeElemReductionTotal(enemy.elemReductionBase, enemy.elemReductionAdditional);
  const bonuses =
    computeDmgBonusPercent(sheet, 'Electro', 'forte', 0, false) *
    computeDmgAmplifyTotal(sheet.amplify, enemy.amplifyTarget) *
    computeSpecialDmgPercent(sheet.specialBase, sheet.specialBonus) *
    computeCritMultiplier(sheet.critRate, sheet.critDmg, ctx.crit);
  return { damage: baseDamage * resistances * bonuses, baseDamage, resistances, bonuses };
}

/**
 * Snapshot rows whose prose exempts them from DMG Bonus. Keys are
 * `characterId|skillId|motionName` (exact snapshot motion names):
 * - galbrena 1004007: "deal a fixed amount of Fusion DMG, considered
 *   Basic Attack DMG that does not bear any effect from DMG buffs"
 *   (Hellstride).
 * - yangyang-xuanling 1005407: "deal a fixed instance of Havoc DMG,
 *   considered Basic Attack DMG, which is not affected by any DMG Bonus
 *   effects" (Wraith of Sound).
 * - jingran 1005901: "dealing fix amount of Fusion DMG, considered Basic
 *   Attack DMG. This instance of damage is not affect by any DMG Bonus
 *   effects" (Shadow Step).
 * - luuk-herssen 1004707: "Deal fixed Spectro DMG, considered Basic
 *   Attack DMG that is not affected by any DMG Bonus" (Ichor Blade;
 *   snapshot row name carries the "(per 0.15s)" suffix).
 */
export const BUFF_IMMUNE_MOTIONS: ReadonlySet<string> = new Set([
  'galbrena|1004007|Hellstride DMG',
  'yangyang-xuanling|1005407|Wraith of Sound DMG',
  'jingran|1005901|Shadow Step DMG',
  'luuk-herssen|1004707|Ichor Blade DMG (per 0.15s)',
]);

/** Whether this motion ignores the DmgBonusPercent term (see set above). */
export function isBuffImmuneMotion(
  characterId: string | undefined,
  skillId: string,
  motionName: string,
): boolean {
  if (characterId === undefined) return false;
  return BUFF_IMMUNE_MOTIONS.has(`${characterId}|${skillId}|${motionName}`);
}

export function computeDamage(ctx: DamageContext): DamageResult {
  const { sheet, skill, enemy } = ctx;
  const lance = jiyanOutroLanceSpec(ctx.characterId, skill, ctx.motionName, ctx.resonanceChain ?? 0);
  if (lance !== null) {
    return computeJiyanLanceDamage({
      sheet,
      motionValue: lance.motionValue,
      baseAtk: ctx.baseAtk,
      attackerLevel: ctx.attackerLevel,
      enemy,
      crit: ctx.crit,
      targetHavocBaneStacks: ctx.targetHavocBaneStacks,
    });
  }
  const twining = camellyaOutroTwiningSpec(ctx.characterId, skill, ctx.motionName, ctx.resonanceChain ?? 0);
  if (twining !== null) {
    return computeCamellyaTwiningDamage({
      sheet,
      motionValue: twining.motionValue,
      baseAtk: ctx.baseAtk,
      attackerLevel: ctx.attackerLevel,
      enemy,
      crit: ctx.crit,
      targetHavocBaneStacks: ctx.targetHavocBaneStacks,
    });
  }
  const chainRule = xiangliyaoOutroChainRuleSpec(ctx.characterId, skill, ctx.motionName, ctx.resonanceChain ?? 0);
  if (chainRule !== null) {
    return computeXiangliyaoChainRuleDamage({
      sheet,
      motionValue: chainRule.motionValue,
      baseAtk: ctx.baseAtk,
      attackerLevel: ctx.attackerLevel,
      enemy,
      crit: ctx.crit,
      targetHavocBaneStacks: ctx.targetHavocBaneStacks,
    });
  }
  const hsinOutro = hsinOutroSpec(ctx.characterId, skill, ctx.motionName);
  if (hsinOutro !== null) {
    return computeHsinOutroDamage({
      sheet,
      motionValue: hsinOutro.motionValue,
      baseAtk: ctx.baseAtk,
      attackerLevel: ctx.attackerLevel,
      enemy,
      crit: ctx.crit,
      targetHavocBaneStacks: ctx.targetHavocBaneStacks,
    });
  }
  const motion = resolveMotion(skill, ctx.motionName, ctx.forteLevel);
  if (motion.isHealing) {
    return { damage: 0, baseDamage: 0, resistances: 1, bonuses: 1 };
  }
  const abilityStat = computeAbilityStat(
    motion.scaling,
    {
      atkCharacter: ctx.baseAtk.character,
      atkWeapon: ctx.baseAtk.weapon,
      hpCharacter: ctx.baseHp.character,
      defCharacter: ctx.baseDef.character,
    },
    sheet,
  );
  const baseAbilityDamage = computeBaseAbilityDamage(abilityStat, motion.ratio);
  const rawBaseDamage = computeBaseDamage(
    baseAbilityDamage,
    motion.flat + (ctx.flatDamage ?? 0),
    ctx.flatBonusPercent ?? 0,
  );
  const kitMods = characterSkillMods(
    ctx.characterId,
    ctx.resonanceChain ?? 0,
    skill,
    motion.name,
    motion.dmgType,
    ctx.forteLevel,
    {
      blazesConsumed: ctx.blazesConsumed,
      nightfallBlazes: ctx.nightfallBlazes,
      ringsConsumed: ctx.ringsConsumed,
      voiceFlux: ctx.voiceFlux,
      wovenMyriad: ctx.wovenMyriad,
      sealMaster: ctx.sealMaster,
    },
  );
  const baseDamage = rawBaseDamage * kitMods.motionMultiplier * cartethyiaMotionMultiplier(
    ctx.characterId,
    ctx.resonanceChain ?? 0,
    skill,
    motion.name,
    ctx.targetStatusStacks ?? 0,
  );

  const resTotal = enemy.baseResistance[skill.attribute] + sheet.resistancePenetration;
  const resistances =
    computeResMultiplier(resTotal) *
    computeDefMultiplier({
      attackerLevel: ctx.attackerLevel,
      enemyLevel: enemy.level,
      enemyDefOverride: enemy.enemyDefOverride,
      defIgnore: sheet.defIgnore + kitMods.defIgnoreExtra,
      defReduction: sheet.defReduction,
      enemyDefPctReduction: havocBaneDefReduction(ctx.targetHavocBaneStacks ?? 0),
    }) *
    computeDmgReductionTotal(enemy.dmgReductionBase, enemy.dmgReductionAdditional) *
    computeElemReductionTotal(enemy.elemReductionBase, enemy.elemReductionAdditional);

  const kind = motion.dmgType;
  // Narrow reading: buff-immune prose ("not affected by any DMG Bonus")
  // skips ONLY the DmgBonusPercent term — amplify, crit, resistance, and
  // DEF terms still apply. Refinable against in-game testing.
  const dmgBonusTerm = isBuffImmuneMotion(ctx.characterId, skill.id, motion.name)
    ? 1
    : computeDmgBonusPercent(
      sheet,
      skill.attribute,
      kind,
      kitMods.dmgBonusExtra,
      isCoordinatedMotion(ctx.characterId, motion.name),
    );
  const bonuses =
    dmgBonusTerm *
    computeDmgAmplifyTotal(
      sheet.amplify +
        kitMods.amplifyExtra +
        (ctx.characterId === 'yangyang-xuanling'
          ? xuanlingBaneTargetAmplify(ctx.targetHavocBaneStacks ?? 0)
          : 0),
      enemy.amplifyTarget,
    ) *
    computeTuneStrainMultiplier(sheet.tuneBreakBoost, ctx.tuneStrainStacks ?? 0) *
    computeSpecialDmgPercent(sheet.specialBase, sheet.specialBonus) *
    computeCritMultiplier(
      sheet.critRate + kitMods.critRateExtra,
      sheet.critDmg +
        kitMods.critDmgExtra +
        cartethyiaConvictionCritDmg(
          ctx.characterId,
          ctx.resonanceChain ?? 0,
          skill,
          ctx.conviction ?? 0,
        ),
      ctx.crit,
    );

  return { damage: baseDamage * resistances * bonuses, baseDamage, resistances, bonuses };
}

export interface EchoSkillDamageContext {
  sheet: StatSheet;
  baseAtk: { character: number; weapon: number };
  baseHp: { character: number };
  baseDef: { character: number };
  /** Which character stat the echo skill scales off (parser tail, default ATK). */
  scaling: 'ATK' | 'HP' | 'DEF';
  /** Ratio-of-scaling-stat part (block data, explicit). */
  motionValue: number;
  /** Flat part of `N%+M` hybrids (default 0). */
  flatDamage?: number;
  /** The ECHO's damage element — usually not the character's attribute. */
  attribute: Attribute;
  attackerLevel: number;
  enemy: EnemyProfile;
  crit: CritMode;
  /** Havoc Bane stacks on the target — percentage DEF reduction. */
  targetHavocBaneStacks?: number;
  /** Tune Strain - Interfered stacks on the target (total-DMG amp). */
  tuneStrainStacks?: number;
}

/**
 * Slot-1 Echo skill damage: the standard formula tree with the echo's own
 * damage element and the `dmgBonus:echo` bucket (attribute + echo, the
 * same two-bucket shape as kit motions). One call scores one hit/stage —
 * multi-hit skills compose via multiple blocks. No kit mods apply.
 */
export function computeEchoSkillDamage(ctx: EchoSkillDamageContext): DamageResult {
  if (!(ctx.motionValue >= 0) || !Number.isFinite(ctx.motionValue)) {
    throw new Error(`echo motion value must be a non-negative number, got ${ctx.motionValue}`);
  }
  const { sheet, enemy } = ctx;
  const abilityStat = computeAbilityStat(
    ctx.scaling,
    {
      atkCharacter: ctx.baseAtk.character,
      atkWeapon: ctx.baseAtk.weapon,
      hpCharacter: ctx.baseHp.character,
      defCharacter: ctx.baseDef.character,
    },
    sheet,
  );
  const baseDamage = computeBaseDamage(
    computeBaseAbilityDamage(abilityStat, ctx.motionValue),
    ctx.flatDamage ?? 0,
    0,
  );
  const resTotal = enemy.baseResistance[ctx.attribute] + sheet.resistancePenetration;
  const resistances =
    computeResMultiplier(resTotal) *
    computeDefMultiplier({
      attackerLevel: ctx.attackerLevel,
      enemyLevel: enemy.level,
      enemyDefOverride: enemy.enemyDefOverride,
      defIgnore: sheet.defIgnore,
      defReduction: sheet.defReduction,
      enemyDefPctReduction: havocBaneDefReduction(ctx.targetHavocBaneStacks ?? 0),
    }) *
    computeDmgReductionTotal(enemy.dmgReductionBase, enemy.dmgReductionAdditional) *
    computeElemReductionTotal(enemy.elemReductionBase, enemy.elemReductionAdditional);
  const bonuses =
    computeDmgBonusPercent(sheet, ctx.attribute, 'echo') *
    computeDmgAmplifyTotal(sheet.amplify, enemy.amplifyTarget) *
    computeTuneStrainMultiplier(sheet.tuneBreakBoost, ctx.tuneStrainStacks ?? 0) *
    computeSpecialDmgPercent(sheet.specialBase, sheet.specialBonus) *
    computeCritMultiplier(sheet.critRate, sheet.critDmg, ctx.crit);
  return { damage: baseDamage * resistances * bonuses, baseDamage, resistances, bonuses };
}

/**
 * Tune Strain total-DMG multiplier: +0.12% per Tune Break Boost point per
 * Interfered stack (Mornye / Qingxiao / Luuk Herssen kit entries on the
 * inspected Tune_Break wiki page). Applies to the attacker's ability
 * damage only — status-detonation interaction is unmodeled.
 */
export function computeTuneStrainMultiplier(tuneBreakBoost: number, strainStacks: number): number {
  if (!Number.isInteger(strainStacks) || strainStacks < 0) {
    throw new Error(`Tune Strain stacks must be a non-negative integer, got ${strainStacks}`);
  }
  return 1 + 0.0012 * tuneBreakBoost * strainStacks;
}

export interface TuneBreakDamageInput {
  /** User-supplied break coefficient — no verified default exists (G3). */
  multiplier: number;
  tuneBreakBoost: number;
  attackerLevel: number;
  enemy: EnemyProfile;
  /** Elemental RES of the break hit (character attribute by assumption). */
  enemyRes: number;
  resistancePenetration: number;
}

/**
 * Tune Break hit on a Mistuned target. PROVISIONAL (Phase 0, G3): shape
 * follows an unverified community simulator
 * (base 10000 × coeff × boost × RES × DEF, no crit/level/ATK scaling) —
 * the coefficient always comes from the caller, never from a default.
 */
export function computeTuneBreakDamage(input: TuneBreakDamageInput): DamageResult {
  if (!(input.multiplier >= 0)) {
    throw new Error(`Tune Break multiplier must be non-negative, got ${input.multiplier}`);
  }
  const baseDamage = 10000 * input.multiplier;
  const boost = (100 + input.tuneBreakBoost) / 100;
  const resistances =
    computeResMultiplier(input.enemyRes + input.resistancePenetration) *
    computeDefMultiplier({
      attackerLevel: input.attackerLevel,
      enemyLevel: input.enemy.level,
      enemyDefOverride: input.enemy.enemyDefOverride,
      defIgnore: 0,
      defReduction: 0,
    }) *
    computeDmgReductionTotal(input.enemy.dmgReductionBase, input.enemy.dmgReductionAdditional) *
    computeElemReductionTotal(input.enemy.elemReductionBase, input.enemy.elemReductionAdditional);
  const bonuses = boost;
  return { damage: baseDamage * resistances * bonuses, baseDamage, resistances, bonuses };
}

export interface TuneRuptureDamageContext {
  sheet: StatSheet;
  baseAtk: { character: number; weapon: number };
  baseHp: { character: number };
  baseDef: { character: number };
  attackerLevel: number;
  skill: CharacterSkill;
  motionName: string;
  forteLevel: number;
  enemy: EnemyProfile;
  characterId?: string;
  resonanceChain?: number;
  /** Trail (or equivalent) stacks consumed by this response. */
  tuneResponseStacks?: number;
  /** Response blocks require the matching Resonance Mode (validated here). */
  resonanceMode?: ResonanceMode;
}

/**
 * Tune Rupture response instance (e.g. Aemeath's Starburst). PROVISIONAL
 * (Phase 0, G2): ATK-scaled snapshot MV with trail scaling, attribute
 * bucket only, and no base crit — the snapshot ships real MVs (why they
 * exist at all), while base crit is ruled out by kits that explicitly
 * grant fixed crit (Aemeath S6). Per-character trail rates come from
 * tuneResponseStackRate; unverified characters throw.
 */
export function computeTuneRuptureDamage(ctx: TuneRuptureDamageContext): DamageResult {
  const motion = resolveMotion(ctx.skill, ctx.motionName, ctx.forteLevel);
  if (motion.isHealing) {
    return { damage: 0, baseDamage: 0, resistances: 1, bonuses: 1 };
  }
  const modes = ctx.characterId !== undefined ? characterResonanceModes(ctx.characterId) : [];
  if (modes.length > 0 && ctx.resonanceMode !== 'tuneRupture') {
    throw new Error(
      `${ctx.characterId} Tune Rupture response needs Resonance Mode tuneRupture, got ${JSON.stringify(ctx.resonanceMode)}`,
    );
  }
  const rate = tuneResponseStackRate(ctx.characterId);
  if (rate === null) {
    throw new Error(`no verified Tune Rupture trail rate for ${JSON.stringify(ctx.characterId)}`);
  }
  const stacks = ctx.tuneResponseStacks ?? 0;
  if (!Number.isInteger(stacks) || stacks < 0) {
    throw new Error(`Tune Rupture response stacks must be a non-negative integer, got ${stacks}`);
  }

  const abilityStat = computeAbilityStat(
    motion.scaling,
    {
      atkCharacter: ctx.baseAtk.character,
      atkWeapon: ctx.baseAtk.weapon,
      hpCharacter: ctx.baseHp.character,
      defCharacter: ctx.baseDef.character,
    },
    ctx.sheet,
  );
  const baseDamage = computeBaseAbilityDamage(abilityStat, motion.ratio) * (1 + rate * stacks);
  const resTotal = ctx.enemy.baseResistance[ctx.skill.attribute] + ctx.sheet.resistancePenetration;
  const resistances =
    computeResMultiplier(resTotal) *
    computeDefMultiplier({
      attackerLevel: ctx.attackerLevel,
      enemyLevel: ctx.enemy.level,
      enemyDefOverride: ctx.enemy.enemyDefOverride,
      defIgnore: ctx.sheet.defIgnore,
      defReduction: ctx.sheet.defReduction,
    }) *
    computeDmgReductionTotal(ctx.enemy.dmgReductionBase, ctx.enemy.dmgReductionAdditional) *
    computeElemReductionTotal(ctx.enemy.elemReductionBase, ctx.enemy.elemReductionAdditional);
  const fixedCrit =
    ctx.characterId === 'aemeath' && (ctx.resonanceChain ?? 0) >= 6 ? AEMEATH_S6_FIXED_CRIT : null;
  const bonuses =
    computeDmgBonusPercent(ctx.sheet, ctx.skill.attribute, 'forte') *
    (fixedCrit ? computeFixedStatusCritMultiplier(fixedCrit) : 1);

  return { damage: baseDamage * resistances * bonuses, baseDamage, resistances, bonuses };
}

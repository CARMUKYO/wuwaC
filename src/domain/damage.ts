import {
  attributeSchema,
  type Attribute,
  type CharacterSkill,
  type DamageType,
  type MotionBonusKind,
} from '../data/schema.ts';
import { computeAbilityStat, type StatSheet } from './stats.ts';
import {
  aeroErosionMultiplier,
  cartethyiaConvictionCritDmg,
  cartethyiaMotionMultiplier,
  cartethyiaStatusTargetMultiplier,
  maxAeroErosionStacks,
} from './cartethyia.ts';

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
}

/**
 * DEF multiplier. Flat DEF Reduction applies to enemy DEF before the ratio;
 * the ratio is capped at 200% (doc §6) — high DEF Ignore can amplify.
 */
export function computeDefMultiplier(input: DefMultiplierInput): number {
  const { attackerLevel, enemyLevel, enemyDefOverride, defIgnore, defReduction } = input;
  const enemyDef = enemyDefOverride ?? (8 * enemyLevel + 792);
  const effectiveDef = Math.max(0, enemyDef - defReduction);
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
 */
export function computeDmgBonusPercent(
  sheet: StatSheet,
  attribute: Attribute,
  kind: DamageType | 'forte',
): number {
  const attributeBonus = sheet[`dmgBonus:${attribute}`];
  const bucketBonus = kind === 'forte' ? 0 : sheet[`dmgBonus:${kind}`];
  return 1 + attributeBonus + bucketBonus;
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
 * TODO: verify the forteLevel → array-index mapping. Arrays carry ~20
 * entries against ~10 skill levels; v1 assumes index = forteLevel − 1
 * (clamped). Pinned by unit test — update test + mapping together.
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
}

export interface DamageResult {
  damage: number;
  baseDamage: number;
  resistances: number;
  bonuses: number;
}

export interface NegativeStatusDamageContext {
  sheet: StatSheet;
  status: 'aeroErosion';
  stacks: number;
  attackerLevel: number;
  enemy: EnemyProfile;
  /** Cartethyia S2 raises the allowed cap from 6 to 9. */
  resonanceChain?: number;
  characterId?: string;
  /** Target stacks for Cartethyia's status-dependent incoming-damage bonus. */
  targetStatusStacks?: number;
}

/** Negative Status level multipliers currently needed by the calculator. */
const NEGATIVE_STATUS_LEVEL_MULTIPLIERS: readonly [number, number][] = [
  [1, 0],
  [50, 229],
  [80, 2005],
  [90, 3674],
];

/** Resolve the status level curve without treating status damage as a skill MV. */
export function negativeStatusLevelMultiplier(level: number): number {
  if (!Number.isFinite(level) || level < 1) {
    throw new Error(`attacker level must be at least 1, got ${level}`);
  }
  const clamped = Math.min(90, level);
  for (let i = 1; i < NEGATIVE_STATUS_LEVEL_MULTIPLIERS.length; i += 1) {
    const [lowerLevel, lowerValue] = NEGATIVE_STATUS_LEVEL_MULTIPLIERS[i - 1];
    const [upperLevel, upperValue] = NEGATIVE_STATUS_LEVEL_MULTIPLIERS[i];
    if (clamped <= upperLevel) {
      const fraction = (clamped - lowerLevel) / (upperLevel - lowerLevel);
      return lowerValue + (upperValue - lowerValue) * fraction;
    }
  }
  return NEGATIVE_STATUS_LEVEL_MULTIPLIERS.at(-1)![1];
}

/** Base damage for one Negative Status detonation. */
export function computeNegativeStatusBaseDamage(attackerLevel: number, stacks: number): number {
  return negativeStatusLevelMultiplier(attackerLevel) * 1.25078 * aeroErosionMultiplier(stacks);
}

/**
 * Negative Status damage has its own rules: no Crit, no attribute/action DMG
 * bonus, and only Negative Status DMG Amplify from the stat sheet. It still
 * uses the target's RES/DEF and target-side reductions.
 */
export function computeNegativeStatusDamage(ctx: NegativeStatusDamageContext): DamageResult {
  if (ctx.status !== 'aeroErosion') throw new Error(`unsupported negative status ${ctx.status}`);
  const maxStacks = maxAeroErosionStacks(ctx.resonanceChain ?? 0);
  if (ctx.stacks > maxStacks) {
    throw new Error(`Aero Erosion supports at most ${maxStacks} stacks at S${ctx.resonanceChain ?? 0}`);
  }

  const baseDamage = computeNegativeStatusBaseDamage(ctx.attackerLevel, ctx.stacks);
  const resTotal = ctx.enemy.baseResistance.Aero + ctx.sheet.resistancePenetration;
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
  const bonuses = 1 + ctx.sheet.negativeStatusAmplify;
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
export function computeDamage(ctx: DamageContext): DamageResult {
  const { sheet, skill, enemy } = ctx;
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
  const baseDamage = rawBaseDamage * cartethyiaMotionMultiplier(
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
      defIgnore: sheet.defIgnore,
      defReduction: sheet.defReduction,
    }) *
    computeDmgReductionTotal(enemy.dmgReductionBase, enemy.dmgReductionAdditional) *
    computeElemReductionTotal(enemy.elemReductionBase, enemy.elemReductionAdditional);

  const kind = motion.dmgType;
  const bonuses =
    computeDmgBonusPercent(sheet, skill.attribute, kind) *
    computeDmgAmplifyTotal(sheet.amplify, enemy.amplifyTarget) *
    computeSpecialDmgPercent(sheet.specialBase, sheet.specialBonus) *
    computeCritMultiplier(
      sheet.critRate,
      sheet.critDmg + cartethyiaConvictionCritDmg(
        ctx.characterId,
        ctx.resonanceChain ?? 0,
        skill,
        ctx.conviction ?? 0,
      ),
      ctx.crit,
    );

  return { damage: baseDamage * resistances * bonuses, baseDamage, resistances, bonuses };
}

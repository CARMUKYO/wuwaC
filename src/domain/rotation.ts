import type {
  CharacterData,
  CharacterSkill,
  OwnedEcho,
  RosterEntry,
  RotationBlockSpec,
  RotationBuffSpec,
  SonataSetData,
  StatKey,
  WeaponData,
} from '../data/schema.ts';
import {
  computeDamage,
  computeNegativeStatusDamage,
  type CritMode,
  type EnemyProfile,
} from './damage.ts';
import { computeStats, type StatSheet } from './stats.ts';

/**
 * Domain layer: rotation scoring (DPR/DPS).
 * Pure functions, no React. Base stats come from `computeStats` (echoes +
 * sonata + forte + chain + weapon); buffs apply as additive `StatSheet`
 * deltas per block, so every multiplicative stage stays inside
 * `computeDamage` exactly once.
 *
 * Block/buff shapes are schema types (`RotationBlockSpec` /
 * `RotationBuffSpec`) so rotation objectives travel the worker boundary as
 * data; `ActionBlock` only adds the session-local id the UI needs.
 */

/** One sequenced action. `forteLevel` is snapshotted at creation (Phase 2 decision). */
export type ActionBlock = RotationBlockSpec & { id: string };

/** Calculator-local buff: label + source for display, stat mods for math. */
export type RotationBuff = RotationBuffSpec;

export interface RotationInput {
  character: CharacterData;
  weapon: WeaponData;
  roster: RosterEntry;
  /** Exactly 5 distinct echoes — the page gates this; the domain enforces it. */
  echoes: OwnedEcho[];
  sonataSets: SonataSetData[];
  enemy: EnemyProfile;
  blocks: ActionBlock[];
  buffs: RotationBuff[];
  /** Full-uptime buffs, applied to every block. */
  globalBuffIds: string[];
  /** Single global rotation time in seconds (Phase 1 decision). */
  rotationTime: number;
  crit: CritMode;
}

export interface BlockResult {
  id: string;
  skillId: string;
  motionName: string;
  label: string;
  damage: number;
  /** Percent of DPR (0 when DPR is 0). */
  share: number;
  /** True for buff-only skills (empty motion values) — always 0 damage. */
  buffCarrier: boolean;
}

export interface RotationResult {
  dpr: number;
  dps: number;
  totalTime: number;
  blocks: BlockResult[];
  /** computeStats warnings plus unknown-buff-id warnings. Never dropped silently. */
  warnings: string[];
}

/** Sum known-buff mods onto a sheet copy. Unknown ids become warnings, never errors. */
function applyBuffs(
  base: Record<StatKey, number>,
  buffsById: Map<string, RotationBuffSpec>,
  ids: string[],
  warnings: string[],
): Record<StatKey, number> {
  if (ids.length === 0) return base;
  const sheet = { ...base };
  for (const id of ids) {
    const buff = buffsById.get(id);
    if (!buff) {
      warnings.push(`unknown buff ${JSON.stringify(id)} ignored`);
      continue;
    }
    for (const mod of buff.mods) sheet[mod.stat] += mod.value;
  }
  return sheet;
}

/** Whether a block still resolves against the given character (stale after a switch). */
export function isBlockStale(character: CharacterData, block: ActionBlock): boolean {
  if (block.damageKind === 'negativeStatus') return false;
  const skill = character.skills.find((s) => s.id === block.skillId);
  if (!skill) return true;
  if (skill.motionValues.length === 0) return false;
  return !skill.motionValues.some((m) => m.name === block.motionName);
}

export interface CharacterBases {
  baseAtk: { character: number; weapon: number };
  baseHp: { character: number };
  baseDef: { character: number };
}

export function calculateRotation(input: RotationInput): RotationResult {
  const { character, weapon, roster, echoes, sonataSets, enemy, blocks, buffs, globalBuffIds, rotationTime, crit } = input;
  if (!Number.isFinite(rotationTime) || rotationTime <= 0) {
    throw new Error(`rotation time must be a positive number of seconds, got ${rotationTime}`);
  }
  if (echoes.length !== 5) {
    throw new Error(`rotation needs exactly 5 echoes, got ${echoes.length}`);
  }

  const { sheet: baseSheet, baseAtk, baseHp, baseDef, warnings } = computeStats({ character, weapon, roster, echoes, sonataSets });
  const scored = scoreRotationBlocks(baseSheet, { baseAtk, baseHp, baseDef }, {
    skills: character.skills,
    characterId: character.id,
    resonanceChain: roster.resonanceChain,
    attackerLevel: roster.level,
    enemy,
    blocks,
    buffs,
    globalBuffIds,
    crit,
  });
  warnings.push(...scored.warnings);

  const results: BlockResult[] = scored.blocks.map((b, i) => ({ ...b, id: blocks[i].id }));
  const dpr = scored.dpr;
  for (const r of results) r.share = dpr > 0 ? (r.damage / dpr) * 100 : 0;
  return { dpr, dps: dpr / rotationTime, totalTime: rotationTime, blocks: results, warnings };
}

export interface ScoredBlock {
  skillId: string;
  motionName: string;
  label: string;
  damage: number;
  /** Percent of DPR — filled in by `calculateRotation`; 0 from the scorer. */
  share: number;
  /** True for buff-only skills (empty motion values) — always 0 damage. */
  buffCarrier: boolean;
}

export interface ScoreRotationInput {
  skills: CharacterSkill[];
  characterId?: string;
  resonanceChain?: number;
  attackerLevel: number;
  enemy: EnemyProfile;
  blocks: RotationBlockSpec[];
  buffs: RotationBuffSpec[];
  globalBuffIds: string[];
  crit: CritMode;
}

/**
 * Score blocks against an already-aggregated sheet. The optimizer's
 * `scoreSheet` uses this directly (the sheet is already computed per combo);
 * `calculateRotation` is computeStats + this + shares + timing.
 */
export function scoreRotationBlocks(
  baseSheet: StatSheet,
  bases: CharacterBases,
  input: ScoreRotationInput,
): { dpr: number; blocks: ScoredBlock[]; warnings: string[] } {
  const { skills, characterId, resonanceChain = 0, attackerLevel, enemy, blocks, buffs, globalBuffIds, crit } = input;
  const warnings: string[] = [];
  const buffsById = new Map(buffs.map((b) => [b.id, b]));
  const globalSheet = applyBuffs(baseSheet, buffsById, globalBuffIds, warnings);
  let statusHasBeenInflicted = false;

  const results: ScoredBlock[] = blocks.map((block) => {
    if (!Number.isInteger(block.forteLevel) || block.forteLevel < 1) {
      throw new Error(`forte level must be a whole number of 1 or more, got ${block.forteLevel}`);
    }

    const sheet = applyBuffs(globalSheet, buffsById, block.activeBuffIds, warnings);
    if (block.damageKind === 'negativeStatus') {
      if (block.statusType !== 'aeroErosion') {
        throw new Error(`unsupported negative status ${JSON.stringify(block.statusType)}`);
      }
      const stacks = block.statusStacks ?? 1;
      const result = computeNegativeStatusDamage({
        sheet,
        status: 'aeroErosion',
        stacks,
        attackerLevel,
        enemy,
        resonanceChain,
        characterId,
        targetStatusStacks: block.targetStatusStacks,
      });
      // A status-damage block is also the explicit point at which the
      // rotation says the status was inflicted. This lets S4's all-attribute
      // bonus affect later actions without pretending it was full uptime.
      statusHasBeenInflicted = true;
      return {
        skillId: block.skillId,
        motionName: block.motionName,
        label: 'Aero Erosion DMG',
        damage: result.damage,
        share: 0,
        buffCarrier: false,
      };
    }

    const skill = skills.find((s) => s.id === block.skillId);
    if (!skill) throw new Error(`unknown skill: ${JSON.stringify(block.skillId)}`);
    if (skill.motionValues.length === 0) {
      return { skillId: skill.id, motionName: block.motionName, label: skill.label, damage: 0, share: 0, buffCarrier: true };
    }
    if (characterId === 'cartethyia' && resonanceChain >= 4 && statusHasBeenInflicted) {
      // S4: after a Negative Status is inflicted, Cartethyia grants 20% DMG
      // Bonus for all Attributes. This calculator is single-character, so the
      // active character receives the applicable Aero portion here.
      sheet['dmgBonus:Aero'] += 0.2;
    }
    const { damage } = computeDamage({
      sheet,
      baseAtk: bases.baseAtk,
      baseHp: bases.baseHp,
      baseDef: bases.baseDef,
      attackerLevel,
      skill,
      motionName: block.motionName,
      forteLevel: block.forteLevel,
      enemy,
      crit,
      characterId,
      resonanceChain,
      targetStatusStacks: block.targetStatusStacks,
      conviction: block.conviction,
    });
    return { skillId: skill.id, motionName: block.motionName, label: skill.label, damage, share: 0, buffCarrier: false };
  });

  return { dpr: results.reduce((sum, r) => sum + r.damage, 0), blocks: results, warnings };
}

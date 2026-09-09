import { computeDamage, type EnemyProfile } from './damage.ts';
import { scoreRotationBlocks } from './rotation.ts';
import type { CharacterSkill, ObjectiveSpec } from '../data/schema.ts';
import type { StatSheet } from './stats.ts';

/**
 * Domain layer: optimizer scoring objectives (reference doc §7).
 *
 * Objectives travel across the worker boundary as *data* (`ObjectiveSpec`,
 * defined in the data layer so saved builds can carry it); this module
 * resolves them to evaluators on either side, so new objectives never touch
 * the search algorithm. Pure functions, no React.
 */

export type { ObjectiveSpec };

export interface ScoreContext {
  skill?: CharacterSkill;
  /** Full kit — required by rotation objectives for per-block resolution. */
  skills?: CharacterSkill[];
  characterId?: string;
  resonanceChain?: number;
  baseAtk: { character: number; weapon: number };
  baseHp: { character: number };
  baseDef: { character: number };
  attackerLevel: number;
  enemy: EnemyProfile;
}

export type ObjectiveFn = (sheet: StatSheet, ctx: ScoreContext) => number;

/** Find the spec's skill among a character's skills. Throws when absent. */
export function resolveObjectiveSkill(
  skills: CharacterSkill[],
  spec: ObjectiveSpec,
): CharacterSkill {
  if (spec.kind !== 'expected-damage') {
    throw new Error(`objective kind ${JSON.stringify(spec.kind)} needs no skill`);
  }
  const found = skills.find((s) => s.id === spec.skillId);
  if (!found) throw new Error(`unknown skill: ${JSON.stringify(spec.skillId)}`);
  return found;
}

/** Score one stat sheet. Throws on skill/spec mismatch or unknown kinds. */
export function scoreSheet(spec: ObjectiveSpec, sheet: StatSheet, ctx: ScoreContext): number {
  switch (spec.kind) {
    case 'max-stat':
      return sheet[spec.stat];
    case 'expected-damage': {
      if (ctx.skill === undefined || ctx.skill.id !== spec.skillId) {
        throw new Error(
          `objective/skill mismatch: spec wants ${JSON.stringify(spec.skillId)}`,
        );
      }
      return computeDamage({
        sheet,
        baseAtk: ctx.baseAtk,
        baseHp: ctx.baseHp,
        baseDef: ctx.baseDef,
        attackerLevel: ctx.attackerLevel,
        skill: ctx.skill,
        motionName: spec.motionName,
        forteLevel: spec.forteLevel,
        enemy: ctx.enemy,
        crit: spec.crit,
      }).damage;
    }
    case 'rotation-dpr': {
      if (ctx.skills === undefined) {
        throw new Error('rotation objective needs the character skill list in context');
      }
      // DPS ranks identically (time is constant), so the search scores DPR.
      return scoreRotationBlocks(sheet, { baseAtk: ctx.baseAtk, baseHp: ctx.baseHp, baseDef: ctx.baseDef }, {
        skills: ctx.skills,
        characterId: ctx.characterId,
        resonanceChain: ctx.resonanceChain,
        attackerLevel: ctx.attackerLevel,
        enemy: ctx.enemy,
        blocks: spec.blocks,
        buffs: spec.buffs,
        globalBuffIds: spec.globalBuffIds,
        crit: spec.crit,
      }).dpr;
    }
    default:
      throw new Error(`unknown objective kind: ${JSON.stringify((spec as { kind: unknown }).kind)}`);
  }
}

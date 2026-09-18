import type {
  Attribute,
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
  computeEchoSkillDamage,
  computeNegativeStatusDamage,
  computeTuneBreakDamage,
  computeTuneRuptureDamage,
  type CritMode,
  type EnemyProfile,
} from './damage.ts';
import { negativeStatusDef } from './negativeStatus.ts';
import { characterResonanceModes, type ResonanceMode } from './characterMods.ts';
import { jiyanOutroLanceSpec } from './jiyan.ts';
import { camellyaOutroTwiningSpec } from './camellya.ts';
import { xiangliyaoOutroChainRuleSpec } from './xiangliyao.ts';
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
  /** Required when the character has Resonance Modes (dual-mode kits). */
  resonanceMode?: ResonanceMode;
  /** Slot-1 echo id: its transcribed main-slot bonus applies (other slots never do). */
  mainEchoId?: string;
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
  /** Derived start in seconds (cumulative durations before this block). */
  startSeconds: number;
}

export interface RotationResult {
  dpr: number;
  dps: number;
  totalTime: number;
  blocks: BlockResult[];
  /** computeStats warnings plus unknown-buff-id warnings. Never dropped silently. */
  warnings: string[];
  /** Transcribed assumptions applied to the sheet (from computeStats). */
  appliedAssumptions: string[];
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

/**
 * Derived block starts: block i starts at the cumulative sum of durations
 * before it. Blocks without `durationSeconds` contribute 0, so untimed
 * blocks stack at the last known time (never dropped, never reordered).
 */
export function blockStartTimes(blocks: RotationBlockSpec[]): number[] {
  const starts: number[] = [];
  let time = 0;
  for (const block of blocks) {
    starts.push(time);
    time += block.durationSeconds ?? 0;
  }
  return starts;
}

/**
 * Whether a buff's window covers a block scoring at `timeSeconds`. Windows
 * are start-inclusive, end-exclusive; a block scores at its start. Buffs
 * without a window duration carry no window and never auto-apply (their
 * global/toggle behavior is unchanged); zero-duration windows apply nowhere.
 */
export function buffAppliesAt(buff: RotationBuffSpec, timeSeconds: number): boolean {
  const duration = buff.windowDurationSeconds;
  if (duration === undefined || duration <= 0) return false;
  const start = buff.windowStartSeconds ?? 0;
  return timeSeconds >= start && timeSeconds < start + duration;
}

/** Whether a block still resolves against the given character (stale after a switch). */
export function isBlockStale(character: CharacterData, block: ActionBlock): boolean {
  if (block.damageKind === 'negativeStatus' || block.damageKind === 'echoSkill') return false;
  // Tune Break blocks carry no skill id by design (character-independent
  // damage kind); tuneRupture blocks carry real skill/motion ids and fall
  // through to the kit lookup below.
  if (block.damageKind === 'tuneBreak') return false;
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
  const { character, weapon, roster, echoes, sonataSets, enemy, blocks, buffs, globalBuffIds, rotationTime, crit, resonanceMode, mainEchoId } = input;
  if (!Number.isFinite(rotationTime) || rotationTime <= 0) {
    throw new Error(`rotation time must be a positive number of seconds, got ${rotationTime}`);
  }
  if (echoes.length !== 5) {
    throw new Error(`rotation needs exactly 5 echoes, got ${echoes.length}`);
  }

  const { sheet: baseSheet, baseAtk, baseHp, baseDef, warnings, appliedAssumptions } = computeStats({
    character,
    weapon,
    roster,
    echoes,
    sonataSets,
    mainEcho: mainEchoId === undefined ? undefined : echoes.find((e) => e.id === mainEchoId),
  });
  const scored = scoreRotationBlocks(baseSheet, { baseAtk, baseHp, baseDef }, {
    skills: character.skills,
    characterId: character.id,
    attribute: character.attribute,
    resonanceChain: roster.resonanceChain,
    attackerLevel: roster.level,
    enemy,
    blocks,
    buffs,
    globalBuffIds,
    crit,
    resonanceMode,
  });
  warnings.push(...scored.warnings);

  const results: BlockResult[] = scored.blocks.map((b, i) => ({ ...b, id: blocks[i].id }));
  const dpr = scored.dpr;
  for (const r of results) r.share = dpr > 0 ? (r.damage / dpr) * 100 : 0;
  for (const r of results) {
    // D6: blocks starting at or past rotationTime still score — the warning
    // keeps the overflow visible instead of silently dropping damage.
    if (r.startSeconds >= rotationTime) {
      warnings.push(`block ${JSON.stringify(r.id)} starts at ${r.startSeconds}s, at or past rotation time ${rotationTime}s (scored anyway)`);
    }
  }
  return { dpr, dps: dpr / rotationTime, totalTime: rotationTime, blocks: results, warnings, appliedAssumptions };
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
  /** Derived start in seconds (cumulative durations before this block). */
  startSeconds: number;
}

export interface ScoreRotationInput {
  skills: CharacterSkill[];
  characterId?: string;
  /** Character attribute — Tune Break RES term (unpublished element, assumption). */
  attribute?: Attribute;
  resonanceChain?: number;
  attackerLevel: number;
  enemy: EnemyProfile;
  blocks: RotationBlockSpec[];
  buffs: RotationBuffSpec[];
  globalBuffIds: string[];
  crit: CritMode;
  /** Required when the character has Resonance Modes (dual-mode kits). */
  resonanceMode?: ResonanceMode;
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
  const { skills, characterId, attribute, resonanceChain = 0, attackerLevel, enemy, blocks, buffs, globalBuffIds, crit, resonanceMode } = input;
  // Dual-mode kits score differently per mode — the rotation must declare
  // which one it runs. Surfaces inline in the calculator (never a crash).
  const modes = characterId !== undefined ? characterResonanceModes(characterId) : [];
  if (modes.length > 0 && (resonanceMode === undefined || !modes.includes(resonanceMode))) {
    throw new Error(
      `${characterId} has Resonance Modes (${modes.join(' / ')}) — select one before scoring`,
    );
  }
  const warnings: string[] = [];
  const buffsById = new Map(buffs.map((b) => [b.id, b]));
  const globalSheet = applyBuffs(baseSheet, buffsById, globalBuffIds, warnings);

  const starts = blockStartTimes(blocks);

  const results: ScoredBlock[] = blocks.map((block, index) => {
    if (!Number.isInteger(block.forteLevel) || block.forteLevel < 1) {
      throw new Error(`forte level must be a whole number of 1 or more, got ${block.forteLevel}`);
    }

    const startSeconds = starts[index];
    // Union of manual mechanisms (global + toggles) with window auto-apply:
    // windowed buffs already covered manually are skipped, never doubled.
    const manual = new Set([...globalBuffIds, ...block.activeBuffIds]);
    const windowedIds = buffs
      .filter((buff) => !manual.has(buff.id) && buffAppliesAt(buff, startSeconds))
      .map((buff) => buff.id);
    const sheet = applyBuffs(globalSheet, buffsById, [...block.activeBuffIds, ...windowedIds], warnings);
    if (block.damageKind === 'negativeStatus') {
      if (block.statusType === undefined) {
        throw new Error('negativeStatus block needs a statusType');
      }
      const stacks = block.statusStacks ?? 1;
      const result = computeNegativeStatusDamage({
        sheet,
        status: block.statusType,
        stacks,
        attackerLevel,
        enemy,
        resonanceChain,
        characterId,
        targetStatusStacks: block.targetStatusStacks,
        targetHavocBaneStacks: block.targetHavocBaneStacks,
      });
      return {
        skillId: block.skillId,
        motionName: block.motionName,
        label: `${negativeStatusDef(block.statusType).label} DMG`,
        damage: result.damage,
        share: 0,
        buffCarrier: false,
        startSeconds,
      };
    }

    if (block.damageKind === 'tuneBreak') {
      if (block.tuneBreakMultiplier === undefined) {
        throw new Error('tuneBreak block needs an explicit tuneBreakMultiplier — no verified default exists (G3)');
      }
      if (attribute === undefined) {
        throw new Error('tuneBreak block needs the character attribute for its RES term');
      }
      const result = computeTuneBreakDamage({
        multiplier: block.tuneBreakMultiplier,
        tuneBreakBoost: sheet.tuneBreakBoost,
        attackerLevel,
        enemy,
        enemyRes: enemy.baseResistance[attribute],
        resistancePenetration: sheet.resistancePenetration,
      });
      return {
        skillId: block.skillId,
        motionName: block.motionName,
        label: 'Tune Break DMG',
        damage: result.damage,
        share: 0,
        buffCarrier: false,
        startSeconds,
      };
    }

    if (block.damageKind === 'echoSkill') {
      if (block.echoMotionValue === undefined || block.echoAttribute === undefined) {
        throw new Error('echoSkill block needs echoMotionValue and echoAttribute');
      }
      const result = computeEchoSkillDamage({
        sheet,
        baseAtk: bases.baseAtk,
        baseHp: bases.baseHp,
        baseDef: bases.baseDef,
        scaling: block.echoScaling ?? 'ATK',
        motionValue: block.echoMotionValue,
        flatDamage: block.echoFlatDamage ?? 0,
        attribute: block.echoAttribute,
        attackerLevel,
        enemy,
        crit,
        targetHavocBaneStacks: block.targetHavocBaneStacks,
        tuneStrainStacks: block.tuneStrainStacks,
      });
      const cooldown = block.echoCooldown !== undefined ? `, ${block.echoCooldown}s CD` : '';
      return {
        skillId: block.skillId,
        motionName: block.motionName,
        label: `${block.echoName ?? 'Echo Skill'} (Echo Skill${cooldown})`,
        damage: result.damage,
        share: 0,
        buffCarrier: false,
        startSeconds,
      };
    }

    const skill = skills.find((s) => s.id === block.skillId);
    if (!skill) throw new Error(`unknown skill: ${JSON.stringify(block.skillId)}`);
    if (block.damageKind === 'tuneRupture') {
      const result = computeTuneRuptureDamage({
        sheet,
        baseAtk: bases.baseAtk,
        baseHp: bases.baseHp,
        baseDef: bases.baseDef,
        attackerLevel,
        skill,
        motionName: block.motionName,
        forteLevel: block.forteLevel,
        enemy,
        characterId,
        resonanceChain,
        tuneResponseStacks: block.tuneResponseStacks,
        resonanceMode,
      });
      return {
        skillId: block.skillId,
        motionName: block.motionName,
        label: `${skill.label} (Tune Rupture)`,
        damage: result.damage,
        share: 0,
        buffCarrier: false,
        startSeconds,
      };
    }
    // Jiyan's outro looks buff-carrier-shaped but scores its coordinated
    // lance through computeDamage (one block = one lance trigger).
    // Camellya's Twining scores the same way (base 329.24% only), as does
    // Xiangli Yao's Chain Rule (base 237.63%, one block per trigger).
    const lance = skill.motionValues.length === 0
      ? jiyanOutroLanceSpec(characterId, skill, block.motionName)
      : null;
    const twining = skill.motionValues.length === 0 && lance === null
      ? camellyaOutroTwiningSpec(characterId, skill, block.motionName)
      : null;
    const chainRule = skill.motionValues.length === 0 && lance === null && twining === null
      ? xiangliyaoOutroChainRuleSpec(characterId, skill, block.motionName)
      : null;
    if (skill.motionValues.length === 0 && lance === null && twining === null && chainRule === null) {
      return { skillId: skill.id, motionName: block.motionName, label: skill.label, damage: 0, share: 0, buffCarrier: true, startSeconds };
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
      targetHavocBaneStacks: block.targetHavocBaneStacks,
      conviction: block.conviction,
      blazesConsumed: block.blazesConsumed,
      nightfallBlazes: block.nightfallBlazes,
      ringsConsumed: block.ringsConsumed,
      voiceFlux: block.voiceFlux,
      wovenMyriad: block.wovenMyriad,
      tuneStrainStacks: block.tuneStrainStacks,
    });
    const proseLabel = lance !== null ? `${skill.label} (coordinated lance)` : twining !== null ? `${skill.label} (Twining)` : chainRule !== null ? `${skill.label} (Chain Rule)` : skill.label;
    return { skillId: skill.id, motionName: block.motionName, label: proseLabel, damage, share: 0, buffCarrier: false, startSeconds };
  });

  return { dpr: results.reduce((sum, r) => sum + r.damage, 0), blocks: results, warnings };
}

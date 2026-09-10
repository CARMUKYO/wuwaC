import { create } from 'zustand';
import type { ResonanceMode } from '../domain/characterMods.ts';
import type { CritMode } from '../domain/damage.ts';
import { DEFAULT_ENEMY_LEVEL, DEFAULT_ENEMY_RES } from '../domain/enemy.ts';
import { maxStatusStacks } from '../domain/negativeStatus.ts';
import type { ActionBlock, RotationBuff } from '../domain/rotation.ts';
import type { RosterEntry } from '../data/schema.ts';

/**
 * Calculator page state (Phase 1: input controls; Phase 2: rotation).
 *
 * Session-local overrides prefilled from the roster — edits here never
 * write back to the roster or Dexie. Buffs are calculator-local by design
 * (Phase 2 decision); team outro-buff integration is a later follow-up.
 */

export const DEFAULT_CHARACTER_LEVEL = 90;
export const DEFAULT_ASCENSION = 6;
export const DEFAULT_CHAIN = 0;
export const DEFAULT_FORTE_LEVEL = 10;
export const DEFAULT_WEAPON_LEVEL = 90;
export const DEFAULT_WEAPON_RANK = 1;
export const DEFAULT_ROTATION_TIME = 10;
export const MAX_ROTATION_TIME = 3600;

/** Five echo slots; `null` = empty. Duplicates are flagged by the page, not the store. */
export type EchoSlots = [string | null, string | null, string | null, string | null, string | null];
const EMPTY_SLOTS: EchoSlots = [null, null, null, null, null];

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function clampFloat(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

interface CalculatorState {
  characterId: string;
  level: number;
  ascension: number;
  resonanceChain: number;
  forteLevels: Record<string, number>;
  weaponId: string;
  weaponLevel: number;
  weaponRank: number;
  enemyKind: 'mob' | 'boss';
  enemyLevel: number;
  enemyBaseRES: number;
  rotationTime: number;
  echoIds: EchoSlots;
  /** Which roster entry the inputs were last prefilled from (`''` = manual). */
  rosterSourceId: string;
  /** Sequenced rotation blocks (forte snapshotted per block at creation). */
  blocks: ActionBlock[];
  /** Calculator-local buff registry. */
  buffs: RotationBuff[];
  /** Full-uptime buffs, applied to every block. */
  globalBuffIds: string[];
  crit: CritMode;

  setCharacterId: (id: string) => void;
  setLevel: (level: number) => void;
  setAscension: (ascension: number) => void;
  setResonanceChain: (rank: number) => void;
  setForteLevel: (skillId: string, level: number) => void;
  setWeaponId: (id: string) => void;
  setWeaponLevel: (level: number) => void;
  setWeaponRank: (rank: number) => void;
  setEnemyKind: (kind: 'mob' | 'boss') => void;
  setEnemyLevel: (level: number) => void;
  setEnemyBaseRES: (res: number) => void;
  setRotationTime: (seconds: number) => void;
  setEchoSlot: (index: number, id: string | null) => void;
  clearEchoes: () => void;
  resetFromRoster: (entry: RosterEntry) => void;
  resetAll: () => void;
  addBlock: (block: Omit<ActionBlock, 'id'>) => ActionBlock;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, direction: -1 | 1) => void;
  setBlockForte: (id: string, forteLevel: number) => void;
  setBlockStatusStacks: (id: string, stacks: number) => void;
  setBlockConviction: (id: string, conviction: number) => void;
  setBlockKitState: (
    id: string,
    patch: Partial<
      Pick<
        ActionBlock,
        | 'targetHavocBaneStacks'
        | 'blazesConsumed'
        | 'nightfallBlazes'
        | 'ringsConsumed'
        | 'voiceFlux'
        | 'wovenMyriad'
        | 'tuneStrainStacks'
        | 'tuneResponseStacks'
        | 'tuneBreakMultiplier'
      >
    >,
  ) => void;
  toggleBlockBuff: (blockId: string, buffId: string) => void;
  addBuff: (buff: Omit<RotationBuff, 'id'>) => RotationBuff;
  removeBuff: (id: string) => void;
  toggleGlobalBuff: (id: string) => void;
  setCrit: (crit: CritMode) => void;
  /** Active Resonance Mode for dual-mode kits; null until the user picks one. */
  resonanceMode: ResonanceMode | null;
  setResonanceMode: (mode: ResonanceMode | null) => void;
}

export const useCalculatorStore = create<CalculatorState>()((set) => ({
  characterId: '',
  level: DEFAULT_CHARACTER_LEVEL,
  ascension: DEFAULT_ASCENSION,
  resonanceChain: DEFAULT_CHAIN,
  forteLevels: {},
  weaponId: '',
  weaponLevel: DEFAULT_WEAPON_LEVEL,
  weaponRank: DEFAULT_WEAPON_RANK,
  enemyKind: 'mob',
  enemyLevel: DEFAULT_ENEMY_LEVEL,
  enemyBaseRES: DEFAULT_ENEMY_RES,
  rotationTime: DEFAULT_ROTATION_TIME,
  echoIds: [...EMPTY_SLOTS] as EchoSlots,
  rosterSourceId: '',
  blocks: [],
  buffs: [],
  globalBuffIds: [],
  crit: 'expected',
  resonanceMode: null,

  setCharacterId: (id) =>
    set((s) => ({
      characterId: id,
      // Skill ids differ per character — stale forte levels would silently
      // score the wrong motions in Phase 2, so drop them on switch.
      forteLevels: id === s.characterId ? s.forteLevels : {},
      // Modes belong to one kit — a stale mode would score the wrong kit.
      resonanceMode: id === s.characterId ? s.resonanceMode : null,
      rosterSourceId: '',
    })),
  setResonanceMode: (mode) => set({ resonanceMode: mode }),
  setLevel: (level) =>
    set((s) => ({ level: clampInt(level, 1, 90, s.level) })),
  setAscension: (ascension) =>
    set((s) => ({ ascension: clampInt(ascension, 0, 6, s.ascension) })),
  setResonanceChain: (rank) =>
    set((s) => ({ resonanceChain: clampInt(rank, 0, 6, s.resonanceChain) })),
  setForteLevel: (skillId, level) =>
    set((s) => ({
      forteLevels: { ...s.forteLevels, [skillId]: clampInt(level, 1, 10, s.forteLevels[skillId] ?? DEFAULT_FORTE_LEVEL) },
    })),
  setWeaponId: (id) => set({ weaponId: id }),
  setWeaponLevel: (level) =>
    set((s) => ({ weaponLevel: clampInt(level, 1, 90, s.weaponLevel) })),
  setWeaponRank: (rank) =>
    set((s) => ({ weaponRank: clampInt(rank, 1, 5, s.weaponRank) })),
  setEnemyKind: (kind) => set({ enemyKind: kind }),
  setEnemyLevel: (level) =>
    set((s) => ({ enemyLevel: clampInt(level, 1, 120, s.enemyLevel) })),
  setEnemyBaseRES: (res) =>
    set((s) => ({ enemyBaseRES: clampFloat(res, 0, 0.8, s.enemyBaseRES) })),
  setRotationTime: (seconds) =>
    set((s) => ({
      rotationTime:
        Number.isFinite(seconds) && seconds > 0
          ? Math.min(MAX_ROTATION_TIME, seconds)
          : s.rotationTime,
    })),
  setEchoSlot: (index, id) =>
    set((s) => {
      if (!Number.isInteger(index) || index < 0 || index > 4) return s;
      const echoIds = [...s.echoIds] as EchoSlots;
      echoIds[index] = id;
      return { echoIds };
    }),
  clearEchoes: () => set({ echoIds: [...EMPTY_SLOTS] as EchoSlots }),

  addBlock: (block) => {
    const row: ActionBlock = { ...block, id: crypto.randomUUID() };
    set((s) => ({ blocks: [...s.blocks, row] }));
    return row;
  },
  removeBlock: (id) => set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) })),
  moveBlock: (id, direction) =>
    set((s) => {
      const index = s.blocks.findIndex((b) => b.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= s.blocks.length) return s;
      const blocks = [...s.blocks];
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      return { blocks };
    }),
  setBlockForte: (id, forteLevel) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === id ? { ...b, forteLevel: clampInt(forteLevel, 1, 10, b.forteLevel) } : b,
      ),
    })),
  setBlockStatusStacks: (id, stacks) =>
    set((s) => ({
      blocks: s.blocks.map((b) => {
        if (b.id !== id) return b;
        if (!Number.isInteger(stacks)) return b;
        if (b.damageKind === 'negativeStatus') {
          const cap = maxStatusStacks(b.statusType ?? 'aeroErosion');
          return { ...b, statusStacks: Math.min(cap, Math.max(1, stacks)) };
        }
        return { ...b, targetStatusStacks: Math.min(9, Math.max(0, stacks)) };
      }),
    })),
  setBlockConviction: (id, conviction) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === id && Number.isInteger(conviction)
          ? { ...b, conviction: Math.min(120, Math.max(0, conviction)) }
          : b,
      ),
    })),
  setBlockKitState: (id, patch) =>
    set((s) => ({
      blocks: s.blocks.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b };
        if (patch.targetHavocBaneStacks !== undefined && Number.isInteger(patch.targetHavocBaneStacks)) {
          next.targetHavocBaneStacks = Math.min(9, Math.max(0, patch.targetHavocBaneStacks));
        }
        if (patch.blazesConsumed !== undefined && Number.isInteger(patch.blazesConsumed)) {
          next.blazesConsumed = Math.min(150, Math.max(0, patch.blazesConsumed));
        }
        if (patch.nightfallBlazes !== undefined && Number.isInteger(patch.nightfallBlazes)) {
          next.nightfallBlazes = Math.min(40, Math.max(0, patch.nightfallBlazes));
        }
        if (patch.ringsConsumed !== undefined && Number.isInteger(patch.ringsConsumed)) {
          next.ringsConsumed = Math.min(99, Math.max(0, patch.ringsConsumed));
        }
        if (typeof patch.voiceFlux === 'boolean') next.voiceFlux = patch.voiceFlux;
        if (typeof patch.wovenMyriad === 'boolean') next.wovenMyriad = patch.wovenMyriad;
        if (patch.tuneStrainStacks !== undefined && Number.isInteger(patch.tuneStrainStacks)) {
          next.tuneStrainStacks = Math.min(10, Math.max(0, patch.tuneStrainStacks));
        }
        if (patch.tuneResponseStacks !== undefined && Number.isInteger(patch.tuneResponseStacks)) {
          next.tuneResponseStacks = Math.min(99, Math.max(0, patch.tuneResponseStacks));
        }
        if (patch.tuneBreakMultiplier !== undefined && Number.isFinite(patch.tuneBreakMultiplier)) {
          next.tuneBreakMultiplier = Math.min(99, Math.max(0, patch.tuneBreakMultiplier));
        }
        return next;
      }),
    })),
  toggleBlockBuff: (blockId, buffId) =>
    set((s) => ({
      blocks: s.blocks.map((b) => {
        if (b.id !== blockId) return b;
        const active = b.activeBuffIds.includes(buffId)
          ? b.activeBuffIds.filter((v) => v !== buffId)
          : [...b.activeBuffIds, buffId];
        return { ...b, activeBuffIds: active };
      }),
    })),
  addBuff: (buff) => {
    const row: RotationBuff = { ...buff, id: crypto.randomUUID() };
    set((s) => ({ buffs: [...s.buffs, row] }));
    return row;
  },
  // Removing a buff also detaches it from blocks and globals — dangling
  // references would otherwise score against a resurrected same-named buff.
  removeBuff: (id) =>
    set((s) => ({
      buffs: s.buffs.filter((b) => b.id !== id),
      globalBuffIds: s.globalBuffIds.filter((v) => v !== id),
      blocks: s.blocks.map((b) => ({ ...b, activeBuffIds: b.activeBuffIds.filter((v) => v !== id) })),
    })),
  toggleGlobalBuff: (id) =>
    set((s) => ({
      globalBuffIds: s.globalBuffIds.includes(id)
        ? s.globalBuffIds.filter((v) => v !== id)
        : [...s.globalBuffIds, id],
    })),
  setCrit: (crit) => set({ crit }),

  resetFromRoster: (entry) =>
    set({
      characterId: entry.characterId,
      level: entry.level,
      ascension: entry.ascension,
      resonanceChain: entry.resonanceChain,
      forteLevels: { ...entry.forteLevels },
      weaponId: entry.weaponId,
      weaponLevel: entry.weaponLevel,
      weaponRank: entry.weaponRank,
      rosterSourceId: entry.characterId,
    }),
  resetAll: () =>
    set({
      characterId: '',
      level: DEFAULT_CHARACTER_LEVEL,
      ascension: DEFAULT_ASCENSION,
      resonanceChain: DEFAULT_CHAIN,
      forteLevels: {},
      weaponId: '',
      weaponLevel: DEFAULT_WEAPON_LEVEL,
      weaponRank: DEFAULT_WEAPON_RANK,
      enemyKind: 'mob',
      enemyLevel: DEFAULT_ENEMY_LEVEL,
      enemyBaseRES: DEFAULT_ENEMY_RES,
      rotationTime: DEFAULT_ROTATION_TIME,
      echoIds: [...EMPTY_SLOTS] as EchoSlots,
      rosterSourceId: '',
      blocks: [],
      buffs: [],
      globalBuffIds: [],
      crit: 'expected',
      resonanceMode: null,
    }),
}));

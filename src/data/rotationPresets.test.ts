import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from './index.ts';
import { isParameterMotionRow } from '../domain/characterMods.ts';
import { isBlockStale } from '../domain/rotation.ts';
import {
  presetToBlocks,
  presetsForCharacter,
  ROTATION_PRESETS,
  type RotationPreset,
} from './rotationPresets.ts';

const snapshot = loadBundledSnapshot();

/** Every per-character preset module on disk, whatever its export names. */
const presetModules = import.meta.glob<{ [key: string]: unknown }>('./rotationPreset-*.ts', {
  eager: true,
});

function presetsInModule(mod: { [key: string]: unknown }): RotationPreset[] {
  return Object.values(mod)
    .filter((v): v is unknown[] => Array.isArray(v))
    .flat()
    .filter((v): v is RotationPreset => typeof v === 'object' && v !== null && 'id' in v);
}

describe('rotation presets', () => {
  it('aggregates every per-character preset file (nothing silently dropped)', () => {
    const aggregated = new Set(ROTATION_PRESETS.map((p) => p.id));
    const orphaned: string[] = [];
    for (const [path, mod] of Object.entries(presetModules)) {
      for (const preset of presetsInModule(mod)) {
        if (!aggregated.has(preset.id)) orphaned.push(`${path}:${preset.id}`);
      }
    }
    expect(orphaned).toEqual([]);
  });

  it('uses unique ids over existing characters with https sources', () => {
    const ids = ROTATION_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of ROTATION_PRESETS) {
      expect(preset.id).toMatch(/^[a-z0-9-]+$/);
      expect(snapshot.characters.some((c) => c.id === preset.characterId)).toBe(true);
      expect(preset.sourceUrl.startsWith('https://')).toBe(true);
      expect(preset.steps.length).toBeGreaterThan(0);
    }
  });

  it('resolves every step against the snapshot (no stale, healing, or parameter rows)', () => {
    for (const preset of ROTATION_PRESETS) {
      const character = snapshot.characters.find((c) => c.id === preset.characterId)!;
      for (const step of preset.steps) {
        expect(Number.isInteger(step.forteLevel) && step.forteLevel >= 1 && step.forteLevel <= 10).toBe(
          true,
        );
        const skill = character.skills.find((s) => s.id === step.skillId);
        expect(skill, `${preset.id}: unknown skill ${step.skillId}`).toBeDefined();
        if (skill!.motionValues.length === 0) {
          // Buff-carrier skills take the empty motion name, like the UI path.
          expect(step.motionName).toBe('');
          continue;
        }
        const motion = skill!.motionValues.find((m) => m.name === step.motionName);
        expect(motion, `${preset.id}: unknown motion ${JSON.stringify(step.motionName)}`).toBeDefined();
        expect(motion!.isHealing ?? /healing/i.test(motion!.name)).toBe(false);
        expect(isParameterMotionRow(preset.characterId, step.motionName)).toBe(false);
        expect(
          isBlockStale(character, { ...step, activeBuffIds: [], id: 'preset-check' }),
        ).toBe(false);
      }
    }
  });

  it('maps the Aemeath exemplar to its 15 calculator blocks', () => {
    const preset = ROTATION_PRESETS.find((p) => p.id === 'aemeath-prydwen-easy')!;
    const blocks = presetToBlocks(preset);
    expect(blocks).toHaveLength(15);
    expect(blocks[0]).toEqual({
      skillId: '1004606',
      motionName: 'Songs Across the Universe DMG',
      forteLevel: 10,
      activeBuffIds: [],
    });
    expect(blocks[14]).toEqual({ skillId: '1004609', motionName: '', forteLevel: 10, activeBuffIds: [] });
    expect(presetsForCharacter('aemeath').map((p) => p.id)).toEqual(['aemeath-prydwen-easy']);
    expect(presetsForCharacter('no-such-character')).toEqual([]);
  });
});

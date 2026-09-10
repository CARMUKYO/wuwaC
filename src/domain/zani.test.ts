import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { computeDamage } from './damage.ts';
import { elementalBoss, standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';
import { ZANI_MAX_BLAZES, zaniMotionCountsAs, zaniMotionMultiplier } from './zani.ts';

const snapshot = loadBundledSnapshot();
const zani = snapshot.characters.find((c) => c.id === 'zani')!;
const skill = zani.skills.find((s) => s.label.startsWith('Restless Watch'))!;
const liberation = zani.skills.find((s) => s.kind === 'liberation')!;
const forte = zani.skills.find((s) => s.kind === 'forte')!;

describe('zaniMotionMultiplier', () => {
  it('ignores other characters', () => {
    expect(zaniMotionMultiplier('jiyan', 6, 'skill', 'Targeted Action DMG')).toBe(1);
    expect(zaniMotionMultiplier(undefined, 6, 'liberation', 'The Last Stand DMG')).toBe(1);
  });

  it('applies S2 to Targeted Action and Forcible Riposte only', () => {
    expect(zaniMotionMultiplier('zani', 2, 'skill', 'Targeted Action DMG')).toBeCloseTo(1.8, 10);
    expect(zaniMotionMultiplier('zani', 2, 'skill', 'Forcible Riposte DMG')).toBeCloseTo(1.8, 10);
    expect(zaniMotionMultiplier('zani', 1, 'skill', 'Targeted Action DMG')).toBe(1);
    expect(zaniMotionMultiplier('zani', 2, 'skill', 'Standard Defense Protocol DMG')).toBe(1);
  });

  it('scales The Last Stand with consumed Blazes at S3, capped at +1200%', () => {
    const lastStand = 'The Last Stand DMG';
    expect(zaniMotionMultiplier('zani', 3, 'liberation', lastStand, { blazesConsumed: 0 })).toBe(1);
    expect(zaniMotionMultiplier('zani', 3, 'liberation', lastStand, { blazesConsumed: 100 })).toBeCloseTo(9, 10);
    expect(zaniMotionMultiplier('zani', 3, 'liberation', lastStand, { blazesConsumed: ZANI_MAX_BLAZES })).toBeCloseTo(13, 10);
    expect(zaniMotionMultiplier('zani', 3, 'liberation', lastStand, { blazesConsumed: 999 })).toBeCloseTo(13, 10);
    expect(zaniMotionMultiplier('zani', 2, 'liberation', lastStand, { blazesConsumed: 100 })).toBe(1);
    expect(zaniMotionMultiplier('zani', 3, 'liberation', 'Rekindle DMG', { blazesConsumed: 100 })).toBe(1);
  });

  it('applies S5 to Rekindle', () => {
    expect(zaniMotionMultiplier('zani', 5, 'liberation', 'Rekindle DMG')).toBeCloseTo(2.2, 10);
    expect(zaniMotionMultiplier('zani', 4, 'liberation', 'Rekindle DMG')).toBe(1);
  });

  it('applies S6 to Heavy Slashes plus per-hit Nightfall scaling', () => {
    expect(zaniMotionMultiplier('zani', 6, 'forte', 'Heavy Slash - Daybreak DMG')).toBeCloseTo(1.4, 10);
    expect(zaniMotionMultiplier('zani', 5, 'forte', 'Heavy Slash - Daybreak DMG')).toBe(1);
    // Nightfall with 40 Blazes on hit: 1.4 × (1 + 0.4 × 40) = 23.8.
    expect(zaniMotionMultiplier('zani', 6, 'forte', 'Heavy Slash - Nightfall DMG', { nightfallBlazes: 40 })).toBeCloseTo(23.8, 8);
    expect(zaniMotionMultiplier('zani', 6, 'forte', 'Heavy Slash - Nightfall DMG', { nightfallBlazes: 999 })).toBeCloseTo(23.8, 8);
    expect(zaniMotionMultiplier('zani', 6, 'forte', 'Heavy Slash - Nightfall DMG')).toBeCloseTo(1.4, 10);
  });
});

describe('zaniMotionCountsAs', () => {
  it('tags the four Inferno Heavy Slashes as Frazzle damage', () => {
    for (const name of ['Heavy Slash - Daybreak DMG', 'Heavy Slash - Dawning DMG', 'Heavy Slash - Nightfall DMG', 'Heavy Slash - Lightsmash DMG']) {
      expect(zaniMotionCountsAs(name)).toBe('spectroFrazzle');
    }
    expect(zaniMotionCountsAs('The Last Stand DMG')).toBeNull();
    expect(zaniMotionCountsAs('Targeted Action DMG')).toBeNull();
  });
});

describe('zani through computeDamage', () => {
  const common = {
    sheet: emptySheet(),
    baseAtk: { character: 100, weapon: 0 },
    baseHp: { character: 100 },
    baseDef: { character: 100 },
    attackerLevel: 90,
    enemy: standardMob(90),
    crit: 'nonCrit' as const,
    characterId: 'zani',
  };

  it('resolves S2 Targeted Action at ×1.8 end to end', () => {
    const base = computeDamage({ ...common, skill, motionName: 'Targeted Action DMG', forteLevel: 10 });
    const s2 = computeDamage({ ...common, skill, motionName: 'Targeted Action DMG', forteLevel: 10, resonanceChain: 2 });
    expect(s2.damage / base.damage).toBeCloseTo(1.8, 10);
  });

  it('resolves S3 Last Stand Blaze scaling end to end', () => {
    const base = computeDamage({ ...common, skill: liberation, motionName: 'The Last Stand DMG', forteLevel: 10, resonanceChain: 3 });
    const blazed = computeDamage({ ...common, skill: liberation, motionName: 'The Last Stand DMG', forteLevel: 10, resonanceChain: 3, blazesConsumed: 100 });
    expect(blazed.damage / base.damage).toBeCloseTo(9, 10);
  });

  it('leaves unrelated characters untouched (Jiyan control)', () => {
    const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
    const basic = jiyan.skills.find((s) => s.kind === 'basic')!;
    const boss = elementalBoss(90, 'Aero');
    const hit = computeDamage({ ...common, characterId: 'jiyan', skill: basic, motionName: 'Stage 1 DMG', forteLevel: 1, enemy: boss });
    expect(hit.damage).toBeGreaterThan(0);
  });

  it('covers the forte Nightfall input path', () => {
    const hit = computeDamage({ ...common, skill: forte, motionName: 'Heavy Slash - Nightfall DMG', forteLevel: 10, resonanceChain: 6, nightfallBlazes: 10 });
    expect(hit.damage).toBeGreaterThan(0);
  });
});

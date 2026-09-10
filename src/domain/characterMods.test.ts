import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import {
  characterResonanceModes,
  characterSkillMods,
  characterStatusBlocks,
  characterTuneRuptureResponses,
  characterUsesHavocBane,
  characterUsesTuneStrain,
  tuneResponseStackRate,
} from './characterMods.ts';

const snapshot = loadBundledSnapshot();
const zani = snapshot.characters.find((c) => c.id === 'zani')!;
const liberation = zani.skills.find((s) => s.kind === 'liberation')!;

describe('characterSkillMods', () => {
  it('routes Zani motions with Blaze inputs', () => {
    const mods = characterSkillMods('zani', 3, liberation, 'The Last Stand DMG', 'liberation', 10, { blazesConsumed: 50 });
    expect(mods).toEqual({ motionMultiplier: 5, dmgBonusExtra: 0, amplifyExtra: 0 });
  });

  it('returns neutral mods for unknown characters and undefined', () => {
    expect(characterSkillMods('jiyan', 6, liberation, 'The Last Stand DMG', 'liberation', 10, { blazesConsumed: 50 }))
      .toEqual({ motionMultiplier: 1, dmgBonusExtra: 0, amplifyExtra: 0 });
    expect(characterSkillMods(undefined, 6, liberation, 'The Last Stand DMG', 'liberation', 10))
      .toEqual({ motionMultiplier: 1, dmgBonusExtra: 0, amplifyExtra: 0 });
  });
});

describe('characterStatusBlocks', () => {
  it('offers detonation blocks only where the pipeline is computable', () => {
    expect(characterStatusBlocks('cartethyia')).toEqual(['aeroErosion']);
    expect(characterStatusBlocks('ciaccona')).toEqual(['aeroErosion']);
    expect(characterStatusBlocks('rover-aero')).toEqual(['aeroErosion']);
    expect(characterStatusBlocks('zani')).toEqual(['spectroFrazzle']);
    expect(characterStatusBlocks('phoebe')).toEqual(['spectroFrazzle']);
    expect(characterStatusBlocks('rover-spectro')).toEqual(['spectroFrazzle']);
    expect(characterStatusBlocks('jiyan')).toEqual([]);
    expect(characterStatusBlocks('yangyang-xuanling')).toEqual([]);
    expect(characterStatusBlocks('aemeath')).toEqual([]);
    // Electro/Glacio detonations have no published tables (G1) — no blocks.
    expect(characterStatusBlocks('buling')).toEqual([]);
    expect(characterStatusBlocks('rover-electro')).toEqual([]);
    expect(characterStatusBlocks('hiyuki')).toEqual([]);
    expect(characterStatusBlocks('suisui')).toEqual([]);
  });
});

describe('characterResonanceModes', () => {
  it('lists dual-mode kits and nothing else', () => {
    expect(characterResonanceModes('aemeath')).toEqual(['tuneRupture', 'fusionBurst']);
    expect(characterResonanceModes('denia')).toEqual(['fusionBurst', 'tuneStrain']);
    expect(characterResonanceModes('lynae')).toEqual(['tuneRupture', 'tuneStrain']);
    expect(characterResonanceModes('jiyan')).toEqual([]);
    expect(characterResonanceModes('cartethyia')).toEqual([]);
    // Lucilla's second mode is unverified (G6) — registry stays silent.
    expect(characterResonanceModes('lucilla')).toEqual([]);
  });
});

describe('tune registries', () => {
  it('exposes verified rupture rates and responses only', () => {
    expect(tuneResponseStackRate('aemeath')).toBeCloseTo(0.04, 10);
    expect(tuneResponseStackRate('mornye')).toBeNull();
    expect(tuneResponseStackRate(undefined)).toBeNull();
    expect(characterTuneRuptureResponses('aemeath')).toEqual(['Tune Rupture Response - Starburst DMG']);
    expect(characterTuneRuptureResponses('jiyan')).toEqual([]);
  });

  it('flags the Tune Strain responders', () => {
    for (const id of ['mornye', 'qingxiao', 'luuk-herssen', 'lynae', 'denia']) {
      expect(characterUsesTuneStrain(id)).toBe(true);
    }
    expect(characterUsesTuneStrain('zani')).toBe(false);
    expect(characterUsesTuneStrain('jiyan')).toBe(false);
  });
});

describe('characterUsesHavocBane', () => {
  it('flags the Bane dealers', () => {
    expect(characterUsesHavocBane('yangyang-xuanling')).toBe(true);
    expect(characterUsesHavocBane('chisa')).toBe(true);
    expect(characterUsesHavocBane('zani')).toBe(false);
    expect(characterUsesHavocBane('jiyan')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  havocBaneDefReduction,
  maxStatusStacks,
  negativeStatusDef,
  negativeStatusLevelMultiplier,
  statusStackMultiplier,
} from './negativeStatus.ts';

describe('negativeStatusDef', () => {
  it('maps each status to its element and default cap', () => {
    expect(negativeStatusDef('aeroErosion')).toMatchObject({ element: 'Aero', defaultMaxStacks: 6 });
    expect(negativeStatusDef('spectroFrazzle')).toMatchObject({ element: 'Spectro', defaultMaxStacks: 10 });
    expect(negativeStatusDef('havocBane')).toMatchObject({ element: 'Havoc', defaultMaxStacks: 3 });
    expect(negativeStatusDef('fusionBurst')).toMatchObject({ element: 'Fusion', defaultMaxStacks: 10 });
    expect(negativeStatusDef('electroFlare')).toMatchObject({ element: 'Electro', defaultMaxStacks: 10 });
    expect(negativeStatusDef('glacioChafe')).toMatchObject({ element: 'Glacio', defaultMaxStacks: 10 });
  });

  it('marks Havoc Bane as the only status that deals no damage', () => {
    expect(negativeStatusDef('havocBane').dealsDamage).toBe(false);
    for (const status of ['aeroErosion', 'spectroFrazzle', 'fusionBurst', 'electroFlare', 'glacioChafe'] as const) {
      expect(negativeStatusDef(status).dealsDamage).toBe(true);
    }
  });
});

describe('statusStackMultiplier', () => {
  it('matches the published Erosion table', () => {
    expect(statusStackMultiplier('aeroErosion', 1)).toBeCloseTo(0.36, 10);
    expect(statusStackMultiplier('aeroErosion', 2)).toBeCloseTo(0.899, 10);
    expect(statusStackMultiplier('aeroErosion', 6)).toBeCloseTo(4.497, 10);
  });

  it('matches the published Frazzle table', () => {
    expect(statusStackMultiplier('spectroFrazzle', 1)).toBeCloseTo(0.24, 10);
    expect(statusStackMultiplier('spectroFrazzle', 5)).toBeCloseTo(1.02, 10);
    expect(statusStackMultiplier('spectroFrazzle', 10)).toBeCloseTo(1.995, 10);
  });

  it('rejects out-of-range stacks', () => {
    expect(() => statusStackMultiplier('aeroErosion', 0)).toThrow(/1 to 6/);
    expect(() => statusStackMultiplier('aeroErosion', 7)).toThrow(/1 to 6/);
    expect(() => statusStackMultiplier('spectroFrazzle', 11)).toThrow(/1 to 10/);
    expect(() => statusStackMultiplier('spectroFrazzle', 1.5)).toThrow();
  });

  it('refuses Havoc Bane detonations with a modeling error', () => {
    expect(() => statusStackMultiplier('havocBane', 3)).toThrow(/no damage/);
  });

  it('refuses statuses with no published table instead of guessing', () => {
    expect(() => statusStackMultiplier('fusionBurst', 10)).toThrow(/no published stack-multiplier table/);
    expect(() => statusStackMultiplier('electroFlare', 10)).toThrow(/no published stack-multiplier table/);
    expect(() => statusStackMultiplier('glacioChafe', 10)).toThrow(/no published stack-multiplier table/);
  });
});

describe('maxStatusStacks', () => {
  it('returns default caps without character context', () => {
    expect(maxStatusStacks('aeroErosion')).toBe(6);
    expect(maxStatusStacks('spectroFrazzle')).toBe(10);
    expect(maxStatusStacks('havocBane')).toBe(3);
  });

  it('applies Cartethyia S2 Erosion extension only at S2+', () => {
    expect(maxStatusStacks('aeroErosion', 'cartethyia', 0)).toBe(6);
    expect(maxStatusStacks('aeroErosion', 'cartethyia', 1)).toBe(6);
    expect(maxStatusStacks('aeroErosion', 'cartethyia', 2)).toBe(9);
    expect(maxStatusStacks('spectroFrazzle', 'cartethyia', 6)).toBe(10);
  });

  it('applies Xuanling S3 Havoc Bane extension only at S3+', () => {
    expect(maxStatusStacks('havocBane', 'yangyang-xuanling', 2)).toBe(3);
    expect(maxStatusStacks('havocBane', 'yangyang-xuanling', 3)).toBe(6);
  });

  it('ignores unknown characters', () => {
    expect(maxStatusStacks('aeroErosion', 'jiyan', 6)).toBe(6);
  });
});

describe('havocBaneDefReduction', () => {
  it('removes 2% enemy DEF per stack, additively', () => {
    expect(havocBaneDefReduction(0)).toBe(0);
    expect(havocBaneDefReduction(1)).toBeCloseTo(0.02, 10);
    expect(havocBaneDefReduction(3)).toBeCloseTo(0.06, 10);
    expect(havocBaneDefReduction(6)).toBeCloseTo(0.12, 10);
  });

  it('rejects negative and fractional stacks', () => {
    expect(() => havocBaneDefReduction(-1)).toThrow();
    expect(() => havocBaneDefReduction(1.5)).toThrow();
  });
});

describe('negativeStatusLevelMultiplier', () => {
  it('hits the published wiki points', () => {
    expect(negativeStatusLevelMultiplier(10)).toBe(16);
    expect(negativeStatusLevelMultiplier(50)).toBe(229);
    expect(negativeStatusLevelMultiplier(80)).toBe(2005);
    expect(negativeStatusLevelMultiplier(90)).toBe(3674);
  });

  it('pins the sub-10 assumption and the level-90 clamp', () => {
    // The wiki's lowest known point is 10 → 16; the ramp from 0 at
    // level 1 is an assumption — pinned here so it changes loudly.
    expect(negativeStatusLevelMultiplier(1)).toBe(0);
    expect(negativeStatusLevelMultiplier(99)).toBe(3674);
  });

  it('interpolates linearly between known points', () => {
    // Halfway between 50 → 229 and 80 → 2005.
    expect(negativeStatusLevelMultiplier(65)).toBeCloseTo(229 + (2005 - 229) / 2, 10);
  });

  it('rejects levels below 1', () => {
    expect(() => negativeStatusLevelMultiplier(0)).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { echoRollValue, rollValueBlocks, substatRoll, substatTierBlocks } from './rollValue.ts';

describe('substatRoll', () => {
  it('maps an exact tier value to its 1-based tier', () => {
    // critRate tiers: 0.063 0.069 0.075 0.081 0.087 0.093 0.099 0.105 -> 0.093 is the 6th of 8.
    expect(substatRoll('critRate', 0.093)).toEqual({ tier: 6, tiers: 8 });
    expect(substatRoll('critRate', 0.063)).toEqual({ tier: 1, tiers: 8 });
    expect(substatRoll('critRate', 0.105)).toEqual({ tier: 8, tiers: 8 });
  });

  it('handles 4-tier flat stats', () => {
    // atk tiers: 30 40 50 60 -> 50 is the 3rd of 4.
    expect(substatRoll('atk', 50)).toEqual({ tier: 3, tiers: 4 });
  });

  it('snaps off-table values to the nearest tier, ties to the lower one', () => {
    // 0.072 is 0.001 from 0.071 (tier 2) and 0.007 from 0.079 (tier 3).
    expect(substatRoll('atkPct', 0.072)).toEqual({ tier: 2, tiers: 8 });
    // atk 45 is equidistant from 40 and 50 -> lower tier (2).
    expect(substatRoll('atk', 45)).toEqual({ tier: 2, tiers: 4 });
    // out-of-range clamps to the ends.
    expect(substatRoll('atk', 500)).toEqual({ tier: 4, tiers: 4 });
    expect(substatRoll('atk', 0)).toEqual({ tier: 1, tiers: 4 });
  });

  it('is null for stats without a tier table', () => {
    expect(substatRoll('healingBonus', 0.1)).toBeNull();
  });
});

describe('substatTierBlocks', () => {
  it('is ceil(tier / tiers * 4)', () => {
    // tier 1/8 -> ceil(0.5) = 1; 2/8 -> ceil(1) = 1; 3/8 -> ceil(1.5) = 2.
    expect(substatTierBlocks('critDmg', 0.126)).toBe(1);
    expect(substatTierBlocks('critDmg', 0.138)).toBe(1);
    expect(substatTierBlocks('critDmg', 0.15)).toBe(2);
    // tier 6/8 -> ceil(3) = 3; 7/8 -> ceil(3.5) = 4; 8/8 -> 4.
    expect(substatTierBlocks('critDmg', 0.186)).toBe(3);
    expect(substatTierBlocks('critDmg', 0.198)).toBe(4);
    expect(substatTierBlocks('critDmg', 0.21)).toBe(4);
    // 4-tier stats map one block per tier.
    expect(substatTierBlocks('def', 60)).toBe(3);
  });

  it('is null for untiered stats', () => {
    expect(substatTierBlocks('healingBonus', 0.1)).toBeNull();
  });
});

describe('echoRollValue', () => {
  it('averages tier/tiers over tiered substats, scaled to 100', () => {
    // critRate 0.093 -> 6/8 = 0.75; atk 30 -> 1/4 = 0.25; mean 0.5 -> 50.
    expect(
      echoRollValue([
        { stat: 'critRate', value: 0.093 },
        { stat: 'atk', value: 30 },
      ]),
    ).toBeCloseTo(50, 10);
  });

  it('ignores untiered substats', () => {
    // healingBonus is skipped; only critDmg 0.21 (8/8 = 1) counts.
    expect(
      echoRollValue([
        { stat: 'healingBonus', value: 0.2 },
        { stat: 'critDmg', value: 0.21 },
      ]),
    ).toBeCloseTo(100, 10);
  });

  it('is null with no tiered substats', () => {
    expect(echoRollValue([])).toBeNull();
    expect(echoRollValue([{ stat: 'healingBonus', value: 0.2 }])).toBeNull();
  });
});

describe('rollValueBlocks', () => {
  it('rounds score/10 and clamps to 0..10', () => {
    expect(rollValueBlocks(74)).toBe(7);
    expect(rollValueBlocks(75)).toBe(8);
    expect(rollValueBlocks(0)).toBe(0);
    expect(rollValueBlocks(100)).toBe(10);
    expect(rollValueBlocks(140)).toBe(10);
    expect(rollValueBlocks(-5)).toBe(0);
  });
});

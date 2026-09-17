import { describe, expect, it } from 'vitest';
import { isPercentStat, parseDisplayValue, statLabel, toDisplayValue } from './format.ts';

describe('isPercentStat', () => {
  it('treats hp/atk/def as flat, everything else as percent-style', () => {
    expect(isPercentStat('hp')).toBe(false);
    expect(isPercentStat('atk')).toBe(false);
    expect(isPercentStat('def')).toBe(false);
    expect(isPercentStat('atkPct')).toBe(true);
    expect(isPercentStat('critRate')).toBe(true);
    expect(isPercentStat('critDmg')).toBe(true);
    expect(isPercentStat('energyRegen')).toBe(true);
    expect(isPercentStat('healingBonus')).toBe(true);
    expect(isPercentStat('dmgBonus:Aero')).toBe(true);
    expect(isPercentStat('dmgBonus:skill')).toBe(true);
  });
});

describe('toDisplayValue', () => {
  it('shows ratios as % numbers without float noise', () => {
    expect(toDisplayValue('critRate', 0.063)).toBe('6.3');
    expect(toDisplayValue('atkPct', 0.3)).toBe('30');
    expect(toDisplayValue('dmgBonus:Aero', 0.1)).toBe('10');
  });

  it('shows flats as-is', () => {
    expect(toDisplayValue('atk', 100)).toBe('100');
    expect(toDisplayValue('hp', 1188.5)).toBe('1188.5');
  });
});

describe('parseDisplayValue', () => {
  it('divides percent-style input by 100', () => {
    expect(parseDisplayValue('critRate', '6.3')).toBeCloseTo(0.063, 10);
    expect(parseDisplayValue('atkPct', '30')).toBeCloseTo(0.3, 10);
  });

  it('keeps flat input as-is', () => {
    expect(parseDisplayValue('atk', '100')).toBe(100);
  });

  it('rejects empty, non-numeric, and negative input', () => {
    expect(() => parseDisplayValue('critRate', '')).toThrow();
    expect(() => parseDisplayValue('critRate', 'abc')).toThrow();
    expect(() => parseDisplayValue('atk', '-5')).toThrow();
    expect(() => parseDisplayValue('critRate', '-1')).toThrow();
  });

  it('accepts negatives for RES Penetration (shred) only', () => {
    expect(parseDisplayValue('resistancePenetration', '-10')).toBeCloseTo(-0.1, 10);
    expect(() => parseDisplayValue('defIgnore', '-10')).toThrow();
    expect(() => parseDisplayValue('defReduction', '-5')).toThrow();
    expect(() => parseDisplayValue('dmgBonus:Havoc', '-15')).toThrow();
  });

  it('round-trips through toDisplayValue', () => {
    expect(parseDisplayValue('critDmg', toDisplayValue('critDmg', 0.126))).toBeCloseTo(0.126, 10);
  });
});

describe('statLabel', () => {
  it('labels flat, ratio, and bucket stats', () => {
    expect(statLabel('atk')).toBe('ATK');
    expect(statLabel('critRate')).toBe('Crit Rate');
    expect(statLabel('dmgBonus:Aero')).toBe('Aero DMG');
    expect(statLabel('dmgBonus:skill')).toBe('Resonance Skill DMG');
    expect(statLabel('dmgBonus:physical')).toBe('Physical DMG');
    expect(statLabel('dmgBonus:coordinated')).toBe('Coordinated Attack DMG');
  });
});

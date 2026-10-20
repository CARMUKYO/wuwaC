import { describe, expect, it } from 'vitest';
import {
  parseNumberToken,
  readPrimaryMain,
  readSecondaryMain,
  readSubstat,
  toDisplay,
  toStored,
  type NumberToken,
  type StatFamily,
} from './values.ts';

const ATK: StatFamily = { kind: 'pair', flat: 'atk', pct: 'atkPct' };
const HP: StatFamily = { kind: 'pair', flat: 'hp', pct: 'hpPct' };
const CRIT_RATE: StatFamily = { kind: 'single', stat: 'critRate' };
const CRIT_DMG: StatFamily = { kind: 'single', stat: 'critDmg' };

function tok(raw: string): NumberToken {
  const t = parseNumberToken(raw);
  if (t === null) throw new Error(`fixture token ${raw} did not parse`);
  return t;
}

describe('parseNumberToken', () => {
  it('reads percent and flat values in display units', () => {
    expect(parseNumberToken('22.0%')).toEqual({ value: 22, decimals: 1, percent: true, raw: '22.0%' });
    expect(parseNumberToken('150')).toEqual({ value: 150, decimals: 0, percent: false, raw: '150' });
  });

  it('normalizes the slips tesseract makes on this font', () => {
    expect(parseNumberToken('1O.8%')?.value).toBe(10.8); // letter O
    expect(parseNumberToken('l0,1 %')?.value).toBe(10.1); // l for 1, comma, spaced %
    expect(parseNumberToken('6.9°%')?.value).toBe(6.9);
  });

  it('rejects non-numbers', () => {
    expect(parseNumberToken('ATK')).toBeNull();
    expect(parseNumberToken('9.3.%')).toBeNull();
    expect(parseNumberToken('')).toBeNull();
  });
});

describe('display/stored units', () => {
  it('converts ratios without float dust and leaves flats alone', () => {
    expect(toStored('critRate', 6.9)).toBe(0.069);
    expect(toDisplay('critDmg', 0.198)).toBe(19.8);
    expect(toStored('hp', 2280)).toBe(2280);
  });
});

describe('readSubstat', () => {
  it('accepts exact tier values', () => {
    expect(readSubstat(CRIT_RATE, tok('6.9%'))).toEqual({ stat: 'critRate', value: 0.069, status: 'exact' });
    expect(readSubstat(CRIT_DMG, tok('21.0%'))).toEqual({ stat: 'critDmg', value: 0.21, status: 'exact' });
  });

  it('resolves flat vs percent from the % sign and magnitude', () => {
    expect(readSubstat(ATK, tok('40'))).toEqual({ stat: 'atk', value: 40, status: 'exact' });
    expect(readSubstat(ATK, tok('10.1%'))).toEqual({ stat: 'atkPct', value: 0.101, status: 'exact' });
    expect(readSubstat(HP, tok('510'))).toEqual({ stat: 'hp', value: 510, status: 'exact' });
    // No % sign but a decimal: flats are integers, so this is HP% 11.6 — flagged.
    expect(readSubstat(HP, tok('11.6'))).toMatchObject({ stat: 'hpPct', value: 0.116, status: 'repaired' });
  });

  it('repairs a dropped decimal point only when it lands on a tier, and flags it', () => {
    // Seen on the Frostbite Coleoid fixture: "7.5%" read as "75%".
    expect(readSubstat(CRIT_RATE, tok('75%'))).toEqual({
      stat: 'critRate',
      value: 0.075,
      status: 'repaired',
      note: 'read "75%" — decimal point missing',
    });
    // "101" on ATK: not a flat tier (30–60); 10.1 is an ATK% tier.
    expect(readSubstat(ATK, tok('101'))).toMatchObject({ stat: 'atkPct', value: 0.101, status: 'repaired' });
  });

  it('marks impossible values invalid with the nearest tier as a suggestion', () => {
    // Seen on the Fusion Prism pass-1 read: "6.3%" truncated to "3%".
    const read = readSubstat(CRIT_RATE, tok('3%'));
    expect(read).toEqual({
      status: 'invalid',
      note: '"3%" is not a possible critRate substat roll',
      suggestion: { stat: 'critRate', value: 0.063 },
    });
    // 7.0 sits between the 6.9 and 7.5 tiers — never snapped silently.
    expect(readSubstat(CRIT_RATE, tok('7.0%')).status).toBe('invalid');
  });
});

describe('readPrimaryMain', () => {
  const maxed = { cost: 4 as const, level: 25, rarity: 5 };

  it('requires the exact 5★ +25 maximum', () => {
    expect(readPrimaryMain(CRIT_RATE, tok('22.0%'), maxed)).toEqual({ stat: 'critRate', value: 0.22, status: 'exact' });
    expect(readPrimaryMain(CRIT_DMG, tok('44.0%'), maxed)).toEqual({ stat: 'critDmg', value: 0.44, status: 'exact' });
    expect(readPrimaryMain(CRIT_RATE, tok('21.0%'), maxed)).toMatchObject({ status: 'invalid', suggestion: { stat: 'critRate', value: 0.22 } });
  });

  it('resolves ATK/HP/DEF to the percent stat (flats are secondary-only)', () => {
    expect(readPrimaryMain(ATK, tok('18.0%'), { cost: 1, level: 25, rarity: 5 })).toEqual({ stat: 'atkPct', value: 0.18, status: 'exact' });
    expect(readPrimaryMain(HP, tok('22.8%'), { cost: 1, level: 25, rarity: 5 })).toEqual({ stat: 'hpPct', value: 0.228, status: 'exact' });
  });

  it('rejects a stat outside the cost pool', () => {
    expect(readPrimaryMain(CRIT_RATE, tok('22.0%'), { cost: 3, level: 25, rarity: 5 })).toEqual({
      status: 'invalid',
      note: 'critRate is not a 3-cost main stat',
    });
  });

  it('only range-checks below +25 (the level curve is unsourced)', () => {
    const low = { cost: 4 as const, level: 10, rarity: 5 };
    // 4-cost Crit Rate range is 4.4–22.0.
    expect(readPrimaryMain(CRIT_RATE, tok('11.0%'), low)).toMatchObject({ stat: 'critRate', value: 0.11, status: 'unverified' });
    expect(readPrimaryMain(CRIT_RATE, tok('30.0%'), low).status).toBe('invalid');
  });
});

describe('readSecondaryMain', () => {
  it('requires the observed +25 constant per cost', () => {
    expect(readSecondaryMain(ATK, tok('150'), { cost: 4, level: 25, rarity: 5 })).toEqual({ stat: 'atk', value: 150, status: 'exact' });
    expect(readSecondaryMain(ATK, tok('100'), { cost: 3, level: 25, rarity: 5 })).toEqual({ stat: 'atk', value: 100, status: 'exact' });
    expect(readSecondaryMain(HP, tok('2280'), { cost: 1, level: 25, rarity: 5 })).toEqual({ stat: 'hp', value: 2280, status: 'exact' });
    expect(readSecondaryMain(ATK, tok('100'), { cost: 4, level: 25, rarity: 5 }).status).toBe('invalid');
  });

  it('rejects the wrong stat for the cost', () => {
    expect(readSecondaryMain(ATK, tok('2280'), { cost: 1, level: 25, rarity: 5 })).toMatchObject({
      status: 'invalid',
      note: "a 1-cost Echo's second main stat is flat hp",
    });
  });

  it('upper-bounds below +25', () => {
    expect(readSecondaryMain(ATK, tok('90'), { cost: 4, level: 15, rarity: 5 })).toMatchObject({ stat: 'atk', value: 90, status: 'unverified' });
    expect(readSecondaryMain(ATK, tok('151'), { cost: 4, level: 15, rarity: 5 }).status).toBe('invalid');
  });
});

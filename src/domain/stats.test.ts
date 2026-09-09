import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import type { OwnedEcho, RosterEntry } from '../data/schema.ts';
import {
  computeAbilityStat,
  computeAtk,
  computeDef,
  computeHp,
  computeStats,
  emptySheet,
  getBaseStatsAtLevel,
  lookupCurve,
  scaledByRank,
} from './stats.ts';

const snapshot = loadBundledSnapshot();
const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
const verdant = snapshot.weapons.find((w) => w.id === 'verdant-summit')!;
const sierra = snapshot.sonataSets.find((s) => s.id === 'sierra-gale')!;

describe('emptySheet', () => {
  it('zeroes every stat key', () => {
    const sheet = emptySheet();
    expect(sheet.atk).toBe(0);
    expect(sheet.critRate).toBe(0);
    expect(sheet['dmgBonus:Aero']).toBe(0);
    expect(sheet.defIgnore).toBe(0);
    expect(sheet.specialBonus).toBe(0);
    expect(Object.values(sheet).every((v) => v === 0)).toBe(true);
  });
});

describe('lookupCurve', () => {
  const points = [
    { level: 1, value: 10 },
    { level: 20, value: 20 },
    { level: 20.5, value: 25 },
  ];

  it('resolves exact, floor, and ascension-tier levels', () => {
    expect(lookupCurve(points, 1)).toBe(10);
    expect(lookupCurve(points, 19)).toBe(10);
    expect(lookupCurve(points, 20)).toBe(20);
    expect(lookupCurve(points, 20.5)).toBe(25);
    expect(lookupCurve(points, 90)).toBe(25);
  });

  it('throws below the first point', () => {
    expect(() => lookupCurve(points, 0)).toThrow();
  });
});

describe('getBaseStatsAtLevel', () => {
  it('reads the level-1 row (hand-checked against snapshot)', () => {
    expect(getBaseStatsAtLevel(jiyan, 1, 0)).toEqual({ hp: 839, atk: 35, def: 97 });
  });

  it('picks pre/post-ascension entries at duplicated levels', () => {
    // Level 20 carries two rows: pre-ascension (atk 91.0385) then post (117.2885).
    expect(getBaseStatsAtLevel(jiyan, 20, 0).atk).toBeCloseTo(91.0385, 10);
    expect(getBaseStatsAtLevel(jiyan, 20, 1).atk).toBeCloseTo(117.2885, 10);
    expect(getBaseStatsAtLevel(jiyan, 20, 6).atk).toBeCloseTo(117.2885, 10);
  });

  it('returns the single row where no duplicate exists', () => {
    expect(getBaseStatsAtLevel(jiyan, 90, 6)).toEqual({
      hp: 10487.5,
      atk: 437.5,
      def: 1185.5534,
    });
    expect(getBaseStatsAtLevel(jiyan, 90, 0)).toEqual({
      hp: 10487.5,
      atk: 437.5,
      def: 1185.5534,
    });
  });
});

describe('computeAtk', () => {
  it('follows ATK = (baseChar + baseWeapon) x (1 + pct) + flat', () => {
    const sheet = emptySheet();
    sheet.atkPct = 0.5;
    sheet.atk = 50;
    // (100 + 200) x 1.5 + 50 = 500
    expect(computeAtk(100, 200, sheet)).toBe(500);
  });
});

describe('computeHp / computeDef', () => {
  it('follows HP = baseChar x (1 + pct) + flat (wiki HP page, no weapon base)', () => {
    const sheet = emptySheet();
    sheet.hpPct = 0.5;
    sheet.hp = 1000;
    // 10000 x 1.5 + 1000 = 16000
    expect(computeHp(10000, sheet)).toBe(16000);
  });

  it('follows DEF = baseChar x (1 + pct) + flat (parallel, no weapon base)', () => {
    const sheet = emptySheet();
    sheet.defPct = 0.25;
    sheet.def = 200;
    // 1000 x 1.25 + 200 = 1450
    expect(computeDef(1000, sheet)).toBe(1450);
  });

  it('resolves the scaling tag via computeAbilityStat', () => {
    const sheet = emptySheet();
    sheet.atkPct = 1;
    sheet.hpPct = 1;
    sheet.defPct = 1;
    const bases = { atkCharacter: 100, atkWeapon: 100, hpCharacter: 1000, defCharacter: 500 };
    // ATK: (100+100) x 2 = 400; HP: 1000 x 2 = 2000; DEF: 500 x 2 = 1000.
    expect(computeAbilityStat('ATK', bases, sheet)).toBe(400);
    expect(computeAbilityStat('HP', bases, sheet)).toBe(2000);
    expect(computeAbilityStat('DEF', bases, sheet)).toBe(1000);
  });
});

describe('scaledByRank', () => {
  it('scales rank-1 values linearly (matches both synced passives)', () => {
    expect(scaledByRank(0.12, 1)).toBeCloseTo(0.12, 10);
    expect(scaledByRank(0.12, 5)).toBeCloseTo(0.6, 10);
  });

  it('rejects ranks outside 1-5', () => {
    expect(() => scaledByRank(0.12, 0)).toThrow();
    expect(() => scaledByRank(0.12, 6)).toThrow();
  });
});

describe('computeStats', () => {
  const roster: RosterEntry = {
    characterId: 'jiyan',
    level: 1,
    ascension: 0,
    resonanceChain: 0,
    forteLevels: {},
    weaponId: 'verdant-summit',
    weaponLevel: 1,
    weaponRank: 1,
  };
  const echoes: OwnedEcho[] = [
    {
      id: 'echo-a',
      echoDefId: 'echo-a-def',
      sonataId: 'sierra-gale',
      cost: 4,
      level: 25,
      rarity: 5,
      mainStat: { stat: 'atkPct', value: 0.3 },
      substats: [{ stat: 'critRate', value: 0.05 }],
      equippedTo: null,
      origin: 'manual',
    },
    {
      id: 'echo-b',
      echoDefId: 'echo-b-def',
      sonataId: 'sierra-gale',
      cost: 3,
      level: 25,
      rarity: 5,
      mainStat: { stat: 'atk', value: 100 },
      secondMainStat: { stat: 'atk', value: 50 },
      substats: [],
      equippedTo: null,
      origin: 'manual',
    },
  ];

  it('aggregates base + weapon + forte + echoes + 2pc sonata', () => {
    const { sheet, baseAtk, baseHp, baseDef, warnings } = computeStats({
      character: jiyan,
      weapon: verdant,
      roster,
      echoes,
      sonataSets: [sierra],
    });

    // Base L1: hp 839 / atk 35 / def 97. Verdant L1: atk 47, critDmg +10.80%.
    expect(baseAtk).toEqual({ character: 35, weapon: 47 });
    expect(baseHp).toEqual({ character: 839 });
    expect(baseDef).toEqual({ character: 97 });
    // Bases stay out of the sheet (bonuses only) — v2 aligns HP/DEF with ATK.
    expect(sheet.hp).toBe(0);
    expect(sheet.def).toBe(0);
    // atkPct: forte 4.2+1.8+1.8+4.2 = 12% + echo 30% = 42%.
    expect(sheet.atkPct).toBeCloseTo(0.42, 10);
    // Flat atk: echo main 100 + secondary 50 = 150 (base excluded by design).
    expect(sheet.atk).toBe(150);
    // critRate: base 5% + forte 1.2+1.2+2.8+2.8 = 8% + substat 5% = 18%.
    expect(sheet.critRate).toBeCloseTo(0.18, 10);
    // critDmg: base 150% + weapon secondary 10.80% = 160.80%.
    expect(sheet.critDmg).toBeCloseTo(1.608, 10);
    // 2pc Sierra Gale (distinct defs): Aero +10%. 5pc not triggered, no warning.
    expect(sheet['dmgBonus:Aero']).toBeCloseTo(0.1, 10);
    // Only the unstructured weapon passive warns.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/weapon passive/);
  });

  it('counts duplicate Echo definitions once toward sonata pieces', () => {
    const dupe = { ...echoes[1], id: 'echo-b-copy' };
    const { sheet, warnings } = computeStats({
      character: jiyan,
      weapon: verdant,
      roster,
      echoes: [echoes[0], echoes[1], dupe],
      sonataSets: [sierra],
    });
    // Still 2 distinct pieces: 2pc holds, 5pc stays silent.
    expect(sheet['dmgBonus:Aero']).toBeCloseTo(0.1, 10);
    expect(warnings).toHaveLength(1);
  });
});

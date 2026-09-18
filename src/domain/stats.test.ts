import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { rosterEntrySchema, type OwnedEcho, type RosterEntry } from '../data/schema.ts';
import {
  computeAbilityStat,
  computeAtk,
  computeDef,
  computeHp,
  computeStats,
  emptySheet,
  getBaseStatsAtLevel,
  lookupAscendedCurve,
  lookupCurve,
  scaledByRank,
  type ComputeStatsResult,
} from './stats.ts';

const snapshot = loadBundledSnapshot();
const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
const verdant = snapshot.weapons.find((w) => w.id === 'verdant-summit')!;
const sierra = snapshot.sonataSets.find((s) => s.id === 'sierra-gale')!;
const frosty = snapshot.sonataSets.find((s) => s.id === 'frosty-resolve')!;
const windward = snapshot.sonataSets.find((s) => s.id === 'windward-pilgrimage')!;
const dream = snapshot.sonataSets.find((s) => s.id === 'dream-of-the-lost')!;
const shadow = snapshot.sonataSets.find((s) => s.id === 'shadow-of-shattered-dreams')!;

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
    const { sheet, baseAtk, baseHp, baseDef, warnings, appliedAssumptions } = computeStats({
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
    // Verdant Summit R1 auto-applies: Aero +12% (character bucket) + Heavy 2x24%.
    expect(sheet['dmgBonus:Aero']).toBeCloseTo(0.22, 10);
    expect(sheet['dmgBonus:heavy']).toBeCloseTo(0.48, 10);
    // The transcribed weapon passive applies instead of warning.
    expect(warnings).toHaveLength(0);
    expect(appliedAssumptions).toHaveLength(1);
    expect(appliedAssumptions[0]).toMatch(/Verdant Summit R1/);
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
    expect(sheet['dmgBonus:Aero']).toBeCloseTo(0.22, 10);
    expect(warnings).toHaveLength(0);
  });

  it('auto-applies a transcribed 5pc bonus at exactly 5 distinct pieces', () => {
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const five = ['d1', 'd2', 'd3', 'd4', 'd5'].map((def, i) => ({
      ...echoes[0],
      id: `sierra-${i}`,
      echoDefId: def,
      mainStat: { stat: 'atk' as const, value: 0 },
      substats: [],
    }));
    const { sheet, appliedAssumptions } = computeStats({
      character: jiyan,
      weapon: plain,
      roster: { ...roster, weaponId: plain.id },
      echoes: five,
      sonataSets: [sierra],
    });
    // 2pc +10% and transcribed 5pc +30% stack; the untranscribed weapon warns instead.
    expect(sheet['dmgBonus:Aero']).toBeCloseTo(0.4, 10);
    expect(appliedAssumptions).toHaveLength(1);
    expect(appliedAssumptions[0]).toMatch(/Sierra Gale 5pc/);
  });

  it('stacks transcribed 2pc + 5pc on Frosty Resolve (hand-computed)', () => {
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const five = ['f1', 'f2', 'f3', 'f4', 'f5'].map((def, i) => ({
      ...echoes[0],
      id: `frosty-${i}`,
      echoDefId: def,
      sonataId: 'frosty-resolve',
      mainStat: { stat: 'atk' as const, value: 0 },
      substats: [],
    }));
    const { sheet, warnings, appliedAssumptions } = computeStats({
      character: jiyan,
      weapon: plain,
      roster: { ...roster, weaponId: plain.id },
      echoes: five,
      sonataSets: [frosty],
    });
    // 2pc Skill +12% plus 5pc Glacio +22.5% and Skill 2 x 18%: Skill totals 48%.
    expect(sheet['dmgBonus:Glacio']).toBeCloseTo(0.225, 10);
    expect(sheet['dmgBonus:skill']).toBeCloseTo(0.48, 10);
    expect(appliedAssumptions).toHaveLength(2);
    // Covered thresholds never warn — only the untranscribed weapon does.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/Graceful Touch/);
  });

  it('stacks transcribed 2pc + 5pc on Windward Pilgrimage (hand-computed)', () => {
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const five = ['w1', 'w2', 'w3', 'w4', 'w5'].map((def, i) => ({
      ...echoes[0],
      id: `windward-${i}`,
      echoDefId: def,
      sonataId: 'windward-pilgrimage',
      mainStat: { stat: 'atk' as const, value: 0 },
      substats: [],
    }));
    const { sheet, appliedAssumptions } = computeStats({
      character: jiyan,
      weapon: plain,
      roster: { ...roster, weaponId: plain.id },
      echoes: five,
      sonataSets: [windward],
    });
    // 2pc Aero +10% plus 5pc Aero +30%: Aero totals 40%. Crit Rate is base
    // 5% + forte 8% + 5pc 10% = 23%.
    expect(sheet['dmgBonus:Aero']).toBeCloseTo(0.4, 10);
    expect(sheet.critRate).toBeCloseTo(0.23, 10);
    expect(appliedAssumptions).toHaveLength(2);
  });

  it('applies 3pc and 1pc thresholds from the transcription wave (hand-computed)', () => {
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const base = {
      character: jiyan,
      weapon: plain,
      roster: { ...roster, weaponId: plain.id },
    };
    const trio = ['d1', 'd2', 'd3'].map((def, i) => ({
      ...echoes[0],
      id: `dream-${i}`,
      echoDefId: def,
      sonataId: 'dream-of-the-lost',
      mainStat: { stat: 'atk' as const, value: 0 },
      substats: [],
    }));
    const dreamResult = computeStats({ ...base, echoes: trio, sonataSets: [dream] });
    // Dream 3pc: Crit Rate 5% base + 8% forte + 20%, Echo Skill +35%.
    expect(dreamResult.sheet.critRate).toBeCloseTo(0.33, 10);
    expect(dreamResult.sheet['dmgBonus:echo']).toBeCloseTo(0.35, 10);
    const solo = [{
      ...echoes[0],
      id: 'shadow-0',
      echoDefId: 's1',
      sonataId: 'shadow-of-shattered-dreams',
      mainStat: { stat: 'atk' as const, value: 0 },
      substats: [],
    }];
    const shadowResult = computeStats({ ...base, echoes: solo, sonataSets: [shadow] });
    // Shadow 1pc fires on a single piece: Basic +35%, Heavy +35%.
    expect(shadowResult.sheet['dmgBonus:basic']).toBeCloseTo(0.35, 10);
    expect(shadowResult.sheet['dmgBonus:heavy']).toBeCloseTo(0.35, 10);
  });

  it('resolves the wielded weapon preset at the roster rank (Verdant R5)', () => {
    const { sheet, appliedAssumptions } = computeStats({
      character: jiyan,
      weapon: verdant,
      roster: { ...roster, weaponRank: 5 },
      echoes,
      sonataSets: [sierra],
    });
    expect(sheet['dmgBonus:Aero']).toBeCloseTo(0.34, 10);
    expect(sheet['dmgBonus:heavy']).toBeCloseTo(0.96, 10);
    expect(appliedAssumptions[0]).toMatch(/Verdant Summit R5/);
  });

  it('scores Boson Astrolabe base plus branch ATK at the roster rank (hand-computed)', () => {
    const boson = snapshot.weapons.find((w) => w.id === 'boson-astrolabe')!;
    const atRank = (weaponRank: number): number =>
      computeStats({
        character: jiyan,
        weapon: boson,
        roster: { ...roster, weaponId: boson.id, weaponRank },
        echoes,
        sonataSets: [sierra],
      }).sheet.atkPct;
    // Forte 12% + echo 30% + base 12% + branch 12% at R1;
    // forte + echo + base 24% + branch 18% at R5.
    expect(atRank(1)).toBeCloseTo(0.66, 10);
    expect(atRank(5)).toBeCloseTo(0.84, 10);
  });

  it('applies the slot-1 echo bonus only via mainEcho, honoring character gates', () => {
    const lorelei: OwnedEcho = { ...echoes[0], id: 'main', echoDefId: 'lorelei' };
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const base = {
      character: jiyan,
      weapon: plain,
      roster: { ...roster, weaponId: plain.id },
      echoes: [lorelei, echoes[1]],
      sonataSets: [sierra],
    };
    const without = computeStats(base);
    expect(without.sheet['dmgBonus:Havoc']).toBe(0);
    expect(without.sheet['dmgBonus:basic']).toBe(0);
    const withMain = computeStats({ ...base, mainEcho: lorelei });
    expect(withMain.sheet['dmgBonus:Havoc']).toBeCloseTo(0.12, 10);
    expect(withMain.sheet['dmgBonus:basic']).toBeCloseTo(0.12, 10);
    expect(withMain.appliedAssumptions[0]).toMatch(/Lorelei/);
    // Sigillum is Aemeath-only: Jiyan holding it in slot 1 gains nothing.
    const sigillum: OwnedEcho = { ...echoes[0], id: 'sig', echoDefId: 'sigillum' };
    const gated = computeStats({ ...base, mainEcho: sigillum });
    expect(gated.sheet['dmgBonus:liberation']).toBe(0);
    expect(gated.appliedAssumptions).toHaveLength(0);
  });

  it('auto-applies the Hecate main-slot coordinated bonus', () => {
    const hecate: OwnedEcho = { ...echoes[0], id: 'hec', echoDefId: 'hecate' };
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const result = computeStats({
      character: jiyan,
      weapon: plain,
      roster: { ...roster, weaponId: plain.id },
      echoes: [hecate, echoes[1]],
      sonataSets: [sierra],
      mainEcho: hecate,
    });
    expect(result.sheet['dmgBonus:coordinated']).toBeCloseTo(0.4, 10);
    expect(result.appliedAssumptions[0]).toMatch(/Hecate/);
  });

  it('applies Yangyang S1/S3 at absolute hand-computed values (S2 warns)', () => {
    const yangyang = snapshot.characters.find((c) => c.id === 'yangyang')!;
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const result = computeStats({
      character: yangyang,
      weapon: plain,
      roster: { ...roster, characterId: 'yangyang', weaponId: plain.id, resonanceChain: 3 },
      echoes: [],
      sonataSets: [],
    });
    // Forte Aero: 0.018+0.042+0.042+0.018 = 0.12, plus S1 0.15.
    expect(result.sheet['dmgBonus:Aero']).toBeCloseTo(0.27, 10);
    // S3 is the only skill-bucket source here.
    expect(result.sheet['dmgBonus:skill']).toBeCloseTo(0.4, 10);
    // Forte ATK: 0.018+0.042+0.042+0.018 = 0.12; beguiling secondary
    // at level 1 = 0.0675.
    expect(result.sheet.atkPct).toBeCloseTo(0.1875, 10);
    expect(result.appliedAssumptions).toHaveLength(2);
    expect(result.appliedAssumptions[0]).toMatch(/Yangyang S1 — /);
    expect(result.appliedAssumptions[1]).toMatch(/Yangyang S3 — /);
    expect(result.warnings.some((w) => /S2[\s\S]*Resonance Energy/.test(w))).toBe(true);
  });

  it('resolves Chixia S5 ATK differentially with S2/S4 note warnings', () => {
    const chixia = snapshot.characters.find((c) => c.id === 'chixia')!;
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const at = (resonanceChain: number): number =>
      computeStats({
        character: chixia,
        weapon: plain,
        roster: { ...roster, characterId: 'chixia', weaponId: plain.id, resonanceChain },
        echoes: [],
        sonataSets: [],
      }).sheet.atkPct;
    expect(at(5) - at(0)).toBeCloseTo(0.3, 10);
    const result = computeStats({
      character: chixia,
      weapon: plain,
      roster: { ...roster, characterId: 'chixia', weaponId: plain.id, resonanceChain: 5 },
      echoes: [],
      sonataSets: [],
    });
    // S1/S3 are motion-scope (silent until scoring); S2/S4 are plain notes.
    expect(result.warnings.some((w) => /S2[\s\S]*Resonance Energy/.test(w))).toBe(true);
    expect(result.warnings.some((w) => /S4[\s\S]*ammo/.test(w))).toBe(true);
    expect(result.warnings.some((w) => /S[13][\s\S] /.test(w))).toBe(false);
    expect(result.appliedAssumptions).toEqual([
      expect.stringMatching(/Chixia S5 — .*max stacks/),
    ]);
  });

  it('auto-applies Cartethyia S4 all-attribute +20% at S4 with disclosure', () => {
    const cartethyia = snapshot.characters.find((c) => c.id === 'cartethyia')!;
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const at = (resonanceChain: number): ComputeStatsResult =>
      computeStats({
        character: cartethyia,
        weapon: plain,
        roster: { ...roster, characterId: 'cartethyia', weaponId: plain.id, resonanceChain },
        echoes: [],
        sonataSets: [],
      });
    // S1-S3 are module/note-covered (no sheet parts): S3 adds nothing over
    // S0 on any attribute bucket; S4 adds exactly +0.2 to all six.
    const buckets = ['dmgBonus:Glacio', 'dmgBonus:Fusion', 'dmgBonus:Electro', 'dmgBonus:Aero', 'dmgBonus:Spectro', 'dmgBonus:Havoc'] as const;
    for (const bucket of buckets) {
      expect(at(3).sheet[bucket] - at(0).sheet[bucket]).toBe(0);
      expect(at(4).sheet[bucket] - at(0).sheet[bucket]).toBeCloseTo(0.2, 10);
    }
    expect(at(4).appliedAssumptions).toEqual([
      expect.stringMatching(/Cartethyia S4 — .*full uptime/i),
    ]);
  });

  it('resolves Jiyan S2/S3/S4/S5 cumulatively with only S1 warning', () => {
    const at = (resonanceChain: number): ComputeStatsResult =>
      computeStats({
        character: jiyan,
        weapon: verdant,
        roster: { ...roster, resonanceChain },
        echoes,
        sonataSets: [sierra],
      });
    const base = at(0);
    const s6 = at(6);
    expect(s6.sheet.atkPct - base.sheet.atkPct).toBeCloseTo(0.28 + 0.45, 10);
    expect(s6.sheet.critRate - base.sheet.critRate).toBeCloseTo(0.16, 10);
    expect(s6.sheet.critDmg - base.sheet.critDmg).toBeCloseTo(0.32, 10);
    expect(s6.sheet['dmgBonus:heavy'] - base.sheet['dmgBonus:heavy']).toBeCloseTo(0.25, 10);
    const chainWarnings = s6.warnings.filter((w) => w.includes('resonance chain'));
    expect(chainWarnings).toHaveLength(1);
    expect(chainWarnings[0]).toMatch(/S1[\s\S]*Resolve/);
    const chainAssumptions = s6.appliedAssumptions.filter((a) => /^Jiyan S[2-5]/.test(a));
    expect(chainAssumptions).toHaveLength(4);
  });

  it('keeps Zani module-covered ranks silent while applying S1/S2 sheet parts', () => {
    const zani = snapshot.characters.find((c) => c.id === 'zani')!;
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const run = (resonanceChain: number): ComputeStatsResult =>
      computeStats({
        character: zani,
        weapon: plain,
        roster: { ...roster, characterId: 'zani', weaponId: plain.id, resonanceChain },
        echoes: [],
        sonataSets: [],
      });
    const base = run(0);
    const s6 = run(6);
    expect(s6.sheet['dmgBonus:Spectro'] - base.sheet['dmgBonus:Spectro']).toBeCloseTo(0.5, 10);
    expect(s6.sheet.critRate - base.sheet.critRate).toBeCloseTo(0.2, 10);
    expect(s6.sheet.atkPct - base.sheet.atkPct).toBeCloseTo(0.2, 10);
    // S3/S5/S6 score in zaniMotionMultiplier; S1's note rides with its sheet
    // entry; S4 has sheet + team entries — no chain rank warns.
    expect(s6.warnings.filter((w) => w.includes('resonance chain'))).toHaveLength(0);
    expect(s6.appliedAssumptions.filter((a) => /^Zani S[124]/.test(a))).toHaveLength(3);
  });

  it('auto-applies the Luuk Herssen S4 wielder amplify part (Wave 2 team wording)', () => {
    const luuk = snapshot.characters.find((c) => c.id === 'luuk-herssen')!;
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const at = (resonanceChain: number): ComputeStatsResult =>
      computeStats({
        character: luuk,
        weapon: plain,
        roster: { ...roster, characterId: 'luuk-herssen', weaponId: plain.id, resonanceChain },
        echoes: [],
        sonataSets: [],
      });
    expect(at(4).sheet.amplify - at(3).sheet.amplify).toBeCloseTo(0.2, 10);
    expect(at(4).appliedAssumptions).toContainEqual(expect.stringMatching(/Luuk Herssen S4 — /));
  });

  it('resolves Wave-3 sheet shapes differentially (shred, amplify, DEF ignore, Crown stacks)', () => {
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const at = (characterId: string, resonanceChain: number): ComputeStatsResult => {
      const character = snapshot.characters.find((c) => c.id === characterId)!;
      return computeStats({
        character,
        weapon: plain,
        roster: { ...roster, characterId, weaponId: plain.id, resonanceChain },
        echoes: [],
        sonataSets: [],
      });
    };
    // Per-element shred scores sheet-wide as negative penetration (Phoebe precedent).
    expect(at('chisa', 2).sheet.resistancePenetration - at('chisa', 0).sheet.resistancePenetration).toBeCloseTo(-0.1, 10);
    // "All DMG Amplification" maps to the amplify term.
    expect(at('lynae', 2).sheet.amplify - at('lynae', 0).sheet.amplify).toBeCloseTo(0.25, 10);
    // Global DEF ignore is a plain sheet stat.
    expect(at('qiuyuan', 5).sheet.defIgnore - at('qiuyuan', 0).sheet.defIgnore).toBeCloseTo(0.15, 10);
    // Augusta Crown stacks compose across ranks: S1/S2 value stacks 1-2,
    // S6 adds the marginal stacks 3-4 (cap raised to 4).
    const aug0 = at('augusta', 0);
    const aug6 = at('augusta', 6);
    expect(aug6.sheet.critDmg - aug0.sheet.critDmg).toBeCloseTo(0.6, 10);
    expect(aug6.sheet.critRate - aug0.sheet.critRate).toBeCloseTo(0.8, 10);
    expect(at('augusta', 1).sheet.critDmg - aug0.sheet.critDmg).toBeCloseTo(0.3, 10);
  });

  it('auto-applies team-rank wielder parts (Sanhua S6, Roccia S2)', () => {
    const plain = snapshot.weapons.find((w) => w.id === 'beguiling-melody')!;
    const at = (characterId: string, resonanceChain: number): ComputeStatsResult => {
      const character = snapshot.characters.find((c) => c.id === characterId)!;
      return computeStats({
        character,
        weapon: plain,
        roster: { ...roster, characterId, weaponId: plain.id, resonanceChain },
        echoes: [],
        sonataSets: [],
      });
    };
    expect(at('sanhua', 6).sheet.atkPct - at('sanhua', 5).sheet.atkPct).toBeCloseTo(0.2, 10);
    expect(at('roccia', 2).sheet['dmgBonus:Havoc'] - at('roccia', 1).sheet['dmgBonus:Havoc']).toBeCloseTo(0.4, 10);
  });
});

describe('lookupAscendedCurve', () => {
  const points = [
    { level: 1, value: 10 },
    { level: 20, value: 20 },
    { level: 20.5, value: 25 },
    { level: 40, value: 40 },
    { level: 40.5, value: 45 },
  ];

  it('selects the post-ascension tier only when ascension reaches the breakpoint rank', () => {
    expect(lookupAscendedCurve(points, 20, 0)).toBe(20);
    expect(lookupAscendedCurve(points, 20, 1)).toBe(25);
    // Second breakpoint needs ascension 2.
    expect(lookupAscendedCurve(points, 40, 1)).toBe(40);
    expect(lookupAscendedCurve(points, 40, 2)).toBe(45);
  });

  it('matches lookupCurve away from breakpoints', () => {
    expect(lookupAscendedCurve(points, 19, 6)).toBe(10);
    expect(lookupAscendedCurve(points, 21, 0)).toBe(25);
  });
});

describe('computeStats weapon ascension + forte unlocks (U6)', () => {
  const base: RosterEntry = {
    characterId: 'jiyan',
    level: 1,
    ascension: 0,
    resonanceChain: 0,
    forteLevels: {},
    weaponId: 'verdant-summit',
    weaponLevel: 20,
    weaponRank: 1,
  };
  const at = (patch: Partial<RosterEntry>): ComputeStatsResult =>
    computeStats({ character: jiyan, weapon: verdant, roster: { ...base, ...patch }, echoes: [], sonataSets: [] });

  it('differs by the snapshot tier delta at the ascension breakpoint', () => {
    // Verdant Summit L20: pre 122.25 / post 153.58 (hand-checked against snapshot).
    expect(at({ weaponAscension: 0 }).baseAtk.weapon).toBeCloseTo(122.25, 10);
    expect(at({ weaponAscension: 1 }).baseAtk.weapon).toBeCloseTo(153.58, 10);
  });

  it('drops exactly the deselected node stat', () => {
    const all = jiyan.forteNodes.map((n) => n.id);
    // Node 185 is Crit Rate +1.2%; dropping it costs exactly 0.012.
    const full = at({ forteUnlockedIds: all }).sheet.critRate;
    const minusOne = at({ forteUnlockedIds: all.filter((id) => id !== '185') }).sheet.critRate;
    expect(full - minusOne).toBeCloseTo(0.012, 10);
    // Empty unlock set: no forte contribution — base 5% crit only, no atkPct.
    const none = at({ forteUnlockedIds: [] }).sheet;
    expect(none.critRate).toBeCloseTo(0.05, 10);
    expect(none.atkPct).toBe(0);
  });

  it('treats absent fields as all-nodes-on, pre-ascension (legacy default)', () => {
    const legacy = at({});
    const explicit = at({
      weaponAscension: 0,
      forteUnlockedIds: jiyan.forteNodes.map((n) => n.id),
    });
    expect(legacy.sheet).toEqual(explicit.sheet);
    expect(legacy.baseAtk).toEqual(explicit.baseAtk);
  });

  it('parses legacy stored entries without the new fields', () => {
    // `base` carries neither new field — exactly what old IndexedDB rows look like.
    const parsed = rosterEntrySchema.parse({ ...base });
    expect(parsed.weaponAscension).toBeUndefined();
    expect(parsed.forteUnlockedIds).toBeUndefined();
  });
});

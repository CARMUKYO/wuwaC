import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import {
  computeDamage,
  standardMob,
} from './damage.ts';
import { emptySheet } from './stats.ts';
import {
  resolveObjectiveSkill,
  scoreSheet,
} from './objectives.ts';
import type { ObjectiveSpec, RotationBlockSpec } from '../data/schema.ts';

const snapshot = loadBundledSnapshot();
const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
const liberation = jiyan.skills.find((s) => s.kind === 'liberation')!;

const ctx = {
  skill: liberation,
  baseAtk: { character: 437.5, weapon: 587.5 },
  baseHp: { character: 10487.5 },
  baseDef: { character: 1185.5534 },
  attackerLevel: 90,
  enemy: standardMob(90),
};

describe('resolveObjectiveSkill', () => {
  it('finds the skill by id', () => {
    const spec = { kind: 'expected-damage', skillId: liberation.id, motionName: 'x', forteLevel: 10, crit: 'expected' } as const;
    expect(resolveObjectiveSkill(jiyan.skills, spec)).toBe(liberation);
  });

  it('throws for unknown skill ids', () => {
    const spec = { kind: 'expected-damage', skillId: 'nope', motionName: 'x', forteLevel: 10, crit: 'expected' } as const;
    expect(() => resolveObjectiveSkill(jiyan.skills, spec)).toThrow(/unknown skill/);
  });
});

describe('scoreSheet', () => {
  it('max-stat reads the sheet field directly', () => {
    const sheet = emptySheet();
    sheet.atkPct = 0.5;
    expect(scoreSheet({ kind: 'max-stat', stat: 'atkPct' }, sheet, ctx)).toBe(0.5);
  });

  it('expected-damage delegates to computeDamage', () => {
    const sheet = emptySheet();
    sheet.atkPct = 0.12;
    sheet.critRate = 0.13;
    sheet.critDmg = 1.986;
    const spec = {
      kind: 'expected-damage',
      skillId: liberation.id,
      motionName: 'Lance of Qingloong Stage 1 DMG',
      forteLevel: 10,
      crit: 'expected',
    } as const;
    const expected = computeDamage({
      sheet,
      baseAtk: ctx.baseAtk,
      baseHp: ctx.baseHp,
      baseDef: ctx.baseDef,
      attackerLevel: 90,
      skill: liberation,
      motionName: spec.motionName,
      forteLevel: 10,
      enemy: ctx.enemy,
      crit: 'expected',
    }).damage;
    expect(scoreSheet(spec, sheet, ctx)).toBe(expected);
  });

  it('throws when the spec names a different skill than the context', () => {
    const sheet = emptySheet();
    const basic = jiyan.skills.find((s) => s.kind === 'basic')!;
    const spec = {
      kind: 'expected-damage',
      skillId: basic.id,
      motionName: 'Stage 1 DMG',
      forteLevel: 1,
      crit: 'expected',
    } as const;
    expect(() => scoreSheet(spec, sheet, ctx)).toThrow(/mismatch/);
  });

  it('throws for unknown objective kinds', () => {
    const sheet = emptySheet();
    expect(() =>
      scoreSheet({ kind: 'nope' } as unknown as { kind: 'max-stat'; stat: 'atk' }, sheet, ctx),
    ).toThrow();
  });

  it('rotation-dpr matches calculateRotation on the same inputs', async () => {
    const { calculateRotation } = await import('./rotation.ts');
    const { computeStats } = await import('./stats.ts');
    const { ownedEchoSchema } = await import('../data/schema.ts');
    const mkEcho = (id: string) =>
      ownedEchoSchema.parse({
        id,
        echoDefId: 'hooscamp',
        sonataId: 'sierra-gale',
        cost: 1,
        level: 25,
        rarity: 5,
        mainStat: { stat: 'atkPct', value: 0.1 },
        substats: [],
        equippedTo: null,
        origin: 'test',
      });
    const combo = [mkEcho('a'), mkEcho('b'), mkEcho('c'), mkEcho('d'), mkEcho('e')];
    const rosterEntry = {
      characterId: 'jiyan',
      level: 90,
      ascension: 6,
      resonanceChain: 0,
      forteLevels: {},
      weaponId: 'verdant-summit',
      weaponLevel: 90,
      weaponRank: 1,
    };
    const blocks: RotationBlockSpec[] = [
      { skillId: jiyan.skills.find((s) => s.kind === 'basic')!.id, motionName: 'Stage 1 DMG', forteLevel: 10, activeBuffIds: [] },
      { skillId: liberation.id, motionName: liberation.motionValues[0].name, forteLevel: 10, activeBuffIds: [] },
    ];
    const spec: ObjectiveSpec = {
      kind: 'rotation-dpr',
      blocks,
      buffs: [],
      globalBuffIds: [],
      crit: 'expected',
    };
    const { sheet, baseAtk, baseHp, baseDef } = computeStats({
      character: jiyan,
      weapon: snapshot.weapons.find((w) => w.id === 'verdant-summit')!,
      roster: { ...rosterEntry },
      echoes: combo,
      sonataSets: snapshot.sonataSets,
    });
    const expected = calculateRotation({
      character: jiyan,
      weapon: snapshot.weapons.find((w) => w.id === 'verdant-summit')!,
      roster: { ...rosterEntry },
      echoes: combo,
      sonataSets: snapshot.sonataSets,
      enemy: standardMob(90),
      blocks: blocks.map((b, i) => ({ ...b, id: `block-${i}` })),
      buffs: [],
      globalBuffIds: [],
      rotationTime: 10,
      crit: 'expected',
    }).dpr;
    expect(scoreSheet(spec, sheet, { ...ctx, skills: jiyan.skills, baseAtk, baseHp, baseDef })).toBe(expected);
  });

  it('rotation-dpr throws without the skill list', () => {
    const sheet = emptySheet();
    const spec: ObjectiveSpec = {
      kind: 'rotation-dpr',
      blocks: [{ skillId: 'x', motionName: 'y', forteLevel: 1, activeBuffIds: [] }],
      buffs: [],
      globalBuffIds: [],
      crit: 'expected',
    };
    expect(() => scoreSheet(spec, sheet, ctx)).toThrow(/skill list/);
  });
});

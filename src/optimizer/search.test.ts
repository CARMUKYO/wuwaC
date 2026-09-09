import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import type { OwnedEcho, RosterEntry, StatKey } from '../data/schema.ts';
import { standardMob } from '../domain/damage.ts';
import {
  searchExhaustive,
  type OptimizeRequest,
  type SearchData,
} from './search.ts';

const snapshot = loadBundledSnapshot();
const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
const verdant = snapshot.weapons.find((w) => w.id === 'verdant-summit')!;
const sonataSets = snapshot.sonataSets.filter((s) =>
  ['sierra-gale', 'rejuvenating-glow'].includes(s.id),
);
const liberation = jiyan.skills.find((s) => s.kind === 'liberation')!;

interface EchoSpec {
  main: [StatKey, number];
  subs?: [StatKey, number][];
  cost: 1 | 3 | 4;
  sonata?: string;
}

function mkEcho(id: string, spec: EchoSpec): OwnedEcho {
  return {
    id,
    label: id,
    echoDefId: `${id}-def`,
    sonataId: spec.sonata ?? 'sierra-gale',
    cost: spec.cost,
    level: 25,
    rarity: 5,
    mainStat: { stat: spec.main[0], value: spec.main[1] },
    substats: (spec.subs ?? []).map(([stat, value]) => ({ stat, value })),
    equippedTo: null,
    origin: 'manual',
  };
}

// Hand-verified inventory (see plan notes for the arithmetic):
// e1 god-crit(4) / e2 flat-atk(4) / e3 aero(3) / e4 filler(3)
// e5 off-set glow(3) / e6 one-a(1) / e7 one-b(1) / e8 atk-trap(4) / e9 glow-one(1)
const echoes: OwnedEcho[] = [
  mkEcho('e1', { main: ['critRate', 0.3], subs: [['critDmg', 0.2], ['atkPct', 0.15]], cost: 4 }),
  mkEcho('e2', { main: ['atk', 500], subs: [['atk', 100], ['hp', 1000]], cost: 4 }),
  mkEcho('e3', { main: ['dmgBonus:Aero', 0.3], subs: [['atkPct', 0.1]], cost: 3 }),
  mkEcho('e4', { main: ['defPct', 0.3], subs: [['def', 100]], cost: 3 }),
  mkEcho('e5', { main: ['atkPct', 0.3], cost: 3, sonata: 'rejuvenating-glow' }),
  mkEcho('e6', { main: ['atk', 50], subs: [['critRate', 0.05]], cost: 1 }),
  mkEcho('e7', { main: ['hp', 500], subs: [['critDmg', 0.1]], cost: 1 }),
  mkEcho('e8', { main: ['atkPct', 0.4], subs: [['atkPct', 0.2]], cost: 4 }),
  mkEcho('e9', { main: ['hp', 300], cost: 1, sonata: 'rejuvenating-glow' }),
];

const roster: RosterEntry = {
  characterId: 'jiyan',
  level: 90,
  ascension: 6,
  resonanceChain: 0,
  forteLevels: { [liberation.id]: 10 },
  weaponId: 'verdant-summit',
  weaponLevel: 90,
  weaponRank: 1,
};

const data: SearchData = {
  character: jiyan,
  weapon: verdant,
  roster,
  echoes,
  sonataSets,
  enemy: standardMob(90),
};

const maxAtk: OptimizeRequest = {
  costBudget: 12,
  sonataLock: { mode: 'none' },
  objective: { kind: 'max-stat', stat: 'atk' },
  topN: 10,
  prune: false,
};

describe('searchExhaustive', () => {
  it('finds the hand-computed optimum for max flat ATK', () => {
    // Only e2 carries flat ATK (600); e6 adds 50. Three 1-cost echoes make
    // two-4-cost combos legal (4+4+1+1+1 = 11), so the first max combo in
    // lexicographic order is {e1,e2,e6,e7,e9}, score 650.
    const result = searchExhaustive(data, maxAtk);
    expect(result.builds).not.toHaveLength(0);
    expect(result.builds[0].echoIds).toEqual(['e1', 'e2', 'e6', 'e7', 'e9']);
    expect(result.builds[0].score).toBe(650);
  });

  it('ranks descending and truncates to topN', () => {
    const result = searchExhaustive(data, { ...maxAtk, topN: 2 });
    expect(result.builds).toHaveLength(2);
    expect(result.builds[0].score).toBeGreaterThanOrEqual(result.builds[1].score);
  });

  it('counts every valid combo without pruning (C(9,5)=126 generated, 45 valid)', () => {
    const result = searchExhaustive(data, maxAtk);
    expect(result.evaluated).toBe(45);
    expect(result.prunedEchoes).toEqual([]);
  });

  it('respects the cost budget on every returned build', () => {
    const result = searchExhaustive(data, maxAtk);
    const costs = new Map(echoes.map((e) => [e.id, e.cost] as const));
    for (const build of result.builds) {
      const total = build.echoIds.reduce((sum, id) => sum + (costs.get(id) ?? 0), 0);
      expect(total).toBeLessThanOrEqual(12);
    }
  });

  it('enforces a 5-piece sonata lock (exactly the 3 valid builds)', () => {
    const result = searchExhaustive(data, {
      ...maxAtk,
      sonataLock: { mode: 'five', setId: 'sierra-gale' },
    });
    expect(result.builds).toHaveLength(3);
    for (const build of result.builds) {
      const sonatas = new Set(
        build.echoIds.map((id) => echoes.find((e) => e.id === id)!.sonataId),
      );
      expect(sonatas).toEqual(new Set(['sierra-gale']));
    }
  });

  it('enforces a 2+2 sonata lock (exactly 19 valid builds)', () => {
    const result = searchExhaustive(data, {
      ...maxAtk,
      topN: 50,
      sonataLock: { mode: 'twoPlusTwo', setIdA: 'sierra-gale', setIdB: 'rejuvenating-glow' },
    });
    expect(result.builds).toHaveLength(19);
    for (const build of result.builds) {
      const counts = new Map<string, number>();
      for (const id of build.echoIds) {
        const sonata = echoes.find((e) => e.id === id)!.sonataId;
        counts.set(sonata, (counts.get(sonata) ?? 0) + 1);
      }
      expect(counts.get('sierra-gale') ?? 0).toBeGreaterThanOrEqual(2);
      expect(counts.get('rejuvenating-glow') ?? 0).toBeGreaterThanOrEqual(2);
    }
  });

  it('filters builds below minStats minimums', () => {
    // Only combos containing e2 (600 flat ATK) clear 550.
    const result = searchExhaustive(data, { ...maxAtk, minStats: { atk: 550 } });
    expect(result.builds.length).toBeGreaterThan(0);
    for (const build of result.builds) {
      expect(build.echoIds).toContain('e2');
    }
    const impossible = searchExhaustive(data, { ...maxAtk, minStats: { atk: 9999 } });
    expect(impossible.builds).toEqual([]);
  });

  it('prunes by default and reports dropped echoes', () => {
    // Relevant stat is flat atk: e2 (600) dominates e1/e8, e6 (50)
    // dominates e7/e9. Sole survivor combo {e2,e3,e4,e5,e6} costs 14,
    // so nothing scores — the pruned set is the assertion.
    const result = searchExhaustive(data, { ...maxAtk, prune: undefined });
    expect([...result.prunedEchoes].sort()).toEqual(['e1', 'e7', 'e8', 'e9']);
    expect(result.evaluated).toBe(0);
    expect(result.builds).toEqual([]);
  });

  it('picks the crit build for expected liberation damage', () => {
    // Hand-compared: best e1 combo (~2764) beats best non-e1 combo (~2657).
    const result = searchExhaustive(data, {
      costBudget: 12,
      sonataLock: { mode: 'none' },
      objective: {
        kind: 'expected-damage',
        skillId: liberation.id,
        motionName: 'Lance of Qingloong Stage 1 DMG',
        forteLevel: 10,
        crit: 'expected',
      },
      topN: 3,
    });
    expect(result.builds[0].echoIds).toContain('e1');
  });

  it('returns empty (not throw) when nothing qualifies', () => {
    const poor: SearchData = { ...data, echoes: echoes.slice(0, 4) };
    const result = searchExhaustive(poor, maxAtk);
    expect(result.builds).toEqual([]);
    expect(result.evaluated).toBe(0);
  });

  it('throws on malformed requests', () => {
    expect(() => searchExhaustive(data, { ...maxAtk, topN: 0 })).toThrow(/topN/);
    expect(() => searchExhaustive(data, { ...maxAtk, costBudget: 11 as 10 })).toThrow(/budget/);
  });

  it('ranks builds by rotation DPR', () => {    const basic = jiyan.skills.find((s) => s.kind === 'basic')!;
    const result = searchExhaustive(data, {
      costBudget: 12,
      sonataLock: { mode: 'none' },
      objective: {
        kind: 'rotation-dpr',
        blocks: [
          { skillId: basic.id, motionName: 'Stage 1 DMG', forteLevel: 10, activeBuffIds: [] },
          { skillId: liberation.id, motionName: 'Lance of Qingloong Stage 1 DMG', forteLevel: 10, activeBuffIds: ['amp'] },
        ],
        buffs: [{ id: 'amp', label: 'AMP', source: 'test', mods: [{ stat: 'amplify', value: 0.2 }] }],
        globalBuffIds: [],
        crit: 'expected',
      },
      topN: 3,
      prune: false,
    });
    // Same 45 valid combos as the max-ATK baseline, all positively scored.
    expect(result.evaluated).toBe(45);
    expect(result.builds).toHaveLength(3);
    for (const build of result.builds) expect(build.score).toBeGreaterThan(0);
    expect(result.builds[0].score).toBeGreaterThanOrEqual(result.builds[1].score);
    // The crit-loaded e1 still wins a damage race.
    expect(result.builds[0].echoIds).toContain('e1');
  });

  it('scores HP-scaling rotations without throwing (Cartethyia find-best-builds regression)', () => {
    // Reported bug: "unsupported scaling HP in v1 (ATK only)" on Cartethyia.
    const cartethyia = snapshot.characters.find((c) => c.id === 'cartethyia')!;
    const cartSkill = cartethyia.skills.find((s) =>
      s.motionValues.some((m) => !m.isHealing),
    )!;
    const cartMotion = cartSkill.motionValues.find((m) => !m.isHealing)!;
    const cartRoster: RosterEntry = {
      characterId: 'cartethyia',
      level: 90,
      ascension: 6,
      resonanceChain: 0,
      forteLevels: {},
      weaponId: 'verdant-summit',
      weaponLevel: 90,
      weaponRank: 1,
    };
    const result = searchExhaustive(
      { ...data, character: cartethyia, roster: cartRoster },
      {
        costBudget: 12,
        sonataLock: { mode: 'none' },
        objective: {
          kind: 'rotation-dpr',
          blocks: [{ skillId: cartSkill.id, motionName: cartMotion.name, forteLevel: 10, activeBuffIds: [] }],
          buffs: [],
          globalBuffIds: [],
          crit: 'expected',
        },
        topN: 3,
        prune: false,
      },
    );
    expect(result.evaluated).toBe(45);
    expect(result.builds).toHaveLength(3);
    for (const build of result.builds) expect(build.score).toBeGreaterThan(0);
  });
});

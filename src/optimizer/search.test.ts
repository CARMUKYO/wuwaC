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
  def?: string;
}

function mkEcho(id: string, spec: EchoSpec): OwnedEcho {
  return {
    id,
    label: id,
    echoDefId: spec.def ?? `${id}-def`,
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

  it('never prunes a set-completing echo the optimum needs (soundness)', () => {
    // max-stat Aero over: 2x stat-weak Sierra Gale + 5x off-set glow with
    // 0.04 Aero each. Sierra 2pc (+0.10 Aero, auto-applied) makes
    // s1+s2+3x off-set (0.22) beat 5x off-set (0.20) — but raw-stat
    // dominance would prune the zero-Aero Sierra pair first.
    const inv: OwnedEcho[] = [
      mkEcho('s1', { main: ['atk', 10], cost: 1, sonata: 'sierra-gale' }),
      mkEcho('s2', { main: ['atk', 10], cost: 1, sonata: 'sierra-gale' }),
      mkEcho('o1', { main: ['dmgBonus:Aero', 0.04], cost: 1, sonata: 'rejuvenating-glow' }),
      mkEcho('o2', { main: ['dmgBonus:Aero', 0.04], cost: 1, sonata: 'rejuvenating-glow' }),
      mkEcho('o3', { main: ['dmgBonus:Aero', 0.04], cost: 1, sonata: 'rejuvenating-glow' }),
      mkEcho('o4', { main: ['dmgBonus:Aero', 0.04], cost: 1, sonata: 'rejuvenating-glow' }),
      mkEcho('o5', { main: ['dmgBonus:Aero', 0.04], cost: 1, sonata: 'rejuvenating-glow' }),
    ];
    const request: OptimizeRequest = {
      costBudget: 12,
      sonataLock: { mode: 'none' },
      objective: { kind: 'max-stat', stat: 'dmgBonus:Aero' },
      topN: 1,
    };
    const unpruned = searchExhaustive({ ...data, echoes: inv }, { ...request, prune: false });
    const pruned = searchExhaustive({ ...data, echoes: inv }, request);
    // The exhaustive baseline finds the Sierra optimum; pruning must agree.
    expect(unpruned.builds[0].echoIds).toContain('s1');
    expect(unpruned.builds[0].echoIds).toContain('s2');
    expect(pruned.builds[0].echoIds).toContain('s1');
    expect(pruned.builds[0].echoIds).toContain('s2');
    expect(pruned.builds[0].score).toBe(unpruned.builds[0].score);
    expect(pruned.prunedEchoes).not.toContain('s1');
    expect(pruned.prunedEchoes).not.toContain('s2');
  });

  it('picks the best slot-1 echo and records it (Lorelei main)', () => {
    // max-stat Havoc over zero-havoc echoes: only Lorelei's transcribed
    // main-slot bonus (+12% Havoc) can score, so the winner must carry it
    // as main.
    const inv: OwnedEcho[] = [
      mkEcho('m1', { main: ['atk', 10], cost: 1, def: 'lorelei' }),
      mkEcho('f1', { main: ['atk', 10], cost: 1 }),
      mkEcho('f2', { main: ['atk', 10], cost: 1 }),
      mkEcho('f3', { main: ['atk', 10], cost: 1 }),
      mkEcho('f4', { main: ['atk', 10], cost: 1 }),
      mkEcho('f5', { main: ['atk', 10], cost: 1 }),
    ];
    const result = searchExhaustive(
      { ...data, echoes: inv },
      {
        costBudget: 12,
        sonataLock: { mode: 'none' },
        objective: { kind: 'max-stat', stat: 'dmgBonus:Havoc' },
        topN: 1,
      },
    );
    expect(result.builds).toHaveLength(1);
    expect(result.builds[0].score).toBeCloseTo(0.12, 10);
    expect(result.builds[0].echoIds).toContain('m1');
    expect(result.builds[0].mainEchoId).toBe('m1');
    expect(result.builds[0].appliedAssumptions.join(' ')).toMatch(/Lorelei/);
  });

  it('shifts rotation-dpr ranking when team buffs saturate a bucket', () => {
    // Six cost-1 echoes, pick 5: two Aero (0.30), two Crit DMG (0.40),
    // two ATK% fills (0.15). Without buffs the winner drops a fill
    // (Aero's margin ~21% beats ATK%'s ~11%); with +500% team Aero the
    // Aero margin collapses to ~5% and the winner drops an Aero piece
    // instead. This pins buff threading through the optimizer — drop
    // the buffs and both runs agree.
    const inv: OwnedEcho[] = [
      mkEcho('aero1', { main: ['dmgBonus:Aero', 0.3], cost: 1 }),
      mkEcho('aero2', { main: ['dmgBonus:Aero', 0.3], cost: 1 }),
      mkEcho('crit1', { main: ['critDmg', 0.4], cost: 1 }),
      mkEcho('crit2', { main: ['critDmg', 0.4], cost: 1 }),
      mkEcho('fill1', { main: ['atkPct', 0.15], cost: 1 }),
      mkEcho('fill2', { main: ['atkPct', 0.15], cost: 1 }),
    ];
    const blocks = [
      { id: 'b1', skillId: liberation.id, motionName: 'Lance of Qingloong Stage 1 DMG', forteLevel: 10, activeBuffIds: [] as string[] },
    ];
    const teamAero = {
      id: 'team-aero',
      label: 'Team Aero',
      source: 'Team',
      mods: [{ stat: 'dmgBonus:Aero' as const, value: 5 }],
    };
    const run = (globalBuffIds: string[]): string[] => {
      const result = searchExhaustive(
        { ...data, echoes: inv },
        {
          costBudget: 12,
          sonataLock: { mode: 'none' },
          objective: { kind: 'rotation-dpr', blocks, buffs: [teamAero], globalBuffIds, crit: 'expected' },
          topN: 1,
        },
      );
      expect(result.builds).toHaveLength(1);
      return result.builds[0].echoIds;
    };
    const plain = run([]);
    expect(plain).toContain('aero1');
    expect(plain).toContain('aero2');
    const buffed = run(['team-aero']);
    expect(buffed).toContain('fill1');
    expect(buffed).toContain('fill2');
    expect(buffed).not.toEqual(plain);
  });

  it('prunes by default and reports dropped echoes', () => {
    // Relevant stat is flat atk: e2 (600) dominates same-set e1/e8,
    // e6 (50) dominates same-set e7. e9 survives despite zero atk — it is
    // rejuvenating-glow, and cross-set pruning would be unsound (a swap
    // can lose a set threshold). Four survivor combos fit the budget; the
    // winner {e2,e3,e4,e6,e9} scores 600 + 50 = 650.
    const result = searchExhaustive(data, { ...maxAtk, prune: undefined });
    expect([...result.prunedEchoes].sort()).toEqual(['e1', 'e7', 'e8']);
    expect(result.evaluated).toBe(4);
    expect(result.builds).toHaveLength(4);
    expect(result.builds[0].echoIds).toEqual(['e2', 'e3', 'e4', 'e6', 'e9']);
    expect(result.builds[0].score).toBe(650);
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

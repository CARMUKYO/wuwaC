import { describe, expect, it } from 'vitest';
import type { OwnedEcho, StatKey } from '../data/schema.ts';
import { pruneDominated, relevantStatsForObjective } from './prune.ts';

function mkEcho(
  id: string,
  cost: 1 | 3 | 4,
  stats: Partial<Record<StatKey, number>>,
): OwnedEcho {
  const entries = Object.entries(stats);
  return {
    id,
    label: id,
    echoDefId: `${id}-def`,
    sonataId: 'sierra-gale',
    cost,
    level: 25,
    rarity: 5,
    mainStat: { stat: 'atk', value: 0 },
    substats: entries.map(([stat, value]) => ({ stat: stat as StatKey, value: value as number })),
    equippedTo: null,
    origin: 'manual',
  };
}

describe('pruneDominated', () => {
  it('drops a strictly-dominated same-cost echo', () => {
    const strong = mkEcho('strong', 3, { atk: 100, critRate: 0.05 });
    const weak = mkEcho('weak', 3, { atk: 50 });
    const result = pruneDominated([strong, weak], ['atk', 'critRate']);
    expect(result.kept.map((e) => e.id)).toEqual(['strong']);
    expect(result.pruned).toEqual(['weak']);
  });

  it('ignores stats outside the relevant set', () => {
    const strong = mkEcho('strong', 3, { atk: 100 });
    const bulky = mkEcho('bulky', 3, { atk: 50, hp: 9999 });
    const result = pruneDominated([strong, bulky], ['atk']);
    expect(result.kept.map((e) => e.id)).toEqual(['strong']);
    expect(result.pruned).toEqual(['bulky']);
  });

  it('never compares across cost tiers', () => {
    const big = mkEcho('big', 4, { atk: 500 });
    const small = mkEcho('small', 1, { atk: 50 });
    const result = pruneDominated([big, small], ['atk']);
    expect(result.kept.map((e) => e.id).sort()).toEqual(['big', 'small']);
    expect(result.pruned).toEqual([]);
  });

  it('keeps ties (no strict improvement anywhere)', () => {
    const a = mkEcho('a', 3, { atk: 100 });
    const b = mkEcho('b', 3, { atk: 100 });
    const result = pruneDominated([a, b], ['atk']);
    expect(result.kept).toHaveLength(2);
    expect(result.pruned).toEqual([]);
  });
});

describe('relevantStatsForObjective', () => {
  it('returns the single stat for max-stat plus extras', () => {
    expect(relevantStatsForObjective({ kind: 'max-stat', stat: 'atk' }, 'Aero', 'skill', ['hp'])).toEqual(
      expect.arrayContaining(['atk', 'hp']),
    );
  });

  it('covers the damage inputs for expected-damage', () => {
    const keys = relevantStatsForObjective(
      { kind: 'expected-damage', skillId: 's', motionName: 'm', forteLevel: 1, crit: 'expected' },
      'Aero',
      'skill',
      [],
    );
    expect(keys).toEqual(
      expect.arrayContaining(['atk', 'atkPct', 'critRate', 'critDmg', 'dmgBonus:Aero', 'dmgBonus:skill']),
    );
    expect(keys).not.toContain('dmgBonus:Electro');
  });

  it('includes every action bucket for unverified forte mapping', () => {
    const keys = relevantStatsForObjective(
      { kind: 'expected-damage', skillId: 's', motionName: 'm', forteLevel: 1, crit: 'expected' },
      'Aero',
      'forte',
      [],
    );
    for (const bucket of ['dmgBonus:basic', 'dmgBonus:heavy', 'dmgBonus:skill', 'dmgBonus:liberation', 'dmgBonus:intro']) {
      expect(keys).toContain(bucket);
    }
  });

  it('covers every bucket plus buff-modded stats for rotation-dpr', () => {
    const keys = relevantStatsForObjective(
      {
        kind: 'rotation-dpr',
        blocks: [{ skillId: 's', motionName: 'm', forteLevel: 1, activeBuffIds: [] }],
        buffs: [{ id: 'b', label: 'B', source: 't', mods: [{ stat: 'energyRegen', value: 0.1 }] }],
        globalBuffIds: [],
        crit: 'expected',
      },
      'Aero',
      'basic',
      [],
    );
    for (const bucket of ['dmgBonus:Aero', 'dmgBonus:basic', 'dmgBonus:heavy', 'dmgBonus:skill', 'dmgBonus:liberation', 'dmgBonus:intro', 'dmgBonus:outro', 'dmgBonus:echo']) {
      expect(keys).toContain(bucket);
    }
    expect(keys).toEqual(expect.arrayContaining(['atk', 'critRate', 'amplify', 'energyRegen']));
    expect(keys).not.toContain('dmgBonus:Electro');
  });

  it('uses HP/DEF stat families for HP/DEF-scaling skills (Cartethyia/Taoqi)', () => {
    const spec = { kind: 'expected-damage', skillId: 's', motionName: 'm', forteLevel: 1, crit: 'expected' } as const;
    const hpKeys = relevantStatsForObjective(spec, 'Aero', 'basic', [], 'HP');
    expect(hpKeys).toEqual(expect.arrayContaining(['hp', 'hpPct']));
    expect(hpKeys).not.toContain('atk');
    expect(hpKeys).not.toContain('atkPct');
    const defKeys = relevantStatsForObjective(spec, 'Havoc', 'skill', [], 'DEF');
    expect(defKeys).toEqual(expect.arrayContaining(['def', 'defPct']));
    expect(defKeys).not.toContain('atk');
  });

  it('follows the motion bucket, not the parent skill kind (Luuk liberation -> basic)', () => {
    const spec = { kind: 'expected-damage', skillId: 's', motionName: 'm', forteLevel: 1, crit: 'expected' } as const;
    const keys = relevantStatsForObjective(spec, 'Spectro', 'basic', [], 'ATK');
    expect(keys).toContain('dmgBonus:basic');
    expect(keys).not.toContain('dmgBonus:liberation');
  });
});

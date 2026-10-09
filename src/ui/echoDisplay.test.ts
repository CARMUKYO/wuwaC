import { describe, expect, it } from 'vitest';
import type { OwnedEcho } from '../data/schema.ts';
import { inventorySummary } from './echoDisplay.ts';

function echo(id: string, sonataId: string, substats: OwnedEcho['substats']): OwnedEcho {
  return {
    id,
    echoDefId: 'hooscamp',
    sonataId,
    cost: 1,
    level: 25,
    rarity: 5,
    mainStat: { stat: 'atkPct', value: 0.18 },
    substats,
    equippedTo: null,
    origin: 'manual',
  };
}

describe('inventorySummary', () => {
  it('reports loading and empty states', () => {
    expect(inventorySummary({ loaded: false, echoes: [], flagged: 0 })).toBe('Loading your echoes…');
    expect(inventorySummary({ loaded: true, echoes: [], flagged: 0 })).toMatch(/empty/);
  });

  it('counts echoes and distinct sets, singular and plural', () => {
    expect(inventorySummary({ loaded: true, echoes: [echo('a', 's1', [])], flagged: 0 })).toBe(
      "You're holding 1 echo across 1 Sonata set.",
    );
    expect(
      inventorySummary({ loaded: true, echoes: [echo('a', 's1', []), echo('b', 's2', [])], flagged: 0 }),
    ).toBe("You're holding 2 echoes across 2 Sonata sets.");
  });

  it('adds the flagged count and the average roll value', () => {
    // atk 30 -> 1/4 -> 25; critDmg 0.21 -> 8/8 -> 100; mean 62.5 -> rounds to 63.
    const echoes = [echo('a', 's1', [{ stat: 'atk', value: 30 }]), echo('b', 's1', [{ stat: 'critDmg', value: 0.21 }])];
    expect(inventorySummary({ loaded: true, echoes, flagged: 1 })).toBe(
      "You're holding 2 echoes across 1 Sonata set. 1 needs re-linking. Average roll value: 63.",
    );
    expect(inventorySummary({ loaded: true, echoes, flagged: 2 })).toContain('2 need re-linking.');
  });
});

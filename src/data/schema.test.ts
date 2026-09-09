import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from './index.ts';
import {
  buildSchema,
  characterSchema,
  ownedEchoSchema,
  SNAPSHOT_VERSION,
  snapshotSchema,
  teamSchema,
} from './schema.ts';

describe('user-data schemas', () => {
  const validEcho = {
    id: 'echo-1',
    echoDefId: 'hooscamp',
    sonataId: 'sierra-gale',
    cost: 3,
    level: 25,
    rarity: 5,
    mainStat: { stat: 'dmgBonus:Aero', value: 0.3 },
    secondMainStat: { stat: 'atk', value: 100 },
    substats: [
      { stat: 'critRate', value: 0.063 },
      { stat: 'critDmg', value: 0.126 },
    ],
    equippedTo: null,
    origin: 'manual',
  } as const;

  it('accepts a well-formed owned Echo', () => {
    expect(ownedEchoSchema.parse(validEcho).id).toBe('echo-1');
  });

  it('rejects duplicate substats and bad costs', () => {
    expect(() =>
      ownedEchoSchema.parse({
        ...validEcho,
        substats: [
          { stat: 'critRate', value: 0.05 },
          { stat: 'critRate', value: 0.06 },
        ],
      }),
    ).toThrow(/duplicate substats/);
    expect(() => ownedEchoSchema.parse({ ...validEcho, cost: 2 })).toThrow();
    expect(() =>
      ownedEchoSchema.parse({ ...validEcho, substats: Array(6).fill({ stat: 'atk', value: 1 }) }),
    ).toThrow();
  });

  it('rejects builds that reuse an Echo or drop a slot', () => {
    const base = {
      id: 'b1',
      name: 'My build',
      characterId: 'jiyan',
      weaponId: 'verdant-summit',
      objectiveId: 'expected-liberation',
      updatedAt: new Date().toISOString(),
    };
    expect(() =>
      buildSchema.parse({ ...base, echoIds: ['a', 'b', 'c', 'd', 'e'] }),
    ).not.toThrow();
    expect(() =>
      buildSchema.parse({ ...base, echoIds: ['a', 'b', 'c', 'd', 'a'] }),
    ).toThrow(/cannot be equipped twice/);
    expect(() => buildSchema.parse({ ...base, echoIds: ['a', 'b', 'c', 'd'] })).toThrow();
  });

  it('rejects teams with duplicate members', () => {
    expect(() =>
      teamSchema.parse({ id: 't', name: 'T', characterIds: ['a', 'b', 'c'] }),
    ).not.toThrow();
    expect(() =>
      teamSchema.parse({ id: 't', name: 'T', characterIds: ['a', 'b', 'a'] }),
    ).toThrow(/same character twice/);
  });

  it('rejects out-of-range chain ranks', () => {
    const char = loadBundledSnapshot().characters[0];
    expect(() => characterSchema.parse({ ...char, rarity: 3 })).toThrow();
    expect(() =>
      characterSchema.parse({
        ...char,
        resonanceChain: char.resonanceChain.slice(0, 5),
      }),
    ).toThrow();
  });
});

describe('bundled snapshot', () => {
  it('validates against the snapshot schema', () => {
    const snapshot = loadBundledSnapshot();
    expect(snapshot.snapshotVersion).toBe(SNAPSHOT_VERSION);
    const characterIds = snapshot.characters.map((c) => c.id);
    expect(characterIds).toContain('jiyan');
    expect(characterIds).toContain('verina');
    expect(new Set(characterIds).size).toBe(characterIds.length);
    const weaponIds = snapshot.weapons.map((w) => w.id);
    expect(weaponIds).toContain('verdant-summit');
    expect(weaponIds).toContain('cosmic-ripples');
    expect(snapshot.sonataSets.length).toBeGreaterThan(0);
  });

  it('re-parses the raw file identically (no drift)', () => {
    expect(snapshotSchema.parse(JSON.parse(JSON.stringify(loadBundledSnapshot())))).toEqual(
      loadBundledSnapshot(),
    );
  });
});

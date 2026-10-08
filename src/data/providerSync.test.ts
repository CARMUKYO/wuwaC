import { describe, expect, it } from 'vitest';
import {
  assembleSnapshot,
  createCollectingReporter,
  createSilentReporter,
  fetchGameDataParts,
} from './providerSync.ts';

/**
 * The shared fetch + normalize pipeline, driven by stub provider responses
 * (no network). Proves the same code the CLI sync runs also serves the
 * in-browser background refresh: stub fetch in, shippable snapshot out.
 */

const motionValues = Array.from({ length: 10 }, (_, i) => `${10 + i}%`);

function charDetail(name: string, id: number): unknown {
  return {
    Id: id,
    Name: { Content: name },
    QualityId: 5,
    ElementName: 'Aero',
    WeaponTypeName: 'Sword',
    Properties: [
      { Name: 'HP', GrowthValues: [{ level: 1, value: 800 }] },
      { Name: 'ATK', GrowthValues: [{ level: 1, value: 20 }] },
      { Name: 'DEF', GrowthValues: [{ level: 1, value: 90 }] },
    ],
    Skills: [
      {
        SkillId: 1001,
        SkillType: 'Normal Attack',
        SkillName: 'Test Strike',
        SkillDescribe: '<p>Deals damage.</p>',
        SkillAttributes: [{ attributeName: 'Stage 1 DMG', values: motionValues }],
        DamageList: [{ PropertyName: 'ATK', Type: 'Basic Attack', RateLv: motionValues }],
      },
    ],
    SkillTree: [],
    ResonantChain: [1, 2, 3, 4, 5, 6].map((rank) => ({
      GroupIndex: rank,
      NodeName: `Test Chain ${rank}`,
      AttributesDescription: 'Effect text.',
    })),
  };
}

function weaponDetail(name: string): unknown {
  return {
    WeaponName: name,
    WeaponTypeName: 'Sword',
    QualityId: 5,
    Properties: [{ Name: 'ATK', GrowthValues: [{ level: 1, value: 30 }] }],
    ResonName: 'Test Passive',
    Desc: 'Does things.',
    DescParams: [{ ArrayString: ['1'] }],
  };
}

function echoDetail(): unknown {
  return {
    Element: { Name: 'Aero' },
    FetterGroup: [9],
    Handbook: { Intensity: 'Common Class', Descrtption1: 'pool text (not parsed)' },
  };
}

function stubResponses(): Map<string, unknown> {
  return new Map<string, unknown>([
    ['/character', { roleList: [{ Id: 1, Name: 'Testina' }] }],
    ['/character/1', charDetail('Testina', 1)],
    ['/weapon', { weapons: [{ Id: 7, Name: 'Test Blade' }] }],
    ['/weapon/7', weaponDetail('Test Blade')],
    [
      '/echo',
      {
        Echo: [
          {
            Id: 42,
            Name: 'Testecho',
            FetterGroups: [
              { Id: 9, Name: 'Test Sonata', Fetters: [{ Key: 2, Name: 'x', EffectDescription: 'Aero DMG + 10%' }] },
            ],
          },
        ],
      },
    ],
    ['/echo/42', echoDetail()],
  ]);
}

function stubFetch(responses: Map<string, unknown>, seen: string[] = []): (path: string) => Promise<unknown> {
  return (path: string) => {
    seen.push(path);
    const body = responses.get(path);
    if (body === undefined) return Promise.reject(new Error(`no stub for ${path}`));
    return Promise.resolve(body);
  };
}

describe('fetchGameDataParts', () => {
  it('normalizes stub provider responses into shippable parts', async () => {
    const { reporter, failures } = createCollectingReporter();
    const parts = await fetchGameDataParts({
      fetchJson: stubFetch(stubResponses()),
      fetchedAt: '2026-10-03T00:00:00.000Z',
      detailDelayMs: 0,
      reporter,
    });
    expect(failures).toEqual([]);
    expect(parts.characters.map((c) => c.name)).toEqual(['Testina']);
    expect(parts.characters[0].skills[0].motionValues[0].values).toHaveLength(10);
    expect(parts.weapons.map((w) => w.name)).toEqual(['Test Blade']);
    expect(parts.weapons[0].secondaryStat).toBeNull();
    expect(parts.sonataSets.map((s) => s.name)).toEqual(['Test Sonata']);
    expect(parts.sonataSets[0].bonuses[0].effect).toEqual({ kind: 'stat', stat: 'dmgBonus:Aero', value: 0.1 });
    expect(parts.echoDefs.map((e) => e.name)).toEqual(['Testecho']);
    expect(parts.echoDefs[0].cost).toBe(1);

    // The shared pipeline's output assembles into a valid snapshot.
    const snapshot = assembleSnapshot(parts, '2026-10-03T00:00:00.000Z');
    expect(snapshot.fetchedAt).toBe('2026-10-03T00:00:00.000Z');
    expect(snapshot.provider).toBe('encore.moe');
  });

  it('rejects when a list fetch fails (network failure surfaces, no partial snapshot)', async () => {
    await expect(
      fetchGameDataParts({
        fetchJson: () => Promise.reject(new Error('network down')),
        detailDelayMs: 0,
        reporter: createSilentReporter(),
      }),
    ).rejects.toThrow('network down');
  });

  it('keeps skip-and-report: one bad detail record fails loudly without blocking the rest', async () => {
    const responses = stubResponses();
    responses.set('/character', {
      roleList: [
        { Id: 1, Name: 'Testina' },
        { Id: 2, Name: 'Broken' },
      ],
    });
    responses.set('/character/2', { Id: 2, Name: { Content: 'Broken' } }); // missing everything else
    const { reporter, failures } = createCollectingReporter();
    const parts = await fetchGameDataParts({
      fetchJson: stubFetch(responses),
      fetchedAt: '2026-10-03T00:00:00.000Z',
      detailDelayMs: 0,
      reporter,
    });
    expect(parts.characters.map((c) => c.name)).toEqual(['Testina']);
    expect(failures.map((f) => f.name)).toEqual(['Broken']);
  });

  it('honors the name filter without fetching excluded details', async () => {
    const seen: string[] = [];
    const parts = await fetchGameDataParts({
      fetchJson: stubFetch(stubResponses(), seen),
      detailDelayMs: 0,
      only: new Set(['Testina']),
      reporter: createSilentReporter(),
    });
    expect(parts.characters.map((c) => c.name)).toEqual(['Testina']);
    expect(parts.weapons).toEqual([]);
    expect(parts.echoDefs).toEqual([]);
    expect(seen).not.toContain('/weapon/7');
    expect(seen).not.toContain('/echo/42');
  });

  it('honors category selection for partial syncs', async () => {
    const parts = await fetchGameDataParts({
      fetchJson: stubFetch(stubResponses()),
      detailDelayMs: 0,
      categories: { chars: true, weapons: false, echoes: false },
      reporter: createSilentReporter(),
    });
    expect(parts.characters).toHaveLength(1);
    expect(parts.weapons).toEqual([]);
    expect(parts.sonataSets).toEqual([]);
    expect(parts.echoDefs).toEqual([]);
  });
});

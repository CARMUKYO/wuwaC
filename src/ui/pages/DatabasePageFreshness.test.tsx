import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { writeCachedSnapshot } from '../../data/activeSnapshot.ts';
import { loadBundledSnapshot } from '../../data/index.ts';
import { db } from '../../state/db.ts';
import { resetSnapshotStoreForTests } from '../../state/snapshotStore.ts';
import { DatabasePage } from './DatabasePage.tsx';

/**
 * Database freshness affordance: which snapshot is active (cached vs
 * bundled date) and the manual "Check for updates" control. The suite's
 * fetch stub (offline) stands unless a test overrides it — never real
 * network.
 */

vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

beforeEach(async () => {
  await db.gamedataCache.clear();
  resetSnapshotStoreForTests();
});

describe('DatabasePage freshness', () => {
  it('shows the bundled source pill with an empty cache', async () => {
    render(<DatabasePage />);
    expect(await screen.findByText(/^Bundled · /)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check for updates/i })).toBeInTheDocument();
  });

  it('shows the cached source pill when a usable cache wins', async () => {
    await writeCachedSnapshot({ ...loadBundledSnapshot(), fetchedAt: '2026-10-02T00:00:00.000Z' });
    render(<DatabasePage />);
    expect(await screen.findByText('Cached · 2026-10-02')).toBeInTheDocument();
  });

  it('renders content synchronously from the seed (no loading flash)', () => {
    render(<DatabasePage />);
    // First paint already lists entries — the cache resolves in place.
    expect(screen.getByText('Jiyan')).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('manual check offline toasts and keeps serving the current snapshot', async () => {
    const user = userEvent.setup();
    render(<DatabasePage />);
    await screen.findByText(/^Bundled · /);

    await user.click(screen.getByRole('button', { name: /check for updates/i }));

    expect(await screen.findByText(/couldn't reach encore\.moe/i)).toBeInTheDocument();
    expect(screen.getByText(/^Bundled · /)).toBeInTheDocument();
    expect(screen.getByText('Jiyan')).toBeInTheDocument();
  });

  it('manual check adopts a newer provider snapshot live', async () => {
    const staleAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await writeCachedSnapshot({ ...loadBundledSnapshot(), fetchedAt: staleAt });
    const motionValues = Array.from({ length: 10 }, (_, i) => `${10 + i}%`);
    const responses = new Map<string, unknown>([
      ['/character', { roleList: [{ Id: 1, Name: 'Testina' }] }],
      [
        '/character/1',
        {
          Id: 1,
          Name: { Content: 'Testina' },
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
              SkillDescribe: 'Deals damage.',
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
        },
      ],
      ['/weapon', { weapons: [{ Id: 7, Name: 'Test Blade' }] }],
      [
        '/weapon/7',
        {
          WeaponName: 'Test Blade',
          WeaponTypeName: 'Sword',
          QualityId: 5,
          Properties: [{ Name: 'ATK', GrowthValues: [{ level: 1, value: 30 }] }],
          ResonName: 'Test Passive',
          Desc: 'Does things.',
          DescParams: [{ ArrayString: ['1'] }],
        },
      ],
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
      [
        '/echo/42',
        {
          Element: { Name: 'Aero' },
          FetterGroup: [9],
          Handbook: { Intensity: 'Common Class', Descrtption1: 'pool text (not parsed)' },
        },
      ],
    ]);
    vi.stubGlobal(
      'fetch',
      ((url: string) => {
        const path = String(url).replace('https://api-v2.encore.moe/api/en', '');
        const body = responses.get(path);
        if (body === undefined) return Promise.reject(new Error(`no stub for ${path}`));
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
      }) as unknown as typeof fetch,
    );

    const user = userEvent.setup();
    render(<DatabasePage />);
    await screen.findByText(/^Cached · /);

    await user.click(screen.getByRole('button', { name: /check for updates/i }));

    // The page adopts the refreshed data live: new pill, new rows, toast.
    expect(await screen.findByText(/game data updated to/i)).toBeInTheDocument();
    expect(screen.getByText(/^Cached · /)).toBeInTheDocument();
    expect(screen.getByText('Testina')).toBeInTheDocument();
    expect(screen.queryByText('Jiyan')).not.toBeInTheDocument();
  });
});

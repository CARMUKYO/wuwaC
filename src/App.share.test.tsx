import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Build, SharedBuild } from './data/schema.ts';
import { encodeBuildLink, encodeSharedBuild } from './state/share.ts';

/**
 * Regression: opening the app at `/#b=<build>` used to land on Inventory,
 * and clicking Builds overwrote the hash before BuildsPage could read it,
 * so the shared build was silently lost. It must open Builds with a
 * preview, write nothing until Import, then leave the URL at `#builds`.
 */

const shared: Build = {
  id: 'shared-1',
  name: 'Shared Build',
  characterId: 'jiyan',
  weaponId: 'verdant-summit',
  echoIds: ['a', 'b', 'c', 'd', 'e'],
  objectiveId: 'Expected damage',
  score: 42,
  updatedAt: '2026-10-01T00:00:00.000Z',
};

/** Fresh module graph so the store reads the hash set by the test. */
async function openApp(hash: string) {
  window.history.replaceState(null, '', `/${hash}`);
  vi.resetModules();
  const { default: App } = await import('./App.tsx');
  const { useAppStore } = await import('./state/store.ts');
  const { useLibraryStore } = await import('./state/library.ts');
  const { db } = await import('./state/db.ts');
  await db.builds.clear();
  render(<App />);
  return { useAppStore, useLibraryStore, db };
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

/** A self-contained v2 payload (5★ +25 values from the echoStats tables). */
const sharedV2: SharedBuild = {
  v: 2,
  name: 'Friend Jiyan',
  score: 2500,
  summary: 'Expected damage',
  character: { id: 'jiyan', level: 90, ascension: 6, chain: 1, forte: { '1001103': 10 } },
  weapon: { id: 'verdant-summit', level: 90, ascension: 6, rank: 1 },
  echoes: [
    { def: 'feilian-beringal', set: 'sierra-gale', cost: 4, level: 25, rarity: 5, main: { stat: 'critRate', value: 0.22 }, second: { stat: 'atk', value: 150 }, subs: [] },
    { def: 'hoochief', set: 'sierra-gale', cost: 3, level: 25, rarity: 5, main: { stat: 'dmgBonus:Aero', value: 0.3 }, second: { stat: 'atk', value: 100 }, subs: [] },
    { def: 'carapace', set: 'sierra-gale', cost: 3, level: 25, rarity: 5, main: { stat: 'atkPct', value: 0.3 }, second: { stat: 'atk', value: 100 }, subs: [] },
    { def: 'hooscamp', set: 'sierra-gale', cost: 1, level: 25, rarity: 5, main: { stat: 'atkPct', value: 0.18 }, second: { stat: 'hp', value: 2280 }, subs: [] },
    { def: 'chirpuff', set: 'sierra-gale', cost: 1, level: 25, rarity: 5, main: { stat: 'atkPct', value: 0.18 }, second: { stat: 'hp', value: 2280 }, subs: [] },
  ],
};

describe('share link opened through the app shell', () => {
  it('opens Builds with a preview and imports only on Import', async () => {
    const user = userEvent.setup();
    const { useAppStore, useLibraryStore, db } = await openApp(encodeBuildLink(shared));

    expect(useAppStore.getState().activeSection).toBe('builds');
    const preview = await screen.findByRole('region', { name: 'Shared build' });
    expect(within(preview).getByText('Shared Build')).toBeInTheDocument();
    expect(window.location.hash.startsWith('#b=')).toBe(true);
    expect(await db.builds.count()).toBe(0);

    await user.click(within(preview).getByRole('button', { name: /import shared build/i }));
    expect(await screen.findByText(/imported shared build/i)).toBeInTheDocument();
    expect(useLibraryStore.getState().builds.map((b) => b.name)).toEqual(['Shared Build']);
    expect(await db.builds.count()).toBe(1);
    expect(window.location.hash).toBe('#builds');
  });

  it('keeps the link through a detour to another section', async () => {
    const user = userEvent.setup();
    const { useAppStore, db } = await openApp(encodeBuildLink(shared));
    await screen.findByRole('region', { name: 'Shared build' });

    useAppStore.getState().setActiveSection('inventory');
    const [buildsTab] = screen.getAllByRole('button', { name: /builds/i });
    await user.click(buildsTab);

    const preview = await screen.findByRole('region', { name: 'Shared build' });
    await user.click(within(preview).getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('region', { name: 'Shared build' })).toBeNull();
    expect(await db.builds.count()).toBe(0);
    expect(window.location.hash).toBe('#builds');
  });

  it('cold-opens a v2 link as a build card, then optimizes without touching the roster', async () => {
    const user = userEvent.setup();
    const { useAppStore, db } = await openApp(await encodeSharedBuild(sharedV2));
    await db.roster.clear();

    expect(useAppStore.getState().activeSection).toBe('builds');
    const preview = await screen.findByRole('region', { name: 'Shared build' });
    expect(within(preview).getByText('Friend Jiyan')).toBeInTheDocument();
    expect(within(preview).getByLabelText('Key stats')).toBeInTheDocument();
    expect(within(preview).getByRole('button', { name: /save as reference/i })).toBeInTheDocument();

    await user.click(within(preview).getByRole('button', { name: /optimize with my echoes/i }));
    expect(useAppStore.getState().activeSection).toBe('calculator');
    expect(await screen.findByText(/loaded from the shared build “friend jiyan”/i, undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(await db.roster.count()).toBe(0);
    expect(await db.builds.count()).toBe(0);
  });
});

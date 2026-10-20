import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OwnedEcho, RosterEntry, SharedBuild } from '../../data/schema.ts';
import { useCalculatorStore } from '../../state/calculator.ts';
import { db } from '../../state/db.ts';
import { useInventoryStore } from '../../state/inventory.ts';
import { useLibraryStore, type BuildDraft } from '../../state/library.ts';
import { useRosterStore } from '../../state/roster.ts';
import { decodeShareLink, encodeBuildLink, encodeSharedBuild } from '../../state/share.ts';
import { useAppStore } from '../../state/store.ts';
import { BuildsPage } from './BuildsPage.tsx';

const seed: BuildDraft = {
  name: 'Seeded Build',
  characterId: 'jiyan',
  weaponId: 'verdant-summit',
  echoIds: ['a', 'b', 'c', 'd', 'e'],
  objectiveId: 'Expected damage',
  score: 99.5,
};

const LIBERATION = '1001103';

const ownEchoes: OwnedEcho[] = (
  [
    ['a', 'feilian-beringal', 4, 'critRate', 0.22, 'atk', 150],
    ['b', 'hoochief', 3, 'dmgBonus:Aero', 0.3, 'atk', 100],
    ['c', 'carapace', 3, 'atkPct', 0.3, 'atk', 100],
    ['d', 'hooscamp', 1, 'atkPct', 0.18, 'hp', 2280],
    ['e', 'chirpuff', 1, 'atkPct', 0.18, 'hp', 2280],
  ] as const
).map(([id, def, cost, main, value, second, secondValue]) => ({
  id,
  echoDefId: def,
  sonataId: 'sierra-gale',
  cost,
  level: 25,
  rarity: 5,
  mainStat: { stat: main, value },
  secondMainStat: { stat: second, value: secondValue },
  substats: [],
  equippedTo: null,
  origin: 'manual',
}));

const myRoster: RosterEntry = {
  characterId: 'jiyan',
  level: 70,
  ascension: 4,
  resonanceChain: 0,
  forteLevels: { [LIBERATION]: 6 },
  weaponId: 'verdant-summit',
  weaponLevel: 80,
  weaponRank: 1,
};

/** A v2 payload as another player would send it (5★ +25 table values). */
const sharedPayload: SharedBuild = {
  v: 2,
  name: 'Friend Jiyan',
  score: 2500,
  summary: 'Expected damage',
  character: { id: 'jiyan', level: 90, ascension: 6, chain: 6, forte: { [LIBERATION]: 10 } },
  weapon: { id: 'verdant-summit', level: 90, ascension: 6, rank: 5 },
  echoes: ownEchoes.map((e) => ({
    def: e.echoDefId,
    set: e.sonataId,
    cost: e.cost,
    level: e.level,
    rarity: e.rarity,
    main: e.mainStat,
    second: e.secondMainStat,
    subs: [],
  })) as unknown as SharedBuild['echoes'],
};

async function openLink(payload: SharedBuild): Promise<string> {
  const link = await encodeSharedBuild(payload);
  window.history.replaceState(null, '', `/${link}`);
  useAppStore.setState({ shareLink: link, activeSection: 'builds' });
  return link;
}

beforeEach(async () => {
  await db.builds.clear();
  await db.ownedEchoes.clear();
  await db.roster.clear();
  useLibraryStore.setState({ builds: [], loaded: false });
  useInventoryStore.setState({ echoes: [], loaded: false });
  useRosterStore.setState({ entries: [], loaded: false });
  useCalculatorStore.getState().resetAll();
  useAppStore.setState({ shareLink: null });
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});

describe('BuildsPage', () => {
  it('lists saved builds', async () => {
    await useLibraryStore.getState().saveBuild(seed);
    render(<BuildsPage />);
    expect(await screen.findByText('Seeded Build')).toBeInTheDocument();
    expect(screen.getByText(/99\.5/)).toBeInTheDocument();
  });

  it('deletes a build', async () => {
    const user = userEvent.setup();
    await useLibraryStore.getState().saveBuild(seed);
    render(<BuildsPage />);
    await screen.findByText('Seeded Build');

    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(useLibraryStore.getState().builds).toEqual([]);
    expect(await db.builds.count()).toBe(0);
  });

  it('exports builds as a JSON download', async () => {
    const user = userEvent.setup();
    const created = await useLibraryStore.getState().saveBuild(seed);
    const createObjectURL = vi.fn((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob);
      return 'blob:mock';
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<BuildsPage />);
    await screen.findByText('Seeded Build');
    await user.click(screen.getByRole('button', { name: /export/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    const parsed = JSON.parse(await blob.text()) as { id: string; name: string }[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ id: created.id, name: 'Seeded Build' });
    clickSpy.mockRestore();
  });

  it('imports pasted JSON and rejects garbage', async () => {
    const user = userEvent.setup();
    render(<BuildsPage />);

    const valid = JSON.stringify([
      { ...seed, name: 'Imported', updatedAt: new Date().toISOString() },
    ]);
    // fireEvent: user.type() would parse the JSON braces as key descriptors.
    fireEvent.change(screen.getByLabelText(/paste build json/i), { target: { value: valid } });
    await user.click(screen.getByRole('button', { name: /^import$/i }));
    expect(await screen.findByText('Imported')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/paste build json/i), { target: { value: 'not json' } });
    await user.click(screen.getByRole('button', { name: /^import$/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(useLibraryStore.getState().builds).toHaveLength(1);
  });

  it('copies a self-contained v2 link; the rotation toggle adds the objective', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await db.ownedEchoes.bulkAdd(ownEchoes);
    await db.roster.add(myRoster);
    await useLibraryStore.getState().saveBuild({
      ...seed,
      objective: { kind: 'expected-damage', skillId: LIBERATION, motionName: 'Lance of Qingloong Stage 1 DMG', forteLevel: 10, crit: 'expected' },
    });

    render(<BuildsPage />);
    await screen.findByText('Seeded Build');
    const copy = screen.getByRole('button', { name: /copy link/i });
    await vi.waitFor(() => expect(copy).toBeEnabled());
    await user.click(copy);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const plain = writeText.mock.calls[0][0] as string;
    expect(plain).toContain('#b=2.');
    const decoded = await decodeShareLink(plain.slice(plain.indexOf('#')));
    expect(decoded.version).toBe(2);
    if (decoded.version !== 2) return;
    expect(decoded.shared.character).toMatchObject({ id: 'jiyan', level: 70 });
    expect(decoded.shared.echoes.map((e) => e.def)).toEqual(ownEchoes.map((e) => e.echoDefId));
    expect(decoded.shared.objective).toBeUndefined();

    await user.click(screen.getByRole('checkbox', { name: /include rotation in the link for seeded build/i }));
    await user.click(copy);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    const withRotation = writeText.mock.calls[1][0] as string;
    expect(withRotation).not.toBe(plain);
    const decoded2 = await decodeShareLink(withRotation.slice(withRotation.indexOf('#')));
    expect(decoded2.version === 2 && decoded2.shared.objective?.kind).toBe('expected-damage');
  });

  it('explains why a link cannot be made instead of guessing', async () => {
    const user = userEvent.setup();
    await useLibraryStore.getState().saveBuild(seed);
    render(<BuildsPage />);
    await screen.findByText('Seeded Build');
    const copy = screen.getByRole('button', { name: /copy link/i });
    await vi.waitFor(() => expect(copy).toBeEnabled());
    await user.click(copy);
    expect(await screen.findByText(/no longer in your inventory/i)).toBeInTheDocument();
  });

  it('previews a v2 link as a build card and flags out-of-range values', async () => {
    const payload: SharedBuild = {
      ...sharedPayload,
      echoes: [
        { ...sharedPayload.echoes[0], main: { stat: 'critRate', value: 0.5 } },
        ...sharedPayload.echoes.slice(1),
      ] as SharedBuild['echoes'],
    };
    await openLink(payload);
    render(<BuildsPage />);
    const preview = await screen.findByRole('region', { name: 'Shared build' });
    expect(within(preview).getByText('Friend Jiyan')).toBeInTheDocument();
    expect(within(preview).getByRole('list', { name: 'Shared Echoes' }).children).toHaveLength(5);
    const stats = within(preview).getByLabelText('Key stats');
    expect(within(stats).getByText('Crit Rate')).toBeInTheDocument();
    expect(within(preview).getByText(/1 value falls outside/i)).toBeInTheDocument();
    expect(within(preview).getByText(/out of range: 5★ \+25 value is 0\.22/i)).toBeInTheDocument();
    expect(await db.builds.count()).toBe(0);
  });

  it('handles ids the recipient game data does not know', async () => {
    await openLink({ ...sharedPayload, character: { ...sharedPayload.character, id: 'nobody' } });
    render(<BuildsPage />);
    const preview = await screen.findByRole('region', { name: 'Shared build' });
    expect(within(preview).getByText(/unknown character "nobody"/i)).toBeInTheDocument();
    expect(within(preview).getByRole('button', { name: /optimize with my echoes/i })).toBeDisabled();
  });

  it('saves as a reference without adding Echoes to the inventory', async () => {
    const user = userEvent.setup();
    await db.ownedEchoes.bulkAdd(ownEchoes.slice(0, 2));
    await openLink(sharedPayload);
    render(<BuildsPage />);
    const preview = await screen.findByRole('region', { name: 'Shared build' });
    await user.click(within(preview).getByRole('button', { name: /save as reference/i }));
    expect(await screen.findByText(/saved “friend jiyan” as a reference build/i)).toBeInTheDocument();
    expect(await db.ownedEchoes.count()).toBe(2);
    const rows = await db.builds.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].reference).toEqual(sharedPayload);
    expect(rows[0].echoIds).toEqual(['ref:0', 'ref:1', 'ref:2', 'ref:3', 'ref:4']);
    expect(screen.getByText('reference')).toBeInTheDocument();
    expect(window.location.hash).toBe('#builds');
  });

  it('optimize loads a calculator draft and leaves the roster alone', async () => {
    const user = userEvent.setup();
    await db.roster.add(myRoster);
    await openLink(sharedPayload);
    render(<BuildsPage />);
    const preview = await screen.findByRole('region', { name: 'Shared build' });
    await user.click(within(preview).getByRole('button', { name: /optimize with my echoes/i }));
    expect(useAppStore.getState().activeSection).toBe('calculator');
    expect(useCalculatorStore.getState()).toMatchObject({
      characterId: 'jiyan',
      level: 90,
      resonanceChain: 6,
      weaponRank: 5,
      rosterSourceId: '',
      draftSource: 'Friend Jiyan',
    });
    expect(await db.roster.get('jiyan')).toEqual(myRoster);
    expect(await db.builds.count()).toBe(0);
  });

  it('previews a shared build from the link and writes nothing until Import', async () => {
    const user = userEvent.setup();
    const saved = await useLibraryStore.getState().saveBuild(seed);
    await db.builds.clear();
    useLibraryStore.setState({ builds: [], loaded: false });
    const link = encodeBuildLink({ ...saved });
    window.history.replaceState(null, '', `/${link}`);
    useAppStore.setState({ shareLink: link });

    render(<BuildsPage />);
    const preview = await screen.findByRole('region', { name: 'Shared build' });
    expect(within(preview).getByText('Seeded Build')).toBeInTheDocument();
    expect(within(preview).getByText(/99\.5/)).toBeInTheDocument();
    expect(useLibraryStore.getState().builds).toHaveLength(0);
    expect(await db.builds.count()).toBe(0);

    await user.click(within(preview).getByRole('button', { name: /import shared build/i }));
    expect(await screen.findByText(/imported shared build/i)).toBeInTheDocument();
    expect(await db.builds.count()).toBe(1);
    expect(screen.queryByRole('region', { name: 'Shared build' })).toBeNull();
    expect(useAppStore.getState().shareLink).toBeNull();
    expect(window.location.hash).toBe('#builds');
  });

  it('dismisses a shared build without saving it', async () => {
    const user = userEvent.setup();
    const saved = await useLibraryStore.getState().saveBuild(seed);
    await db.builds.clear();
    useLibraryStore.setState({ builds: [], loaded: false });
    const link = encodeBuildLink({ ...saved });
    window.history.replaceState(null, '', `/${link}`);
    useAppStore.setState({ shareLink: link });

    render(<BuildsPage />);
    const preview = await screen.findByRole('region', { name: 'Shared build' });
    await user.click(within(preview).getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('region', { name: 'Shared build' })).toBeNull();
    expect(await db.builds.count()).toBe(0);
    expect(window.location.hash).toBe('#builds');
  });

  it('reports a corrupt share link instead of importing', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/#b=not-base64!');
    useAppStore.setState({ shareLink: '#b=not-base64!' });

    render(<BuildsPage />);
    expect(await screen.findByText(/could not open the shared build/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText(/could not open the shared build/i)).toBeNull();
    expect(await db.builds.count()).toBe(0);
  });
});

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../state/db.ts';
import { useLibraryStore, type BuildDraft } from '../../state/library.ts';
import { encodeBuildLink } from '../../state/share.ts';
import { BuildsPage } from './BuildsPage.tsx';

const seed: BuildDraft = {
  name: 'Seeded Build',
  characterId: 'jiyan',
  weaponId: 'verdant-summit',
  echoIds: ['a', 'b', 'c', 'd', 'e'],
  objectiveId: 'Expected damage',
  score: 99.5,
};

beforeEach(async () => {
  await db.builds.clear();
  useLibraryStore.setState({ builds: [], loaded: false });
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

  it('copies a share link per build', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await useLibraryStore.getState().saveBuild(seed);

    render(<BuildsPage />);
    await screen.findByText('Seeded Build');
    await user.click(screen.getByRole('button', { name: /copy link/i }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0] as string).toContain('#b=');
  });

  it('imports a build from the URL hash on mount', async () => {
    const saved = await useLibraryStore.getState().saveBuild(seed);
    await db.builds.clear();
    useLibraryStore.setState({ builds: [], loaded: false });
    window.history.replaceState(null, '', encodeBuildLink({ ...saved }));

    render(<BuildsPage />);
    expect(await screen.findByText('Seeded Build')).toBeInTheDocument();
    expect(useLibraryStore.getState().builds).toHaveLength(1);
  });
});

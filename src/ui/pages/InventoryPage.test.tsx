import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OwnedEcho } from '../../data/schema.ts';
import { db } from '../../state/db.ts';
import { useInventoryStore } from '../../state/inventory.ts';
import { InventoryPage } from './InventoryPage.tsx';

beforeEach(async () => {
  await db.ownedEchoes.clear();
  useInventoryStore.setState({ echoes: [], loaded: false });
});

async function addEchoViaUi(user: ReturnType<typeof userEvent.setup>, nickname?: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: /add echo/i }));
  await user.selectOptions(screen.getByLabelText(/^echo$/i), 'hooscamp');
  if (nickname) await user.type(screen.getByLabelText(/nickname/i), nickname);
  await user.type(screen.getByLabelText(/main stat value/i), '30');
  await user.click(screen.getByRole('button', { name: /^add echo$/i }));
}

describe('InventoryPage', () => {
  it('shows an empty state with zero echoes', async () => {
    render(<InventoryPage />);
    expect(await screen.findByText(/no echoes yet/i)).toBeInTheDocument();
  });

  it('adds an echo through the form and persists it', async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await screen.findByText(/no echoes yet/i);

    await addEchoViaUi(user, 'Page Echo');

    expect(await screen.findByText('Page Echo')).toBeInTheDocument();
    expect(screen.queryByText(/no echoes yet/i)).not.toBeInTheDocument();
    const rows = await db.ownedEchoes.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ label: 'Page Echo', echoDefId: 'hooscamp', cost: 1 });
  });

  it('falls back to the def name without a nickname', async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await screen.findByText(/no echoes yet/i);

    await addEchoViaUi(user);

    expect(await screen.findByText('Hooscamp')).toBeInTheDocument();
  });

  it('edits a nickname', async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await addEchoViaUi(user, 'Page Echo');

    const row = screen.getByText('Page Echo').closest('li')!;
    await user.click(within(row).getByRole('button', { name: /edit/i }));
    const nameField = screen.getByLabelText(/nickname/i);
    await user.clear(nameField);
    await user.type(nameField, 'Renamed');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await screen.findByText('Renamed');
    expect(screen.queryByText('Page Echo')).not.toBeInTheDocument();
    const rows = await db.ownedEchoes.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('Renamed');
  });

  it('deletes an echo and returns to the empty state', async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await addEchoViaUi(user, 'Page Echo');

    const row = screen.getByText('Page Echo').closest('li')!;
    await user.click(within(row).getByRole('button', { name: /delete/i }));

    expect(await screen.findByText(/no echoes yet/i)).toBeInTheDocument();
    expect(await db.ownedEchoes.count()).toBe(0);
  });

  it('shows errors and writes nothing when no Echo is picked', async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await screen.findByText(/no echoes yet/i);

    await user.click(screen.getByRole('button', { name: /add echo/i }));
    await user.click(screen.getByRole('button', { name: /^add echo$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/pick an echo/i);
    expect(await db.ownedEchoes.count()).toBe(0);
  });

  it('filters the list by sonata set and restores with all sets', async () => {
    const lingering: OwnedEcho = {
      id: 'echo-lingering',
      label: 'Lingering One',
      echoDefId: 'hooscamp',
      sonataId: 'lingering-tunes',
      cost: 1,
      level: 25,
      rarity: 5,
      mainStat: { stat: 'atkPct', value: 0.3 },
      substats: [],
      equippedTo: null,
      origin: 'manual',
    };
    const thunder: OwnedEcho = {
      ...lingering,
      id: 'echo-thunder',
      label: 'Thunder One',
      echoDefId: 'tempest-mephis',
      sonataId: 'void-thunder',
      cost: 4,
    };
    await db.ownedEchoes.bulkAdd([lingering, thunder]);
    const user = userEvent.setup();
    render(<InventoryPage />);

    expect(await screen.findByText('Lingering One')).toBeInTheDocument();
    expect(screen.getByText('Thunder One')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/sonata set/i), 'lingering-tunes');
    expect(screen.getByText('Lingering One')).toBeInTheDocument();
    expect(screen.queryByText('Thunder One')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /echo inventory/i })).toHaveTextContent('(1/2)');

    await user.selectOptions(screen.getByLabelText(/sonata set/i), '');
    expect(screen.getByText('Lingering One')).toBeInTheDocument();
    expect(screen.getByText('Thunder One')).toBeInTheDocument();
  });

  it('shows an empty-filter state when no echo matches the sonata set', async () => {
    await db.ownedEchoes.add({
      id: 'echo-lingering',
      label: 'Lingering One',
      echoDefId: 'hooscamp',
      sonataId: 'lingering-tunes',
      cost: 1,
      level: 25,
      rarity: 5,
      mainStat: { stat: 'atkPct', value: 0.3 },
      substats: [],
      equippedTo: null,
      origin: 'manual',
    });
    const user = userEvent.setup();
    render(<InventoryPage />);

    await screen.findByText('Lingering One');
    await user.selectOptions(screen.getByLabelText(/sonata set/i), 'void-thunder');
    expect(await screen.findByText(/no echoes with this sonata set/i)).toBeInTheDocument();
  });

  it('previews a Kamera file and imports the matchable rows', async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await screen.findByText(/no echoes yet/i);

    const file = new File(
      [
        JSON.stringify([
          {
            Hooscamp: {
              level: 25,
              tuneLv: 1,
              sonata: 'lingeringtunes',
              rarity: 5,
              stats: { main: { 'atk%': 30 }, sub: { cr: 8.7 } },
            },
          },
          { '340000070': { level: 25, tuneLv: 0, sonata: 'voidthunder', rarity: 5, stats: { main: { atk: 60 }, sub: {} } } },
        ]),
      ],
      'echoes_wuwainventorykamera.json',
      { type: 'application/json' },
    );
    await user.upload(screen.getByLabelText(/import echoes file/i), file);

    expect(await screen.findByText(/1 echo ready to add, 1 skipped/i)).toBeInTheDocument();
    expect(screen.getByText(/row 2 \(340000070\)/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^add 1 echo$/i }));

    expect(await screen.findByText('Hooscamp')).toBeInTheDocument();
    const rows = await db.ownedEchoes.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      echoDefId: 'hooscamp',
      sonataId: 'lingering-tunes',
      origin: 'import:wuwa-inventory-kamera',
      mainStat: { stat: 'atkPct', value: 0.3 },
    });
  });

  it('cancels an import preview without writing anything', async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await screen.findByText(/no echoes yet/i);

    const file = new File(
      [
        JSON.stringify([
          {
            hooscamp: {
              level: 0,
              tuneLv: 0,
              sonata: 'sierragale',
              rarity: 5,
              stats: { main: { atk: 60 }, sub: {} },
            },
          },
        ]),
      ],
      'echoes.json',
      { type: 'application/json' },
    );
    await user.upload(screen.getByLabelText(/import echoes file/i), file);
    expect(await screen.findByText(/1 echo ready to add, 0 skipped/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByText(/ready to add/i)).not.toBeInTheDocument();
    expect(await db.ownedEchoes.count()).toBe(0);
  });

  it('alerts on a non-JSON import file', async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await screen.findByText(/no echoes yet/i);

    const file = new File(['definitely not json'], 'echoes.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/import echoes file/i), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(/not a JSON file/i);
    expect(await db.ownedEchoes.count()).toBe(0);
  });

  it('exports the inventory in the Kamera shape', async () => {
    await db.ownedEchoes.add({
      id: 'echo-export',
      echoDefId: 'hooscamp',
      sonataId: 'sierra-gale',
      cost: 1,
      level: 25,
      rarity: 5,
      mainStat: { stat: 'atkPct', value: 0.3 },
      substats: [{ stat: 'critRate', value: 0.087 }],
      equippedTo: null,
      origin: 'manual',
    });
    const blobs: Blob[] = [];
    const downloads: { href: string; download: string }[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn((blob: Blob) => {
          blobs.push(blob);
          return 'blob:mock-export';
        }),
        revokeObjectURL: vi.fn(),
      }),
    );
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push({ href: this.href, download: this.download });
      });
    try {
      const user = userEvent.setup();
      render(<InventoryPage />);
      await screen.findByText('Hooscamp');

      await user.click(screen.getByRole('button', { name: /^export$/i }));

      expect(blobs).toHaveLength(1);
      expect(JSON.parse(await blobs[0].text())).toEqual([
        {
          hooscamp: {
            level: 25,
            tuneLv: 1,
            sonata: 'sierragale',
            rarity: 5,
            stats: { main: { 'atk%': 30 }, sub: { 'cr%': 8.7 } },
          },
        },
      ]);
      expect(downloads).toEqual([{ href: 'blob:mock-export', download: 'echoes_wuwainventorykamera.json' }]);
    } finally {
      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('flags orphan rows and re-links them through edit', async () => {
    const orphan: OwnedEcho = {
      id: 'orphan-1',
      label: 'Old Echo',
      echoDefId: 'slugged-label',
      sonataId: 'sierra-gale',
      cost: 3,
      level: 25,
      rarity: 5,
      mainStat: { stat: 'atkPct', value: 0.3 },
      substats: [],
      equippedTo: null,
      origin: 'manual',
    };
    await db.ownedEchoes.add(orphan);
    const user = userEvent.setup();
    render(<InventoryPage />);

    expect(await screen.findByText(/re-linking — press edit/i)).toBeInTheDocument();
    expect(screen.getByText(/needs re-link:/i)).toBeInTheDocument();

    const row = screen.getByText('Old Echo').closest('li')!;
    await user.click(within(row).getByRole('button', { name: /edit/i }));
    await user.selectOptions(screen.getByLabelText(/^echo$/i), 'hooscamp');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Cost force-fixed to the def (1), banner clears.
    expect(await db.ownedEchoes.get('orphan-1')).toMatchObject({ echoDefId: 'hooscamp', cost: 1 });
    expect(screen.queryByText(/re-linking — press edit/i)).not.toBeInTheDocument();
  });
});

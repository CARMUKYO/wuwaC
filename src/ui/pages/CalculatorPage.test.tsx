import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OwnedEcho, RosterEntry } from '../../data/schema.ts';
import { useCalculatorStore } from '../../state/calculator.ts';
import { useInventoryStore } from '../../state/inventory.ts';
import { useLibraryStore } from '../../state/library.ts';
import { useRosterStore } from '../../state/roster.ts';
import { useTeamStore } from '../../state/teamStore.ts';
import type { OptimizeRequest } from '../../optimizer/search.ts';
import { CalculatorPage } from './CalculatorPage.tsx';

const { calls, canned } = vi.hoisted(() => ({
  calls: [] as unknown[][],
  canned: {
    builds: [
      {
        echoIds: [] as string[],
        score: 9876.5,
        sheet: {} as never,
        warnings: [] as string[],
        appliedAssumptions: ['Verdant Summit R1 — full stacks (2)'],
      },
    ],
    evaluated: 1,
    prunedEchoes: [] as string[],
  },
}));

vi.mock('../../optimizer/worker.ts', () => ({
  runOptimization: (data: unknown, request: unknown) => {
    calls.push([data, request]);
    return { promise: Promise.resolve(canned), cancel: () => {}, onProgress: () => {} };
  },
}));

const entry: RosterEntry = {
  characterId: 'jiyan',
  level: 80,
  ascension: 5,
  resonanceChain: 2,
  forteLevels: { '1001101': 8 },
  weaponId: 'verdant-summit',
  weaponLevel: 70,
  weaponRank: 3,
};

const echoA: OwnedEcho = {
  id: 'echo-a',
  label: 'Echo A',
  echoDefId: 'echo-a',
  sonataId: 'freezing-frost',
  cost: 4,
  level: 25,
  rarity: 5,
  mainStat: { stat: 'critRate', value: 0.22 },
  substats: [],
  equippedTo: null,
  origin: 'manual',
};

beforeEach(() => {
  useCalculatorStore.getState().resetAll();
  useRosterStore.setState({ entries: [], loaded: true });
  useInventoryStore.setState({ echoes: [], loaded: true });
  useLibraryStore.setState({ builds: [], loaded: true });
  useTeamStore.setState({ teams: [], loaded: true });
  calls.length = 0;
  canned.builds[0].echoIds = [];
});

/** Five distinct 1-cost echoes (total 5 — a legal loadout and candidate pool). */
function seedEchoes(): OwnedEcho[] {
  const echoes = ['a', 'b', 'c', 'd', 'e'].map((n) => ({
    ...echoA,
    id: `echo-${n}`,
    label: `Echo ${n.toUpperCase()}`,
    echoDefId: 'hooscamp',
    sonataId: 'sierra-gale',
    cost: 1 as const,
    mainStat: { stat: 'atkPct' as const, value: 0.1 },
  }));
  useInventoryStore.setState({ echoes, loaded: true });
  return echoes;
}

function setupScorable(): OwnedEcho[] {
  const echoes = seedEchoes();
  const calc = useCalculatorStore.getState();
  calc.setCharacterId('jiyan');
  calc.setWeaponId('verdant-summit');
  echoes.forEach((e, i) => useCalculatorStore.getState().setEchoSlot(i, e.id));
  useCalculatorStore.getState().addBlock({ skillId: '1001101', motionName: 'Stage 1 DMG', forteLevel: 10, activeBuffIds: [] });
  return echoes;
}

describe('CalculatorPage', () => {
  it('prompts for a character when none is selected', () => {
    render(<CalculatorPage />);
    expect(screen.getByText(/pick a character above/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enemy kind/i)).toBeInTheDocument();
  });

  it('prefills level and skill inputs from a roster entry', async () => {
    useRosterStore.setState({ entries: [entry], loaded: true });
    const user = userEvent.setup();
    render(<CalculatorPage />);

    await user.selectOptions(screen.getByLabelText(/prefill from roster/i), 'jiyan');

    // Roster level 80 flows into the slider + exact-value field.
    expect(screen.getByLabelText(/^character level \(exact value\)$/i)).toHaveValue(80);
    // Roster forte 8 flows into Jiyan's basic-attack slider.
    expect(screen.getByLabelText(/lone lance.*exact value/i)).toHaveValue(8);
    // Buff-only outro is listed, not slider-ed — and offered as a carrier button.
    expect(screen.getByRole('button', { name: /discipline.*buff carrier/i })).toBeInTheDocument();
  });

  it('moves the character level slider into the store', async () => {
    useCalculatorStore.getState().setCharacterId('jiyan');
    render(<CalculatorPage />);
    // fireEvent: controlled range inputs need change events in jsdom.
    fireEvent.change(screen.getByRole('slider', { name: /character level/i }), { target: { value: '60' } });
    await waitFor(() => {
      expect(useCalculatorStore.getState().level).toBe(60);
    });
  });

  it('shows enemy resistance as a percent', async () => {
    render(<CalculatorPage />);
    expect(screen.getByText('10%')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: /base resistance/i }), { target: { value: '40' } });
    await waitFor(() => {
      expect(useCalculatorStore.getState().enemyBaseRES).toBeCloseTo(0.4, 10);
    });
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('warns on duplicate echo picks and cost overflow', async () => {
    const expensive: OwnedEcho = { ...echoA, id: 'echo-b', label: 'Echo B', cost: 4 };
    const pricey: OwnedEcho = { ...echoA, id: 'echo-c', label: 'Echo C', cost: 4 };
    const pricey2: OwnedEcho = { ...echoA, id: 'echo-d', label: 'Echo D', cost: 4 };
    useInventoryStore.setState({ echoes: [echoA, expensive, pricey, pricey2], loaded: true });
    const user = userEvent.setup();
    render(<CalculatorPage />);

    await user.selectOptions(screen.getByLabelText(/echo slot 1/i), 'echo-a');
    await user.selectOptions(screen.getByLabelText(/echo slot 2/i), 'echo-a');
    expect(await screen.findByText(/same echo is picked twice/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/echo slot 2/i), 'echo-b');
    await user.selectOptions(screen.getByLabelText(/echo slot 3/i), 'echo-c');
    await user.selectOptions(screen.getByLabelText(/echo slot 4/i), 'echo-d');
    expect(await screen.findByText(/over the 12-cost budget/i)).toBeInTheDocument();
  });

  it('gates scoring until 5 distinct echoes are picked', () => {
    useCalculatorStore.getState().setCharacterId('jiyan');
    useCalculatorStore.getState().setWeaponId('verdant-summit');
    render(<CalculatorPage />);
    expect(screen.getByText(/pick 5 distinct echoes/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/rotation results/i)).not.toBeInTheDocument();
  });

  it('scores DPR as the block sum and DPS as DPR over time', async () => {
    const echoes = ['a', 'b', 'c', 'd', 'e'].map((n) => ({
      ...echoA,
      id: `echo-${n}`,
      label: `Echo ${n}`,
      cost: 1 as const,
      mainStat: { stat: 'atkPct' as const, value: 0.1 },
    }));
    useInventoryStore.setState({ echoes, loaded: true });
    const calc = useCalculatorStore.getState();
    calc.setCharacterId('jiyan');
    calc.setWeaponId('verdant-summit');
    echoes.forEach((e, i) => useCalculatorStore.getState().setEchoSlot(i, e.id));
    useCalculatorStore.getState().addBlock({ skillId: '1001101', motionName: 'Stage 1 DMG', forteLevel: 10, activeBuffIds: [] });
    useCalculatorStore.getState().addBlock({ skillId: '1001101', motionName: 'Stage 2 DMG', forteLevel: 10, activeBuffIds: [] });
    render(<CalculatorPage />);

    const results = await screen.findByLabelText(/rotation results/i);
    const dprText = results.textContent ?? '';
    // Cross-checked against the domain directly: header shows rounded sums.
    const { calculateRotation } = await import('../../domain/rotation.ts');
    const { loadBundledSnapshot } = await import('../../data/index.ts');
    const { buildEnemyProfile } = await import('../../domain/enemy.ts');
    const snapshot = loadBundledSnapshot();
    const expected = calculateRotation({
      character: snapshot.characters.find((c) => c.id === 'jiyan')!,
      weapon: snapshot.weapons.find((w) => w.id === 'verdant-summit')!,
      roster: {
        characterId: 'jiyan', level: 90, ascension: 6, resonanceChain: 0,
        forteLevels: {}, weaponId: 'verdant-summit', weaponLevel: 90, weaponRank: 1,
      },
      echoes,
      sonataSets: snapshot.sonataSets,
      enemy: buildEnemyProfile('mob', 90, 0.1, 'Aero'),
      blocks: useCalculatorStore.getState().blocks,
      buffs: [],
      globalBuffIds: [],
      rotationTime: 10,
      crit: 'expected',
    });
    expect(dprText).toContain(Math.round(expected.dpr).toLocaleString());
    expect(dprText).toContain(Math.round(expected.dps).toLocaleString());
  });

  it('adds a buff and toggles it onto a block', async () => {
    useCalculatorStore.getState().setCharacterId('jiyan');
    useCalculatorStore.getState().setWeaponId('verdant-summit');
    useCalculatorStore.getState().addBlock({ skillId: '1001101', motionName: 'Stage 1 DMG', forteLevel: 10, activeBuffIds: [] });
    const user = userEvent.setup();
    render(<CalculatorPage />);

    await user.type(screen.getByLabelText(/buff name/i), 'Verina Outro');
    await user.selectOptions(screen.getByLabelText(/^stat$/i), 'atkPct');
    await user.type(screen.getByLabelText(/^value/i), '20');
    await user.click(screen.getByRole('button', { name: /add buff/i }));

    expect(useCalculatorStore.getState().buffs).toHaveLength(1);
    expect(useCalculatorStore.getState().buffs[0].mods).toEqual([{ stat: 'atkPct', value: 0.2 }]);
    // Buff starts off — enabling it per-block records the toggle.
    // (The label matches twice: block-level checkbox first, global toggle second.)
    const buffId = useCalculatorStore.getState().buffs[0].id;
    const blockId = useCalculatorStore.getState().blocks[0].id;
    await user.click(screen.getAllByLabelText(/\[custom\] verina outro/i)[0]);
    expect(useCalculatorStore.getState().blocks.find((b) => b.id === blockId)?.activeBuffIds).toEqual([buffId]);
  });

  it('shows the current-picks DPR baseline once 5 echoes are picked', () => {
    setupScorable();
    render(<CalculatorPage />);
    expect(screen.getByText(/current picks: .* dpr/i)).toBeInTheDocument();
  });

  it('optimizes the rotation with a rotation-dpr objective and applies the winner', async () => {
    const echoes = setupScorable();
    canned.builds[0].echoIds = echoes.map((e) => e.id).sort();
    const user = userEvent.setup();
    render(<CalculatorPage />);

    // Clear the slots so Apply has something visible to do.
    useCalculatorStore.getState().clearEchoes();
    await user.click(screen.getByRole('button', { name: /find best builds/i }));

    expect(await screen.findByText(/9,877 dpr/i)).toBeInTheDocument();
    expect(calls).toHaveLength(1);
    const request = calls[0][1] as OptimizeRequest;
    expect(request.objective.kind).toBe('rotation-dpr');
    if (request.objective.kind === 'rotation-dpr') {
      expect(request.objective.blocks).toHaveLength(1);
      expect(request.objective.crit).toBe('expected');
    }

    await user.click(screen.getByRole('button', { name: /apply to loadout/i }));
    expect(useCalculatorStore.getState().echoIds).toEqual(canned.builds[0].echoIds);
    // Both the calculator results (real auto-apply) and the optimizer
    // result (canned) disclose the Verdant assumption.
    expect(screen.getAllByText(/assumes: verdant summit r1/i)).toHaveLength(2);
  });

  it('passes the sonata lock through to the optimizer request', async () => {
    setupScorable();
    const user = userEvent.setup();
    render(<CalculatorPage />);

    await user.selectOptions(screen.getByLabelText(/sonata lock/i), 'five');
    await user.selectOptions(screen.getByLabelText(/locked set/i), 'sierra-gale');
    await user.click(screen.getByRole('button', { name: /find best builds/i }));
    await screen.findByText(/9,877 dpr/i);

    const request = calls[calls.length - 1][1] as OptimizeRequest;
    expect(request.sonataLock).toEqual({ mode: 'five', setId: 'sierra-gale' });
  });

  it('saves a rotation result with its spec', async () => {
    const echoes = setupScorable();
    canned.builds[0].echoIds = echoes.map((e) => e.id).sort();
    const user = userEvent.setup();
    render(<CalculatorPage />);

    await user.click(screen.getByRole('button', { name: /find best builds/i }));
    await screen.findByText(/9,877 dpr/i);

    await user.click(screen.getByRole('button', { name: /^save$/i }));
    await user.type(screen.getByLabelText(/build name/i), 'Jiyan Rotation');
    await user.click(screen.getByRole('button', { name: /confirm save/i }));

    // Saving is fire-and-forget — wait for the store, don't assert sync.
    await waitFor(() => expect(useLibraryStore.getState().builds).toHaveLength(1));
    const builds = useLibraryStore.getState().builds;
    expect(builds).toHaveLength(1);
    expect(builds[0]).toMatchObject({ name: 'Jiyan Rotation', objectiveId: 'Rotation DPR' });
    expect(builds[0].objective?.kind).toBe('rotation-dpr');
  });

  it('lists only matching-type weapons for the character', () => {
    useCalculatorStore.getState().setCharacterId('jiyan');
    render(<CalculatorPage />);

    const select = screen.getByLabelText('Weapon');
    expect(within(select).queryByRole('option', { name: 'Thunderbolt' })).not.toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Autumntrace' })).toBeInTheDocument();
  });

  it('blocks scoring on a wrong-type weapon with a fix-it message', () => {
    setupScorable();
    useCalculatorStore.getState().setWeaponId('thunderbolt');
    render(<CalculatorPage />);

    expect(screen.getByText(/can't use thunderbolt — pick a broadblade/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/rotation results/i)).not.toBeInTheDocument();
  });

  it('imports team buffs as enabled global buffs without duplicating', async () => {
    setupScorable();
    useTeamStore.setState({
      teams: [{ id: 'team-1', name: 'Lynae team', characterIds: ['lynae', 'verina', 'sanhua'] }],
      loaded: true,
    });
    const user = userEvent.setup();
    render(<CalculatorPage />);

    await user.selectOptions(screen.getByLabelText(/import outro/i), 'team-1');
    await user.click(screen.getByRole('button', { name: /import team buffs/i }));

    const labels = useCalculatorStore.getState().buffs.map((b) => b.label);
    expect(labels).toContain('Lynae Outro (incoming) · 14s');
    expect(labels).toContain('Lynae Liberation (team) · 30s');
    const state = useCalculatorStore.getState();
    expect(state.globalBuffIds).toHaveLength(state.buffs.length);

    await user.click(screen.getByRole('button', { name: /import team buffs/i }));
    expect(useCalculatorStore.getState().buffs.map((b) => b.label)).toEqual(labels);
  });
});

import { describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadBundledSnapshot } from '../../data/index.ts';
import type { ActionBlock, BlockResult, RotationBuff } from '../../domain/rotation.ts';
import { calculateRotation } from '../../domain/rotation.ts';
import { buildEnemyProfile } from '../../domain/enemy.ts';
import { ownedEchoSchema, type CharacterData, type OwnedEcho, type RosterEntry } from '../../data/schema.ts';
import { RotationTimeline, type MainEchoSkill } from './RotationTimeline.tsx';

const character = loadBundledSnapshot().characters.find((c) => c.id === 'jiyan')!;
const chisa = loadBundledSnapshot().characters.find((c) => c.id === 'chisa')!;

function renderTimeline(
  overrides: {
    character?: CharacterData;
    weaponRank?: number;
    onAddBuff?: (buff: Omit<RotationBuff, 'id'>) => void;
    mainEchoSkill?: MainEchoSkill | null;
    onAddBlock?: Mock;
    blocks?: ActionBlock[];
    buffs?: RotationBuff[];
    globalBuffIds?: string[];
    rotationTime?: number;
    dpr?: number | null;
    dps?: number | null;
    results?: Map<string, BlockResult>;
  } = {},
) {
  const onAddBuff = overrides.onAddBuff ?? vi.fn();
  const onAddBlock: Mock = overrides.onAddBlock ?? vi.fn();
  const onToggleBlockBuff = vi.fn();
  const onSetBlockDuration = vi.fn();
  const onSetBuffWindow = vi.fn();
  const onClearBuffWindow = vi.fn();
  render(
    <RotationTimeline
      character={overrides.character ?? character}
      resonanceChain={0}
      forteLevels={{}}
      resonanceMode={null}
      onSetResonanceMode={() => {}}
      blocks={overrides.blocks ?? ([] as ActionBlock[])}
      buffs={overrides.buffs ?? []}
      globalBuffIds={overrides.globalBuffIds ?? []}
      results={overrides.results ?? new Map()}
      dpr={overrides.dpr ?? null}
      dps={overrides.dps ?? null}
      rotationTime={overrides.rotationTime ?? 20}
      weaponRank={overrides.weaponRank}
      mainEchoSkill={overrides.mainEchoSkill}
      onAddBlock={onAddBlock}
      onRemoveBlock={() => {}}
      onMoveBlock={() => {}}
      onSetBlockForte={() => {}}
      onSetBlockStatusStacks={() => {}}
      onSetBlockConviction={() => {}}
      onSetBlockKitState={() => {}}
      onToggleBlockBuff={onToggleBlockBuff}
      onToggleGlobalBuff={() => {}}
      onAddBuff={onAddBuff}
      onRemoveBuff={() => {}}
      onSetBlockDuration={onSetBlockDuration}
      onSetBuffWindow={onSetBuffWindow}
      onClearBuffWindow={onClearBuffWindow}
    />,
  );
  return {
    onAddBuff: onAddBuff as ReturnType<typeof vi.fn>,
    onAddBlock,
    onToggleBlockBuff,
    onSetBlockDuration,
    onSetBuffWindow,
    onClearBuffWindow,
  };
}

function timedBlock(id: string, motionName: string, durationSeconds?: number, activeBuffIds: string[] = []): ActionBlock {
  return { id, skillId: '1001101', motionName, forteLevel: 10, activeBuffIds, ...(durationSeconds === undefined ? {} : { durationSeconds }) };
}

function timedBuff(id: string, windowStartSeconds?: number, windowDurationSeconds?: number): RotationBuff {
  return {
    id, label: `Buff ${id}`, source: 'Test',
    mods: [{ stat: 'amplify', value: 0.2 }],
    ...(windowStartSeconds === undefined ? {} : { windowStartSeconds }),
    ...(windowDurationSeconds === undefined ? {} : { windowDurationSeconds }),
  };
}

describe('RotationTimeline buff presets', () => {
  it('adds a manual sonata preset with its transcribed mods (Moonlit incoming)', async () => {
    const user = userEvent.setup();
    const { onAddBuff } = renderTimeline();

    await user.selectOptions(screen.getByLabelText(/preset \(echo \/ sonata \/ weapon\)/i), 'sonata-moonlit-clouds-5pc');
    expect(await screen.findByText(/next resonator for 15s/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add preset/i }));

    expect(onAddBuff).toHaveBeenCalledOnce();
    expect(onAddBuff).toHaveBeenCalledWith({
      label: 'Moonlit Clouds 5pc (incoming)',
      source: 'Sonata preset',
      mods: [{ stat: 'atkPct', value: 0.225 }],
      windowDurationSeconds: 15,
    });
  });

  it('hides auto-applied presets from the picker (Sierra Gale 5pc)', async () => {
    const user = userEvent.setup();
    renderTimeline();

    const options = Array.from(
      (screen.getByLabelText(/preset \(echo \/ sonata \/ weapon\)/i) as HTMLSelectElement).options,
    ).map((o) => o.value);
    expect(options).not.toContain('sonata-sierra-gale-5pc');
    expect(options).not.toContain('weapon-autumntrace');
    expect(options).toContain('sonata-moonlit-clouds-5pc');
    await user.selectOptions(screen.getByLabelText(/preset \(echo \/ sonata \/ weapon\)/i), 'sonata-moonlit-clouds-5pc');
    expect(screen.getByRole('button', { name: /add preset/i })).toBeEnabled();
  });

  it('resolves manual weapon presets at the equipped rank (Static Mist Outro R1)', async () => {
    const user = userEvent.setup();
    const { onAddBuff } = renderTimeline({ weaponRank: 1 });

    await user.selectOptions(screen.getByLabelText(/preset \(echo \/ sonata \/ weapon\)/i), 'weapon-static-mist-outro');
    await user.click(screen.getByRole('button', { name: /add preset/i }));

    expect(onAddBuff).toHaveBeenCalledWith({
      label: 'Static Mist (Outro, incoming)',
      source: 'Weapon preset',
      mods: [{ stat: 'atkPct', value: 0.1 }],
      windowDurationSeconds: 14,
    });
  });

  it('adds a custom buff with two stat mods', async () => {
    const user = userEvent.setup();
    const { onAddBuff } = renderTimeline();

    await user.type(screen.getByLabelText(/buff name/i), 'Outro combo');
    await user.selectOptions(screen.getByLabelText(/^stat$/i), 'atkPct');
    await user.type(screen.getByLabelText(/^value/i), '15');
    await user.selectOptions(screen.getByLabelText(/second stat/i), 'dmgBonus:liberation');
    await user.type(screen.getByLabelText(/second value/i), '25');
    await user.click(screen.getByRole('button', { name: /^add buff$/i }));

    expect(onAddBuff).toHaveBeenCalledWith({
      label: 'Outro combo',
      source: 'Custom',
      mods: [
        { stat: 'atkPct', value: 0.15 },
        { stat: 'dmgBonus:liberation', value: 0.25 },
      ],
    });
  });

  it('adds a single-mod custom buff when the second value stays empty', async () => {
    const user = userEvent.setup();
    const { onAddBuff } = renderTimeline();

    await user.type(screen.getByLabelText(/buff name/i), 'Solo');
    await user.type(screen.getByLabelText(/^value/i), '10');
    await user.click(screen.getByRole('button', { name: /^add buff$/i }));

    expect(onAddBuff).toHaveBeenCalledWith({
      label: 'Solo',
      source: 'Custom',
      mods: [{ stat: 'atkPct', value: 0.1 }],
    });
  });

  it('adds windowed presets with their quoted window (Moonlit 15s)', async () => {
    const user = userEvent.setup();
    const { onAddBuff } = renderTimeline();

    await user.selectOptions(screen.getByLabelText(/preset \(echo \/ sonata \/ weapon\)/i), 'sonata-moonlit-clouds-5pc');
    await user.click(screen.getByRole('button', { name: /add preset/i }));

    expect(onAddBuff).toHaveBeenCalledWith({
      label: 'Moonlit Clouds 5pc (incoming)',
      source: 'Sonata preset',
      mods: [{ stat: 'atkPct', value: 0.225 }],
      windowDurationSeconds: 15,
    });
  });
});

describe('RotationTimeline action picker', () => {
  it('hides the Chisa per-Ring parameter row but keeps Eradication', () => {
    // "Bonus DMG Multiplier per Ring of Chainsaw" is a scaling parameter
    // consumed by chisaSkillMods, not a scorable hit — offering it as a
    // block would score a phantom 1.30% hit.
    renderTimeline({ character: chisa });

    expect(screen.queryByRole('button', { name: /bonus dmg multiplier per ring/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sawring - eradication/i })).toBeInTheDocument();
  });
});

describe('RotationTimeline echo skill panel', () => {
  const lorelei: MainEchoSkill = {
    echoName: 'Lorelei',
    cooldown: 25,
    hits: [{ label: 'Hit 1', motionValue: 4.05, flatDamage: 0, attribute: 'Havoc', scaling: 'ATK' }],
  };

  it('adds an echo-skill block carrying the parsed hit values', async () => {
    const user = userEvent.setup();
    const { onAddBlock } = renderTimeline({ mainEchoSkill: lorelei });

    await user.click(screen.getByRole('button', { name: /405\.0% havoc/i }));

    expect(onAddBlock).toHaveBeenCalledOnce();
    expect(onAddBlock).toHaveBeenCalledWith('', 'Lorelei', 1, {
      damageKind: 'echoSkill',
      echoName: 'Lorelei',
      echoMotionValue: 4.05,
      echoFlatDamage: 0,
      echoAttribute: 'Havoc',
      echoScaling: 'ATK',
      echoCooldown: 25,
    });
  });

  it('explains slot-1 echoes with no scorable hit instead of offering buttons', () => {
    renderTimeline({ mainEchoSkill: { echoName: 'Diamondclaw', cooldown: 8, hits: [] } });

    expect(screen.getByText(/no damaging skill to score/i)).toBeInTheDocument();
  });

  it('hides the panel when slot 1 is empty', () => {
    renderTimeline({ mainEchoSkill: null });

    expect(screen.queryByText(/echo skill \(slot 1/i)).not.toBeInTheDocument();
  });
});

describe('RotationTimeline timing', () => {
  it('shows derived starts on block rows', () => {
    renderTimeline({ blocks: [timedBlock('b1', 'Stage 1 DMG', 2), timedBlock('b2', 'Stage 2 DMG', 3)] });

    expect(screen.getByText(/@0s/)).toBeInTheDocument();
    expect(screen.getByText(/@2s/)).toBeInTheDocument();
  });

  it('wires the duration input to onSetBlockDuration and ignores empty input', () => {
    const { onSetBlockDuration } = renderTimeline({ blocks: [timedBlock('b1', 'Stage 1 DMG')] });

    const input = screen.getByLabelText(/^duration \(s\)$/i);
    expect(input).toHaveValue(null);
    fireEvent.change(input, { target: { value: '' } });
    expect(onSetBlockDuration).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '2.5' } });
    expect(onSetBlockDuration).toHaveBeenCalledWith('b1', 2.5);
  });

  it('auto-checks in-window buffs as disabled with a window tag', async () => {
    const user = userEvent.setup();
    // Starts [0, 2]; window [0, 2) covers block 1 only.
    const { onToggleBlockBuff } = renderTimeline({
      blocks: [timedBlock('b1', 'Stage 1 DMG', 2), timedBlock('b2', 'Stage 2 DMG', 2)],
      buffs: [timedBuff('w1', 0, 2)],
    });

    // DOM order: block 1 box, block 2 box, then the global-toggle row.
    const [box1, box2, global] = screen.getAllByRole('checkbox', { name: /buff w1/i });
    expect(box1).toBeChecked();
    expect(box1).toBeDisabled();
    expect(box2).not.toBeChecked();
    expect(box2).toBeEnabled();
    expect(global).not.toBeChecked();
    expect(screen.getAllByText(/^window$/)).toHaveLength(1);
    // Disabled boxes swallow clicks — the window applies regardless of toggles.
    await user.click(box1);
    expect(onToggleBlockBuff).not.toHaveBeenCalled();
  });

  it('keeps manually toggled in-window buffs editable (union)', async () => {
    const user = userEvent.setup();
    const { onToggleBlockBuff } = renderTimeline({
      blocks: [timedBlock('b1', 'Stage 1 DMG', 2, ['w1']), timedBlock('b2', 'Stage 2 DMG', 2)],
      buffs: [timedBuff('w1', 0, 2)],
    });

    const [box1, box2] = screen.getAllByRole('checkbox', { name: /buff w1/i });
    // Manual + window: checked, tagged, still toggleable (unchecking drops
    // the manual part; the window keeps applying).
    expect(box1).toBeChecked();
    expect(box1).toBeEnabled();
    expect(screen.getAllByText(/^window$/)).toHaveLength(1);
    await user.click(box1);
    expect(onToggleBlockBuff).toHaveBeenCalledWith('b1', 'w1');
    expect(box2).not.toBeChecked();
    expect(box2).toBeEnabled();
  });

  it('warns amber when summed durations exceed rotation time', () => {
    renderTimeline({
      blocks: [timedBlock('b1', 'Stage 1 DMG', 6), timedBlock('b2', 'Stage 2 DMG', 6)],
      rotationTime: 10,
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-amber-300');
    expect(alert).toHaveTextContent('12s exceeds rotation time 10s');
  });

  it('shows the summed total without a warning when within rotation time', () => {
    renderTimeline({
      blocks: [timedBlock('b1', 'Stage 1 DMG', 2), timedBlock('b2', 'Stage 2 DMG', 2)],
      rotationTime: 10,
    });

    expect(screen.getByText(/total block duration 4s of 10s/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders untimed rotations without timing content', async () => {
    const user = userEvent.setup();
    const { onToggleBlockBuff } = renderTimeline({
      blocks: [timedBlock('b1', 'Stage 1 DMG', undefined, ['w1']), timedBlock('b2', 'Stage 2 DMG')],
      buffs: [timedBuff('w1')],
    });

    expect(screen.queryByText(/@\d+s/)).not.toBeInTheDocument();
    expect(screen.queryByText(/total block duration/i)).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^window$/)).toHaveLength(0);
    expect(screen.getByText(/— full uptime/)).toBeInTheDocument();
    // The empty duration inputs exist (the only new chrome); checkboxes stay manual-only.
    const durationInputs = screen.getAllByLabelText(/^duration \(s\)$/i);
    expect(durationInputs).toHaveLength(2);
    for (const input of durationInputs) expect(input).toHaveValue(null);
    const [box1, box2] = screen.getAllByRole('checkbox', { name: /buff w1/i });
    expect(box1).toBeChecked();
    expect(box1).toBeEnabled();
    expect(box2).not.toBeChecked();
    expect(box2).toBeEnabled();
    await user.click(box2);
    expect(onToggleBlockBuff).toHaveBeenCalledWith('b2', 'w1');
  });

  it('wires buff window inputs to onSetBuffWindow', async () => {
    const user = userEvent.setup();
    const { onSetBuffWindow } = renderTimeline({ buffs: [timedBuff('w1')] });

    expect(screen.getByLabelText(/window start/i)).toHaveValue(null);
    expect(screen.getByLabelText(/window duration/i)).toHaveValue(null);
    expect(screen.queryByRole('button', { name: /clear window/i })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/window start/i), '1');
    expect(onSetBuffWindow).toHaveBeenCalledWith('w1', 1, 0);
    await user.type(screen.getByLabelText(/window duration/i), '4');
    expect(onSetBuffWindow).toHaveBeenCalledWith('w1', 0, 4);
  });

  it('shows the window range and clear control on windowed buffs', async () => {
    const user = userEvent.setup();
    const { onClearBuffWindow } = renderTimeline({ buffs: [timedBuff('w1', 1, 4)] });

    expect(screen.getByText(/window \[1s, 5s\)/)).toBeInTheDocument();
    expect(screen.queryByText(/full uptime/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/window start/i)).toHaveValue(1);
    expect(screen.getByLabelText(/window duration/i)).toHaveValue(4);
    await user.click(screen.getByRole('button', { name: /clear window for buff w1/i }));
    expect(onClearBuffWindow).toHaveBeenCalledWith('w1');
  });

  it('manual checklist: window over blocks 1–2 moves DPR, block 3 damage unchanged', () => {
    // End-to-end of the plan's manual checklist with real scoring: 3 timed
    // blocks, one buff windowed [0, 4) over the first two. The timeline must
    // show starts, tag exactly the covered blocks, and the out-of-window
    // block must score identically to the untimed run.
    const snapshot = loadBundledSnapshot();
    const verdant = snapshot.weapons.find((w) => w.id === 'verdant-summit')!;
    const roster: RosterEntry = {
      characterId: 'jiyan', level: 90, ascension: 6, resonanceChain: 0, forteLevels: {},
      weaponId: 'verdant-summit', weaponLevel: 90, weaponRank: 1,
    };
    const echo = (id: string): OwnedEcho => ownedEchoSchema.parse({
      id, echoDefId: 'hooscamp', sonataId: 'sierra-gale', cost: 1, level: 25, rarity: 5,
      mainStat: { stat: 'atkPct', value: 0.3 }, substats: [], equippedTo: null, origin: 'test',
    });
    const mkBlocks = (timed: boolean): ActionBlock[] => [
      timedBlock('b1', 'Stage 1 DMG', timed ? 2 : undefined),
      timedBlock('b2', 'Stage 2 DMG', timed ? 2 : undefined),
      timedBlock('b3', 'Stage 1 DMG', timed ? 2 : undefined),
    ];
    const mkBuff = (timed: boolean): RotationBuff =>
      timed ? timedBuff('w1', 0, 4) : timedBuff('w1');
    const score = (timed: boolean) => calculateRotation({
      character, weapon: verdant, roster,
      echoes: [echo('a'), echo('b'), echo('c'), echo('d'), echo('e')],
      sonataSets: snapshot.sonataSets,
      enemy: buildEnemyProfile('mob', 90, 0.1, 'Aero'),
      blocks: mkBlocks(timed), buffs: [mkBuff(timed)], globalBuffIds: [],
      rotationTime: 10, crit: 'expected',
    });
    const plain = score(false);
    const windowed = score(true);
    expect(windowed.dpr).toBeGreaterThan(plain.dpr);
    expect(windowed.blocks[2].damage).toBe(plain.blocks[2].damage);

    renderTimeline({
      blocks: mkBlocks(true),
      buffs: [mkBuff(true)],
      results: new Map(windowed.blocks.map((b) => [b.id, b])),
      dpr: windowed.dpr,
      dps: windowed.dps,
      rotationTime: 10,
    });
    expect(screen.getByText(/@0s/)).toBeInTheDocument();
    expect(screen.getByText(/@2s/)).toBeInTheDocument();
    expect(screen.getByText(/@4s/)).toBeInTheDocument();
    // Exactly blocks 1–2 carry the window tag; block 3 stays manual-only.
    expect(screen.getAllByText(/^window$/)).toHaveLength(2);
    const boxes = screen.getAllByRole('checkbox', { name: /buff w1/i });
    expect(boxes).toHaveLength(4);
    expect(boxes[0]).toBeChecked();
    expect(boxes[0]).toBeDisabled();
    expect(boxes[1]).toBeChecked();
    expect(boxes[1]).toBeDisabled();
    expect(boxes[2]).not.toBeChecked();
    expect(boxes[2]).toBeEnabled();
  });
});

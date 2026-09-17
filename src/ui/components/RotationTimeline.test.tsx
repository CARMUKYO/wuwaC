import { describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadBundledSnapshot } from '../../data/index.ts';
import type { ActionBlock, RotationBuff } from '../../domain/rotation.ts';
import { RotationTimeline, type MainEchoSkill } from './RotationTimeline.tsx';

const character = loadBundledSnapshot().characters.find((c) => c.id === 'jiyan')!;

function renderTimeline(
  overrides: {
    weaponRank?: number;
    onAddBuff?: (buff: Omit<RotationBuff, 'id'>) => void;
    mainEchoSkill?: MainEchoSkill | null;
    onAddBlock?: Mock;
  } = {},
) {
  const onAddBuff = overrides.onAddBuff ?? vi.fn();
  const onAddBlock: Mock = overrides.onAddBlock ?? vi.fn();
  render(
    <RotationTimeline
      character={character}
      resonanceChain={0}
      forteLevels={{}}
      resonanceMode={null}
      onSetResonanceMode={() => {}}
      blocks={[] as ActionBlock[]}
      buffs={[]}
      globalBuffIds={[]}
      results={new Map()}
      dpr={null}
      dps={null}
      rotationTime={20}
      weaponRank={overrides.weaponRank}
      mainEchoSkill={overrides.mainEchoSkill}
      onAddBlock={onAddBlock}
      onRemoveBlock={() => {}}
      onMoveBlock={() => {}}
      onSetBlockForte={() => {}}
      onSetBlockStatusStacks={() => {}}
      onSetBlockConviction={() => {}}
      onSetBlockKitState={() => {}}
      onToggleBlockBuff={() => {}}
      onToggleGlobalBuff={() => {}}
      onAddBuff={onAddBuff}
      onRemoveBuff={() => {}}
    />,
  );
  return { onAddBuff: onAddBuff as ReturnType<typeof vi.fn>, onAddBlock };
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

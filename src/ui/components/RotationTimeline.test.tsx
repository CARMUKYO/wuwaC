import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadBundledSnapshot } from '../../data/index.ts';
import type { ActionBlock, RotationBuff } from '../../domain/rotation.ts';
import { RotationTimeline } from './RotationTimeline.tsx';

const character = loadBundledSnapshot().characters.find((c) => c.id === 'jiyan')!;

function renderTimeline(overrides: { weaponRank?: number; onAddBuff?: (buff: Omit<RotationBuff, 'id'>) => void } = {}) {
  const onAddBuff = overrides.onAddBuff ?? vi.fn();
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
      onAddBlock={() => {}}
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
  return { onAddBuff: onAddBuff as ReturnType<typeof vi.fn> };
}

describe('RotationTimeline buff presets', () => {
  it('adds a sonata preset with its transcribed mods', async () => {
    const user = userEvent.setup();
    const { onAddBuff } = renderTimeline();

    await user.selectOptions(screen.getByLabelText(/preset \(echo \/ sonata \/ weapon\)/i), 'sonata-sierra-gale-5pc');
    expect(await screen.findByText(/after intro skill/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add preset/i }));

    expect(onAddBuff).toHaveBeenCalledOnce();
    expect(onAddBuff).toHaveBeenCalledWith({
      label: 'Sierra Gale 5pc',
      source: 'Sonata preset',
      mods: [{ stat: 'dmgBonus:Aero', value: 0.3 }],
    });
  });

  it('resolves weapon presets at the equipped rank (Autumntrace R1)', async () => {
    const user = userEvent.setup();
    const { onAddBuff } = renderTimeline({ weaponRank: 1 });

    await user.selectOptions(screen.getByLabelText(/preset \(echo \/ sonata \/ weapon\)/i), 'weapon-autumntrace');
    await user.click(screen.getByRole('button', { name: /add preset/i }));

    expect(onAddBuff).toHaveBeenCalledWith({
      label: 'Autumntrace',
      source: 'Weapon preset',
      mods: [{ stat: 'atkPct', value: 0.2 }],
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

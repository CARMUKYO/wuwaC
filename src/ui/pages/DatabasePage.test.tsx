import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabasePage } from './DatabasePage.tsx';

describe('DatabasePage', () => {
  it('lists characters from the full snapshot', async () => {
    render(<DatabasePage />);
    expect(await screen.findByText('Jiyan')).toBeInTheDocument();
    expect(screen.getByText('Verina')).toBeInTheDocument();
  });

  it('searches characters case-insensitively', async () => {
    const user = userEvent.setup();
    render(<DatabasePage />);
    await screen.findByText('Jiyan');

    await user.type(screen.getByLabelText(/search/i), 'ver');
    expect(screen.queryByText('Jiyan')).not.toBeInTheDocument();
    expect(screen.getByText('Verina')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/search/i));
    expect(screen.getByText('Jiyan')).toBeInTheDocument();
  });

  it('shows no-matches state for gibberish', async () => {
    const user = userEvent.setup();
    render(<DatabasePage />);
    await screen.findByText('Jiyan');

    await user.type(screen.getByLabelText(/search/i), 'zzz-no-such-thing');
    expect(await screen.findByText(/no matches/i)).toBeInTheDocument();
  });

  it('opens a character detail with kit data', async () => {
    const user = userEvent.setup();
    render(<DatabasePage />);
    await user.click(await screen.findByText('Jiyan'));

    expect(await screen.findByText(/lone lance/i)).toBeInTheDocument();
    expect(screen.getByText('Aero')).toBeInTheDocument();
  });

  it('browses weapons with passive details', async () => {
    const user = userEvent.setup();
    render(<DatabasePage />);
    await user.click(screen.getByRole('tab', { name: /weapons/i }));

    await user.click(await screen.findByText('Verdant Summit'));
    // 'Broadblade' also names another weapon — scope to the detail article.
    const passive = await screen.findByText(/swordsworn/i);
    const article = passive.closest('article')!;
    expect(within(article).getByText(/broadblade/i)).toBeInTheDocument();
  });

  it('browses echo defs with cost and pools', async () => {
    const user = userEvent.setup();
    render(<DatabasePage />);
    await user.click(screen.getByRole('tab', { name: /echoes/i }));

    await user.click(await screen.findByText('Hooscamp'));
    expect(await screen.findByText(/cost 1/i)).toBeInTheDocument();
    // 1-cost tier pool: small stats only, no Crit stats (docs/echostats.md §1).
    expect(screen.getByText(/ATK%/)).toBeInTheDocument();
    expect(screen.queryByText(/crit rate/i)).not.toBeInTheDocument();
  });

  it('shows element-less echoes without an element', async () => {
    const user = userEvent.setup();
    render(<DatabasePage />);
    await user.click(screen.getByRole('tab', { name: /echoes/i }));

    // Diamondclaw is element-less (provider element Id 0, not a real element).
    await user.click(await screen.findByText('Diamondclaw'));
    expect(await screen.findByText(/no element/i)).toBeInTheDocument();
  });

  it('browses sonata sets with structured badges', async () => {
    const user = userEvent.setup();
    render(<DatabasePage />);
    await user.click(screen.getByRole('tab', { name: /sonata/i }));

    await user.click(await screen.findByText('Sierra Gale'));
    expect(await screen.findByText(/2-piece/i)).toBeInTheDocument();
  });
});

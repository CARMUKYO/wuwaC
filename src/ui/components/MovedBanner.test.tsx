import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../state/store.ts';

const downloadBackup = vi.fn();
vi.mock('../download.ts', () => ({ downloadBackup: () => downloadBackup() }));

import { MovedBanner } from './MovedBanner.tsx';

const TARGET = 'https://wuwa-opt.github.io/wuwaC/';

beforeEach(() => {
  downloadBackup.mockReset();
  useAppStore.setState({ shareLink: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('MovedBanner', () => {
  it('renders nothing on the live site', () => {
    vi.stubEnv('VITE_MOVED_TO', '');
    const { container } = render(<MovedBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the variable is malformed (the build would have refused it)', () => {
    vi.stubEnv('VITE_MOVED_TO', 'http://elsewhere.example/');
    const { container } = render(<MovedBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('points at the configured site and offers a backup export', async () => {
    vi.stubEnv('VITE_MOVED_TO', TARGET);
    downloadBackup.mockResolvedValue({});
    const user = userEvent.setup();
    render(<MovedBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(/has moved to/i);
    expect(screen.getByRole('link', { name: 'Go to the new site' })).toHaveAttribute('href', TARGET);
    await user.click(screen.getByRole('button', { name: 'Export backup' }));
    expect(downloadBackup).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/backup downloaded/i)).toBeInTheDocument();
  });

  it('shows a failed export instead of swallowing it', async () => {
    vi.stubEnv('VITE_MOVED_TO', TARGET);
    downloadBackup.mockRejectedValue(new Error('disk full'));
    const user = userEvent.setup();
    render(<MovedBanner />);
    await user.click(screen.getByRole('button', { name: 'Export backup' }));
    expect(await screen.findByText('disk full')).toBeInTheDocument();
  });

  it('offers a pending share link on the new site with the same fragment, and only then', () => {
    vi.stubEnv('VITE_MOVED_TO', TARGET);
    const { rerender } = render(<MovedBanner />);
    expect(screen.queryByRole('link', { name: /shared build/i })).not.toBeInTheDocument();
    useAppStore.setState({ shareLink: '#b=2.AbC-_9' });
    rerender(<MovedBanner />);
    expect(screen.getByRole('link', { name: /shared build on the new site/i })).toHaveAttribute(
      'href',
      `${TARGET}#b=2.AbC-_9`,
    );
  });

  it('never derives the target from the page', () => {
    vi.stubEnv('VITE_MOVED_TO', TARGET);
    useAppStore.setState({ shareLink: '#b=2.x' });
    render(<MovedBanner />);
    for (const link of screen.getAllByRole('link')) {
      expect(new URL(link.getAttribute('href') ?? '').origin).toBe(new URL(TARGET).origin);
    }
  });
});

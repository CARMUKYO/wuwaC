import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GameIcon } from './GameIcon.tsx';

describe('GameIcon', () => {
  it('renders the remote image when a url is given', () => {
    render(<GameIcon name="Jiyan" iconUrl="https://example.com/jiyan.webp" />);
    const img = screen.getByRole('presentation', { hidden: true });
    expect(img).toHaveAttribute('src', 'https://example.com/jiyan.webp');
  });

  it('falls back to initials without a url', () => {
    render(<GameIcon name="Jiyan" />);
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('falls back to initials when the image fails to load', () => {
    render(<GameIcon name="Jiyan" iconUrl="https://example.com/missing.webp" />);
    fireEvent.error(screen.getByRole('presentation', { hidden: true }));
    expect(screen.getByText('J')).toBeInTheDocument();
  });
});

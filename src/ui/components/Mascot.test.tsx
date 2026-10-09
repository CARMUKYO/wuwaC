import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MASCOT_STILL_URL, MASCOT_URL, Mascot } from './Mascot.tsx';

describe('Mascot', () => {
  // jsdom has no 2D canvas; model that explicitly instead of letting it log.
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the GIF with a reduced-motion still, and no bounce classes', () => {
    const { container } = render(<Mascot />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', MASCOT_URL);
    expect(MASCOT_URL).toMatch(/aemeath-ames\.gif$/);
    const source = container.querySelector('source')!;
    expect(source).toHaveAttribute('media', '(prefers-reduced-motion: reduce)');
    expect(source).toHaveAttribute('srcset', MASCOT_STILL_URL);
    expect(container.querySelector('.hop, .bob, .hop-shadow')).toBeNull();
  });

  it('sizes the banner at 132px and the logo at 44px', () => {
    const banner = render(<Mascot />);
    const bannerImg = banner.container.querySelector('img')!;
    expect(bannerImg).toHaveAttribute('width', '132');
    // Responsive box: 96px on phones, 132px from sm up.
    expect(bannerImg.closest('[data-paused]')).toHaveClass('size-24', 'sm:size-[132px]');
    banner.unmount();
    const logo = render(<Mascot variant="logo" />);
    expect(logo.container.querySelector('img')).toHaveAttribute('width', '44');
  });

  it('falls back to the pixel placeholder when the image fails to load', () => {
    const { container } = render(<Mascot />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('pauses on mouse hover and resumes on leave', () => {
    const { container } = render(<Mascot />);
    const box = container.querySelector('[data-paused]')!;
    fireEvent.pointerEnter(box, { pointerType: 'mouse' });
    expect(box).toHaveAttribute('data-paused', 'true');
    // jsdom has no canvas, so the pause falls back to the still frame.
    expect(container.querySelector('img')).toHaveAttribute('src', MASCOT_STILL_URL);
    fireEvent.pointerLeave(box, { pointerType: 'mouse' });
    expect(box).toHaveAttribute('data-paused', 'false');
    expect(container.querySelector('img')).toHaveAttribute('src', MASCOT_URL);
  });

  it('toggles pause on tap for touch input', () => {
    const { container } = render(<Mascot />);
    const box = container.querySelector('[data-paused]')!;
    fireEvent.pointerUp(box, { pointerType: 'touch' });
    expect(box).toHaveAttribute('data-paused', 'true');
    fireEvent.pointerUp(box, { pointerType: 'touch' });
    expect(box).toHaveAttribute('data-paused', 'false');
  });
});

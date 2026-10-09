import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MASCOT_STILL_URL, MASCOT_URL, Mascot } from './Mascot.tsx';

describe('Mascot', () => {
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
    expect(banner.container.querySelector('img')).toHaveAttribute('width', '132');
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
});

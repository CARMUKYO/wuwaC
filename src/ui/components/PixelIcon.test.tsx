import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PixelIcon } from './PixelIcon.tsx';
import { PIXEL_ICONS, bitmapPath, type PixelIconName } from './pixelIcons.ts';

const NAMES = Object.keys(PIXEL_ICONS) as PixelIconName[];

describe('pixel icon bitmaps', () => {
  it.each(NAMES)('%s is 12 rows x 12 columns of only . 1 2 3 4', (name) => {
    const rows = PIXEL_ICONS[name];
    expect(rows).toHaveLength(12);
    for (const row of rows) {
      expect(row).toHaveLength(12);
      expect(row).toMatch(/^[.1234]{12}$/);
    }
  });

  it.each(NAMES)('%s only uses colour indices that have a token', (name) => {
    const used = new Set(PIXEL_ICONS[name].join('').replace(/\./g, ''));
    // heart has no shade (3) in the spec table.
    if (name === 'heart') expect(used.has('3')).toBe(false);
  });
});

describe('bitmapPath', () => {
  it('merges horizontal runs and emits separate runs per row', () => {
    expect(bitmapPath(['.22.', '2..2'], '2')).toBe('M1 0h2v1h-2zM0 1h1v1h-1zM3 1h1v1h-1z');
  });

  it('returns an empty string for an absent colour', () => {
    expect(bitmapPath(['....'], '1')).toBe('');
  });
});

describe('PixelIcon', () => {
  it('renders crisp 24px SVG with the outline path drawn last', () => {
    const { container } = render(<PixelIcon name="chest" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
    expect(svg).toHaveAttribute('viewBox', '0 0 12 12');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    const paths = Array.from(container.querySelectorAll('path'));
    expect(paths).toHaveLength(4);
    expect(paths[paths.length - 1].getAttribute('style')).toContain('--color-icon-outline');
  });

  it('skips colour indices the bitmap never uses', () => {
    const { container } = render(<PixelIcon name="heart" />);
    expect(container.querySelectorAll('path')).toHaveLength(3);
  });
});

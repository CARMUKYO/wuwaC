import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FrequencyStrip, MotifEmptyState } from './motif.tsx';

describe('FrequencyStrip', () => {
  it('renders one bar per count and hides from assistive tech', () => {
    const { container } = render(<FrequencyStrip seed="inventory" bars={12} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.querySelectorAll('rect')).toHaveLength(12);
  });

  it('draws the same wave for the same seed', () => {
    const first = render(<FrequencyStrip seed="roster" bars={16} />);
    const ys = Array.from(first.container.querySelectorAll('rect')).map((r) =>
      r.getAttribute('y'),
    );
    first.unmount();
    const second = render(<FrequencyStrip seed="roster" bars={16} />);
    const ysAgain = Array.from(second.container.querySelectorAll('rect')).map((r) =>
      r.getAttribute('y'),
    );
    expect(ysAgain).toEqual(ys);
    // …and a different wave for a different seed.
    second.unmount();
    const third = render(<FrequencyStrip seed="teams" bars={16} />);
    const ysOther = Array.from(third.container.querySelectorAll('rect')).map((r) =>
      r.getAttribute('y'),
    );
    expect(ysOther).not.toEqual(ys);
  });
});

describe('MotifEmptyState', () => {
  it('renders art plus message', () => {
    const { container } = render(<MotifEmptyState seed="empty">Nothing here yet.</MotifEmptyState>);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });
});

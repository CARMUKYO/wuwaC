import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CostPips, SegmentMeter, Window } from './ui.tsx';

describe('Window', () => {
  it('labels the section from its string title and renders the title bar', () => {
    render(<Window title="Echo Box">body</Window>);
    const win = screen.getByRole('region', { name: 'Echo Box' });
    expect(win).toHaveClass('px-frame');
    expect(screen.getByRole('heading', { name: 'Echo Box' })).toHaveClass('font-display');
    expect(win).toHaveTextContent('body');
  });

  it('uses the pink bar for bar="b" and omits the bar without title/actions', () => {
    const { rerender, container } = render(
      <Window title="Status" bar="b">
        x
      </Window>,
    );
    expect(screen.getByRole('heading', { name: 'Status' }).parentElement).toHaveClass('bg-bar-b');
    rerender(<Window label="Plain">x</Window>);
    expect(container.querySelector('.border-b-\\[3px\\]')).toBeNull();
  });
});

describe('SegmentMeter', () => {
  it('renders `total` blocks with the first `filled` lit', () => {
    render(<SegmentMeter filled={7} total={10} label="Roll value 70" />);
    const blocks = screen.getByRole('img', { name: 'Roll value 70' }).children;
    expect(blocks).toHaveLength(10);
    expect(Array.from(blocks).filter((b) => b.className.includes('bg-meter'))).toHaveLength(7);
  });

  it('rounds and clamps filled to 0..total', () => {
    const { rerender } = render(<SegmentMeter filled={99} total={4} size="tier" label="tier" />);
    expect(screen.getByRole('img').querySelectorAll('.bg-meter')).toHaveLength(4);
    rerender(<SegmentMeter filled={-3} total={4} size="tier" label="tier" />);
    expect(screen.getByRole('img').querySelectorAll('.bg-meter')).toHaveLength(0);
    rerender(<SegmentMeter filled={2.6} total={4} size="tier" label="tier" />);
    expect(screen.getByRole('img').querySelectorAll('.bg-meter')).toHaveLength(3);
  });
});

describe('CostPips', () => {
  it('lights `cost` of 4 pips', () => {
    const { container } = render(<CostPips cost={3} />);
    expect(container.querySelectorAll('.bg-pip')).toHaveLength(3);
    expect(container.querySelectorAll('.bg-panel-3')).toHaveLength(1);
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AnimatedNumber,
  DeltaChip,
  ScoreBar,
  Skeleton,
  ToastStack,
} from './feedback.tsx';
import { useToasts } from '../toasts.ts';

describe('AnimatedNumber', () => {
  it('renders the formatted target on first paint', () => {
    render(<AnimatedNumber value={1234567.8} />);
    expect(screen.getByText('1,234,568')).toBeInTheDocument();
  });

  it('accepts a custom format', () => {
    render(<AnimatedNumber value={9.5} format={(n) => `${n.toFixed(1)}s`} />);
    expect(screen.getByText('9.5s')).toBeInTheDocument();
  });
});

describe('DeltaChip', () => {
  it('shows gains in tide and losses in ember', () => {
    const { rerender } = render(<DeltaChip current={110} previous={100} />);
    expect(screen.getByText(/10\.0%/)).toHaveClass('text-tide');
    rerender(<DeltaChip current={90} previous={100} />);
    expect(screen.getByText(/10\.0%/)).toHaveClass('text-ember');
  });

  it('hides flat, zero-base, and non-finite deltas', () => {
    const { container, rerender } = render(<DeltaChip current={100} previous={100} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<DeltaChip current={50} previous={0} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<DeltaChip current={NaN} previous={100} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ScoreBar', () => {
  it('clamps the fill to 0–100%', () => {
    const { container, rerender } = render(<ScoreBar share={140} />);
    expect(container.querySelector('.score-bar-fill')).toHaveStyle({ width: '100%' });
    rerender(<ScoreBar share={-20} />);
    expect(container.querySelector('.score-bar-fill')).toHaveStyle({ width: '0%' });
  });
});

describe('Skeleton', () => {
  it('announces loading with placeholder rows', () => {
    const { container } = render(<Skeleton lines={2} />);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton')).toHaveLength(2);
  });
});

describe('ToastStack', () => {
  it('renders the stack with dismiss buttons', async () => {
    const user = userEvent.setup();
    function Harness() {
      const { toasts, push, dismiss } = useToasts();
      return (
        <>
          <button type="button" onClick={() => push('Hello.')}>push</button>
          <ToastStack toasts={toasts} onDismiss={dismiss} />
        </>
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'push' }));
    expect(screen.getByText('Hello.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dismiss: hello/i }));
    expect(screen.queryByText('Hello.')).not.toBeInTheDocument();
  });
});

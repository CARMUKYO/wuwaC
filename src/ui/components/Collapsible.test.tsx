import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Collapsible } from './Collapsible.tsx';

describe('Collapsible', () => {
  it('toggles the body on click', async () => {
    const user = userEvent.setup();
    render(<Collapsible title="Forte nodes">node list</Collapsible>);
    const toggle = screen.getByRole('button', { name: /forte nodes/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('node list')).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('node list')).toBeInTheDocument();
  });

  it('respects controlled open state', () => {
    render(
      <Collapsible title="Details" open>
        shown
      </Collapsible>,
    );
    expect(screen.getByRole('button', { name: /details/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('shown')).toBeInTheDocument();
  });
});

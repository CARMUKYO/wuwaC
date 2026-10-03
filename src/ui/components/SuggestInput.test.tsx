import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuggestInput } from './SuggestInput.tsx';

const SUGGESTIONS = [
  { value: 'jiyan', label: 'Jiyan', hint: 'Aero' },
  { value: 'yinlin', label: 'Yinlin', hint: 'Electro' },
];

function Harness() {
  const [value, setValue] = useState('');
  return (
    <SuggestInput id="s" label="Member 1" value={value} suggestions={SUGGESTIONS} onChange={setValue} />
  );
}

describe('SuggestInput', () => {
  it('keeps typed text as the value even without a match', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('combobox'), 'custom-id');
    expect(screen.getByRole('combobox')).toHaveValue('custom-id');
    expect(screen.getByText(/custom ids still work/i)).toBeInTheDocument();
  });

  it('fills a suggestion on Enter', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('combobox');
    await user.click(box);
    await user.type(box, 'yin');
    expect(screen.getByRole('option', { name: /yinlin/i })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(box).toHaveValue('yinlin');
  });
});

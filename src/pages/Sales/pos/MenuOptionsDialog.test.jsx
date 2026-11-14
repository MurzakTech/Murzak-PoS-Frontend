import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuOptionsDialog from './MenuOptionsDialog';

const GROUPS = [
  { name: 'How cooked', required: true, multiple: false, choices: [{ name: 'Rare', price: 0 }, { name: 'Well done', price: 0 }] },
  { name: 'Extras', required: false, multiple: true, choices: [{ name: 'Extra cheese', price: 50 }] },
];

test('the dish is added only once a required group is chosen, at its price with the extras', async () => {
  const onAdd = jest.fn();
  render(<MenuOptionsDialog open product={{ item_code: 'BURGER', item_name: 'Beef burger' }} groups={GROUPS} basePrice={650} onAdd={onAdd} onClose={jest.fn()} />);
  expect(screen.getByText('Beef burger')).toBeInTheDocument();
  const add = screen.getByRole('button', { name: /^Add/ });
  expect(add).toBeDisabled();
  expect(screen.getByText(/Choose How cooked to add this/)).toBeInTheDocument();

  await userEvent.click(screen.getByText('Well done'));
  await userEvent.click(screen.getByText(/Extra cheese/));
  expect(add).toBeEnabled();
  expect(add).toHaveTextContent('700');
  await userEvent.click(add);
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ extra: 50, text: 'Well done; Extra cheese (+50)' }));
});

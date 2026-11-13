import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuOptionsCard from './MenuOptionsCard';

test('the dish shows its options, and an added group is saved as a list of choices', async () => {
  const load = jest.fn().mockResolvedValue({ BURGER: [{ name: 'How cooked', required: true, multiple: false, choices: [{ name: 'Rare', price: 0 }] }] });
  const save = jest.fn().mockImplementation(async ({ groups }) => ({ groups: groups.map((g) => ({ ...g, choices: g.choices.map((c) => ({ name: c.replace(/ \+.*/, ''), price: c.includes('+') ? 50 : 0 })) })) }));
  render(<MenuOptionsCard code="BURGER" company="Bar Ltd" load={load} save={save} />);
  expect(await screen.findByDisplayValue('How cooked')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Add a group' }));
  const names = screen.getAllByLabelText('Group name');
  await userEvent.type(names[1], 'Extras');
  const choices = screen.getAllByLabelText('Choices');
  await userEvent.type(choices[1], 'Extra cheese +50, Bacon');
  await userEvent.click(screen.getByRole('button', { name: 'Save menu options' }));

  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0].groups[1]).toEqual({ name: 'Extras', required: false, multiple: false, choices: ['Extra cheese +50', 'Bacon'] });
  expect(await screen.findByText('Menu options saved.')).toBeInTheDocument();
});

test('a dish with no options says most need none', async () => {
  render(<MenuOptionsCard code="TEA" load={jest.fn().mockResolvedValue({})} save={jest.fn()} />);
  expect(await screen.findByText(/Most dishes need none/)).toBeInTheDocument();
});

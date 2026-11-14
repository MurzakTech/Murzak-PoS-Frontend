import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InsuranceDialog, InsuranceToolbar } from './InsuranceDialog';

const INSURERS = [{ name: 'AAR', copay_percent: 10, copay_amount: 200, customer: 'AAR Insurance' }];

test('the cashier bills the insurer with the card details and sees the split', async () => {
  const onSave = jest.fn();
  render(<InsuranceDialog open insurers={INSURERS} total={5000} onSave={onSave} onClose={jest.fn()} />);
  expect(screen.getByRole('status')).toHaveTextContent('Patient pays now: KES 500');
  expect(screen.getByRole('status')).toHaveTextContent('AAR owes: KES 4,500');
  const bill = screen.getByRole('button', { name: 'Bill to AAR' });
  expect(bill).toBeDisabled();
  await userEvent.type(screen.getByLabelText(/Patient's name/), 'Wanjiru Kamau');
  await userEvent.type(screen.getByLabelText(/Member number/), 'AAR-123');
  await userEvent.click(bill);
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ insurer: 'AAR', customer: 'AAR Insurance', patient: 'Wanjiru Kamau', member_no: 'AAR-123' }));
});

test('without credit sales switched on, or without insurers, the bill cannot go to an insurer', () => {
  const { rerender } = render(<InsuranceDialog open insurers={INSURERS} value={{ insurer: 'AAR', patient: 'W', member_no: '1' }} total={100} creditReady={false} onSave={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText(/Credit sales are switched off/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bill to AAR' })).toBeDisabled();
  rerender(<InsuranceDialog open insurers={[]} total={100} onSave={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText(/No insurers are set/)).toBeInTheDocument();
});

test('the toolbar shows the insurer on the bill and takes it off', async () => {
  const onClear = jest.fn();
  render(<InsuranceToolbar insurance={{ insurer: 'AAR', member_no: 'AAR-123' }} onOpen={jest.fn()} onClear={onClear} />);
  expect(screen.getByRole('button', { name: 'Change insurance' })).toBeInTheDocument();
  await userEvent.click(screen.getByTestId('CancelIcon'));
  expect(onClear).toHaveBeenCalled();
});

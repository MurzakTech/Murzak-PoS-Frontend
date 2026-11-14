import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PayoutSection from './PayoutSection';

const PLAN = {
  matched: [{ invoice: 'POS-1', ref: 'GL-1' }, { invoice: 'POS-2', ref: 'GL-2' }],
  already_settled: [{ invoice: 'POS-0', ref: 'GL-0' }],
  not_found: ['GL-9'],
  summary: { orders: 2, sales: 2000, received: 1450, commission_percent: 25, expected_commission: 500, actual_commission: 550, difference: 50 },
};

const makeApi = () => ({
  listPayouts: jest.fn().mockResolvedValue({ payouts: [] }),
  listUnsettledOrders: jest.fn().mockResolvedValue({ orders: [{}, {}, {}], total: 2300, without_number: 1 }),
  checkPayout: jest.fn().mockResolvedValue(PLAN),
  recordPayout: jest.fn().mockResolvedValue({ payout: 'PAY-1', ...PLAN }),
});

test('a payout is checked, shows what the platform kept, then is recorded', async () => {
  const api = makeApi();
  render(<PayoutSection company="Cafe Ltd" platforms={['Glovo']} api={api} />);
  expect(await screen.findByText(/3 orders not yet paid out/)).toBeInTheDocument();
  const record = screen.getByRole('button', { name: 'Record payout' });
  expect(record).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Order numbers on the statement'), 'GL-1{enter}GL-2{enter}GL-0{enter}GL-9');
  await userEvent.type(screen.getByLabelText('Amount paid'), '1450');
  await userEvent.click(screen.getByRole('button', { name: 'Check' }));
  await waitFor(() => expect(api.checkPayout).toHaveBeenCalledWith({ platform: 'Glovo', orderRefs: 'GL-1\nGL-2\nGL-0\nGL-9', amount: 1450, company: 'Cafe Ltd' }));
  expect(await screen.findByText(/kept KES 50 more than agreed/)).toBeInTheDocument();
  expect(screen.getByText('Not found in the POS: GL-9')).toBeInTheDocument();
  expect(screen.getByText('Already paid out in an earlier payout: GL-0')).toBeInTheDocument();
  await userEvent.click(record);
  await waitFor(() => expect(api.recordPayout).toHaveBeenCalled());
  expect(await screen.findByText('Payout recorded. 2 orders are marked as paid out.')).toBeInTheDocument();
});

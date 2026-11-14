import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClaimsPage from './ClaimsPage';

jest.mock('../../utils/getUserCompany', () => ({ getUserCompany: () => 'Chemist Ltd' }));
jest.mock('../shell', () => ({ PageHeader: ({ title }) => <h1>{title}</h1> }));

const CLAIMS = {
  claims: [
    { invoice: 'POS-1', date: '2026-11-10', insurer: 'AAR', patient: 'Wanjiru', member_no: 'A-1', copay: 500, insurer_share: 4500, status: 'To claim' },
    { invoice: 'POS-2', date: '2026-11-09', insurer: 'AAR', patient: 'Otieno', member_no: 'A-2', copay: 200, insurer_share: 800, status: 'Claimed' },
  ],
  by_status: { 'To claim': 4500, Claimed: 800 },
  insurers: ['AAR'],
};

const makeApi = () => ({
  getClaims: jest.fn().mockResolvedValue(CLAIMS),
  listReceiveModes: jest.fn().mockResolvedValue(['Bank Transfer']),
  markClaimed: jest.fn().mockResolvedValue({ claimed: ['POS-1'] }),
  recordInsurerPayment: jest.fn().mockResolvedValue({ payments: [{ invoice: 'POS-1' }, { invoice: 'POS-2' }] }),
  setClaimRejected: jest.fn().mockResolvedValue({}),
});

test('claims are chosen, marked as sent, and an insurer payment is shared over them', async () => {
  const api = makeApi();
  render(<ClaimsPage api={api} />);
  const table = await screen.findByRole('table');
  await waitFor(() => expect(within(table).getByText('Wanjiru')).toBeInTheDocument());
  await userEvent.click(screen.getByLabelText('Choose POS-1'));
  expect(screen.getByText(/1 chosen/)).toHaveTextContent('4,500');
  await userEvent.type(screen.getByLabelText('Claim or batch number'), 'BATCH-11');
  await userEvent.click(screen.getByRole('button', { name: 'Mark as claimed' }));
  await waitFor(() => expect(api.markClaimed).toHaveBeenCalledWith({ invoices: ['POS-1'], claimRef: 'BATCH-11', company: 'Chemist Ltd' }));
  expect(await screen.findByText('1 claims marked as sent.')).toBeInTheDocument();

  await userEvent.click(screen.getByLabelText('Choose POS-1'));
  await userEvent.click(screen.getByLabelText('Choose POS-2'));
  await userEvent.type(screen.getByLabelText('Amount the insurer paid'), '5000');
  await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
  await waitFor(() => expect(api.recordInsurerPayment).toHaveBeenCalledWith(expect.objectContaining({ invoices: ['POS-1', 'POS-2'], amount: 5000, mode: 'Bank Transfer' })));
  expect(await screen.findByText('Payment recorded on 2 claims.')).toBeInTheDocument();
});

test('nothing chosen says so instead of calling the server', async () => {
  const api = makeApi();
  render(<ClaimsPage api={api} />);
  await screen.findByText('Wanjiru');
  await userEvent.click(screen.getByRole('button', { name: 'Mark as claimed' }));
  expect(await screen.findByText('Choose one or more claims first.')).toBeInTheDocument();
  expect(api.markClaimed).not.toHaveBeenCalled();
});

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import GatewayPayment from './GatewayPayment';
import * as api from '../../../api/paymentGatewayApi';
import * as realtime from '../../../realtime/realtimeClient';

jest.mock('../../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../../realtime/realtimeClient');
jest.mock('qrcode.react', () => ({ QRCodeSVG: () => <div /> }));
jest.mock('../../../api/paymentGatewayApi', () => ({
  ...jest.requireActual('../../../api/paymentGatewayApi'),
  sendMpesaPrompt: jest.fn(),
  checkMpesaPayment: jest.fn(),
  listUnclaimedMpesaPayments: jest.fn(),
}));

const flush = () => act(async () => { await Promise.resolve(); });

const sendPrompt = async (option = {}) => {
  const onChange = jest.fn();
  render(<GatewayPayment kind="mpesa" option={option} mode="MPESA" amount={100} currency="KES" company="Shop A" saleReference="POS1" customerPhone="0712 345 678" onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: /send .* prompt/i }));
  await flush();
  return onChange;
};

beforeEach(() => {
  realtime.resetRealtime();
  jest.useFakeTimers();
  api.sendMpesaPrompt.mockResolvedValue({ transaction: { transaction_id: 'LOG-1' } });
  api.listUnclaimedMpesaPayments.mockResolvedValue({ transactions: [] });
});
afterEach(() => jest.useRealTimers());

test('a payment message confirms the sale at once, without waiting for the next check', async () => {
  api.checkMpesaPayment.mockResolvedValue({ transaction: { transaction_id: 'LOG-1', status: 'Success', mpesa_receipt_number: 'RCT9', amount: 100 } });
  const onChange = await sendPrompt();
  expect(api.checkMpesaPayment).not.toHaveBeenCalled();

  await act(async () => { realtime.emit({ kind: 'payment', status: 'Success', company: 'Shop A', name: 'LOG-1' }); });
  await flush();

  expect(api.checkMpesaPayment).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, transactionId: 'LOG-1', reference: 'RCT9' }));
});

test('while the live connection is up the check runs only every 15 seconds', async () => {
  api.checkMpesaPayment.mockResolvedValue({ transaction: { transaction_id: 'LOG-1', status: 'Pending' } });
  await sendPrompt();
  await act(async () => { realtime.setConnected(true); });
  await flush();
  api.checkMpesaPayment.mockClear();

  await act(async () => { jest.advanceTimersByTime(14000); });
  expect(api.checkMpesaPayment).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(api.checkMpesaPayment).toHaveBeenCalledTimes(1);
});

test('two messages in a row never run two checks at the same time', async () => {
  let release;
  api.checkMpesaPayment.mockImplementation(() => new Promise((resolve) => { release = () => resolve({ transaction: { transaction_id: 'LOG-1', status: 'Pending' } }); }));
  await sendPrompt();

  await act(async () => {
    realtime.emit({ kind: 'payment', status: 'Failed', company: 'Shop A' });
    realtime.emit({ kind: 'payment', status: 'Failed', company: 'Shop A' });
  });
  expect(api.checkMpesaPayment).toHaveBeenCalledTimes(1);
  await act(async () => { release(); await Promise.resolve(); });
  await flush();
  expect(api.checkMpesaPayment).toHaveBeenCalledTimes(2); // one more, to catch what arrived meanwhile
});

test('the list of payments made straight to the till updates when the server hears of one', async () => {
  render(<GatewayPayment kind="mpesa" option={{ c2b_enabled: 1, pay_to: '654321', pay_to_type: 'Till' }} mode="MPESA" amount={100} currency="KES" company="Shop A" saleReference="POS1" onChange={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /customer already paid/i }));
  await flush();
  const before = api.listUnclaimedMpesaPayments.mock.calls.length;

  await act(async () => { realtime.emit({ kind: 'payment', status: 'Success', company: 'Shop A', gateway: 'M-Pesa' }); });
  await flush();
  expect(api.listUnclaimedMpesaPayments.mock.calls.length).toBe(before + 1);
});

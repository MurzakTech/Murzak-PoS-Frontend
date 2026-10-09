import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import GatewayPayment from './GatewayPayment';
import * as api from '../../../api/paymentGatewayApi';

jest.mock('../../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('qrcode.react', () => ({ QRCodeSVG: ({ value }) => <div data-testid="qr">{value}</div> }));
jest.mock('../../../api/paymentGatewayApi', () => {
  const actual = jest.requireActual('../../../api/paymentGatewayApi');
  return {
    ...actual,
    sendMpesaPrompt: jest.fn(),
    checkMpesaPayment: jest.fn(),
    findMpesaPaymentByCode: jest.fn(),
    listUnclaimedMpesaPayments: jest.fn(() => Promise.resolve({ transactions: [] })),
    createGatewayCheckout: jest.fn(),
    checkGatewayPayment: jest.fn(),
    cancelGatewayPayment: jest.fn(),
  };
});

const flush = () => act(async () => { await Promise.resolve(); });

const renderMpesa = (props = {}) => {
  const onChange = jest.fn();
  render(
    <GatewayPayment
      kind="mpesa"
      option={{ allow_manual_code: 1, pay_to: '654321', pay_to_type: 'Till' }}
      mode="MPESA"
      amount={99.5}
      currency="KES"
      company="Shop A"
      saleReference="POS1"
      customerPhone="0712 345 678"
      onChange={onChange}
      {...props}
    />
  );
  return onChange;
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

test('M-Pesa prompt: sends the rounded amount and confirms once the customer pays', async () => {
  api.sendMpesaPrompt.mockResolvedValue({ transaction: { transaction_id: 'LOG-1' } });
  api.checkMpesaPayment
    .mockResolvedValueOnce({ transaction: { transaction_id: 'LOG-1', status: 'Pending' } })
    .mockResolvedValueOnce({ transaction: { transaction_id: 'LOG-1', status: 'Success', mpesa_receipt_number: 'RCT9', amount: 100 } });
  const onChange = renderMpesa();

  expect(screen.getByText(/rounded up to/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /send .*100.* prompt/i }));
  await flush();

  expect(api.sendMpesaPrompt).toHaveBeenCalledWith({ company: 'Shop A', phoneNumber: '254712345678', amount: 100, reference: 'POS1' });
  expect(screen.getByText(/enter their M-Pesa PIN/i)).toBeInTheDocument();

  await act(async () => { jest.advanceTimersByTime(3000); });
  await flush();
  expect(onChange).not.toHaveBeenCalled();

  await act(async () => { jest.advanceTimersByTime(3000); });
  await flush();
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, transactionId: 'LOG-1', reference: 'RCT9', amount: 100 }));
});

test('M-Pesa prompt: a cancelled prompt shows why and offers to send again', async () => {
  api.sendMpesaPrompt.mockResolvedValue({ transaction: { transaction_id: 'LOG-2' } });
  api.checkMpesaPayment.mockResolvedValue({ transaction: { transaction_id: 'LOG-2', status: 'Cancelled', message: 'The customer cancelled the M-Pesa prompt' } });
  const onChange = renderMpesa();

  fireEvent.click(screen.getByRole('button', { name: /send .* prompt/i }));
  await flush();
  await act(async () => { jest.advanceTimersByTime(3000); });
  await flush();

  expect(screen.getByText('The customer cancelled the M-Pesa prompt')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /send prompt again/i })).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

test('M-Pesa: an invalid phone number cannot be prompted', () => {
  renderMpesa({ customerPhone: '' });
  fireEvent.change(screen.getByLabelText(/M-Pesa number/i), { target: { value: '12345' } });
  expect(screen.getByRole('button', { name: /send .* prompt/i })).toBeDisabled();
});

test('M-Pesa code: an unknown code can be recorded only after a deliberate confirmation', async () => {
  api.findMpesaPaymentByCode.mockRejectedValue(new Error('No M-Pesa payment with code SJK4H7Q2XP has reached this business yet.'));
  const onChange = renderMpesa();

  fireEvent.click(screen.getByRole('button', { name: /customer already paid/i }));
  fireEvent.change(screen.getByLabelText(/M-Pesa code/i), { target: { value: 'sjk4h7q2xp' } });
  fireEvent.click(screen.getByRole('button', { name: /check code/i }));
  await flush();

  expect(screen.getByText(/has reached this business yet/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /record SJK4H7Q2XP/i }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, reference: 'SJK4H7Q2XP' }));
  expect(onChange.mock.calls[0][0].transactionId).toBeUndefined();
});

test('M-Pesa code: a payment already used on another sale is refused', async () => {
  api.findMpesaPaymentByCode.mockResolvedValue({ already_used: true, transaction: { invoice: 'POS-0007' } });
  const onChange = renderMpesa();

  fireEvent.click(screen.getByRole('button', { name: /customer already paid/i }));
  fireEvent.change(screen.getByLabelText(/M-Pesa code/i), { target: { value: 'RCT12345' } });
  fireEvent.click(screen.getByRole('button', { name: /check code/i }));
  await flush();

  expect(screen.getByText(/already used on sale POS-0007/i)).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

test('Pesapal: shows a QR code for the payment link and confirms when paid', async () => {
  api.createGatewayCheckout.mockResolvedValue({
    transaction: { transaction_id: 'PGT-1', checkout_url: 'https://pay.pesapal.test/abc', currency: 'KES', charged_currency: 'KES', charged_amount: 500 },
  });
  api.checkGatewayPayment.mockResolvedValue({ transaction: { transaction_id: 'PGT-1', status: 'Success', confirmation_code: 'PSP1', amount: 500, payment_method: 'Visa' } });
  const onChange = jest.fn();
  render(<GatewayPayment kind="pesapal" mode="Pesapal" amount={500} currency="KES" company="Shop A" saleReference="POS2" customerPhone="0712345678" onChange={onChange} />);

  fireEvent.click(screen.getByRole('button', { name: /show pesapal qr code/i }));
  await flush();
  expect(screen.getByTestId('qr')).toHaveTextContent('https://pay.pesapal.test/abc');

  await act(async () => { jest.advanceTimersByTime(3000); });
  await flush();
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, transactionId: 'PGT-1', reference: 'PSP1', label: 'Pesapal (Visa)' }));
});

test('Bank: needs a reference before the payment is recorded', () => {
  const onChange = jest.fn();
  render(<GatewayPayment kind="bank" mode="Equity Bank" amount={2500} currency="KES" onChange={onChange} />);
  const record = screen.getByRole('button', { name: /record payment/i });
  expect(record).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Equity Bank reference/i), { target: { value: 'ft2310abc' } });
  fireEvent.click(record);
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, reference: 'FT2310ABC', amount: 2500 }));
});

test('M-Pesa prompt: a prompt already waiting is resumed, not sent twice', async () => {
  api.sendMpesaPrompt.mockResolvedValue({
    reused: true,
    message: 'A prompt is already waiting on 254712345678.',
    transaction: { transaction_id: 'LOG-OLD', status: 'Pending' },
  });
  api.checkMpesaPayment.mockResolvedValue({ transaction: { transaction_id: 'LOG-OLD', status: 'Success', mpesa_receipt_number: 'RCT5', amount: 100 } });
  const onChange = renderMpesa();

  fireEvent.click(screen.getByRole('button', { name: /send .* prompt/i }));
  await flush();
  expect(screen.getByText(/already waiting on 254712345678/i)).toBeInTheDocument();

  await act(async () => { jest.advanceTimersByTime(3000); });
  await flush();
  expect(api.checkMpesaPayment).toHaveBeenCalledWith('LOG-OLD');
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'LOG-OLD', reference: 'RCT5' }));
});

test('M-Pesa prompt: a payment already received is confirmed at once', async () => {
  api.sendMpesaPrompt.mockResolvedValue({
    reused: true,
    transaction: { transaction_id: 'LOG-PAID', status: 'Success', mpesa_receipt_number: 'RCT6', amount: 100 },
  });
  const onChange = renderMpesa();

  fireEvent.click(screen.getByRole('button', { name: /send .* prompt/i }));
  await flush();
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, transactionId: 'LOG-PAID', reference: 'RCT6' }));
  expect(api.checkMpesaPayment).not.toHaveBeenCalled();
});

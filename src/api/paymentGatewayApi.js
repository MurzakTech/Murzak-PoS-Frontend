import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * Payment gateways: M-Pesa (Daraja), Pesapal, PayPal and bank payments.
 *
 * Every business keeps its own keys on the server (Settings > Payment Gateways), so the same
 * POS build works for every client. Secrets never come back to the browser: the server
 * returns "***" for a saved secret, and sending "***" back leaves it unchanged.
 */

const MPESA = 'techsavanna_pos.api.mpesa_api';
const GATEWAYS = 'techsavanna_pos.api.payment_gateway_api';

export const SAVED_SECRET = '***';

// Frappe wraps return values in { message }. Our endpoints answer { success, message, ... }.
const call = async (method, data = {}, { get = false } = {}) => {
  let response;
  try {
    response = get
      ? await axiosInstance.get(method, { params: data })
      : await axiosInstance.post(method, data);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const body = response.data?.message ?? response.data;
  if (body && body.success === false) {
    const err = new Error(humanizeMessage(body.message, 'The payment provider refused the request.'));
    err.body = body;
    throw err;
  }
  return body;
};

// ---------------------------------------------------------------------------
// Settings screen
// ---------------------------------------------------------------------------

export const getPaymentGateways = (company) => call(`${GATEWAYS}.get_payment_gateways`, { company }, { get: true });

export const saveMpesaSettings = (company, settings) =>
  call(`${MPESA}.register_mpesa_settings`, { ...settings, company });

export const saveGatewaySettings = (company, gateway, settings) =>
  call(`${GATEWAYS}.save_gateway_settings`, { ...settings, company, gateway });

export const testGateway = (company, gateway) => call(`${GATEWAYS}.test_gateway`, { company, gateway });

export const sendMpesaTestPayment = (company, phoneNumber) =>
  call(`${MPESA}.test_mpesa_connection`, { company, phone_number: phoneNumber });

export const deactivateGateway = (company, gateway) => call(`${GATEWAYS}.deactivate_gateway`, { company, gateway });

// ---------------------------------------------------------------------------
// Till
// ---------------------------------------------------------------------------

/** { options: { [modeOfPayment]: { gateway: 'mpesa'|'pesapal'|'paypal'|'bank', ... } } } */
export const getPosPaymentOptions = (company) =>
  call(`${GATEWAYS}.get_pos_payment_options`, { company }, { get: true });

export const sendMpesaPrompt = ({ company, phoneNumber, amount, reference }) =>
  call(`${MPESA}.initiate_stk_push_payment`, {
    company,
    phone_number: phoneNumber,
    amount,
    reference,
    description: 'POS sale',
  });

export const checkMpesaPayment = (transactionId) =>
  call(`${MPESA}.check_payment_status`, { transaction_id: transactionId }, { get: true });

export const findMpesaPaymentByCode = (company, code) =>
  call(`${MPESA}.find_c2b_payment`, { company, receipt_number: code }, { get: true });

export const listUnclaimedMpesaPayments = (company) =>
  call(`${MPESA}.list_unclaimed_c2b_payments`, { company }, { get: true });

export const createGatewayCheckout = ({ company, gateway, amount, reference, phoneNumber, email, customerName }) =>
  call(`${GATEWAYS}.create_gateway_checkout`, {
    company,
    gateway,
    amount,
    reference,
    phone_number: phoneNumber || undefined,
    email: email || undefined,
    customer_name: customerName || undefined,
  });

export const checkGatewayPayment = (transactionId) =>
  call(`${GATEWAYS}.check_gateway_payment`, { transaction_id: transactionId }, { get: true });

export const cancelGatewayPayment = (transactionId) =>
  call(`${GATEWAYS}.cancel_gateway_payment`, { transaction_id: transactionId });

/** Accepts 0712 345 678, +254712345678, 712345678 ... Returns 2547XXXXXXXX or '' when invalid. */
export const normalizeKenyanPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  let n = '';
  if (digits.startsWith('254') && digits.length === 12) n = digits;
  else if (digits.startsWith('0') && digits.length === 10) n = `254${digits.slice(1)}`;
  else if (digits.length === 9 && /^[17]/.test(digits)) n = `254${digits}`;
  return /^254[17]\d{8}$/.test(n) ? n : '';
};

/** M-Pesa only takes whole shillings; the server rounds up the same way. */
export const mpesaChargeAmount = (amount) => Math.max(1, Math.ceil(Math.round(Number(amount || 0) * 100) / 100));

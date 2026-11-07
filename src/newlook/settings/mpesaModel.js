import { SAVED_SECRET } from '../../api/paymentGatewayApi';

/**
 * M-Pesa settings (Settings, Till and payments): the values of the form, what is missing, and how the status reads. The keys
 * live on the server; a saved secret comes back as "***" and sending "***" back leaves it as it was.
 */

// Safaricom's public test shortcode and passkey, for trying the till before going live
export const DARAJA_SANDBOX = { shortcode: '174379', passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' };

export const MPESA_DEFAULTS = {
  is_active: 1,
  environment: 'Sandbox',
  shortcode_type: 'BuyGoods',
  shortcode: '',
  till_number: '',
  consumer_key: '',
  consumer_secret: '',
  passkey: '',
  payment_account: '',
  account_reference_prefix: '',
  allow_manual_code: 1,
  enable_c2b: 0,
  payment_timeout: 120,
  initiator_name: '',
  security_credential: '',
};

export const SECRET_FIELDS = ['consumer_key', 'consumer_secret', 'passkey', 'security_credential'];

/** The form's values from what the server holds, with the defaults for anything it does not have */
export const fromServer = (data) => {
  const out = { ...MPESA_DEFAULTS };
  if (!data) return out;
  Object.keys(MPESA_DEFAULTS).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) out[key] = data[key];
  });
  return out;
};

/** Which secrets the server already holds (so the form can say "Saved" and not ask for them again) */
export const savedSecrets = (data) => Object.fromEntries(SECRET_FIELDS.map((key) => [key, Boolean(data) && data[key] === SAVED_SECRET]));

/** What the status chip says: notSetUp, off, live or test */
export const statusOf = (settings) => {
  if (!settings) return 'notSetUp';
  if (!settings.is_active) return 'off';
  return settings.environment === 'Production' ? 'live' : 'test';
};

const digits = /^\d+$/;

/** What is wrong with the form: { field: 'key into the words' }. Empty when it can be saved. */
export const problems = (values) => {
  const found = {};
  const has = (key) => String(values[key] || '').trim() !== '';
  if (!has('shortcode')) found.shortcode = 'shortcodeMissing';
  else if (!digits.test(String(values.shortcode).trim())) found.shortcode = 'numberWrong';
  if (has('till_number') && !digits.test(String(values.till_number).trim())) found.till_number = 'numberWrong';
  ['consumer_key', 'consumer_secret', 'passkey'].forEach((key) => {
    if (!has(key)) found[key] = `${key}Missing`;
  });
  if (!has('payment_account')) found.payment_account = 'accountMissing';
  const wait = Number(values.payment_timeout);
  if (!Number.isFinite(wait) || wait < 30 || wait > 600) found.payment_timeout = 'waitWrong';
  return found;
};

/** What is sent to the server: the form with the numbers as numbers and the text trimmed (a saved secret stays "***") */
export const toSave = (values) => ({
  ...values,
  shortcode: String(values.shortcode || '').trim(),
  till_number: String(values.till_number || '').trim(),
  account_reference_prefix: String(values.account_reference_prefix || '').trim(),
  initiator_name: String(values.initiator_name || '').trim(),
  payment_timeout: Number(values.payment_timeout) || MPESA_DEFAULTS.payment_timeout,
});

/** Going live, or turning off the phone prompt's safety net, changes what customers and cashiers meet: ask first */
export const needsAsking = (before, after) => {
  if (before.environment !== 'Production' && after.environment === 'Production') return 'goLive';
  return null;
};

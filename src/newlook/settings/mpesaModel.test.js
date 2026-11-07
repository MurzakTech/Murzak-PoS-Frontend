import { SAVED_SECRET } from '../../api/paymentGatewayApi';
import { MPESA_DEFAULTS, fromServer, needsAsking, problems, savedSecrets, statusOf, toSave } from './mpesaModel';

const GOOD = { ...MPESA_DEFAULTS, shortcode: '174379', consumer_key: 'k', consumer_secret: 's', passkey: 'p', payment_account: 'M-Pesa - LI' };

describe('M-Pesa form values', () => {
  it('start from the defaults and take what the server holds', () => {
    expect(fromServer(null)).toEqual(MPESA_DEFAULTS);
    expect(fromServer({ shortcode: '123456', environment: 'Production', extra: 'ignored' })).toEqual({ ...MPESA_DEFAULTS, shortcode: '123456', environment: 'Production' });
  });

  it('know which secrets are already saved', () => {
    expect(savedSecrets({ consumer_key: SAVED_SECRET, passkey: '', consumer_secret: SAVED_SECRET })).toEqual({ consumer_key: true, consumer_secret: true, passkey: false, security_credential: false });
    expect(savedSecrets(null).consumer_key).toBe(false);
  });
});

describe('M-Pesa status', () => {
  it('reads not set up, off, testing and live', () => {
    expect(statusOf(null)).toBe('notSetUp');
    expect(statusOf({ is_active: 0, environment: 'Production' })).toBe('off');
    expect(statusOf({ is_active: 1, environment: 'Sandbox' })).toBe('test');
    expect(statusOf({ is_active: 1, environment: 'Production' })).toBe('live');
  });
});

describe('M-Pesa problems', () => {
  it('has none for a complete form, and counts a saved secret as present', () => {
    expect(problems(GOOD)).toEqual({});
    expect(problems({ ...GOOD, consumer_key: SAVED_SECRET, consumer_secret: SAVED_SECRET, passkey: SAVED_SECRET })).toEqual({});
  });

  it('names what is missing, in the order of the form', () => {
    expect(Object.keys(problems({ ...MPESA_DEFAULTS }))).toEqual(['shortcode', 'consumer_key', 'consumer_secret', 'passkey', 'payment_account']);
  });

  it('wants the shortcode and the till number to be numbers', () => {
    expect(problems({ ...GOOD, shortcode: 'abc' }).shortcode).toBe('numberWrong');
    expect(problems({ ...GOOD, till_number: '12 34' }).till_number).toBe('numberWrong');
    expect(problems({ ...GOOD, till_number: '' }).till_number).toBeUndefined();
  });

  it('keeps the wait for the customer between 30 and 600 seconds', () => {
    expect(problems({ ...GOOD, payment_timeout: 5 }).payment_timeout).toBe('waitWrong');
    expect(problems({ ...GOOD, payment_timeout: 900 }).payment_timeout).toBe('waitWrong');
    expect(problems({ ...GOOD, payment_timeout: '120' }).payment_timeout).toBeUndefined();
  });
});

describe('M-Pesa saving', () => {
  it('trims the text and sends the wait as a number, leaving a saved secret as it is', () => {
    const sent = toSave({ ...GOOD, shortcode: ' 174379 ', payment_timeout: '90', consumer_key: SAVED_SECRET });
    expect(sent.shortcode).toBe('174379');
    expect(sent.payment_timeout).toBe(90);
    expect(sent.consumer_key).toBe(SAVED_SECRET);
  });

  it('asks before going live, and only then', () => {
    expect(needsAsking({ environment: 'Sandbox' }, { environment: 'Production' })).toBe('goLive');
    expect(needsAsking({ environment: 'Production' }, { environment: 'Production' })).toBeNull();
    expect(needsAsking({ environment: 'Production' }, { environment: 'Sandbox' })).toBeNull();
  });
});

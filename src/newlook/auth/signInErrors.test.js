/**
 * Ticket P5-5: what the server said is turned into our own plain words, and never reveals whether an account exists.
 */
import { plainSignInError } from './signInErrors';
import T from './strings.auth';

const kind = (message, options) => plainSignInError(message, options).kind;

describe('plainSignInError', () => {
  test('a wrong password or email gets one sentence that says what to do', () => {
    const r = plainSignInError('That email, phone number or password is not right. Check them and try again.');
    expect(r).toEqual({ kind: 'credentials', text: T.errors.credentials, field: 'password' });
    expect(T.errors.credentials).toMatch(/not right/);
    expect(T.errors.credentials).toMatch(/try again/);
  });

  test('wrong details, no such account and a switched-off account all read the same (nothing reveals whether the account exists)', () => {
    const samples = ['Invalid email or password', 'User account is disabled', 'Incorrect password', 'AuthenticationError', 'That email, phone number or password is not right. Check them and try again.'];
    const texts = new Set(samples.map((s) => plainSignInError(s).text));
    expect(texts.size).toBe(1);
  });

  test('a locked account says how long to wait, in the right number', () => {
    expect(plainSignInError('Too many failed sign-in attempts. Try again in 12 minutes, or reset your password.').text).toMatch(/Wait 12 minutes/);
    expect(plainSignInError('Too many failed sign-in attempts. Try again in 1 minute, or reset your password.').text).toMatch(/Wait 1 minute,/);
    expect(plainSignInError('Too many failed sign-in attempts.').text).toMatch(/Wait a few minutes/);
    expect(kind('Too many failed sign-in attempts. Try again in 12 minutes, or reset your password.')).toBe('locked');
    expect(plainSignInError('Too many failed sign-in attempts. Try again in 5 minutes.').field).toBeNull();
  });

  test('a locked account points to Forgot password', () => {
    expect(plainSignInError('Too many failed sign-in attempts. Try again in 5 minutes.').text).toMatch(/Forgot password/);
  });

  test('too many requests in a short time', () => {
    expect(kind('Too many attempts in a short time. Wait a minute and try again.')).toBe('tooMany');
  });

  test('connection problems are not blamed on the password', () => {
    expect(kind('You are offline. Check your internet connection and try again.')).toBe('offline');
    expect(kind('We could not reach the Murzak server. Check your internet connection and try again.')).toBe('network');
    expect(kind('The server is taking too long to answer. Please try again.')).toBe('slow');
    expect(kind('The server is busy or being updated. Please try again in a minute.')).toBe('busy');
    expect(kind('Something went wrong on our side. Please try again, and contact support if it keeps happening.')).toBe('server');
    expect(plainSignInError('We could not reach the Murzak server. Check your internet connection and try again.').field).toBeNull();
  });

  test('a wrong code at the code step marks the code', () => {
    expect(plainSignInError('That code is not correct. Check the time on your phone and try the newest code.')).toEqual({ kind: 'code', text: T.errors.code, field: 'code' });
    expect(plainSignInError('anything at all', { step: 'code' }).field).toBe('code');
  });

  test('a lock or a lost connection at the code step is still said as such', () => {
    expect(kind('Too many failed sign-in attempts. Try again in 5 minutes.', { step: 'code' })).toBe('locked');
    expect(kind('You are offline. Check your internet connection and try again.', { step: 'code' })).toBe('offline');
  });

  test('anything unknown gets a safe sentence and never the raw server words', () => {
    const r = plainSignInError('frappe.exceptions.SomethingStrange: secret detail');
    expect(r.kind).toBe('other');
    expect(r.text).toBe(T.errors.other);
    expect(r.text).not.toMatch(/frappe|secret/);
    expect(plainSignInError(undefined).kind).toBe('other');
  });
});

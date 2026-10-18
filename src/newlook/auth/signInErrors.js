import T from './strings.auth';
import { fill } from '../labels/fill';

/**
 * Turns whatever the sign-in reported into plain words and says which field to mark (ticket P5-5).
 *
 * The text comes from the app's sign-in (the Redux error: already tidied by utils/friendlyError.js). It is only used to tell the kinds
 * of problem apart; the words shown are always our own (strings.auth.js), so a raw server sentence never reaches the screen.
 * Anything about the details being wrong, including an account that is switched off, gets the same sentence: the page must never
 * reveal whether an email address or phone number is registered.
 *
 * Returns { kind, text, field } where field is 'password', 'code' or null (nothing to mark).
 */
const LOCKED = /too many failed sign-in attempts/i;
const TOO_MANY = /too many (attempts|requests|tries)|rate limit/i;
const OFFLINE = /you are offline/i;
const NETWORK = /could not reach|internet connection|network/i;
const SLOW = /taking too long|timed? ?out/i;
const BUSY = /busy or being updated|temporarily unavailable/i;
const SERVER = /went wrong on our side/i;
const WRONG_CODE = /code is not (correct|right)|authenticator|6-digit/i;
const WRONG_DETAILS = /password|credential|email|phone|not right|disabled|session has ended|sign in again|not authenticated|authentication|invalid login/i;

export const plainSignInError = (message, { step = 'password' } = {}) => {
  const said = String(message || '');

  if (LOCKED.test(said)) {
    const minutes = Number((said.match(/(\d+)\s*minute/i) || [])[1]);
    if (minutes === 1) return { kind: 'locked', text: T.errors.lockedOneMinute, field: null };
    if (minutes > 1) return { kind: 'locked', text: fill(T.errors.lockedMinutes, { minutes }), field: null };
    return { kind: 'locked', text: T.errors.locked, field: null };
  }
  if (TOO_MANY.test(said)) return { kind: 'tooMany', text: T.errors.tooMany, field: null };
  if (OFFLINE.test(said)) return { kind: 'offline', text: T.errors.offline, field: null };
  if (SLOW.test(said)) return { kind: 'slow', text: T.errors.slow, field: null };
  if (BUSY.test(said)) return { kind: 'busy', text: T.errors.busy, field: null };
  if (SERVER.test(said)) return { kind: 'server', text: T.errors.server, field: null };
  if (NETWORK.test(said)) return { kind: 'network', text: T.errors.network, field: null };

  // At the code step the password was already accepted, so a refusal there is about the code
  if (step === 'code' || WRONG_CODE.test(said)) return { kind: 'code', text: T.errors.code, field: 'code' };
  if (WRONG_DETAILS.test(said)) return { kind: 'credentials', text: T.errors.credentials, field: 'password' };
  return { kind: 'other', text: T.errors.other, field: null };
};

export default plainSignInError;

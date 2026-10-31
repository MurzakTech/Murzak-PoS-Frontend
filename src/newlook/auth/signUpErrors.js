import T from './strings.auth';

/**
 * Turns sign-up rejection messages into plain language and identifies which field to highlight.
 */
const OFFLINE = /you are offline/i;
const NETWORK = /could not reach|internet connection|network/i;
const SLOW = /taking too long|timed? ?out/i;
const BUSY = /busy or being updated|temporarily unavailable/i;
const SERVER = /went wrong on our side/i;
const EMAIL_TAKEN = /email.*(already|taken|exists|registered)|user.*already exists/i;
const PHONE_TAKEN = /phone.*(already|taken|exists|registered)|mobile.*already exists/i;
const PASSWORD_REQ = /password|weak_password/i;

export const plainSignUpError = (error) => {
  const said = typeof error === 'string' ? error : (error?.message || '');
  const code = error?.code || '';
  const requirements = Array.isArray(error?.requirements) ? error.requirements : null;

  if (OFFLINE.test(said)) return { kind: 'offline', text: T.errors.offline, field: null };
  if (SLOW.test(said)) return { kind: 'slow', text: T.errors.slow, field: null };
  if (BUSY.test(said)) return { kind: 'busy', text: T.errors.busy, field: null };
  if (SERVER.test(said)) return { kind: 'server', text: T.errors.server, field: null };
  if (NETWORK.test(said)) return { kind: 'network', text: T.errors.network, field: null };
  if (EMAIL_TAKEN.test(said)) {
    return {
      kind: 'emailTaken',
      text: T.errors.emailTaken,
      field: 'email',
    };
  }
  if (PHONE_TAKEN.test(said)) {
    return {
      kind: 'phoneTaken',
      text: T.errors.phoneTaken,
      field: 'phone',
    };
  }
  if (code === 'WEAK_PASSWORD' || PASSWORD_REQ.test(said)) {
    const text = requirements && requirements.length > 0
      ? `Password needs: ${requirements.join(', ')}.`
      : (said || T.check.passwordComplexity);
    return { kind: 'password', text, field: 'password' };
  }

  return { kind: 'other', text: said || T.errors.signUpFailed, field: null };
};

export default plainSignUpError;

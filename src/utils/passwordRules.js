/**
 * The password rules the server enforces when an account is created
 * (techsavanna_pos.api.auth_api.validate_password_strength). Checking them in
 * the browser as the person types means they never submit a password only to
 * be told, afterwards, that it is not good enough.
 */
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'An uppercase letter (A to Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'A lowercase letter (a to z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'A number (0 to 9)', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'A symbol, such as ! @ # - or _', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

/** The rules a password does not yet meet (empty when it is acceptable). */
export const unmetPasswordRules = (password) =>
  PASSWORD_RULES.filter((rule) => !rule.test(String(password || '')));

/** For react-hook-form: true when the password is fine, otherwise what is still missing. */
export const validatePassword = (password) => {
  const missing = unmetPasswordRules(password);
  if (!missing.length) return true;
  return `Still needed: ${missing.map((r) => r.label.replace(/ \(.*\)|, such as.*$/, '').toLowerCase()).join(', ')}.`;
};

// Everything the browser keeps for the person signed in. Tills are often shared,
// so when a session ends none of this may be left for the next person.
// (themeMode is a device preference, so it stays.)
const SESSION_KEYS = [
  'access_token',
  'refresh_token',
  'user',
  'api_key',
  'api_secret',
  'company',
  'pos_profile',
  'activeWarehouse',
  'onboarding_completed',
];

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};

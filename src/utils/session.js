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
  'lastActivity',
  // The till's offline copies of the product list and open shift (src/utils/offlineTill.js).
  // Sales waiting to upload (pos_offline_sales) are deliberately kept: they are real sales.
  'pos_offline_catalog',
  'pos_offline_shift',
];

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};

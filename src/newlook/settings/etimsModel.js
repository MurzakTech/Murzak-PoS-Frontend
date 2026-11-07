/**
 * eTIMS settings (Settings, Tax): what may be changed from the screen, what is checked, and which changes ask first. The PIN
 * comes from the business's Tax ID and the branch from KRA, so neither is changed here.
 */

const SERIAL = /^[A-Za-z0-9._\-/ ]{1,40}$/;

/** The form's values from the server's details */
export const formFrom = (details) => ({ deviceSerial: details ? details.deviceSerial : '', active: details ? details.active : false, test: details ? details.test : true });

/** What is wrong with the form: { field: 'key into the words' }. A blank serial number is allowed (the server leaves it as it was). */
export const problems = (values) => {
  const found = {};
  const serial = String(values.deviceSerial || '').trim();
  if (serial && !SERIAL.test(serial)) found.deviceSerial = 'serialWrong';
  return found;
};

/** Whether anything differs from what the server holds */
export const changed = (values, saved) => Boolean(saved) && (String(values.deviceSerial || '').trim() !== saved.deviceSerial || values.active !== saved.active || values.test !== saved.test);

/**
 * The changes that need a yes first: switching from test to live (the shop starts reporting real sales to KRA), and switching off
 * reporting (sales and bills stop reaching KRA). Returns 'goLive', 'turnOff' or null; turning off wins when both happen.
 */
export const needsAsking = (values, saved) => {
  if (!saved) return null;
  if (saved.active && !values.active) return 'turnOff';
  if (values.active && saved.test && !values.test) return 'goLive';
  return null;
};

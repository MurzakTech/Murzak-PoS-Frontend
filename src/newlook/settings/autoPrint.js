/**
 * Print the receipt automatically after a sale: kept on this device only, under the key the till already reads
 * (pos_auto_print in src/pages/Sales/NewSale.js). On unless it was switched off, as the till treats it.
 */
export const AUTOPRINT_KEY = 'pos_auto_print';

export const readAutoPrint = () => {
  try {
    return localStorage.getItem(AUTOPRINT_KEY) !== 'false';
  } catch (e) {
    return true;
  }
};

/** Throws when this device will not keep the choice (storage blocked), so the switch can say so. */
export const writeAutoPrint = (on) => {
  localStorage.setItem(AUTOPRINT_KEY, String(Boolean(on)));
  if (readAutoPrint() !== Boolean(on)) throw new Error('This device did not keep the choice.');
  return Boolean(on);
};

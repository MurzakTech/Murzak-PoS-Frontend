import { ACCENTS, DEFAULT_ACCENT, DEFAULT_BACKDROP, readBrand } from './brandModel';

/**
 * The brand as this device last learned it (ticket P7-3), kept in this browser only, like the New look device flag (auth/deviceFlag.js).
 *
 * The Sign-in page opens before anyone is known, so the shop's brand cannot be asked from the server yet. BrandProvider writes the
 * logo, accent and shop name here each time it learns them, and the Sign-in page reads them. Only a picture address, a colour name and
 * the shop's public name are kept: no personal data and nothing secret. A new device, or blocked storage, simply shows the plain page.
 *
 * Receipts also read the saved copy of the whole brand and the shop details (BrandProvider keeps them under CACHE_PREFIX), so a till that
 * opens without a connection still prints the shop's own receipt.
 */
export const DEVICE_KEY = 'murzak_brand_device';
export const CACHE_PREFIX = 'murzak_brand_cache:';

const safeParse = (text) => {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : null;
  } catch (e) {
    return null;
  }
};

/** { logo, accent, backdrop, name } as last learned; empty values when nothing is kept */
export const readDeviceBrand = () => {
  let stored = null;
  try {
    stored = safeParse(localStorage.getItem(DEVICE_KEY));
  } catch (e) {
    stored = null; // storage can be unavailable (private mode)
  }
  const brand = readBrand(stored || {});
  return { logo: brand.logo, accent: brand.accent, backdrop: brand.backdrop, name: String((stored && stored.name) || '').slice(0, 100) };
};

export const writeDeviceBrand = ({ logo, accent, backdrop, name }) => {
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify({ logo: logo || '', accent: accent || DEFAULT_ACCENT, backdrop: backdrop || DEFAULT_BACKDROP, name: name || '' }));
  } catch (e) {
    // Not critical; the next sign-in on this device just shows the plain page
  }
};

/** The saved copy of one shop's brand and details: { brand, business } or null */
export const readCache = (company) => {
  try {
    const stored = safeParse(localStorage.getItem(`${CACHE_PREFIX}${company || 'default'}`));
    return stored ? { brand: readBrand(stored.brand), business: stored.business && typeof stored.business === 'object' ? stored.business : {} } : null;
  } catch (e) {
    return null;
  }
};

export const writeCache = (company, value) => {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${company || 'default'}`, JSON.stringify(value));
  } catch (e) {
    // Not critical; the next offline start just prints the plain receipt
  }
};

/** Sets (or, for the default colour, clears) the accent on the page. Only a listed name is ever written. */
export const applyAccent = (accent) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (accent && accent !== DEFAULT_ACCENT && ACCENTS.includes(accent)) root.setAttribute('data-accent', accent);
  else root.removeAttribute('data-accent');
};

import { isPageLive } from '../redirects/live';
import { oldScreen, toNewAddress } from '../redirects/engine';

/**
 * The small decisions of the first-time set-up, kept apart from the screens so they can be tested alone: the steps, where
 * the wizard starts, the "Not now" memory on this device, the tax ID check, and where each link goes.
 */
export const STEP_KEYS = ['business', 'shop', 'cash', 'payments', 'products', 'staff'];
export const KIND_KEYS = ['pharmacy', 'retail', 'services', 'other'];
export const SETUP_PATH = '/new-look/setup';
export const HOME_PATH = '/new-look';

export const isStep = (key) => STEP_KEYS.includes(key);
export const stepAddress = (key) => `${SETUP_PATH}?step=${key}`;
export const stepNumber = (key) => STEP_KEYS.indexOf(key) + 1;
export const nextKey = (key) => STEP_KEYS[STEP_KEYS.indexOf(key) + 1] || null;
export const previousKey = (key) => STEP_KEYS[STEP_KEYS.indexOf(key) - 1] || null;

/**
 * Where the wizard opens: the step in the address if it is a real one, otherwise the first step not passed yet (so a refresh
 * continues where it stopped), otherwise the first step.
 */
export const startStep = (state, requested) => {
  if (isStep(requested)) return requested;
  if (state && isStep(state.nextStep)) return state.nextStep;
  return STEP_KEYS[0];
};

/** 'current', 'done', 'skipped' or 'todo' for the list of steps */
export const stepStatus = (state, key, current) => {
  if (key === current) return 'current';
  if (state && state.doneSteps.includes(key)) return 'done';
  if (state && state.skippedSteps.includes(key)) return 'skipped';
  return 'todo';
};

/** Has this step been passed (done or skipped)? */
export const isPassed = (state, key) => Boolean(state && (state.doneSteps.includes(key) || state.skippedSteps.includes(key)));

// ---------- "Not now": remembered on this device for 7 days ----------

export const NOT_NOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const notNowKey = (company) => `murzak_new_look:setup-not-now:${company || 'default'}`;

export const snooze = (company, now = Date.now()) => {
  try {
    localStorage.setItem(notNowKey(company), String(now + NOT_NOW_DAYS * DAY_MS));
  } catch (e) {
    // Not critical: the banner will simply ask again next time
  }
};

export const isSnoozed = (company, now = Date.now()) => {
  try {
    const until = Number(localStorage.getItem(notNowKey(company)));
    return Number.isFinite(until) && until > now;
  } catch (e) {
    return false;
  }
};

export const clearSnooze = (company) => {
  try {
    localStorage.removeItem(notNowKey(company));
  } catch (e) {
    // Not critical
  }
};

/** Show the Home banner? Only to an owner, only while the server offers set-up, and not within 7 days of "Not now". */
export const showsBanner = ({ state, company, now = Date.now() }) => Boolean(state && state.offer && state.canEdit && !isSnoozed(company, now));

// ---------- The tax ID ----------

export const cleanTaxId = (text) => String(text || '').replace(/\s+/g, '').toUpperCase();

/** True when a tax ID typed in is acceptable: empty (it is optional), or 5 to 20 letters and numbers */
export const taxIdOk = (text) => {
  const clean = cleanTaxId(text);
  return clean === '' || /^[A-Z0-9]{5,20}$/.test(clean);
};

// ---------- The usual opening cash ----------

export const MAX_CASH = 1000000000;

/** { amount, problem } for the digits typed: empty is allowed (no suggestion); 'tooBig' past one billion */
export const cashCheck = (digits) => {
  const text = String(digits || '').replace(/\D/g, '');
  if (!text) return { amount: 0, problem: '' };
  const amount = Number(text);
  return amount > MAX_CASH ? { amount, problem: 'tooBig' } : { amount, problem: '' };
};

// ---------- Links ----------

/** What a kind stands for when looking for ready-made products (the sign-up industry, when known, wins) */
const STARTER_BY_KIND = { pharmacy: 'PHARMACY', retail: 'RETAIL', services: 'SALON' };

/** The industry code whose starter products to offer, or '' for a kind with no ready-made list */
export const starterCode = ({ industryCode, kind }) => industryCode || STARTER_BY_KIND[kind] || '';

/** Every address the wizard links to; a current screen carries legacy=1 so it does not bounce back to a new page */
export const linksFor = (previewOn) => {
  const go = (page, old) => (isPageLive(page, previewOn) ? toNewAddress(page) : oldScreen(old));
  return {
    newProduct: toNewAddress('/products/new'),
    starter: (code) => oldScreen(`/industry/${encodeURIComponent(code)}/products`),
    fromFile: oldScreen('/products/bulk-import'),
    openingStock: oldScreen('/products/bulk-stock-import'),
    team: go('/settings/team', '/staff'),
    business: go('/settings/business', '/settings/business'),
    till: go('/settings/till', '/settings/pos-profile'),
    tax: go('/settings/tax', '/settings/etims'),
    payments: oldScreen('/settings/payment-gateways'),
    home: HOME_PATH,
  };
};

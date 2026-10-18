import { NOT_NOW_DAYS, STEP_KEYS, cashCheck, clearSnooze, cleanTaxId, isPassed, isSnoozed, linksFor, nextKey, previousKey, showsBanner, snooze, startStep, starterCode, stepAddress, stepStatus, taxIdOk } from './setupModel';

const fresh = { doneSteps: [], skippedSteps: [], nextStep: 'business', offer: true, canEdit: true };
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => localStorage.clear());

describe('the steps', () => {
  test('are six, in the order of the Spec', () => {
    expect(STEP_KEYS).toEqual(['business', 'shop', 'cash', 'payments', 'products', 'staff']);
    expect(nextKey('business')).toBe('shop');
    expect(nextKey('staff')).toBeNull();
    expect(previousKey('business')).toBeNull();
    expect(previousKey('cash')).toBe('shop');
    expect(stepAddress('cash')).toBe('/new-look/setup?step=cash');
  });

  test('the wizard opens at the first step not passed, so a refresh continues where it stopped', () => {
    expect(startStep(fresh)).toBe('business');
    expect(startStep({ ...fresh, doneSteps: ['business', 'shop'], nextStep: 'cash' })).toBe('cash');
    expect(startStep({ ...fresh, doneSteps: ['business'], skippedSteps: ['shop'], nextStep: 'cash' })).toBe('cash');
  });

  test('a step named in the address wins, but only if it is a real step', () => {
    expect(startStep({ ...fresh, nextStep: 'cash' }, 'payments')).toBe('payments');
    expect(startStep({ ...fresh, nextStep: 'cash' }, 'tax')).toBe('cash');
    expect(startStep(null, null)).toBe('business');
    expect(startStep({ ...fresh, nextStep: null }, '')).toBe('business');
  });

  test('each step is current, done, skipped or not done yet', () => {
    const state = { doneSteps: ['business'], skippedSteps: ['shop'] };
    expect(stepStatus(state, 'business', 'cash')).toBe('done');
    expect(stepStatus(state, 'shop', 'cash')).toBe('skipped');
    expect(stepStatus(state, 'cash', 'cash')).toBe('current');
    expect(stepStatus(state, 'staff', 'cash')).toBe('todo');
    expect(isPassed(state, 'shop')).toBe(true);
    expect(isPassed(state, 'staff')).toBe(false);
  });
});

describe('Not now', () => {
  test('hides the banner for 7 days on this device, then it comes back', () => {
    const now = 1_700_000_000_000;
    expect(NOT_NOW_DAYS).toBe(7);
    expect(isSnoozed('Shop A', now)).toBe(false);
    snooze('Shop A', now);
    expect(isSnoozed('Shop A', now + 6 * DAY)).toBe(true);
    expect(isSnoozed('Shop A', now + 7 * DAY - 1)).toBe(true);
    expect(isSnoozed('Shop A', now + 7 * DAY + 1)).toBe(false);
  });

  test('is remembered for each shop on its own', () => {
    snooze('Shop A', 1000);
    expect(isSnoozed('Shop B', 1001)).toBe(false);
    clearSnooze('Shop A');
    expect(isSnoozed('Shop A', 1001)).toBe(false);
  });

  test('a device that cannot store anything just asks again', () => {
    const broken = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(isSnoozed('Shop A', 1)).toBe(false);
    broken.mockRestore();
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => snooze('Shop A')).not.toThrow();
    set.mockRestore();
  });
});

describe('who sees the banner', () => {
  test('an owner, while the server offers set-up and not within 7 days of Not now', () => {
    expect(showsBanner({ state: fresh, company: 'Shop A', now: 5 })).toBe(true);
    snooze('Shop A', 5);
    expect(showsBanner({ state: fresh, company: 'Shop A', now: 6 })).toBe(false);
    expect(showsBanner({ state: fresh, company: 'Shop A', now: 5 + 8 * DAY })).toBe(true);
  });

  test('nobody when the server does not offer it (a shop with data), and not a person who cannot edit', () => {
    expect(showsBanner({ state: { ...fresh, offer: false }, company: 'Shop A' })).toBe(false);
    expect(showsBanner({ state: { ...fresh, canEdit: false }, company: 'Shop A' })).toBe(false);
    expect(showsBanner({ state: null, company: 'Shop A' })).toBe(false);
  });
});

describe('the tax ID and the opening cash', () => {
  test('a tax ID may be empty, or 5 to 20 letters and numbers', () => {
    ['', '  ', 'A123456789B', 'a123456789b', 'A123 456 789 B'].forEach((v) => expect(taxIdOk(v)).toBe(true));
    ['A1', 'A12-345', 'x'.repeat(21), 'A123456789B!'].forEach((v) => expect(taxIdOk(v)).toBe(false));
    expect(cleanTaxId(' a123 456 ')).toBe('A123456');
  });

  test('the opening cash may be empty (no suggestion) and is never past a billion', () => {
    expect(cashCheck('')).toEqual({ amount: 0, problem: '' });
    expect(cashCheck('5000')).toEqual({ amount: 5000, problem: '' });
    expect(cashCheck('5,000').amount).toBe(5000);
    expect(cashCheck('99999999999').problem).toBe('tooBig');
  });
});

describe('where the links go', () => {
  test('the starter products are those of the industry chosen at sign-up, else of the kind; "other" has none', () => {
    expect(starterCode({ industryCode: 'GROCERY', kind: 'pharmacy' })).toBe('GROCERY');
    expect(starterCode({ industryCode: null, kind: 'pharmacy' })).toBe('PHARMACY');
    expect(starterCode({ industryCode: null, kind: 'retail' })).toBe('RETAIL');
    expect(starterCode({ industryCode: null, kind: 'other' })).toBe('');
    expect(starterCode({ industryCode: null, kind: null })).toBe('');
  });

  test('a current screen carries legacy=1 so it does not bounce back; a finished page does not', () => {
    const links = linksFor(false);
    expect(links.newProduct).toBe('/new-look/products/new');
    expect(links.starter('PHARMACY')).toBe('/industry/PHARMACY/products?legacy=1');
    expect(links.fromFile).toBe('/products/bulk-import?legacy=1');
    expect(links.openingStock).toBe('/products/bulk-stock-import?legacy=1');
    expect(links.payments).toBe('/settings/payment-gateways?legacy=1');
  });

  test('Team opens the current Staff screen until Settings, Team is live, and the new page after', () => {
    expect(linksFor(false).team).toBe('/staff?legacy=1');
    expect(linksFor(true).team).toBe('/new-look/settings/team');
  });
});

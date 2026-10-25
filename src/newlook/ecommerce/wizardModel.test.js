import { firstOpenStep, stepProblems } from './wizardModel';

const FORM = {
  store_name: 'Duka ya Amina',
  slug: 'duka-ya-amina',
  delivery_enabled: true,
  pickup_enabled: true,
  pickup_address: 'Moi Avenue 4',
  delivery_mode: 'free',
  delivery_flat_fee: '',
  accept_cash: true,
  accept_mpesa: false,
};
const ctx = (over = {}, form = {}) => ({
  form: { ...FORM, ...form },
  slugCheck: { state: 'free' },
  saved: { slug: '' },
  productCount: 5,
  mpesaReady: false,
  ...over,
});

describe('the name step', () => {
  test('passes with a name and a free web address name', () => {
    expect(stepProblems('name', ctx())).toEqual({});
  });
  test('needs a store name of at least two letters', () => {
    expect(stepProblems('name', ctx({}, { store_name: ' A ' }))).toEqual({ store_name: 'needName' });
  });
  test('needs a web address name that is only letters, numbers and hyphens', () => {
    expect(stepProblems('name', ctx({}, { slug: 'Duka ya!' }))).toEqual({ slug: 'needSlug' });
    expect(stepProblems('name', ctx({}, { slug: '' }))).toEqual({ slug: 'needSlug' });
  });
  test('a name that is taken, or still being checked, stops the owner', () => {
    expect(stepProblems('name', ctx({ slugCheck: { state: 'taken' } }))).toEqual({ slug: 'slugTaken' });
    expect(stepProblems('name', ctx({ slugCheck: { state: 'checking' } }))).toEqual({ slug: 'slugChecking' });
  });
  test('the store\'s own saved name is never "taken"', () => {
    expect(stepProblems('name', ctx({ slugCheck: { state: 'taken' }, saved: { slug: 'duka-ya-amina' } }))).toEqual({});
  });
});

describe('the orders step', () => {
  test('needs delivery or pickup', () => {
    expect(stepProblems('receive', ctx({}, { delivery_enabled: false, pickup_enabled: false }))).toEqual({ receive: 'needReceive' });
  });
  test('pickup needs an address, and one flat fee needs an amount', () => {
    expect(stepProblems('receive', ctx({}, { pickup_address: ' ' }))).toEqual({ pickup_address: 'needPickupAddress' });
    expect(stepProblems('receive', ctx({}, { delivery_mode: 'flat' }))).toEqual({ delivery_flat_fee: 'needFee' });
    expect(stepProblems('receive', ctx({}, { delivery_mode: 'flat', delivery_flat_fee: '200' }))).toEqual({});
  });
  test('delivery fees by area are not asked about here', () => {
    expect(stepProblems('receive', ctx({}, { delivery_mode: 'area' }))).toEqual({});
  });
});

describe('the payment step', () => {
  test('needs a way to pay, and M-Pesa only when it is set up', () => {
    expect(stepProblems('pay', ctx({}, { accept_cash: false }))).toEqual({ pay: 'needPay' });
    expect(stepProblems('pay', ctx({}, { accept_mpesa: true }))).toEqual({ pay: 'mpesaNotReady' });
    expect(stepProblems('pay', ctx({ mpesaReady: true }, { accept_mpesa: true }))).toEqual({});
  });
});

describe('the products step', () => {
  test('needs at least one product shown', () => {
    expect(stepProblems('products', ctx({ productCount: 0 }))).toEqual({ products: 'needProducts' });
    expect(stepProblems('products', ctx())).toEqual({});
  });
});

describe('where to start', () => {
  test('a new store starts at its name; a half-done one at what is missing; a finished one at opening', () => {
    expect(firstOpenStep(ctx({}, { store_name: '', slug: '' }))).toBe('name');
    expect(firstOpenStep(ctx({ productCount: 0 }))).toBe('products');
    expect(firstOpenStep(ctx())).toBe('open');
  });
});

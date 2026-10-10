import { loadCatalog, loadShift, saveCatalog, saveShift, trimProduct } from './offlineTill';

beforeEach(() => localStorage.clear());

it('keeps only the product fields the till needs, per business', () => {
  expect(trimProduct({ item_code: 'A', price: 5, secret_cost: 2 })).toEqual({ item_code: 'A', price: 5 });
  saveCatalog('Shop A', [{ item_code: 'A', item_name: 'Apple', standard_rate: 5, valuation_rate: 3 }]);
  expect(loadCatalog('Shop A')).toEqual([{ item_code: 'A', item_name: 'Apple', standard_rate: 5 }]);
  expect(loadCatalog('Shop B')).toEqual([]);
});

it('resumes a shift only for the same person and business', () => {
  saveShift('Shop A', 'jane@shop.ke', { name: 'POS-OPE-1', pos_profile: 'Main', user: 'jane@shop.ke' });
  expect(loadShift('Shop A', 'jane@shop.ke')).toMatchObject({ name: 'POS-OPE-1', status: 'Open' });
  expect(loadShift('Shop A', 'kevin@shop.ke')).toBeNull();
  expect(loadShift('Shop B', 'jane@shop.ke')).toBeNull();
});

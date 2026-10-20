import {
  loadCatalog,
  loadCatalogAsync,
  loadShift,
  loadShiftAsync,
  saveCatalog,
  saveCatalogAsync,
  decrementOfflineCatalogStock,
  saveShift,
  clearShift,
  clearOfflineStorage,
  trimProduct,
  _resetMemoryCacheForTest,
} from './offlineTill';
import { _resetIdbForTest } from './indexedDb';

beforeEach(() => {
  localStorage.clear();
  _resetMemoryCacheForTest();
  _resetIdbForTest();
});

it('keeps only the product fields the till needs, per business', () => {
  expect(trimProduct({ item_code: 'A', price: 5, secret_cost: 2 })).toEqual({ item_code: 'A', price: 5 });
  saveCatalog('Shop A', [{ item_code: 'A', item_name: 'Apple', standard_rate: 5, valuation_rate: 3, actual_qty: 10 }]);
  expect(loadCatalog('Shop A')).toEqual([{ item_code: 'A', item_name: 'Apple', standard_rate: 5, actual_qty: 10 }]);
  expect(loadCatalog('Shop B')).toEqual([]);
});

it('saves and loads catalog asynchronously with high-capacity IndexedDB storage', async () => {
  await saveCatalogAsync('Supermarket X', [
    { item_code: 'BREAD', item_name: 'Fresh Bread', price: 65, barcode: '123456789', actual_qty: 25 },
  ]);
  const loaded = await loadCatalogAsync('Supermarket X');
  expect(loaded).toEqual([
    { item_code: 'BREAD', item_name: 'Fresh Bread', price: 65, barcode: '123456789', actual_qty: 25 },
  ]);
  expect(await loadCatalogAsync('Other Shop')).toEqual([]);
});

it('decrements catalog stock locally when offline sales are made', async () => {
  await saveCatalogAsync('Shop A', [
    { item_code: 'MILK', item_name: 'Fresh Milk', price: 60, actual_qty: 10 },
    { item_code: 'BREAD', item_name: 'Bread', price: 65, actual_qty: 5 },
  ]);

  await decrementOfflineCatalogStock('Shop A', [
    { item_code: 'MILK', qty: 3 },
    { item_code: 'BREAD', qty: 5 },
  ]);

  const updated = await loadCatalogAsync('Shop A');
  expect(updated.find((p) => p.item_code === 'MILK').actual_qty).toBe(7);
  expect(updated.find((p) => p.item_code === 'BREAD').actual_qty).toBe(0);
});

it('resumes a shift only for the same person and business', () => {
  saveShift('Shop A', 'jane@shop.ke', { name: 'POS-OPE-1', pos_profile: 'Main', user: 'jane@shop.ke' });
  expect(loadShift('Shop A', 'jane@shop.ke')).toMatchObject({ name: 'POS-OPE-1', status: 'Open' });
  expect(loadShift('Shop A', 'kevin@shop.ke')).toBeNull();
  expect(loadShift('Shop B', 'jane@shop.ke')).toBeNull();
});

it('resumes a shift asynchronously through loadShiftAsync', async () => {
  saveShift('Shop A', 'jane@shop.ke', { name: 'POS-OPE-1', pos_profile: 'Main', user: 'jane@shop.ke' });
  const shift = await loadShiftAsync('Shop A', 'jane@shop.ke');
  expect(shift).toMatchObject({ name: 'POS-OPE-1', status: 'Open' });
});

it('clears shift and offline storage completely', async () => {
  saveCatalog('Shop A', [{ item_code: 'A', price: 10 }]);
  saveShift('Shop A', 'jane@shop.ke', { name: 'POS-OPE-1' });

  clearShift();
  expect(loadShift('Shop A', 'jane@shop.ke')).toBeNull();
  expect(await loadShiftAsync('Shop A', 'jane@shop.ke')).toBeNull();

  clearOfflineStorage();
  expect(loadCatalog('Shop A')).toEqual([]);
  expect(await loadCatalogAsync('Shop A')).toEqual([]);
});

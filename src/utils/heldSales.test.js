import {
  LEGACY_KEY,
  heldKey,
  readHeld,
  writeHeld,
  cleanLabel,
  makeHeldSale,
  heldTitle,
  heldTotal,
  heldAge,
  labelInUse,
  renameHeld,
} from './heldSales';

// A small stand-in for localStorage
const fakeStorage = (initial = {}, { failWrites = false } = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { if (failWrites) throw new Error('quota'); data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
};

const sale = (over = {}) => ({ id: 1, heldAt: '2026-10-10T10:00:00.000Z', cart: [{ subtotal: 100 }, { subtotal: 50.5 }], customer: 'Walk-in Customer', ...over });

describe('keeping held sales apart for each business', () => {
  it('stores each business under its own key', () => {
    const s = fakeStorage();
    writeHeld(s, 'Shop A', [sale({ id: 1 })]);
    writeHeld(s, 'Shop B', [sale({ id: 2 })]);
    expect(readHeld(s, 'Shop A').map((h) => h.id)).toEqual([1]);
    expect(readHeld(s, 'Shop B').map((h) => h.id)).toEqual([2]);
    expect(heldKey('Shop A')).not.toBe(heldKey('Shop B'));
  });

  it('adopts sales held under the old shared key for the first business to open the till, once', () => {
    const s = fakeStorage({ [LEGACY_KEY]: JSON.stringify([sale({ id: 7 })]) });
    expect(readHeld(s, 'Shop A').map((h) => h.id)).toEqual([7]);
    expect(s.getItem(LEGACY_KEY)).toBeNull(); // gone, so nobody else sees them
    expect(readHeld(s, 'Shop B')).toEqual([]);
    expect(readHeld(s, 'Shop A').map((h) => h.id)).toEqual([7]); // and Shop A keeps them
  });

  it('still shows the old sales if they could not be moved', () => {
    const s = fakeStorage({ [LEGACY_KEY]: JSON.stringify([sale({ id: 7 })]) }, { failWrites: true });
    expect(readHeld(s, 'Shop A').map((h) => h.id)).toEqual([7]);
  });
});

describe('reading and writing', () => {
  it('reports a failed save instead of pretending it worked', () => {
    expect(writeHeld(fakeStorage({}, { failWrites: true }), 'Shop A', [sale()])).toBe(false);
    expect(writeHeld(fakeStorage(), 'Shop A', [sale()])).toBe(true);
  });

  it('survives damaged or unexpected stored data', () => {
    expect(readHeld(fakeStorage({ [heldKey('A')]: '{not json' }), 'A')).toEqual([]);
    expect(readHeld(fakeStorage({ [heldKey('A')]: '{"a":1}' }), 'A')).toEqual([]);
    expect(readHeld(fakeStorage({ [heldKey('A')]: JSON.stringify([sale(), { id: 2 }, null, 'x', { cart: [] }]) }), 'A')).toHaveLength(1);
    expect(readHeld({ getItem: () => { throw new Error('blocked'); } }, 'A')).toEqual([]);
  });

  it('works without a company', () => {
    const s = fakeStorage();
    writeHeld(s, undefined, [sale()]);
    expect(readHeld(s, undefined)).toHaveLength(1);
  });
});

describe('naming', () => {
  it('tidies a name: spaces collapsed, length limited', () => {
    expect(cleanLabel('  Table   4 ')).toBe('Table 4');
    expect(cleanLabel('x'.repeat(100))).toHaveLength(40);
    expect(cleanLabel(null)).toBe('');
  });

  it('builds a held sale carrying its name and the till snapshot', () => {
    const now = new Date('2026-10-10T08:15:00.000Z');
    const h = makeHeldSale({ cart: [{ subtotal: 5 }], customer: 'Walk-in Customer' }, ' Table 4 ', now);
    expect(h).toMatchObject({ id: now.getTime(), heldAt: now.toISOString(), label: 'Table 4', customer: 'Walk-in Customer' });
  });

  it('titles a sale by its name, then its customer, then the time it was held', () => {
    expect(heldTitle(sale({ label: 'Table 4', customer: 'Amina' }))).toBe('Table 4');
    expect(heldTitle(sale({ customer: 'Amina' }))).toBe('Amina');
    const unnamed = sale({ heldAt: new Date(2026, 9, 10, 9, 5).toISOString() });
    expect(heldTitle(unnamed)).toBe('Sale at 09:05');
    expect(heldTitle(sale({ heldAt: 'nonsense' }))).toBe('Held sale');
  });

  it('spots a name already in use, ignoring capitals and the sale being renamed', () => {
    const list = [sale({ id: 1, label: 'Table 4' }), sale({ id: 2, label: 'Bar' })];
    expect(labelInUse(list, 'table 4')).toBe(true);
    expect(labelInUse(list, 'table 4', 1)).toBe(false);
    expect(labelInUse(list, 'Table 5')).toBe(false);
    expect(labelInUse(list, '   ')).toBe(false);
  });

  it('renames one held sale and leaves the others', () => {
    const list = [sale({ id: 1, label: 'A' }), sale({ id: 2, label: 'B' })];
    expect(renameHeld(list, 2, '  Patio ').map((h) => h.label)).toEqual(['A', 'Patio']);
  });
});

describe('totals and age', () => {
  it('adds up the bill', () => {
    expect(heldTotal(sale())).toBe(150.5);
    expect(heldTotal(sale({ cart: [{}, { subtotal: 'x' }] }))).toBe(0);
  });

  const at = (minutes) => new Date(new Date('2026-10-10T10:00:00.000Z').getTime() + minutes * 60000);
  it.each([
    [0, 'just now', false],
    [5, '5 min ago', false],
    [60, '1 h ago', false],
    [135, '2 h 15 min ago', false],
    [11 * 60 + 59, '11 h 59 min ago', false],
    [12 * 60, '12 h ago', true],
    [26 * 60, '26 h ago', true],
    [50 * 60, '2 days ago', true],
  ])('describes %i minutes as "%s" (stale: %s)', (minutes, text, stale) => {
    expect(heldAge(sale(), at(minutes))).toEqual({ text, stale });
  });

  it('copes with a missing time and a clock that is slightly behind', () => {
    expect(heldAge(sale({ heldAt: 'x' }))).toEqual({ text: '', stale: false });
    expect(heldAge(sale(), at(-5)).text).toBe('just now');
  });
});

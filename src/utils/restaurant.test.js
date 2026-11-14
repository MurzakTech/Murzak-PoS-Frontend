import { equalShares, happyHourDiscount, happyHourFor, minutesOpen, serviceChargeOn, splitByItem, tableMap } from './restaurant';

const RULES = [
  { name: 'After work', days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '17:00', end: '19:00', percent: 20, groups: ['Beer'], items: [] },
  { name: 'Late', days: ['sat'], start: '22:00', end: '02:00', percent: 10, groups: [], items: ['TUSKER'] },
];
// 2026-11-16 is a Monday
const at = (day, hh, mm = 0) => new Date(2026, 10, 16 + day, hh, mm);

describe('happy hour', () => {
  test('applies on a listed day inside the window, to the chosen section', () => {
    expect(happyHourFor(RULES, { item_code: 'GUINNESS', item_group: 'Beer' }, at(0, 17, 30)).percent).toBe(20);
    expect(happyHourFor(RULES, { item_code: 'GUINNESS', item_group: 'Beer' }, at(0, 19, 0))).toBeNull();
    expect(happyHourFor(RULES, { item_code: 'GUINNESS', item_group: 'Beer' }, at(5, 17, 30))).toBeNull();
    expect(happyHourFor(RULES, { item_code: 'CHIPS', item_group: 'Food' }, at(0, 17, 30))).toBeNull();
  });

  test('a window past midnight belongs to the day it started', () => {
    expect(happyHourFor(RULES, { item_code: 'TUSKER', item_group: 'Beer' }, at(5, 23, 0)).name).toBe('Late');
    expect(happyHourFor(RULES, { item_code: 'TUSKER', item_group: 'Beer' }, at(6, 1, 30)).name).toBe('Late');
    expect(happyHourFor(RULES, { item_code: 'TUSKER', item_group: 'Beer' }, at(6, 23, 0))).toBeNull();
  });

  test('becomes the till discount rule', () => {
    expect(happyHourDiscount(RULES[0])).toEqual({ discount_type: 'Percentage', discount_value: 20, name: 'After work', happy_hour: true });
    expect(happyHourDiscount(null)).toBeNull();
  });
});

test('the service charge is a percentage of what is owed, and nothing when off', () => {
  expect(serviceChargeOn(2450, 10)).toBe(245);
  expect(serviceChargeOn(999.99, 7.5)).toBe(75);
  expect(serviceChargeOn(1000, 0)).toBe(0);
  expect(serviceChargeOn(0, 10)).toBe(0);
});

describe('splitting a bill', () => {
  const cart = [
    { item_code: 'BURGER', qty: 2, rate: 700, subtotal: 1400, discount_amount: 0, sentQty: 2 },
    { item_code: 'BEER', qty: 3, rate: 300, subtotal: 720, discount_amount: 180, sentQty: 3 },
  ];

  test('by item: the guest takes their lines, the rest stays, and what was sent goes with each', () => {
    const { part, rest } = splitByItem(cart, { BURGER: 1, BEER: 1 });
    expect(part).toEqual([
      expect.objectContaining({ item_code: 'BURGER', qty: 1, subtotal: 700, sentQty: 1 }),
      expect.objectContaining({ item_code: 'BEER', qty: 1, subtotal: 240, discount_amount: 60, sentQty: 1 }),
    ]);
    expect(rest).toEqual([
      expect.objectContaining({ item_code: 'BURGER', qty: 1, sentQty: 1 }),
      expect.objectContaining({ item_code: 'BEER', qty: 2, subtotal: 480, sentQty: 2 }),
    ]);
  });

  test('taking more than is on the bill takes what is there, and nothing taken leaves the bill whole', () => {
    expect(splitByItem(cart, { BURGER: 9 }).rest.map((l) => l.item_code)).toEqual(['BEER']);
    expect(splitByItem(cart, {}).part).toEqual([]);
  });

  test('equally: shares add up to the cent', () => {
    expect(equalShares(1000, 3)).toEqual([333.34, 333.33, 333.33]);
    expect(equalShares(1000, 3).reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 2);
    expect(equalShares(500, 0)).toEqual([500]);
  });
});

describe('the table map', () => {
  test('each table is free, open with its bill, or the one on this till; other bills are listed apart', () => {
    const map = tableMap(['T1', 'T2', 'T3'], [{ id: 'h1', label: 't2', total: 900 }, { id: 'h2', label: "John's tab", total: 300 }], 'T3');
    expect(map.tables.map((t) => t.status)).toEqual(['free', 'open', 'here']);
    expect(map.tables[1].held.id).toBe('h1');
    expect(map.others.map((h) => h.label)).toEqual(["John's tab"]);
  });

  test('how long a bill has been open', () => {
    expect(minutesOpen('2026-11-13T18:00:00Z', new Date('2026-11-13T18:45:30Z'))).toBe(45);
    expect(minutesOpen(null)).toBeNull();
  });
});

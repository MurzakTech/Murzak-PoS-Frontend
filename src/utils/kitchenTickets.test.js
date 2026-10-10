import {
  EMPTY_KITCHEN,
  defaultSettings,
  readSettings,
  writeSettings,
  kitchenKey,
  stationFor,
  suggestStations,
  cleanNote,
  planSend,
  markSent,
  afterSend,
  voidFor,
  clampSent,
  planCancelAll,
  hasSentItems,
  takeTicketNumber,
  buildTickets,
  ticketTitle,
  orderTypeOf,
  sharedPart,
  SHARED_KEYS,
  MAX_NOTE,
} from './kitchenTickets';

const settingsWith = (over = {}) => ({
  ...defaultSettings(),
  enabled: true,
  stations: [
    { id: 'kitchen', name: 'Kitchen', groups: ['Food'] },
    { id: 'bar', name: 'Bar', groups: ['Beer', 'Soda'] },
  ],
  ...over,
});

const line = (item_code, item_name, item_group, qty, over = {}) => ({ item_code, item_name, item_group, qty, rate: 100, subtotal: qty * 100, ...over });

const fakeStorage = (initial = {}, { fail = false } = {}) => {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { if (fail) throw new Error('quota'); data[k] = String(v); } };
};

describe('routing items to stations', () => {
  it('sends an item to the station its category is set to, ignoring capitals', () => {
    const s = settingsWith();
    expect(stationFor(s, 'Food').id).toBe('kitchen');
    expect(stationFor(s, ' beer ').id).toBe('bar');
  });

  it('sends an item with no station nowhere, unless a default station is chosen', () => {
    expect(stationFor(settingsWith(), 'Cigarettes')).toBeNull();
    expect(stationFor(settingsWith({ defaultStation: 'bar' }), 'Cigarettes').id).toBe('bar');
  });

  it('suggests stations from category names, for people who would rather not set them up by hand', () => {
    const s = suggestStations(['Food', 'Beer', 'Soda', 'Starters', 'Stationery', 'Spirits', 'Hot Drinks']);
    expect(s[0].groups).toEqual(['Food', 'Starters']);
    expect(s[1].groups).toEqual(['Beer', 'Soda', 'Spirits', 'Hot Drinks']);
  });
});

describe('what a send contains', () => {
  it('holds only the items not sent yet, grouped by station', () => {
    const plan = planSend([line('P', 'Pilau', 'Food', 2), line('T', 'Tusker', 'Beer', 3)], EMPTY_KITCHEN, settingsWith());
    expect(plan.count).toBe(2);
    expect(plan.stations.map((g) => [g.station.name, g.adds.map((a) => [a.item_name, a.qty])])).toEqual([
      ['Kitchen', [['Pilau', 2]]],
      ['Bar', [['Tusker', 3]]],
    ]);
  });

  it('on a second round sends only what was added since', () => {
    const cart = [line('P', 'Pilau', 'Food', 3, { sentQty: 2 }), line('T', 'Tusker', 'Beer', 3, { sentQty: 3 })];
    const plan = planSend(cart, EMPTY_KITCHEN, settingsWith());
    expect(plan.count).toBe(1);
    expect(plan.stations[0].adds).toEqual([{ item_code: 'P', item_name: 'Pilau', qty: 1, note: '' }]);
  });

  it('has nothing to send when everything was already sent', () => {
    const plan = planSend([line('P', 'Pilau', 'Food', 2, { sentQty: 2 })], EMPTY_KITCHEN, settingsWith());
    expect(plan.count).toBe(0);
    expect(plan.stations).toEqual([]);
  });

  it('carries the note, and tells the kitchen when the note of something already sent changes', () => {
    const cart = [
      line('P', 'Pilau', 'Food', 1, { note: 'no pilipili' }),
      line('B', 'Burger', 'Food', 1, { sentQty: 1, sentNote: 'well done', note: 'well done, no onions' }),
    ];
    const plan = planSend(cart, EMPTY_KITCHEN, settingsWith());
    expect(plan.stations[0].adds[0].note).toBe('no pilipili');
    expect(plan.stations[0].changes).toEqual([{ item_code: 'B', item_name: 'Burger', note: 'well done, no onions', previousNote: 'well done' }]);
  });

  it('does not report a change when the note is only written differently', () => {
    const cart = [line('B', 'Burger', 'Food', 1, { sentQty: 1, sentNote: 'no  onions ', note: 'no onions' })];
    expect(planSend(cart, EMPTY_KITCHEN, settingsWith()).count).toBe(0);
  });

  it('lists items with no station instead of forgetting them, and counts them as nothing to send', () => {
    const plan = planSend([line('C', 'Cigarettes', 'Tobacco', 2), line('P', 'Pilau', 'Food', 1)], EMPTY_KITCHEN, settingsWith());
    expect(plan.unrouted).toEqual([{ item_code: 'C', item_name: 'Cigarettes', item_group: 'Tobacco', qty: 2 }]);
    expect(plan.count).toBe(1);
  });

  it('includes cancellations of things already sent, merged when the same item was cancelled twice', () => {
    const kitchen = { round: 1, voids: [
      { item_code: 'P', item_name: 'Pilau', item_group: 'Food', qty: 1, note: '' },
      { item_code: 'P', item_name: 'Pilau', item_group: 'Food', qty: 2, note: '' },
      { item_code: 'T', item_name: 'Tusker', item_group: 'Beer', qty: 1, note: '' },
      { item_code: 'C', item_name: 'Cigarettes', item_group: 'Tobacco', qty: 1, note: '' },
    ] };
    const plan = planSend([], kitchen, settingsWith());
    expect(plan.stations.find((g) => g.station.id === 'kitchen').voids).toEqual([{ item_code: 'P', item_name: 'Pilau', qty: 3, note: '' }]);
    expect(plan.stations.find((g) => g.station.id === 'bar').voids).toHaveLength(1);
    expect(plan.count).toBe(2); // the unrouted cancellation was never sent anywhere
  });

  it('orders stations as they are set up', () => {
    const plan = planSend([line('T', 'Tusker', 'Beer', 1), line('P', 'Pilau', 'Food', 1)], EMPTY_KITCHEN, settingsWith());
    expect(plan.stations.map((g) => g.station.name)).toEqual(['Kitchen', 'Bar']);
  });
});

describe('after a send', () => {
  const cart = [line('P', 'Pilau', 'Food', 2, { note: 'no pilipili' }), line('C', 'Cigarettes', 'Tobacco', 1)];

  it('marks what was sent, with its note, and leaves unrouted items to be noticed again', () => {
    const plan = planSend(cart, EMPTY_KITCHEN, settingsWith());
    const next = markSent(cart, plan);
    expect(next[0]).toMatchObject({ sentQty: 2, sentNote: 'no pilipili' });
    expect(next[1].sentQty).toBeUndefined();
    expect(planSend(next, EMPTY_KITCHEN, settingsWith()).count).toBe(0); // a second press sends nothing
    expect(cart[0].sentQty).toBeUndefined(); // the original cart is untouched
  });

  it('counts a round and clears the cancellations that were just sent, keeping any that could not be', () => {
    const kitchen = { round: 1, voids: [
      { item_code: 'P', item_name: 'Pilau', item_group: 'Food', qty: 1, note: '' },
      { item_code: 'C', item_name: 'Cigarettes', item_group: 'Tobacco', qty: 1, note: '' },
    ] };
    const plan = planSend([], kitchen, settingsWith());
    const next = afterSend(kitchen, plan, settingsWith());
    expect(next.round).toBe(2);
    expect(next.voids.map((v) => v.item_code)).toEqual(['C']);
  });
});

describe('remembering cancellations', () => {
  const sent = line('P', 'Pilau', 'Food', 3, { sentQty: 3, sentNote: 'no pilipili' });

  it('records what was cancelled when a sent item is reduced', () => {
    expect(voidFor(sent, 1)).toEqual({ item_code: 'P', item_name: 'Pilau', item_group: 'Food', qty: 2, note: 'no pilipili' });
    expect(voidFor(sent, 0).qty).toBe(3);
  });

  it('records nothing when only unsent items are reduced, or the quantity does not go below what was sent', () => {
    expect(voidFor(sent, 3)).toBeNull();
    expect(voidFor(sent, 5)).toBeNull();
    expect(voidFor(line('P', 'Pilau', 'Food', 3), 1)).toBeNull();
    expect(voidFor(null, 0)).toBeNull();
  });

  it('never leaves a line with more sent than it has', () => {
    expect(clampSent(sent, 1).sentQty).toBe(1);
    expect(clampSent(sent, 5)).toBe(sent);
  });

  it('turns a whole bill that was sent into cancellations, including earlier ones', () => {
    const kitchen = { round: 2, voids: [{ item_code: 'T', item_name: 'Tusker', item_group: 'Beer', qty: 1, note: '' }] };
    const plan = planCancelAll([sent, line('N', 'New', 'Food', 1)], kitchen, settingsWith());
    expect(plan.stations.flatMap((g) => g.voids.map((v) => [v.item_name, v.qty]))).toEqual([['Pilau', 3], ['Tusker', 1]]);
    expect(plan.stations.flatMap((g) => g.adds)).toEqual([]); // the unsent item is just dropped
  });

  it('knows whether anything on a bill was sent', () => {
    expect(hasSentItems([sent], EMPTY_KITCHEN)).toBe(true);
    expect(hasSentItems([line('N', 'New', 'Food', 1)], EMPTY_KITCHEN)).toBe(false);
    expect(hasSentItems([], { round: 1, voids: [{}] })).toBe(true);
  });
});

describe('tickets', () => {
  const now = new Date(2026, 9, 10, 19, 42);

  it('builds one ticket per station, with the table name, who sent it, the time and the round', () => {
    const plan = planSend([line('P', 'Pilau', 'Food', 1), line('T', 'Tusker', 'Beer', 2)], EMPTY_KITCHEN, settingsWith());
    const tickets = buildTickets(plan, { label: ' Table 4 ', waiter: 'Amina', number: 14, round: 2, now });
    expect(tickets).toHaveLength(2);
    expect(tickets[0]).toMatchObject({ station: 'Kitchen', number: 14, round: 2, label: 'Table 4', waiter: 'Amina', time: '19:42' });
    expect(tickets[1].adds[0]).toMatchObject({ item_name: 'Tusker', qty: 2 });
  });

  it('treats a bill with no name as a counter order, and a named one as a table', () => {
    const plan = planSend([line('P', 'Pilau', 'Food', 1)], EMPTY_KITCHEN, settingsWith());
    const unnamed = buildTickets(plan, { label: '', waiter: 'A', number: 1, round: 1, now })[0];
    expect(unnamed).toMatchObject({ label: '', orderType: 'counter' });
    expect(ticketTitle(unnamed)).toBe('Counter order');
    const named = buildTickets(plan, { label: 'Table 4', waiter: 'A', number: 1, round: 1, now })[0];
    expect(named.orderType).toBe('table');
    expect(ticketTitle(named)).toBe('Table 4');
  });

  it('lets the waiter say counter or table, whatever the name', () => {
    const plan = planSend([line('P', 'Pilau', 'Food', 1)], EMPTY_KITCHEN, settingsWith());
    const counter = buildTickets(plan, { label: 'John', waiter: 'A', number: 7, round: 1, orderType: 'counter', now })[0];
    expect(ticketTitle(counter)).toBe('Counter: John');
    const table = buildTickets(plan, { label: '', waiter: 'A', number: 7, round: 1, orderType: 'table', now })[0];
    expect(ticketTitle(table)).toBe('Table (no name)');
  });

  it('gives every ticket an id of its own, shared prefix per send, so a repeat can be recognised', () => {
    const plan = planSend([line('P', 'Pilau', 'Food', 1), line('T', 'Tusker', 'Beer', 1)], EMPTY_KITCHEN, settingsWith());
    const a = buildTickets(plan, { label: 'T4', waiter: 'A', number: 1, round: 1, now });
    const b = buildTickets(plan, { label: 'T4', waiter: 'A', number: 1, round: 1, now });
    expect(a[0].clientId).not.toBe(a[1].clientId);
    expect(a[0].clientId.slice(0, -2)).toBe(a[1].clientId.slice(0, -2));
    expect(a[0].clientId).not.toBe(b[0].clientId); // a new send is a new set of ids
    expect(a[0].createdAt).toBe(now.toISOString());
  });

  it('numbers tickets from 1 each day', () => {
    const s = settingsWith();
    const day1 = new Date(2026, 9, 10, 9, 0);
    const a = takeTicketNumber(s, day1);
    const b = takeTicketNumber(a.settings, day1);
    expect([a.number, b.number]).toEqual([1, 2]);
    const c = takeTicketNumber(b.settings, new Date(2026, 9, 11, 9, 0));
    expect(c.number).toBe(1);
    expect(c.settings.nextTicket).toBe(2);
  });
});

describe('notes', () => {
  it('tidies a note and limits its length', () => {
    expect(cleanNote('  no   onions ')).toBe('no onions');
    expect(cleanNote('x'.repeat(200))).toHaveLength(MAX_NOTE);
    expect(cleanNote(null)).toBe('');
  });
});

describe('saved settings', () => {
  it('start switched off, with a Kitchen and a Bar, so nothing changes until someone turns it on', () => {
    const s = readSettings(fakeStorage(), 'Shop A');
    expect(s.enabled).toBe(false);
    expect(s.stations.map((x) => x.name)).toEqual(['Kitchen', 'Bar']);
    expect(s.quickNotes.length).toBeGreaterThan(0);
  });

  it('are kept separately for each business', () => {
    const st = fakeStorage();
    writeSettings(st, 'Shop A', { ...settingsWith(), nextTicket: 7 });
    expect(readSettings(st, 'Shop A').nextTicket).toBe(7);
    expect(readSettings(st, 'Shop B').nextTicket).toBe(1);
    expect(kitchenKey('Shop A')).not.toBe(kitchenKey('Shop B'));
  });

  it('report a failed save', () => {
    expect(writeSettings(fakeStorage({}, { fail: true }), 'Shop A', settingsWith())).toBe(false);
  });

  it('survive damaged or unexpected stored data', () => {
    expect(readSettings(fakeStorage({ [kitchenKey('A')]: '{oops' }), 'A').enabled).toBe(false);
    const odd = readSettings(fakeStorage({ [kitchenKey('A')]: JSON.stringify({ enabled: 'yes', stations: [{ name: '' }, null, { name: ' Grill ', groups: ['Meat', 5, ''] }], defaultStation: 'nope', quickNotes: 'x', nextTicket: -3 }) }), 'A');
    expect(odd.enabled).toBe(false);
    expect(odd.stations).toEqual([{ id: 'station-1', name: 'Grill', groups: ['Meat', '5'] }]);
    expect(odd.defaultStation).toBe('');
    expect(odd.nextTicket).toBe(1);
  });
});

describe('order type', () => {
  it('works out table or counter, and ignores anything else', () => {
    expect(orderTypeOf('counter', 'Table 4')).toBe('counter');
    expect(orderTypeOf('table', '')).toBe('table');
    expect(orderTypeOf('nonsense', 'Table 4')).toBe('table');
    expect(orderTypeOf(undefined, '  ')).toBe('counter');
  });
});

describe('station screens setting', () => {
  it('starts off, and is remembered', () => {
    expect(defaultSettings().screens).toBe(false);
    const st = fakeStorage();
    writeSettings(st, 'A', { ...settingsWith(), screens: true, lastOrderType: 'counter' });
    const back = readSettings(st, 'A');
    expect(back.screens).toBe(true);
    expect(back.lastOrderType).toBe('counter');
  });

  it('only counts an actual true, and ignores an unknown last order type', () => {
    const odd = readSettings(fakeStorage({ [kitchenKey('A')]: JSON.stringify({ screens: 'yes', lastOrderType: 'drive-through' }) }), 'A');
    expect(odd.screens).toBe(false);
    expect(odd.lastOrderType).toBe('table');
  });

  it('shares the business-wide settings and keeps device settings (printing, ticket numbers) out', () => {
    const shared = sharedPart({ ...settingsWith(), screens: true, printNow: false, nextTicket: 9, ticketDate: '2026-10-10' });
    expect(Object.keys(shared).sort()).toEqual([...SHARED_KEYS].sort());
    expect(shared).not.toHaveProperty('printNow');
    expect(shared).not.toHaveProperty('nextTicket');
    expect(shared.screens).toBe(true);
  });
});

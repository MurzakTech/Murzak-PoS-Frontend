import {
  addProductLine,
  amountOf,
  billLine,
  billRequest,
  cancelCopy,
  checkPurchase,
  csvName,
  dayWords,
  defaultMode,
  detailsFor,
  dueInfo,
  duplicateCodes,
  freshForm,
  isDirty,
  isoDay,
  kindChoices,
  kindFromParam,
  leftAfter,
  lineAmount,
  lineFrom,
  linesTotal,
  newPurchaseAddress,
  newRequestId,
  openAddress,
  orderRequest,
  parseQty,
  parseSpoilt,
  payProblems,
  purchasesCsv,
  purchasesTabs,
  qtyText,
  receiveAddress,
  receiveItems,
  receiveLines,
  receiveProblems,
  reviewFieldProblems,
  reviewLines,
  returnRemarks,
  reviewTotal,
  serverLines,
  spoiltItems,
  spoiltTotal,
  statusView,
  stockLine,
  summaryOf,
  tabAddress,
  tabFromParam,
} from './purchasesModel';

const order = {
  doctype: 'Purchase Order',
  number: '#O0012',
  supplier: { id: 'SUP-1', name: 'Bidco' },
  reference: 'PUR-ORD-2026-00012',
  totals: { subtotal: 2000, tax: 320, total: 2320 },
  lines: [
    { item_code: 'A', item_name: 'Sugar', unit: 'Kg', ordered: 10, received: 4, to_arrive: 6, rate: 100 },
    { item_code: 'B', item_name: 'Rice', unit: 'Kg', ordered: 5, received: 0, to_arrive: 5, rate: 200 },
    { item_code: 'C', item_name: 'Salt', unit: 'Kg', ordered: 2, received: 2, to_arrive: 0, rate: 50 },
  ],
};

describe('tabs and addresses', () => {
  test('the three tabs in order', () => {
    expect(purchasesTabs().map((t) => t.label)).toEqual(['All purchases', 'Orders', 'Returns']);
  });

  test('an unknown tab is All purchases', () => {
    expect(tabFromParam('orders')).toBe('orders');
    expect(tabFromParam('sessions')).toBe('all');
    expect(tabFromParam(undefined)).toBe('all');
  });

  test('a tab keeps the period, supplier and rows per page, and drops the search, page and open purchase', () => {
    expect(tabAddress('/new-look/purchases', 'orders', '?period=7d&supplier=SUP-1&size=50&q=sugar&page=3&open=X')).toBe('/new-look/purchases?period=7d&size=50&supplier=SUP-1&tab=orders');
  });

  test('All purchases has no tab in its address', () => {
    expect(tabAddress('/new-look/purchases', 'all', '?tab=returns')).toBe('/new-look/purchases');
  });

  test('the Show filter has the tabs view, goods received notes and every supplier bill', () => {
    expect(kindChoices().map((c) => [c.value, c.label])).toEqual([
      ['', 'Orders, bills and returns'],
      ['receipts', 'Goods received notes'],
      ['bills', 'All supplier bills'],
    ]);
    expect(kindFromParam('receipts')).toBe('receipts');
    expect(kindFromParam('bills')).toBe('bills');
    expect(kindFromParam('x')).toBe('');
    expect(kindFromParam(undefined)).toBe('');
  });

  test('a tab drops the view from the address', () => {
    expect(tabAddress('/new-look/purchases', 'orders', '?kind=bills&period=7d')).toBe('/new-look/purchases?period=7d&tab=orders');
  });

  test('the Reorder address fills a product in', () => {
    expect(newPurchaseAddress('SKU 1')).toBe('/new-look/purchases/new?item=SKU%201');
    expect(newPurchaseAddress()).toBe('/new-look/purchases/new');
  });

  test('the Receive goods and open addresses', () => {
    expect(receiveAddress('PO-1')).toBe('/new-look/purchases/receive?order=PO-1');
    expect(receiveAddress()).toBe('/new-look/purchases/receive');
    expect(openAddress('PINV 1')).toBe('/new-look/purchases?open=PINV%201');
  });
});

describe('dates and status', () => {
  test('a date reads day first', () => {
    expect(dayWords('2026-10-13')).toBe('13 Oct 2026');
    expect(dayWords('')).toBe('–');
  });

  test('isoDay writes a local day', () => {
    expect(isoDay(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('every status has an icon and a word', () => {
    ['draft', 'ordered', 'received', 'billed', 'paid', 'returned', 'cancelled'].forEach((s) => {
      const view = statusView(s);
      expect(view.icon).toBeTruthy();
      expect(view.words).toBeTruthy();
    });
    expect(statusView('paid')).toMatchObject({ icon: 'check', tone: 'good', words: 'Paid' });
    expect(statusView('billed').words).toBe('Billed');
  });

  test('an unknown status reads as it came', () => {
    expect(statusView('odd').words).toBe('odd');
  });

  test('a bill that is due soon or late says so, a paid one says nothing', () => {
    const today = new Date(2026, 9, 14);
    expect(dueInfo({ status: 'billed', due_date: '2026-11-01' }, today)).toEqual({ overdue: false, text: 'Due 1 Nov 2026' });
    expect(dueInfo({ status: 'billed', due_date: '2026-10-01' }, today)).toEqual({ overdue: true, text: 'Overdue since 1 Oct 2026' });
    expect(dueInfo({ status: 'paid', due_date: '2026-10-01' }, today)).toBeNull();
    expect(dueInfo({ status: 'billed', due_date: '' }, today)).toBeNull();
  });
});

describe('the spreadsheet', () => {
  const rows = [{ number: '#B0007', supplier: '=Bidco', date: '2026-10-11', total: 500, status: 'billed', bill_no: 'INV-9', due_date: '2026-11-10', outstanding: 500 }];

  test('has a heading row and one row per purchase, with the status in words', () => {
    const text = purchasesCsv(rows).split('\n');
    expect(text[0]).toBe('"Purchase","Supplier","Date","Total","Status","Bill number","Due date","Still owed"');
    expect(text[1]).toContain('"Billed"');
  });

  test('a cell that would be read as a formula is quoted', () => {
    expect(purchasesCsv(rows)).toContain('"\'=Bidco"');
  });

  test('the file is named after the tab and the day', () => {
    expect(csvName('orders', '2026-10-14')).toBe('purchases-orders-2026-10-14.csv');
  });
});

describe('the panel', () => {
  test('cancelling an order names what happens to the stock', () => {
    const copy = cancelCopy(order);
    expect(copy.title).toBe('Cancel order #O0012?');
    expect(copy.message).toContain('Bidco');
    expect(copy.message).toContain('KES 2,320');
    expect(copy.message).toContain('your stock does not change');
  });

  test('cancelling a bill names the stock taken out and the money removed', () => {
    const copy = cancelCopy({ doctype: 'Purchase Invoice', number: '#B0007', supplier: { name: 'Unga' }, totals: { total: 500, outstanding: 300 } });
    expect(copy.message).toContain('stock it added is taken out again');
    expect(copy.message).toContain('KES 300');
  });

  test('a paid bill does not talk about money owed', () => {
    const copy = cancelCopy({ doctype: 'Purchase Invoice', number: '#B0007', supplier: { name: 'Unga' }, totals: { total: 500, outstanding: 0 } });
    expect(copy.message).not.toContain('you owe');
  });

  test('a bill line says what is still owed only when something is', () => {
    expect(billLine({ number: '#B0001', total: 100, outstanding: 40 })).toBe('#B0001, KES 100, owed KES 40');
    expect(billLine({ number: '#B0001', total: 100, outstanding: 0 })).toBe('#B0001, KES 100');
  });

  test('the system reference goes under Details with the right label', () => {
    expect(detailsFor(order)).toEqual([{ label: 'Order reference', value: 'PUR-ORD-2026-00012' }]);
    expect(detailsFor({ doctype: 'Purchase Receipt', reference: 'MAT-1' })[0].label).toBe('Goods received reference');
    expect(detailsFor({ doctype: 'Purchase Invoice', reference: 'P-1', return_against: 'P-0' })).toHaveLength(2);
  });
});

describe('paying a bill', () => {
  const modes = [
    { name: 'Cash', kind: 'cash' },
    { name: 'M-Pesa', kind: 'mpesa' },
  ];

  test('a good payment has no problems', () => {
    expect(payProblems({ amount: '500', mode: 'Cash', modes, outstanding: 500 })).toEqual({});
  });

  test('the amount must be above 0 and not above what is owed', () => {
    expect(payProblems({ amount: '0', mode: 'Cash', modes, outstanding: 500 }).amount).toMatch(/above 0/);
    expect(payProblems({ amount: '501', mode: 'Cash', modes, outstanding: 500 }).amount).toContain('KES 500');
    expect(payProblems({ amount: '', mode: 'Cash', modes, outstanding: 500 }).amount).toBeTruthy();
  });

  test('M-Pesa needs its code, 8 to 12 letters and numbers', () => {
    expect(payProblems({ amount: '5', mode: 'M-Pesa', modes, reference: '', outstanding: 5 }).reference).toMatch(/M-Pesa code/);
    expect(payProblems({ amount: '5', mode: 'M-Pesa', modes, reference: 'ab 12', outstanding: 5 }).reference).toMatch(/8 to 12/);
    expect(payProblems({ amount: '5', mode: 'M-Pesa', modes, reference: 'QGH7K2LMN4', outstanding: 5 })).toEqual({});
  });

  test('cash needs no code', () => {
    expect(payProblems({ amount: '5', mode: 'Cash', modes, reference: '', outstanding: 5 }).reference).toBeUndefined();
  });

  test('a shop with ways of paying must choose one', () => {
    expect(payProblems({ amount: '5', mode: '', modes, outstanding: 5 }).mode).toBeTruthy();
    expect(payProblems({ amount: '5', mode: '', modes: [], outstanding: 5 })).toEqual({});
  });

  test('cash is offered first', () => {
    expect(defaultMode([{ name: 'Bank', kind: 'other' }, ...modes])).toBe('Cash');
    expect(defaultMode([{ name: 'Bank', kind: 'other' }])).toBe('Bank');
    expect(defaultMode([])).toBe('');
  });

  test('typed amounts keep digits and one dot', () => {
    expect(amountOf('1,250.50')).toBe(1250.5);
    expect(amountOf('12.3.4')).toBe(12.34);
    expect(amountOf('abc')).toBe(0);
  });
});

describe('receive goods quantities', () => {
  test('lines start ticked at what is still to arrive, and a finished line starts unticked', () => {
    const lines = receiveLines(order);
    expect(lines.map((l) => [l.item_code, l.ticked, l.qty])).toEqual([
      ['A', true, '6'],
      ['B', true, '5'],
      ['C', false, ''],
    ]);
  });

  test('quantities read as plain numbers', () => {
    expect(qtyText(6)).toBe('6');
    expect(qtyText(2.5)).toBe('2.5');
    expect(qtyText(1.00049)).toBe('1');
  });

  test('a typed quantity must be above 0', () => {
    expect(parseQty('2.5')).toBe(2.5);
    expect(parseQty('0')).toBeNull();
    expect(parseQty('')).toBeNull();
    expect(parseQty('.')).toBeNull();
    expect(parseQty('abc')).toBeNull();
  });

  test('the starting quantities have no problems', () => {
    expect(receiveProblems(receiveLines(order))).toEqual({});
  });

  test('more than is still to arrive is a problem for that line, naming how much is left', () => {
    const lines = receiveLines(order).map((l) => (l.item_code === 'A' ? { ...l, qty: '7' } : l));
    expect(receiveProblems(lines).A).toBe('Only 6 of Sugar is still to arrive. Enter that or less.');
  });

  test('a blank, zero or negative quantity is a problem', () => {
    const lines = receiveLines(order);
    expect(receiveProblems(lines.map((l) => (l.item_code === 'A' ? { ...l, qty: '' } : l))).A).toMatch(/How many|Enter how many/);
    expect(receiveProblems(lines.map((l) => (l.item_code === 'A' ? { ...l, qty: '0' } : l))).A).toMatch(/above 0/);
    expect(receiveProblems(lines.map((l) => (l.item_code === 'A' ? { ...l, qty: '-3' } : l))).A).toBeTruthy();
  });

  test('an unticked line is not checked', () => {
    const lines = receiveLines(order).map((l) => (l.item_code === 'A' ? { ...l, ticked: false, qty: '99' } : l));
    expect(receiveProblems(lines).A).toBeUndefined();
  });

  test('nothing ticked is a general problem', () => {
    const lines = receiveLines(order).map((l) => ({ ...l, ticked: false }));
    expect(receiveProblems(lines).general).toBe('Tick at least one item that arrived.');
  });

  test('an item on two lines cannot be received here', () => {
    const lines = [...receiveLines(order), ...receiveLines(order).slice(0, 1)];
    expect(duplicateCodes(lines)).toEqual(['A']);
    expect(receiveProblems(lines).A).toMatch(/more than once/);
  });

  test('only the ticked lines with a good quantity are sent', () => {
    const lines = receiveLines(order).map((l) => (l.item_code === 'B' ? { ...l, ticked: false } : l));
    expect(receiveItems(lines)).toEqual([{ item_code: 'A', qty_received: 6 }]);
  });

  test('a finished line is never sent even if ticked', () => {
    const lines = receiveLines(order).map((l) => (l.item_code === 'C' ? { ...l, ticked: true, qty: '1' } : l));
    expect(receiveItems(lines).map((i) => i.item_code)).toEqual(['A', 'B']);
  });

  test('the review adds up quantity times cost', () => {
    const lines = receiveLines(order).map((l) => (l.item_code === 'A' ? { ...l, qty: '2.5' } : l));
    expect(reviewLines(lines).map((l) => [l.item_code, l.qty, l.amount])).toEqual([
      ['A', 2.5, 250],
      ['B', 5, 1000],
    ]);
    expect(reviewTotal(lines)).toBe(1250);
  });

  test('what is left after a partly delivered order is listed', () => {
    const lines = receiveLines(order).map((l) => (l.item_code === 'A' ? { ...l, qty: '2' } : l));
    expect(leftAfter(lines)).toBe('Sugar 4');
  });

  test('a delivery that completes the order leaves nothing', () => {
    expect(leftAfter(receiveLines(order))).toBe('');
  });

  test('a due date before the bill date is a problem; blank dates are left alone', () => {
    expect(reviewFieldProblems({ billDate: '2026-10-13', dueDate: '2026-10-01' }).dueDate).toMatch(/before the bill date/);
    expect(reviewFieldProblems({ billDate: '2026-10-13', dueDate: '' })).toEqual({});
    expect(reviewFieldProblems({ billDate: '', dueDate: '2026-10-01' })).toEqual({});
  });

  test('a stock result line says before and now', () => {
    expect(stockLine({ item_code: 'A', before: 10, after: 16 }, { A: 'Sugar' })).toBe('Sugar: 10 before, 16 now');
    expect(stockLine({ item_code: 'A', before: 10, after: 16 })).toBe('A: 10 before, 16 now');
  });

  test('a spoilt quantity may be blank or 0, and is never more than what arrived', () => {
    expect(parseSpoilt('')).toBe(0);
    expect(parseSpoilt('0')).toBe(0);
    expect(parseSpoilt('2.5')).toBe(2.5);
    expect(parseSpoilt('abc')).toBe(null);
    const spoil = (spoilt) => receiveLines(order).map((l) => (l.item_code === 'A' ? { ...l, spoilt } : l));
    expect(receiveProblems(spoil('')).spoilt).toBeUndefined();
    expect(receiveProblems(spoil('2'))).toEqual({});
    expect(receiveProblems(spoil('7'))['spoilt:A']).toMatch(/received 6 of Sugar/);
    expect(receiveProblems(spoil('x'))['spoilt:A']).toMatch(/Enter a number/);
  });

  test('spoilt goods are still received, split into good stock, and valued for the return note', () => {
    const lines = receiveLines(order).map((l) => (l.item_code === 'A' ? { ...l, spoilt: '2', reason: 'Expired' } : l));
    expect(receiveItems(lines)[0]).toEqual({ item_code: 'A', qty_received: 6 });
    const a = reviewLines(lines).find((l) => l.item_code === 'A');
    expect([a.qty, a.spoilt, a.good]).toEqual([6, 2, 4]);
    expect(spoiltItems(lines)).toEqual([{ item_code: 'A', item_name: 'Sugar', qty: 2, rate: a.rate, reason: 'Expired' }]);
    expect(spoiltTotal(lines)).toBe(Math.round(2 * a.rate * 100) / 100);
    expect(spoiltItems(receiveLines(order))).toEqual([]);
  });

  test('an unticked line is never returned', () => {
    const lines = receiveLines(order).map((l) => (l.item_code === 'A' ? { ...l, ticked: false, spoilt: '2' } : l));
    expect(spoiltItems(lines)).toEqual([]);
  });

  test('the return note words group the products by reason and add the person\'s note', () => {
    const items = [
      { item_name: 'Sugar', qty: 2, reason: 'Damaged' },
      { item_name: 'Rice', qty: 1, reason: 'Damaged' },
      { item_name: 'Salt', qty: 3, reason: 'Expired' },
    ];
    expect(returnRemarks(items, ' DN 77 ')).toBe('Damaged: Sugar 2, Rice 1. Expired: Salt 3. DN 77');
    expect(returnRemarks(items).length).toBeLessThanOrEqual(140);
  });

  test('a request id is long enough for the server and different each time', () => {
    const a = newRequestId('recv');
    expect(a).toMatch(/^recv-[a-z0-9]+-[a-z0-9]+$/);
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(newRequestId('recv')).not.toBe(a);
  });
});

describe('the New purchase form', () => {
  const product = { item_code: 'A', item_name: 'Sugar', unit: 'Kg', cost: 95.5 };
  const good = { ...freshForm('2026-10-14'), supplier: 'SUP-1' };

  test('a line starts at quantity 1 and the cost on record', () => {
    expect(lineFrom(product)).toMatchObject({ item_code: 'A', name: 'Sugar', qty: '1', cost: '95.5' });
    expect(lineFrom({ item_code: 'B', item_name: 'Rice', cost: null }).cost).toBe('');
  });

  test('adding a product already on the list raises its quantity instead of adding a second line', () => {
    const first = addProductLine([], product);
    const second = addProductLine(first.lines, product);
    expect(second.merged).toBe(true);
    expect(second.lines).toHaveLength(1);
    expect(second.lines[0].qty).toBe('2');
  });

  test('a different product is a new line', () => {
    const first = addProductLine([], product);
    const second = addProductLine(first.lines, { item_code: 'B', item_name: 'Rice', cost: 10 });
    expect(second.merged).toBe(false);
    expect(second.lines).toHaveLength(2);
  });

  test('line amounts and the total add up', () => {
    const lines = [
      { ...lineFrom(product), qty: '2', cost: '100' },
      { ...lineFrom({ item_code: 'B', item_name: 'Rice', cost: 10 }), qty: '3', cost: '10.5' },
    ];
    expect(lineAmount(lines[0])).toBe(200);
    expect(linesTotal(lines)).toBe(231.5);
  });

  test('a good form has no problems', () => {
    expect(checkPurchase(good, [lineFrom(product)])).toEqual({});
  });

  test('the supplier and at least one product are required', () => {
    const problems = checkPurchase(freshForm('2026-10-14'), []);
    expect(problems.supplier).toBe('Choose the supplier.');
    expect(problems.items).toBe('Add at least one product.');
  });

  test('each line needs a quantity above 0 and a cost', () => {
    const line = { ...lineFrom(product), qty: '0', cost: '' };
    const problems = checkPurchase(good, [line]);
    expect(problems[`qty:${line.key}`]).toContain('Sugar');
    expect(problems[`cost:${line.key}`]).toContain('Sugar');
  });

  test('a cost of 0 is allowed', () => {
    const line = { ...lineFrom(product), cost: '0' };
    expect(checkPurchase(good, [line])).toEqual({});
  });

  test('a bill already held: the due date cannot be before the bill date', () => {
    const values = { ...good, haveBill: true, billDate: '2026-10-13', dueDate: '2026-10-01' };
    expect(checkPurchase(values, [lineFrom(product)]).dueDate).toMatch(/before the bill date/);
  });

  test('marking it paid needs an amount, not above the total, and a way of paying', () => {
    const lines = [{ ...lineFrom(product), qty: '2', cost: '100' }];
    const modes = [{ name: 'M-Pesa', kind: 'mpesa' }];
    const values = { ...good, haveBill: true, paid: true, paidAmount: '', paidHow: '', paidCode: '' };
    const problems = checkPurchase(values, lines, { modes });
    expect(problems.paidAmount).toBeTruthy();
    expect(problems.paidHow).toBeTruthy();
    expect(checkPurchase({ ...values, paidAmount: '201', paidHow: 'M-Pesa', paidCode: 'QGH7K2LMN4' }, lines, { modes }).paidAmount).toContain('KES 200');
    expect(checkPurchase({ ...values, paidAmount: '100', paidHow: 'M-Pesa', paidCode: '' }, lines, { modes }).paidCode).toBeTruthy();
    expect(checkPurchase({ ...values, paidAmount: '100', paidHow: 'M-Pesa', paidCode: 'QGH7K2LMN4' }, lines, { modes })).toEqual({});
  });

  test('payment fields are ignored when the bill is not held or not paid', () => {
    const lines = [lineFrom(product)];
    expect(checkPurchase({ ...good, paid: true, paidAmount: '' }, lines)).toEqual({});
    expect(checkPurchase({ ...good, haveBill: true, paid: false, paidAmount: '' }, lines)).toEqual({});
  });

  test('the summary lists problems in the order the fields appear, with the id of each field', () => {
    const line = { ...lineFrom(product), qty: '', cost: '' };
    const problems = checkPurchase(freshForm('2026-10-14'), [line]);
    const summary = summaryOf(problems, [line]);
    expect(summary.map((s) => s.id)).toEqual(['np-supplier', `np-qty-${line.key}`, `np-cost-${line.key}`]);
  });

  test('an empty list of items points at the list', () => {
    const summary = summaryOf(checkPurchase(good, []), []);
    expect(summary).toEqual([{ id: 'np-items', message: 'Add at least one product.' }]);
  });

  test('a form is dirty once anything changes, and clean again when it matches the start', () => {
    const start = freshForm('2026-10-14');
    expect(isDirty(start, [], start, [])).toBe(false);
    expect(isDirty({ ...start, supplier: 'SUP-1' }, [], start, [])).toBe(true);
    expect(isDirty(start, [lineFrom(product)], start, [])).toBe(true);
  });

  test('a form that arrived with a product filled in is not dirty until it is changed', () => {
    const start = freshForm('2026-10-14');
    const lines = [lineFrom(product)];
    expect(isDirty(start, lines, start, lines)).toBe(false);
    expect(isDirty(start, [{ ...lines[0], qty: '3' }], start, lines)).toBe(true);
  });

  test('the lines are sent as codes, numbers and costs', () => {
    expect(serverLines([{ ...lineFrom(product), qty: '2', cost: '95.50' }])).toEqual([{ item_code: 'A', qty: 2, rate: 95.5 }]);
  });

  test('without a held bill the request is an order with no bill details', () => {
    const request = orderRequest({ ...good, haveBill: true, billNo: 'X' }, [lineFrom(product)], 'po-1');
    expect(request).toEqual({ supplier: 'SUP-1', items: [{ item_code: 'A', qty: 1, rate: 95.5 }], date: '2026-10-14', warehouse: undefined, requestId: 'po-1' });
  });

  test('a held bill sends the bill details, the payment and the note', () => {
    const values = {
      ...good,
      haveBill: true,
      billNo: ' INV-1 ',
      billDate: '2026-10-01',
      dueDate: '',
      warehouse: 'Main - A',
      paid: true,
      paidAmount: '95.5',
      paidHow: 'M-Pesa',
      paidCode: ' QGH7K2LMN4 ',
      notes: ' By van ',
    };
    expect(billRequest(values, [lineFrom(product)], 'bill-1')).toEqual({
      supplier: 'SUP-1',
      items: [{ item_code: 'A', qty: 1, rate: 95.5 }],
      billNo: 'INV-1',
      billDate: '2026-10-01',
      dueDate: undefined,
      warehouse: 'Main - A',
      paidAmount: 95.5,
      mode: 'M-Pesa',
      reference: 'QGH7K2LMN4',
      notes: 'By van',
      requestId: 'bill-1',
    });
  });

  test('a bill that is not marked paid sends no payment', () => {
    const request = billRequest({ ...good, haveBill: true, paid: false, paidAmount: '50' }, [lineFrom(product)], 'bill-1');
    expect(request.paidAmount).toBeUndefined();
    expect(request.mode).toBeUndefined();
  });
});

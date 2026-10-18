import {
  categoryChoices,
  checkExpense,
  csvName,
  dayWords,
  defaultPaidFrom,
  expenseRequest,
  expensesCsv,
  filterCategories,
  firstProblem,
  freshForm,
  isDirty,
  isRefund,
  megabytes,
  newRequestId,
  paidFromChoices,
  paidFromWords,
  periodName,
  readAsDataUrl,
  reasonWords,
  receiptProblem,
  serverProblem,
  sourceWords,
  summaryOf,
} from './expensesModel';

const PAID_FROM = [
  { key: 'cash', label: 'Cash', available: true, reason: '' },
  { key: 'mpesa', label: 'M-Pesa', available: false, reason: 'no_account' },
  { key: 'bank', label: 'Bank', available: false, reason: 'no_mode' },
];

describe('dates and names', () => {
  test('a date reads day first', () => {
    expect(dayWords('2026-10-03')).toBe('3 Oct 2026');
    expect(dayWords('')).toBe('-');
    expect(dayWords(undefined)).toBe('-');
  });

  test('the period in a file name', () => {
    expect(periodName('7d')).toBe('last-7-days');
    expect(periodName('nonsense')).toBe('last-30-days');
    expect(csvName('30d', '2026-10-17')).toBe('expenses-last-30-days-2026-10-17.csv');
  });

  test('a request id is new each time and fit to send', () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9.:-]{8,64}$/);
  });
});

describe('paid from', () => {
  test('starts with the first choice the shop can use', () => {
    expect(defaultPaidFrom(PAID_FROM)).toBe('cash');
    expect(defaultPaidFrom([PAID_FROM[1], { key: 'bank', label: 'Bank', available: true }])).toBe('bank');
    expect(defaultPaidFrom([PAID_FROM[1]])).toBe('');
    expect(defaultPaidFrom()).toBe('');
  });

  test('a choice the shop cannot use says so and cannot be picked', () => {
    expect(paidFromChoices(PAID_FROM)).toEqual([
      { value: 'cash', label: 'Cash', disabled: false },
      { value: 'mpesa', label: 'M-Pesa (not set up)', disabled: true },
      { value: 'bank', label: 'Bank (not set up)', disabled: true },
    ]);
  });

  test('the reason is plain words', () => {
    expect(reasonWords(PAID_FROM[0])).toBe('');
    expect(reasonWords(PAID_FROM[1])).toBe('M-Pesa has no account linked to it yet. Ask your accountant to link one.');
    expect(reasonWords(PAID_FROM[2])).toBe('This shop does not have Bank set up.');
    expect(reasonWords({ key: 'cash', label: 'Cash', available: false, reason: 'account_unusable' })).toBe('The account linked to Cash cannot be used right now.');
    expect(reasonWords({ key: 'cash', label: 'Cash', available: false, reason: 'weird' })).toBe('Cash cannot be used right now.');
  });
});

describe('categories', () => {
  const categories = [
    { id: 'Rent - DS', label: 'Rent', group: 'Indirect' },
    { id: 'Airtime - DS', label: 'Airtime', group: 'Indirect' },
  ];

  test('the form offers the ones the server gave', () => {
    expect(categoryChoices(categories)).toEqual([
      { value: 'Rent - DS', label: 'Rent' },
      { value: 'Airtime - DS', label: 'Airtime' },
    ]);
    expect(categoryChoices()).toEqual([]);
  });

  test('the filter adds a category that only appears in the rows, or is already chosen, and sorts by name', () => {
    const rows = [{ category: { id: 'Power - DS', label: 'Power' } }, { category: { id: 'Rent - DS', label: 'Rent' } }];
    expect(filterCategories(categories, rows).map((c) => c.label)).toEqual(['Airtime', 'Power', 'Rent']);
    expect(filterCategories(categories, [], 'Water - DS').map((c) => c.label)).toEqual(['Airtime', 'Rent', 'Water']);
  });
});

describe('rows', () => {
  const mine = { kind: 'expense', reference_type: 'Journal Entry', paid_from: { key: 'cash', label: 'Cash' }, amount: 1500 };
  const bill = { kind: 'other', reference_type: 'Purchase Invoice', paid_from: null, amount: 4000 };

  test('where a row came from', () => {
    expect(sourceWords(mine)).toBe('Added on this page');
    expect(sourceWords(bill)).toBe('Supplier bill');
    expect(sourceWords({ kind: 'other', reference_type: 'Journal Entry' })).toBe('Journal entry');
    expect(sourceWords({ kind: 'other', reference_type: 'Stock Entry' })).toBe('Stock movement');
    expect(sourceWords({ kind: 'other', reference_type: 'Strange' })).toBe('Other entry');
    expect(sourceWords(null)).toBe('-');
  });

  test('what it was paid from', () => {
    expect(paidFromWords(mine)).toBe('Cash');
    expect(paidFromWords(bill)).toBe('-');
    expect(paidFromWords({ paid_from: { key: 'other', label: 'Safe' } })).toBe('Safe');
    expect(paidFromWords({ paid_from: { key: 'other', label: '' } })).toBe('Another account');
  });

  test('money back is a refund', () => {
    expect(isRefund({ amount: -200 })).toBe(true);
    expect(isRefund(mine)).toBe(false);
  });
});

describe('the spreadsheet', () => {
  test('has a header and a line for each row, with money as plain numbers', () => {
    const rows = [
      { date: '2026-10-16', category: { label: 'Office Rent' }, note: 'Rent, October', paid_from: { key: 'cash', label: 'Cash' }, amount: 1500, added_by: 'Amina', kind: 'expense', reference_type: 'Journal Entry' },
      { date: '2026-10-10', category: { label: 'Power' }, note: '', paid_from: null, amount: 4000, added_by: null, kind: 'other', reference_type: 'Purchase Invoice' },
    ];
    expect(expensesCsv(rows).split('\n')).toEqual([
      '"Date","Category","Note","Paid from","Amount","Added by","Source"',
      '"2026-10-16","Office Rent","Rent, October","Cash","1500","Amina","Added on this page"',
      '"2026-10-10","Power","","","4000","","Supplier bill"',
      '',
    ]);
  });

  test('a note that starts like a formula is made safe', () => {
    const csv = expensesCsv([{ date: '2026-10-16', category: { label: 'X' }, note: '=SUM(A1)', paid_from: null, amount: 1, kind: 'other', reference_type: 'Journal Entry' }]);
    expect(csv).toContain(`"'=SUM(A1)"`);
  });
});

describe('the form', () => {
  const good = { ...freshForm({ today: '2026-10-17', paidFrom: 'cash' }), amount: '1500', category: 'Rent - DS', date: '2026-10-16' };

  test('a fresh form has today and what it was given', () => {
    expect(freshForm({ today: '2026-10-17', category: 'Rent - DS', paidFrom: 'cash' })).toEqual({ amount: '', category: 'Rent - DS', paidFrom: 'cash', date: '2026-10-17', note: '', receipt: null });
    expect(freshForm()).toEqual({ amount: '', category: '', paidFrom: '', date: '', note: '', receipt: null });
  });

  test('is dirty only when something changed from where it started', () => {
    const start = freshForm({ today: '2026-10-17', paidFrom: 'cash' });
    expect(isDirty(start, start)).toBe(false);
    expect(isDirty({ ...start, amount: '5' }, start)).toBe(true);
    expect(isDirty({ ...start, note: 'x' }, start)).toBe(true);
    expect(isDirty({ ...start, category: 'Rent - DS' }, start)).toBe(true);
    expect(isDirty({ ...start, paidFrom: 'bank' }, start)).toBe(true);
    expect(isDirty({ ...start, date: '2026-10-01' }, start)).toBe(true);
    expect(isDirty({ ...start, receipt: { name: 'a.png', size: 1, dataUrl: 'data:x' } }, start)).toBe(true);
  });

  test('a good form has no problems', () => {
    expect(checkExpense(good, '2026-10-17')).toEqual({});
    expect(checkExpense({ ...good, date: '2026-10-17' }, '2026-10-17')).toEqual({});
  });

  test('says what is missing, beside each field', () => {
    expect(checkExpense({ ...good, amount: '', category: '', paidFrom: '', date: '' }, '2026-10-17')).toEqual({
      amount: 'Enter the amount',
      category: 'Choose a category',
      paidFrom: 'Choose what the money was paid from',
      date: 'Enter the date, for example 16/10/2026',
    });
  });

  test('the amount must be whole shillings above zero', () => {
    expect(checkExpense({ ...good, amount: '0' }, '2026-10-17').amount).toBe('The amount must be more than 0');
    expect(checkExpense({ ...good, amount: '12.5' }, '2026-10-17').amount).toBe('The amount must be a whole number of shillings');
    expect(checkExpense({ ...good, amount: '-5' }, '2026-10-17').amount).toBe('The amount must be a whole number of shillings');
  });

  test('the date cannot be after today', () => {
    expect(checkExpense({ ...good, date: '2026-10-18' }, '2026-10-17').date).toBe('The date cannot be in the future');
  });

  test('the note is at most 140 characters', () => {
    expect(checkExpense({ ...good, note: 'a'.repeat(140) }, '2026-10-17')).toEqual({});
    expect(checkExpense({ ...good, note: 'a'.repeat(141) }, '2026-10-17').note).toBe('The note can be at most 140 characters');
  });

  test('the summary lists the problems top to bottom with the id of each field', () => {
    const found = { note: 'n', amount: 'a', receipt: 'r', date: 'd' };
    expect(summaryOf(found)).toEqual([
      { id: 'ex-amount', message: 'a' },
      { id: 'ex-date', message: 'd' },
      { id: 'ex-note', message: 'n' },
      { id: 'ex-receipt', message: 'r' },
    ]);
    expect(firstProblem(found)).toBe('amount');
    expect(firstProblem({ date: 'd' })).toBe('date');
    expect(firstProblem({})).toBe('amount');
  });

  test('what is sent to the server', () => {
    expect(expenseRequest({ ...good, note: '  Rent for October ', receipt: { dataUrl: 'data:image/png;base64,AAAA' } }, 'exp-1', 'Demo Shop')).toEqual({
      amount: '1500',
      category: 'Rent - DS',
      paidFrom: 'cash',
      date: '2026-10-16',
      note: 'Rent for October',
      receipt: 'data:image/png;base64,AAAA',
      company: 'Demo Shop',
      requestId: 'exp-1',
    });
    expect(expenseRequest(good, 'exp-1', 'Demo Shop').receipt).toBeUndefined();
  });

  test('a refusal from the server sits beside its field, or on the whole form', () => {
    expect(serverProblem({ field: 'paid_from', message: 'No M-Pesa account.' })).toEqual({ field: 'paidFrom', message: 'No M-Pesa account.' });
    expect(serverProblem({ field: 'amount', message: 'Too much.' })).toEqual({ field: 'amount', message: 'Too much.' });
    expect(serverProblem({ message: 'Offline.' })).toEqual({ field: '', message: 'Offline.' });
    expect(serverProblem({ field: 'strange', message: 'x' }).field).toBe('');
    expect(serverProblem(null).message).toBe('The expense was not saved. Please try again.');
  });
});

describe('the receipt photo', () => {
  const file = (type, size) => ({ type, size, name: 'receipt' });

  test('sizes read in megabytes', () => {
    expect(megabytes(5 * 1024 * 1024)).toBe('5');
    expect(megabytes(1.5 * 1024 * 1024)).toBe('1.5');
    expect(megabytes(7.26 * 1024 * 1024)).toBe('7.3');
  });

  test('a picture of 5 MB or less is fine', () => {
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].forEach((type) => expect(receiptProblem(file(type, 1000))).toBe(''));
    expect(receiptProblem(file('image/png', 5 * 1024 * 1024))).toBe('');
    expect(receiptProblem(null)).toBe('');
  });

  test('anything else is refused in plain words', () => {
    expect(receiptProblem(file('application/pdf', 1000))).toBe('Choose a picture (JPG, PNG, GIF or WebP).');
    expect(receiptProblem(file('image/svg+xml', 1000))).toBe('Choose a picture (JPG, PNG, GIF or WebP).');
    expect(receiptProblem(file('image/png', 5 * 1024 * 1024 + 1))).toBe('This photo is 5 MB. Choose one of 5 MB or less.');
    expect(receiptProblem(file('image/png', 8.5 * 1024 * 1024))).toBe('This photo is 8.5 MB. Choose one of 5 MB or less.');
  });

  test('a file is read as text the server takes', async () => {
    const photo = new File(['abc'], 'r.png', { type: 'image/png' });
    await expect(readAsDataUrl(photo)).resolves.toBe('data:image/png;base64,YWJj');
  });
});

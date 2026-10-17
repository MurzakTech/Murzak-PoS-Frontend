import {
  csvName,
  dayWords,
  dueDateWords,
  dueUrgency,
  dueWords,
  editAddress,
  emptyForm,
  formFromSupplier,
  formProblems,
  GROUPS_PATH,
  hasOwed,
  isDirty,
  listAddress,
  nextBillText,
  owedFromParam,
  owedOptions,
  owedText,
  owes,
  purchasesAddress,
  statusFromParam,
  suppliersCsv,
  toServerValues,
} from './suppliersModel';

describe('the Owed filter and the status in the address', () => {
  test('?owed=1 turns the filter on for a person who may see what is owed', () => {
    ['1', 'true', 'owed', 'yes', 'TRUE'].forEach((value) => expect(owedFromParam(value, true)).toBe(true));
  });

  test('nothing, 0 or anything else leaves it off', () => {
    ['', '0', 'false', 'maybe', undefined, null].forEach((value) => expect(owedFromParam(value, true)).toBe(false));
  });

  test('a cashier never gets the filter, even with ?owed=1 in the address', () => {
    expect(owedFromParam('1', false)).toBe(false);
  });

  test('the two choices read All suppliers and Owed', () => {
    expect(owedOptions().map((o) => o.label)).toEqual(['All suppliers', 'Owed']);
  });

  test('the status is active unless the address says disabled or all', () => {
    expect(statusFromParam('')).toBe('active');
    expect(statusFromParam('gone')).toBe('active');
    expect(statusFromParam('disabled')).toBe('disabled');
    expect(statusFromParam('all')).toBe('all');
  });
});

describe('the addresses', () => {
  test('the panel of a supplier opens on the list', () => {
    expect(listAddress('/new-look/suppliers', 'SUP-1')).toBe('/new-look/suppliers?open=SUP-1');
  });

  test('a number with spaces and symbols is made safe', () => {
    expect(listAddress('/new-look/suppliers', 'Bidco & Sons')).toBe('/new-look/suppliers?open=Bidco%20%26%20Sons');
    expect(editAddress('/new-look/suppliers', 'Bidco & Sons')).toBe('/new-look/suppliers/Bidco%20%26%20Sons/edit');
  });

  test('a bill links to the Purchases page with the supplier and the bill', () => {
    expect(purchasesAddress('SUP-1', 'ACC-PINV-2026-00012')).toBe('/new-look/purchases?supplier=SUP-1&open=ACC-PINV-2026-00012');
  });

  test('all the bills of a supplier link to the Purchases page with only the supplier', () => {
    expect(purchasesAddress('SUP-1')).toBe('/new-look/purchases?supplier=SUP-1');
  });

  test('a supplier name in a link is made safe', () => {
    expect(purchasesAddress('A&B Mill')).toBe('/new-look/purchases?supplier=A%26B+Mill');
  });

  test('the supplier groups screen is the one that exists today', () => {
    expect(GROUPS_PATH).toBe('/suppliers/groups');
  });
});

describe('dates and what is owed', () => {
  test('a date reads day first', () => {
    expect(dayWords('2026-10-13')).toBe('13 Oct 2026');
    expect(dayWords('2026-01-05')).toBe('5 Jan 2026');
  });

  test('anything that is not a date gives a dash', () => {
    expect(dayWords('')).toBe('-');
    expect(dayWords(null)).toBe('-');
    expect(dayWords('soon')).toBe('-');
  });

  test('a row without an owed field (a cashier row) has no owed figure', () => {
    expect(hasOwed({ id: 'A' })).toBe(false);
    expect(hasOwed({ id: 'A', owed: 0 })).toBe(true);
    expect(hasOwed(undefined)).toBe(false);
  });

  test('a supplier is owed when the amount is above zero', () => {
    expect(owes({ owed: 5 })).toBe(true);
    expect(owes({ owed: 0 })).toBe(false);
    expect(owes({})).toBe(false);
  });

  test('the owed figure is money, and a dash when nothing is owed', () => {
    expect(owedText({ owed: 12000 })).toBe('KES 12,000');
    expect(owedText({ owed: 0 })).toBe('-');
    expect(owedText({})).toBe('-');
  });
});

describe('the word that goes with the due date', () => {
  test('a late bill says how many days late, with the right singular', () => {
    expect(dueWords({ state: 'overdue', days: -3 })).toBe('3 days late');
    expect(dueWords({ state: 'overdue', days: -1 })).toBe('1 day late');
  });

  test('a bill due soon says today or in how many days', () => {
    expect(dueWords({ state: 'soon', days: 0 })).toBe('Due today');
    expect(dueWords({ state: 'soon', days: 1 })).toBe('Due in 1 day');
    expect(dueWords({ state: 'soon', days: 3 })).toBe('Due in 3 days');
  });

  test('a bill far off, or none, has no word', () => {
    expect(dueWords({ state: 'later', days: 20 })).toBe('');
    expect(dueWords(null)).toBe('');
    expect(dueWords({})).toBe('');
  });

  test('only late and soon bills are urgent', () => {
    expect(dueUrgency({ state: 'overdue' })).toBe('overdue');
    expect(dueUrgency({ state: 'soon' })).toBe('soon');
    expect(dueUrgency({ state: 'later' })).toBe('');
    expect(dueUrgency(null)).toBe('');
  });

  test('the date of the next bill reads day first, or a dash', () => {
    expect(dueDateWords({ date: '2026-10-20' })).toBe('20 Oct 2026');
    expect(dueDateWords(null)).toBe('-');
  });

  test('the next bill reads amount and date for the panel', () => {
    expect(nextBillText({ amount: 12000, date: '2026-10-10' })).toBe('KES 12,000 on 10 Oct 2026');
  });
});

describe('the spreadsheet', () => {
  const rows = [
    { id: 'S1', name: 'Bidco Distributors', type: 'Company', group: 'Goods', tax_id: 'P051234567A', country: 'Kenya', currency: 'KES', disabled: false, owed: 20000, next_due: { date: '2026-10-10', amount: 12000 }, bills_due_soon: 1 },
    { id: 'S2', name: '=HYPERLINK("x")', type: 'Individual', disabled: true, owed: 0, next_due: null, bills_due_soon: 0 },
  ];

  test('an owner gets the money columns', () => {
    const lines = suppliersCsv(rows, true).trim().split('\n');
    expect(lines[0]).toBe('"Supplier","Type","Group","Tax ID","Country","Currency","Owed","Next bill due","Next bill amount","Bills due soon","Status"');
    expect(lines[1]).toBe('"Bidco Distributors","Company","Goods","P051234567A","Kenya","KES","20000","2026-10-10","12000","1","Active"');
  });

  test('a cashier gets no money columns', () => {
    const text = suppliersCsv(rows.map(({ owed, next_due, bills_due_soon, ...rest }) => rest), false); // eslint-disable-line no-unused-vars
    expect(text.split('\n')[0]).toBe('"Supplier","Type","Group","Tax ID","Country","Currency","Status"');
    expect(text).not.toMatch(/Owed|20000/);
  });

  test('a name that looks like a formula is made safe', () => {
    expect(suppliersCsv(rows, true)).toContain(`"'=HYPERLINK(""x"")"`);
  });

  test('a disabled supplier says Disabled', () => {
    expect(suppliersCsv(rows, true).trim().split('\n')[2]).toMatch(/"Disabled"$/);
  });

  test('the file name says the view and the day', () => {
    expect(csvName('owed', '2026-10-13')).toBe('suppliers-owed-2026-10-13.csv');
  });
});

describe('the supplier form', () => {
  test('a new supplier starts as a Kenyan company in shillings, enabled', () => {
    expect(emptyForm()).toEqual({ name: '', type: 'Company', taxId: '', group: '', country: 'Kenya', currency: 'KES', internal: false, enabled: true });
  });

  test('the name is required', () => {
    expect(formProblems({ ...emptyForm(), name: '   ' }).name).toBe('Enter the supplier name');
    expect(formProblems({ ...emptyForm(), name: 'Bidco' })).toEqual({});
  });

  test('a currency must be three letters, or empty', () => {
    expect(formProblems({ ...emptyForm(), name: 'A', currency: 'KE' }).currency).toMatch(/three letters/i);
    expect(formProblems({ ...emptyForm(), name: 'A', currency: 'usd' })).toEqual({});
    expect(formProblems({ ...emptyForm(), name: 'A', currency: '' })).toEqual({});
  });

  test('every problem is reported at once', () => {
    expect(Object.keys(formProblems({ ...emptyForm(), name: '', currency: '12' }))).toEqual(['name', 'currency']);
  });

  test('the server gets trimmed words, with the tax ID and the currency in capitals', () => {
    expect(toServerValues({ ...emptyForm(), name: '  Bidco  ', taxId: ' p051234567a ', currency: 'kes', group: 'Goods', country: ' Kenya ' })).toEqual({
      name: 'Bidco',
      type: 'Company',
      taxId: 'P051234567A',
      group: 'Goods',
      country: 'Kenya',
      currency: 'KES',
      internal: false,
    });
  });

  test('empty choices are left out', () => {
    const sent = toServerValues({ ...emptyForm(), name: 'A', group: '', country: '', currency: '' });
    expect(sent.group).toBeUndefined();
    expect(sent.country).toBeUndefined();
    expect(sent.currency).toBeUndefined();
  });

  test('the form starts with the supplier\'s own values, and a disabled supplier is not enabled', () => {
    expect(formFromSupplier({ name: 'Bidco', type: 'Individual', tax_id: 'P1', group: 'Goods', country: 'Kenya', currency: 'KES', internal: true, disabled: true })).toEqual({
      name: 'Bidco',
      type: 'Individual',
      taxId: 'P1',
      group: 'Goods',
      country: 'Kenya',
      currency: 'KES',
      internal: true,
      enabled: false,
    });
  });

  test('an unknown type reads Company', () => {
    expect(formFromSupplier({ name: 'A', type: 'Government' }).type).toBe('Company');
  });

  test('the form is dirty only when something differs from where it started', () => {
    const start = emptyForm();
    expect(isDirty(start, start)).toBe(false);
    expect(isDirty({ ...start, name: 'A' }, start)).toBe(true);
    expect(isDirty({ ...start, enabled: false }, start)).toBe(true);
  });
});

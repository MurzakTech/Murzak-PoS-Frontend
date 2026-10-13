import {
  TAB_KEYS,
  csvFor,
  csvName,
  detailsFor,
  differenceInfo,
  doctypeOf,
  emptyKind,
  methodsOf,
  paymentAmount,
  paymentProblems,
  receiptText,
  salesCsv,
  salesTabs,
  sessionClosed,
  sessionsCsv,
  statusView,
  tabAddress,
  tabFromParam,
  whatsappLink,
  whenLabel,
} from './salesModel';

// Made-up shop data only
const SALE = {
  id: 'ACC-PSINV-2026-00033',
  doctype: 'POS Invoice',
  receipt: '#0033',
  reference: 'ACC-PSINV-2026-00033',
  date: '2026-10-12',
  time: '14:05',
  customer: { name: 'Wanjiru Kamau', mobile: '0712345678' },
  cashier: 'Amina Hassan',
  status: 'unpaid',
  is_return: false,
  return_against: null,
  lines: [{ item_code: 'MLK', item_name: 'Milk 500ml', qty: 2, rate: 60, amount: 120 }],
  totals: { subtotal: 120, discount: 0, tax: 0, total: 120, paid: 50, outstanding: 70, change: 0 },
  payments: [{ mode: 'Cash', label: 'Cash', amount: 50, reference: '' }],
  returns: [],
  can: { take_payment: true, return_items: true, print: true, whatsapp: true },
};

describe('tabs', () => {
  test('there are four tabs in the order of the Spec', () => {
    expect(TAB_KEYS).toEqual(['all', 'unpaid', 'returns', 'sessions']);
    expect(salesTabs().map((t) => t.label)).toEqual(['All sales', 'Unpaid', 'Returns', 'Till sessions']);
  });

  test('a tab that is missing or unknown opens All sales', () => {
    expect(tabFromParam('unpaid')).toBe('unpaid');
    expect(tabFromParam('')).toBe('all');
    expect(tabFromParam('nonsense')).toBe('all');
  });

  test('a tab link keeps the period and rows per page and drops the search, page and open receipt', () => {
    expect(tabAddress('/new-look/sales', 'unpaid', 'period=7d&size=50&q=wanjiru&page=3&open=X')).toBe('/new-look/sales?period=7d&size=50&tab=unpaid');
    expect(tabAddress('/new-look/sales', 'all', 'tab=returns&q=a')).toBe('/new-look/sales');
    expect(tabAddress('/new-look/sales', 'sessions', 'period=custom&from=2026-10-01&to=2026-10-07')).toBe('/new-look/sales?period=custom&from=2026-10-01&to=2026-10-07&tab=sessions');
  });
});

describe('doctypeOf', () => {
  test('takes the kind from the list row, and otherwise guesses from the number', () => {
    expect(doctypeOf('A', [{ id: 'A', doctype: 'Sales Invoice' }])).toBe('Sales Invoice');
    expect(doctypeOf('ACC-PSINV-2026-00001')).toBe('POS Invoice');
    expect(doctypeOf('ACC-SINV-2026-00001')).toBe('Sales Invoice');
  });
});

describe('statusView', () => {
  test('a returned sale reads Returned with the Part returned icon; the others keep their own words', () => {
    expect(statusView('returned')).toEqual({ status: 'part-returned', words: 'Returned' });
    expect(statusView('paid')).toEqual({ status: 'paid', words: undefined });
    expect(statusView('overdue').status).toBe('overdue');
  });
});

describe('methodsOf', () => {
  test('is always a list', () => {
    expect(methodsOf({ methods: ['M-Pesa', '', 'Cash'] })).toEqual(['M-Pesa', 'Cash']);
    expect(methodsOf({})).toEqual([]);
    expect(methodsOf(null)).toEqual([]);
  });
});

describe('whenLabel', () => {
  const now = new Date(2026, 9, 13, 10, 0);
  test('says Today and Yesterday, then the day first', () => {
    expect(whenLabel('2026-10-13', '09:30', now)).toBe('Today, 09:30');
    expect(whenLabel('2026-10-12', '14:05', now)).toBe('Yesterday, 14:05');
    expect(whenLabel('2026-10-03', '08:00', now)).toBe('3 Oct, 08:00');
    expect(whenLabel('2025-12-03', '17:30', now)).toBe('3 Dec 2025, 17:30');
  });
  test('a missing date is a dash and a missing time leaves no dangling comma', () => {
    expect(whenLabel('', '', now)).toBe('–');
    expect(whenLabel('2026-10-13', '', now)).toBe('Today');
  });
});

describe('differenceInfo', () => {
  test('short, over and matches each have an icon and a word', () => {
    expect(differenceInfo(-200)).toMatchObject({ kind: 'short', icon: 'alert', words: 'Short KES 200' });
    expect(differenceInfo(150.5)).toMatchObject({ kind: 'over', icon: 'arrowUp', words: 'Over KES 150.50' });
    expect(differenceInfo(0)).toMatchObject({ kind: 'matches', icon: 'check', words: 'Matches' });
  });
  test('an open session has no difference, only a dash', () => {
    expect(differenceInfo(null)).toMatchObject({ kind: 'none', icon: null, words: '–' });
    expect(differenceInfo(undefined).kind).toBe('none');
  });
  test('a closed time or Still open', () => {
    expect(sessionClosed({ closed_at: '17:40' })).toBe('17:40');
    expect(sessionClosed({ closed_at: null })).toBe('Still open');
  });
});

describe('CSV', () => {
  const rows = [
    { receipt: '#0033', date: '2026-10-12', time: '14:05', customer: 'Wanjiru "Wawa" Kamau', cashier: 'Amina', methods: ['M-Pesa', 'Cash'], total: 1200, paid: 1200, outstanding: 0, status: 'paid' },
    { receipt: '#0034', date: '2026-10-12', time: '15:00', customer: '=SUM(A1)', cashier: 'Amina', methods: [], total: -300, paid: 0, outstanding: 0, status: 'returned' },
  ];
  test('sales rows have the ten columns of the Spec, quoted', () => {
    const lines = salesCsv(rows).trim().split('\n');
    expect(lines[0]).toBe('"Receipt","Date","Time","Customer","Cashier","Payment","Total","Paid","Outstanding","Status"');
    expect(lines[1]).toBe('"#0033","2026-10-12","14:05","Wanjiru ""Wawa"" Kamau","Amina","M-Pesa, Cash","1200","1200","0","paid"');
    expect(lines).toHaveLength(3);
  });
  test('a text that starts like a formula is quoted so a spreadsheet does not run it, and a return reads Returned', () => {
    const second = salesCsv(rows).trim().split('\n')[2];
    expect(second).toContain('"\'=SUM(A1)"');
    expect(second.endsWith('"Returned"')).toBe(true);
    expect(second).toContain('"-300"');
  });
  test('till sessions have their own columns, with blanks for an open session', () => {
    const text = sessionsCsv([
      { cashier: 'a@b.test', cashier_name: 'Amina Hassan', opened_on: '2026-10-12', opened_at: '08:00', closed_at: '17:30', status: 'closed', sales_count: 12, expected: 5000, counted: 4800, difference: -200 },
      { cashier: 'c@d.test', cashier_name: 'Otieno', opened_on: '2026-10-13', opened_at: '08:05', closed_at: null, status: 'open', sales_count: 2, expected: 1000, counted: null, difference: null },
    ]).trim().split('\n');
    expect(text[0]).toBe('"Cashier","Opened on","Opened at","Closed at","Status","Sales","Expected cash","Counted cash","Cash difference"');
    expect(text[1]).toBe('"Amina Hassan","2026-10-12","08:00","17:30","Closed","12","5000","4800","-200"');
    expect(text[2]).toBe('"Otieno","2026-10-13","08:05","","Open","2","1000","",""');
  });
  test('csvFor picks the right one for the tab, and the file name says which', () => {
    expect(csvFor('sessions', []).startsWith('"Cashier"')).toBe(true);
    expect(csvFor('unpaid', []).startsWith('"Receipt"')).toBe(true);
    expect(csvName('unpaid', '2026-10-13')).toBe('sales-unpaid-2026-10-13.csv');
  });
});

describe('WhatsApp', () => {
  test('builds a wa.me link from a Kenyan 07 number with the receipt text', () => {
    const link = whatsappLink(SALE);
    expect(link.startsWith('https://wa.me/254712345678?text=')).toBe(true);
    const text = decodeURIComponent(link.split('text=')[1]);
    expect(text).toContain('Wanjiru Kamau');
    expect(text).toContain('#0033');
    expect(text).toContain('12 Oct 2026');
    expect(text).toContain('2 x Milk 500ml, KES 120');
    expect(text).toContain('Still to pay: KES 70');
  });
  test('the message never carries a system reference', () => {
    expect(receiptText(SALE)).not.toMatch(/PSINV|SINV|ACC-/);
  });
  test('a paid sale does not say still to pay, and a sale with no lines is a short message', () => {
    const text = receiptText({ ...SALE, lines: [], totals: { ...SALE.totals, outstanding: 0, paid: 120 } });
    expect(text).not.toContain('Still to pay');
    expect(text).toContain('total KES 120, paid KES 120');
  });
  test('no usable mobile gives no link', () => {
    expect(whatsappLink({ ...SALE, customer: { name: 'A', mobile: '' } })).toBe('');
    expect(whatsappLink({ ...SALE, customer: null })).toBe('');
  });
});

describe('detailsFor', () => {
  test('the system reference goes under Details, with the original invoice for a return', () => {
    expect(detailsFor(SALE)).toEqual([{ label: 'POS invoice', value: 'ACC-PSINV-2026-00033' }]);
    expect(detailsFor({ ...SALE, doctype: 'Sales Invoice', return_against: 'ACC-SINV-1' })).toEqual([
      { label: 'Sales invoice', value: 'ACC-PSINV-2026-00033' },
      { label: 'Original invoice', value: 'ACC-SINV-1' },
    ]);
  });
});

describe('paymentProblems', () => {
  test('needs an amount that is more than nothing and no more than is owed', () => {
    expect(paymentProblems({ amount: '', mode: 'cash', outstanding: 70 }).amount).toMatch(/Enter the amount/);
    expect(paymentProblems({ amount: '0', mode: 'cash', outstanding: 70 }).amount).toBeDefined();
    expect(paymentProblems({ amount: '80', mode: 'cash', outstanding: 70 }).amount).toBe('That is more than the KES 70 still to pay');
    expect(paymentProblems({ amount: '70', mode: 'cash', outstanding: 70 })).toEqual({});
  });
  test('M-Pesa needs its code, letters and numbers, 8 to 12 characters', () => {
    expect(paymentProblems({ amount: '70', mode: 'mpesa', reference: '', outstanding: 70 }).reference).toBe('Enter the M-Pesa code');
    expect(paymentProblems({ amount: '70', mode: 'mpesa', reference: 'ab', outstanding: 70 }).reference).toMatch(/8 to 12/);
    expect(paymentProblems({ amount: '70', mode: 'mpesa', reference: 'SJK4D9X2LM', outstanding: 70 })).toEqual({});
    expect(paymentProblems({ amount: '70', mode: 'card', reference: '', outstanding: 70 })).toEqual({});
  });
  test('paymentAmount reads typed text', () => {
    expect(paymentAmount('1,250.50')).toBe(1250.5);
    expect(paymentAmount('abc')).toBe(0);
  });
});

describe('emptyKind', () => {
  test('filters give "no match"; otherwise the tab names its own empty state', () => {
    expect(emptyKind('all', true)).toBe('noMatch');
    expect(emptyKind('unpaid', false)).toBe('unpaid');
  });
});

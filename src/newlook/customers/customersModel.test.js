/**
 * The decisions of the Customers page as plain functions (ticket P4-7): the tabs and their addresses, dates and phone numbers,
 * the spreadsheet, the WhatsApp messages, the statement period, and the customer form checks.
 */
import {
  csvName,
  customerTabs,
  customersCsv,
  dayNumbers,
  dayWords,
  defaultMessage,
  editAddress,
  emptyForm,
  fileSafe,
  formFromCustomer,
  formProblems,
  isDirty,
  lastPurchaseDetail,
  lastPurchaseWords,
  listAddress,
  shortNumber,
  shownPhone,
  statementCsv,
  statementRange,
  statementText,
  statusFromParam,
  storedMobile,
  tabAddress,
  tabFromParam,
  toServerValues,
  typeFromParam,
  whatsappLink,
} from './customersModel';

describe('the tabs', () => {
  test('an owner has All customers and Owing, a cashier only All customers', () => {
    expect(customerTabs(true).map((t) => t.key)).toEqual(['all', 'owing']);
    expect(customerTabs(false).map((t) => t.key)).toEqual(['all']);
    expect(customerTabs(true).map((t) => t.label)).toEqual(['All customers', 'Owing']);
  });

  test('the Owing tab is only for a person who may see balances, and anything unknown is All customers', () => {
    expect(tabFromParam('owing', true)).toBe('owing');
    expect(tabFromParam('owing', false)).toBe('all');
    expect(tabFromParam('unpaid', true)).toBe('all');
    expect(tabFromParam(undefined, true)).toBe('all');
  });

  test('a tab keeps the rows per page and drops the page, the search and the open customer', () => {
    expect(tabAddress('/new-look/customers', 'owing', 'size=50&page=3&q=amina&open=C1&type=Company')).toBe('/new-look/customers?size=50&tab=owing');
    expect(tabAddress('/new-look/customers', 'all', 'page=3&tab=owing')).toBe('/new-look/customers');
  });

  test('filters from the address: a status or type that is unknown is ignored', () => {
    expect(statusFromParam('disabled')).toBe('disabled');
    expect(statusFromParam('gone')).toBe('active');
    expect(statusFromParam('')).toBe('active');
    expect(typeFromParam('Company')).toBe('Company');
    expect(typeFromParam('Government')).toBe('');
  });

  test('addresses of the panel and of the edit form', () => {
    expect(listAddress('/new-look/customers', 'CUST 7/A')).toBe('/new-look/customers?open=CUST%207%2FA');
    expect(editAddress('/new-look/customers', 'CUST-0007')).toBe('/new-look/customers/CUST-0007/edit');
    expect(editAddress('/new-look/customers', 'A B/C')).toBe('/new-look/customers/A%20B%2FC/edit');
  });
});

describe('dates, phone numbers and receipt numbers', () => {
  test('dates are day first', () => {
    expect(dayWords('2026-10-13')).toBe('13 Oct 2026');
    expect(dayWords('2026-01-02 09:00:00')).toBe('2 Jan 2026');
    expect(dayNumbers('2026-10-13')).toBe('13/10/2026');
    expect(dayWords('nonsense')).toBe('-');
    expect(dayNumbers(null)).toBe('-');
  });

  test('a stored phone number is shown as 0712 345 678', () => {
    expect(shownPhone('+254712345678')).toBe('0712 345 678');
    expect(shownPhone('0712345678')).toBe('0712 345 678');
    expect(shownPhone('')).toBe('-');
    expect(shownPhone(null)).toBe('-');
  });

  test('the last purchase reads as a date, with the amount only when the person may see it', () => {
    expect(lastPurchaseWords({ last_purchase: { date: '2026-10-05', amount: 250 } })).toBe('5 Oct 2026');
    expect(lastPurchaseWords({ last_purchase: null })).toBe('No purchases yet');
    expect(lastPurchaseDetail({ date: '2026-10-05', amount: 250 })).toBe('5 Oct 2026, KES 250');
    expect(lastPurchaseDetail({ date: '2026-10-05' })).toBe('5 Oct 2026');
    expect(lastPurchaseDetail(null)).toBe('No purchases yet');
  });

  test('the short number follows the Sales list rule', () => {
    expect(shortNumber('ACC-PSINV-2026-00005')).toBe('#0005');
    expect(shortNumber('ACC-SINV-2026-00005', 'S')).toBe('#S0005');
    expect(shortNumber('ACC-PAY-2026-00012', 'P')).toBe('#P0012');
    expect(shortNumber('ACC-PSINV-2026-00005-1')).toBe('#0005');
    expect(shortNumber('ACC-PSINV-2026-123456')).toBe('#123456');
    expect(shortNumber('OPENING')).toBe('OPENING');
  });
});

describe('the spreadsheet', () => {
  const rows = [
    { name: 'Wanjiru Kamau', mobile: '+254712345678', email: 'w@demo.test', type: 'Individual', balance: 3500, last_purchase: { date: '2026-10-05', amount: 250 }, disabled: false },
    { name: '=Cmd', mobile: '', email: '', type: 'Company', balance: 0, last_purchase: null, disabled: true },
  ];

  test('an owner gets the balance columns', () => {
    const lines = customersCsv(rows, true).trim().split('\n');
    expect(lines[0]).toBe('"Customer","Mobile","Email","Type","Balance owed","Last purchase","Last purchase amount","Status"');
    expect(lines[1]).toBe('"Wanjiru Kamau","0712 345 678","w@demo.test","Individual","3500","2026-10-05","250","Active"');
  });

  test('a cashier gets none', () => {
    const lines = customersCsv(rows.map(({ balance, ...r }) => ({ ...r, last_purchase: r.last_purchase && { date: r.last_purchase.date } })), false).trim().split('\n');
    expect(lines[0]).toBe('"Customer","Mobile","Email","Type","Last purchase","Status"');
    expect(lines[1]).toBe('"Wanjiru Kamau","0712 345 678","w@demo.test","Individual","2026-10-05","Active"');
  });

  test('a cell that starts like a formula gets a quote in front', () => {
    expect(customersCsv(rows, true).split('\n')[2].startsWith(`"'=Cmd"`)).toBe(true);
  });

  test('the file name says the tab and the day', () => {
    expect(csvName('owing', '2026-10-13')).toBe('customers-owing-2026-10-13.csv');
  });

  test('a file name part is letters and digits only', () => {
    expect(fileSafe('Wanjiru Kamau')).toBe('Wanjiru-Kamau');
    expect(fileSafe('  Baraka & Sons / Ltd. ')).toBe('Baraka-Sons-Ltd');
    expect(fileSafe('')).toBe('customer');
  });
});

describe('WhatsApp messages and links', () => {
  test('a customer who owes gets the reminder wording of Home, with the amount and the shop', () => {
    const text = defaultMessage({ name: 'Wanjiru', balance: 3500, shop: 'Duka la Amina' });
    expect(text).toBe('Hello Wanjiru, this is a friendly reminder that KES 3,500 is still outstanding on your account at Duka la Amina. Thank you.');
  });

  test('a customer who owes nothing gets a hello with no amount', () => {
    const text = defaultMessage({ name: 'Wanjiru', balance: 0, shop: 'Duka la Amina' });
    expect(text).toBe('Hello Wanjiru, thank you for shopping at Duka la Amina.');
    expect(defaultMessage({ name: 'W', balance: undefined, shop: '' })).toContain('our shop');
  });

  test('the link is wa.me with the international number and the text encoded', () => {
    const link = whatsappLink('0712 345 678', 'Hello & thanks');
    expect(link).toBe('https://wa.me/254712345678?text=Hello%20%26%20thanks');
    expect(whatsappLink('+254712345678', 'x')).toContain('wa.me/254712345678');
  });

  test('there is no link for a number WhatsApp cannot use', () => {
    expect(whatsappLink('', 'x')).toBe('');
    expect(whatsappLink('12345', 'x')).toBe('');
    expect(whatsappLink(null, 'x')).toBe('');
  });

  const lines = [
    { date: '2026-10-01', kind: 'sale', receipt: '#S0004', debit: 3000, credit: 0 },
    { date: '2026-10-08', kind: 'return', receipt: '#S0006', debit: 0, credit: 100 },
    { date: '2026-10-09', kind: 'payment', receipt: '#P0003', debit: 0, credit: 400 },
  ];

  test('the statement text has the balance and the latest lines, newest first', () => {
    const text = statementText({ name: 'Wanjiru', shop: 'Duka la Amina', balance: 2500, lines });
    expect(text).toBe(
      'Hello Wanjiru, here is your statement from Duka la Amina. You owe KES 2,500.\nLatest:\n09/10/2026 Payment #P0003 KES 400\n08/10/2026 Return #S0006 KES 100\n01/10/2026 Sale #S0004 KES 3,000\nThank you.'
    );
  });

  test('only the last five lines are used', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ date: `2026-10-0${i + 1}`, kind: 'sale', receipt: `#000${i}`, debit: 10, credit: 0 }));
    const text = statementText({ name: 'W', shop: 'S', balance: 5, lines: many });
    expect(text.match(/Sale/g)).toHaveLength(5);
    expect(text).toContain('09/10/2026');
    expect(text).not.toContain('04/10/2026');
  });

  test('a customer who owes nothing is told so', () => {
    expect(statementText({ name: 'W', shop: 'S', balance: 0, lines: [] })).toBe('Hello W, here is your statement from S. You owe nothing.\nThank you.');
  });
});

describe('the statement period and file', () => {
  const today = new Date(2026, 9, 13); // 13 October 2026

  test('last 30 days includes today and 29 days before', () => {
    expect(statementRange('30d', today)).toEqual({ from: '2026-09-14', to: '2026-10-13' });
  });

  test('last 90 days', () => {
    expect(statementRange('90d', today)).toEqual({ from: '2026-07-16', to: '2026-10-13' });
  });

  test('this month starts on the 1st', () => {
    expect(statementRange('month', today)).toEqual({ from: '2026-10-01', to: '2026-10-13' });
  });

  test('the spreadsheet has the balance at the start, every line and the balance at the end', () => {
    const csv = statementCsv({
      from: '2026-10-01',
      to: '2026-10-13',
      opening_balance: 1000,
      closing_balance: 3500,
      lines: [{ date: '2026-10-01', kind: 'sale', receipt: '#S0004', debit: 3000, credit: 0, balance: 4000 }, { date: '2026-10-09', kind: 'payment', receipt: '#P0003', debit: 0, credit: 500, balance: 3500 }],
    });
    expect(csv.trim().split('\n')).toEqual([
      '"Date","Document","Debit","Credit","Balance"',
      '"2026-10-01","Balance at the start","","","1000"',
      '"2026-10-01","Sale #S0004","3000","","4000"',
      '"2026-10-09","Payment #P0003","","500","3500"',
      '"2026-10-13","Balance at the end","","","3500"',
    ]);
  });
});

describe('the customer form checks', () => {
  const ok = { ...emptyForm(), name: 'Amina', mobile: '0712 345 678' };

  test('a name and a mobile are required', () => {
    expect(formProblems(emptyForm())).toEqual({ name: 'Enter the customer name', mobile: 'Enter a mobile number' });
    expect(formProblems(ok)).toEqual({});
    expect(formProblems({ ...ok, name: '   ' })).toEqual({ name: 'Enter the customer name' });
  });

  test('the Kenyan mobile helper accepts the usual ways of writing a number', () => {
    ['0712 345 678', '0712345678', '+254712345678', '+254 712 345 678', '254712345678', '712345678', '0112 345 678', '0712-345-678'].forEach((text) => {
      expect(formProblems({ ...ok, mobile: text })).toEqual({});
      expect(storedMobile(text)).toMatch(/^\+254[17]\d{8}$/);
    });
    expect(storedMobile('0712 345 678')).toBe('+254712345678');
    expect(storedMobile('712345678')).toBe('+254712345678');
  });

  test('other numbers are explained', () => {
    ['12345', '0212345678', '+1 555 123 4567', 'abc'].forEach((text) => {
      expect(formProblems({ ...ok, mobile: text }).mobile).toMatch(/Kenyan mobile number/);
    });
    expect(storedMobile('12345')).toBeNull();
  });

  test('the email, when given, must look like one', () => {
    expect(formProblems({ ...ok, email: 'a@b.co' })).toEqual({});
    expect(formProblems({ ...ok, email: 'a@b' }).email).toBe('That does not look like an email address');
    expect(formProblems({ ...ok, email: '' })).toEqual({});
  });

  test('the KRA PIN, when given, is a letter, nine digits and a letter', () => {
    expect(formProblems({ ...ok, taxId: 'A012345678Z' })).toEqual({});
    expect(formProblems({ ...ok, taxId: 'a012345678z' })).toEqual({});
    expect(formProblems({ ...ok, taxId: 'A01234' }).taxId).toMatch(/A KRA PIN is a letter/);
  });

  test('editing: an unchanged mobile is not checked again, and a customer without one needs none', () => {
    const original = { ...ok, mobile: '+1 555 123 4567' };
    expect(formProblems(original, original)).toEqual({});
    expect(formProblems({ ...original, mobile: '12345' }, original).mobile).toMatch(/Kenyan/);
    const none = { ...ok, mobile: '' };
    expect(formProblems(none, none)).toEqual({});
    expect(formProblems({ ...none, name: '' }, none)).toEqual({ name: 'Enter the customer name' });
    expect(formProblems({ ...ok, mobile: '' }, ok).mobile).toBe('Enter a mobile number');
  });

  test('the server gets the stored mobile, the PIN in capitals, and the group and area only when chosen', () => {
    expect(toServerValues({ ...ok, taxId: 'a012345678z', email: ' a@b.co ', group: 'Commercial', area: '' })).toEqual({
      name: 'Amina',
      mobile: '+254712345678',
      email: 'a@b.co',
      taxId: 'A012345678Z',
      type: 'Individual',
      group: 'Commercial',
      territory: undefined,
    });
  });

  test('editing: an unchanged mobile is left out of the update', () => {
    const original = { ...ok };
    expect(toServerValues({ ...ok, name: 'Amina H' }, original).mobile).toBeUndefined();
    expect(toServerValues({ ...ok, mobile: '0733 000 111' }, original).mobile).toBe('+254733000111');
  });

  test('the form starts empty with the type Individual', () => {
    expect(emptyForm()).toEqual({ name: '', mobile: '', email: '', taxId: '', type: 'Individual', group: '', area: '', disabled: false });
  });

  test('a customer from the server fills the form, with the phone written the way people read it', () => {
    expect(formFromCustomer({ name: 'Baraka', mobile: '+254733000111', email: null, tax_id: 'A012345678Z', type: 'Company', group: 'Commercial', territory: 'Nairobi', disabled: true })).toEqual({
      name: 'Baraka',
      mobile: '0733 000 111',
      email: '',
      taxId: 'A012345678Z',
      type: 'Company',
      group: 'Commercial',
      area: 'Nairobi',
      disabled: true,
    });
    expect(formFromCustomer({ name: 'X', type: 'Odd' }).type).toBe('Individual');
  });

  test('a form is dirty when any value differs from where it started', () => {
    expect(isDirty(emptyForm(), emptyForm())).toBe(false);
    expect(isDirty({ ...emptyForm(), name: 'A' }, emptyForm())).toBe(true);
    expect(isDirty({ ...emptyForm(), disabled: true }, emptyForm())).toBe(true);
  });
});

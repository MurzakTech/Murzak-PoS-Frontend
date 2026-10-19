import { addressLines, fromSale, fromTill, lineQuantity, pageRule, phoneText, plainAmount, rollLength, totalRows, whenFromDate, whenFromTexts } from './receiptModel';

const SALE = {
  id: 'ACC-PSINV-2026-00045',
  receipt: '#0045',
  reference: 'ACC-PSINV-2026-00045',
  date: '21 Oct 2026',
  time: '14:32',
  customer: { name: 'Wanjiru' },
  cashier: 'Amina',
  lines: [{ item_code: 'A', item_name: 'Milk 500ml', qty: 2, rate: 60, amount: 120 }],
  totals: { subtotal: 120, discount: 0, tax: 16, total: 120, paid: 150, outstanding: 0, change: 30 },
  payments: [{ mode: 'Mpesa', label: 'M-Pesa', amount: 150, reference: 'QWE123RTY4' }],
};

describe('a receipt from the Sales page', () => {
  test('keeps the short number, the full reference, the lines, the totals and the payments', () => {
    const r = fromSale(SALE);
    expect(r.number).toBe('#0045');
    expect(r.reference).toBe('ACC-PSINV-2026-00045');
    expect(r.when).toBe('21 Oct 2026, 14:32');
    expect(r.customer).toBe('Wanjiru');
    expect(r.lines).toEqual([{ name: 'Milk 500ml', qty: 2, unitWord: '', rate: 60, amount: 120, offer: 0 }]);
    expect(r.totals).toMatchObject({ total: 120, tax: 16, change: 30 });
    expect(r.payments).toEqual([{ label: 'M-Pesa', amount: 150, reference: 'QWE123RTY4' }]);
  });
  test('leaves out what the sale does not have', () => {
    const r = fromSale({ lines: [{ item_code: 'A', qty: 1, amount: 5 }], totals: {}, payments: [] });
    expect(r.lines[0].rate).toBeNull();
    expect(r.when).toBe('');
    expect(r.customer).toBe('');
  });
});

describe('a receipt from the till', () => {
  const invoice = { name: 'ACC-PSINV-2026-00099', grand_total: 1160, customer: 'Walk-in Customer' };
  const saleData = {
    items: [
      { item_code: 'A', item_name: 'Flour', qty: 2, rate: 180, subtotal: 360, uom: 'Nos' },
      { item_code: 'B', item_name: 'Oil', qty: 1, rate: 340, subtotal: 320, uom: 'Ltr', discount_amount: 20 },
      { item_code: 'C', item_name: 'Sugar', qty: 3, rate: 160, subtotal: 480, uom: 'Kg' },
    ],
    payments: [{ mode_of_payment: 'Cash', amount: 1160 }],
    paymentMode: 'Cash',
    amountGiven: 1200,
    grandTotal: 1160,
    timestamp: new Date(2026, 9, 21, 9, 5),
  };
  test('the short number leads, the offer is shown on its line, the change is worked out', () => {
    const r = fromTill({ invoice, saleData, cashierName: 'Amina', doctype: 'POS Invoice' });
    expect(r.number).toBe('#0099');
    expect(r.reference).toBe('ACC-PSINV-2026-00099');
    expect(r.when).toBe('21 Oct 2026, 09:05');
    expect(r.lines[1].offer).toBe(20);
    expect(r.totals).toMatchObject({ subtotal: 1180, offers: 20, discount: 0, total: 1160, change: 40, cashGiven: 1200 });
    expect(lineQuantity(r.lines[0])).toBe('2 pieces');
    expect(lineQuantity(r.lines[2])).toBe('3 kilograms');
  });
  test('an offline sale keeps its temporary name and has no reference', () => {
    const r = fromTill({ invoice: { name: 'OFFLINE-17', grand_total: 100, offline: true }, saleData: { ...saleData, paymentMode: 'Mpesa', amountGiven: 0 }, cashierName: 'A', doctype: 'POS Invoice' });
    expect(r.number).toBe('OFFLINE-17');
    expect(r.reference).toBe('');
    expect(r.offline).toBe(true);
    expect(r.totals.change).toBe(0);
  });
  test('tax from the invoice is shown, and the discount does not swallow it', () => {
    const r = fromTill({ invoice: { ...invoice, grand_total: 1160, total_taxes_and_charges: 160 }, saleData: { ...saleData, items: [{ item_code: 'A', item_name: 'X', qty: 1, rate: 1000, subtotal: 1000, uom: 'Nos' }] }, cashierName: 'A', doctype: 'POS Invoice' });
    expect(r.totals.tax).toBe(160);
    expect(r.totals.discount).toBe(0);
  });
});

describe('the totals block', () => {
  test('shows only TOTAL when nothing is added or taken off', () => {
    expect(totalRows({ total: 100 }).map((r) => r.key)).toEqual(['total']);
  });
  test('shows subtotal, offers, discount and tax when there are some, then TOTAL', () => {
    expect(totalRows({ subtotal: 200, offers: 10, discount: 5, tax: 16, total: 201 }).map((r) => r.key)).toEqual(['subtotal', 'offers', 'discount', 'tax', 'total']);
    expect(totalRows({ subtotal: 200, offers: 10, total: 190 })[1].value).toBe(-10);
  });
});

describe('small helpers', () => {
  test('amounts have no currency and keep cents only when there are some', () => {
    expect(plainAmount(1200)).toBe('1,200');
    expect(plainAmount(1200.5)).toBe('1,200.50');
    expect(plainAmount('')).toBe('');
  });
  test('the address is street lines then town and postal code; empty parts are left out', () => {
    expect(addressLines({ address: { line1: '1 Test Road', line2: '', city: 'Nairobi', pincode: '00100' } })).toEqual(['1 Test Road', 'Nairobi 00100']);
    expect(addressLines({})).toEqual([]);
  });
  test('the phone is written as the rest of the app writes it', () => {
    expect(phoneText({ phone: '+254712345678' })).toBe('0712 345 678');
    expect(phoneText({})).toBe('');
  });
  test('dates are day first', () => {
    expect(whenFromDate(new Date(2026, 0, 3, 7, 4))).toBe('03 Jan 2026, 07:04');
    expect(whenFromDate(null)).toBe('');
    expect(whenFromTexts('21 Oct 2026', '')).toBe('21 Oct 2026');
  });
  test('each style has its own @page rule', () => {
    expect(pageRule('thermal80', 150)).toContain('size: 80mm 150mm');
    expect(pageRule('thermal58', 120)).toContain('size: 58mm 120mm');
    expect(pageRule('a4')).toContain('size: A4');
    expect(pageRule('nonsense', 100)).toContain('80mm 100mm');
  });
  test('a roll has no word "auto" in it, and a long page is used until the length is measured', () => {
    expect(pageRule('thermal80')).toContain('80mm 297mm');
    expect(pageRule('thermal80')).not.toMatch(/auto/);
  });
  test('the length of a roll is the height on screen in mm plus margins and a little spare, rounded up', () => {
    // 378px is 100mm
    expect(rollLength(378, 'thermal80')).toBe(Math.ceil(378 / (96 / 25.4) + 6 + 4));
    expect(rollLength(0, 'thermal80')).toBe(297);
    expect(rollLength(undefined, 'thermal58')).toBe(297);
  });
});

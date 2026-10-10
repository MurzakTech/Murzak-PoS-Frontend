import { buildReturnLines, buildReturnPayload, returnBlocker } from './SalesReturns';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));

const invoice = {
  name: 'ACC-SINV-2026-00012',
  customer: 'Walk-in Customer',
  company: 'Murzak Shop',
  docstatus: 1,
  is_return: 0,
  items: [
    { name: 'row-1', item_code: 'MILK-500', item_name: 'Milk 500ml', qty: 4, rate: 60, uom: 'Nos', warehouse: 'Main - MS' },
    { name: 'row-2', item_code: 'BREAD', item_name: 'Bread', qty: 1, rate: 65, uom: 'Nos', warehouse: 'Main - MS' },
  ],
};

describe('returnBlocker', () => {
  it('allows a completed sale', () => {
    expect(returnBlocker(invoice)).toBeNull();
  });

  it.each([
    [null, /could not be found/],
    [{ success: false, message: 'Sales Invoice X does not exist' }, /could not be found/],
    [{ ...invoice, is_return: 1 }, /already a return/],
    [{ ...invoice, docstatus: 0 }, /draft/],
    [{ ...invoice, docstatus: 2 }, /cancelled/],
  ])('explains why %# cannot be returned', (doc, message) => {
    expect(returnBlocker(doc)).toMatch(message);
  });
});

describe('buildReturnPayload', () => {
  const lines = buildReturnLines(invoice);

  it('starts every line at zero', () => {
    expect(lines.map((l) => l.return_qty)).toEqual([0, 0]);
  });

  it('requires at least one item', () => {
    expect(buildReturnPayload({ invoice, lines, reason: 'Damaged or defective' }).error).toMatch(/at least one item/);
  });

  it('refuses more than was sold', () => {
    const over = lines.map((l, i) => (i === 1 ? { ...l, return_qty: 2 } : l));
    expect(buildReturnPayload({ invoice, lines: over, reason: 'Damaged or defective' }).error).toMatch(/more Bread than was sold/);
  });

  it('requires a reason, and a description for Other', () => {
    const one = lines.map((l, i) => (i === 0 ? { ...l, return_qty: 1 } : l));
    expect(buildReturnPayload({ invoice, lines: one, reason: '' }).error).toMatch(/reason/);
    expect(buildReturnPayload({ invoice, lines: one, reason: 'Other', notes: ' ' }).error).toMatch(/Describe/);
  });

  it('sends only returned lines, linked to the original sale', () => {
    const one = lines.map((l, i) => (i === 0 ? { ...l, return_qty: 2 } : l));
    const { payload, error } = buildReturnPayload({
      invoice, lines: one, reason: 'Expired or near expiry', notes: 'Past date on shelf', company: 'Murzak Shop',
    });
    expect(error).toBeUndefined();
    expect(payload).toMatchObject({
      customer: 'Walk-in Customer',
      return_against: 'ACC-SINV-2026-00012',
      company: 'Murzak Shop',
      reason: 'Expired or near expiry: Past date on shelf',
    });
    expect(payload.items).toEqual([
      expect.objectContaining({
        item_code: 'MILK-500', qty: 2, rate: 60, warehouse: 'Main - MS', against_sales_invoice_item: 'row-1',
      }),
    ]);
  });
});

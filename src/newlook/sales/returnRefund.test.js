import { defaultRefundMode, refundChoices } from './returnRefund';

describe('how a return is paid back', () => {
  const mpesaSale = { doctype: 'POS Invoice', payments: [{ mode: 'Cash', amount: 20 }, { mode: 'Mpesa', amount: 130 }] };

  it('defaults to the way the sale was mostly paid', () => {
    expect(defaultRefundMode(mpesaSale)).toBe('Mpesa');
    expect(defaultRefundMode({ payments: [{ mode: 'Cash', amount: 50 }] })).toBe('Cash');
  });

  it('defaults to Cash when nothing is known', () => {
    expect(defaultRefundMode(null)).toBe('Cash');
    expect(defaultRefundMode({ payments: [] })).toBe('Cash');
  });

  it('offers the original way first for an M-Pesa sale, then cash, and no credit for a till sale', () => {
    expect(refundChoices(mpesaSale)).toEqual([
      { value: 'Mpesa', kind: 'original' },
      { value: 'Cash', kind: 'cash' },
    ]);
  });

  it('offers cash and credit for a cash sale that is not a till sale', () => {
    expect(refundChoices({ doctype: 'Sales Invoice', payments: [{ mode: 'Cash', amount: 50 }] })).toEqual([
      { value: 'Cash', kind: 'cash' },
      { value: 'credit', kind: 'credit' },
    ]);
  });
});

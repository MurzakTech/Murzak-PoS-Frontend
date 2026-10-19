import { shortReceiptNumber } from './receiptNumber';

describe('the short receipt number', () => {
  test('a till sale is #0045, as the Sales list writes it', () => {
    expect(shortReceiptNumber('POS Invoice', 'ACC-PSINV-2026-00045')).toBe('#0045');
  });

  test('an invoice has an S, so it cannot be mistaken for a till sale with the same digits', () => {
    expect(shortReceiptNumber('Sales Invoice', 'ACC-SINV-2026-00045')).toBe('#S0045');
  });

  test('a long number is never cut, and a short one is padded to four digits', () => {
    expect(shortReceiptNumber('POS Invoice', 'ACC-PSINV-2026-123456')).toBe('#123456');
    expect(shortReceiptNumber('POS Invoice', 'ACC-PSINV-2026-5')).toBe('#0005');
  });

  test('a name with no number at the end is shown as it is', () => {
    expect(shortReceiptNumber('POS Invoice', 'OFFLINE-ABC')).toBe('OFFLINE-ABC');
    expect(shortReceiptNumber('POS Invoice', '')).toBe('');
    expect(shortReceiptNumber('POS Invoice', null)).toBe('');
  });
});

import { receiptMessage } from './receiptMessage';

test('says who it is from, the receipt and the amount', () => {
  expect(receiptMessage({ shop: 'Linda mwananchi', number: 'ACC-PSINV-2026-00050', total: 'KES 150' })).toBe(
    'Thank you for shopping at Linda mwananchi. Receipt ACC-PSINV-2026-00050: KES 150 paid. We hope to see you again.'
  );
});

test('copes with missing parts', () => {
  expect(receiptMessage({})).toContain('Thank you for shopping at our shop.');
});

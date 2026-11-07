import { isFormAddress } from './formAddress';

test('form addresses are told apart from list addresses', () => {
  ['/products/new', '/expenses/new', '/suppliers/new', '/purchases/new', '/new-look/products/new', '/products/ITEM1/edit', '/suppliers/:id/edit'].forEach((p) => expect(isFormAddress(p)).toBe(true));
  ['/products', '/expenses', '/sales/pos', '/reports', '/settings/business', '/newsletter'].forEach((p) => expect(isFormAddress(p)).toBe(false));
});

import { isPublicPath } from './publicPaths';

describe('addresses that never send a visitor to the login page', () => {
  test('the sign-in, sign-up and information pages, as before', () => {
    ['/login', '/register', '/signup', '/forgot-password', '/terms-of-service', '/privacy-policy', '/contact-us'].forEach((path) => {
      expect(isPublicPath(path)).toBe(true);
    });
  });

  test('a business\'s online store, its checkout and an order page', () => {
    ['/shop/duka', '/shop/duka/checkout', '/track/tok_abcdefghijkl'].forEach((path) => {
      expect(isPublicPath(path)).toBe(true);
    });
  });

  test('the back office is not public', () => {
    ['/', '/sales', '/ecommerce', '/products', '/settings/business', '/shopping', '/tracking', '/shop'].forEach((path) => {
      expect(isPublicPath(path)).toBe(false);
    });
  });

  test('a missing address is not public', () => {
    expect(isPublicPath()).toBe(false);
    expect(isPublicPath('')).toBe(false);
  });
});

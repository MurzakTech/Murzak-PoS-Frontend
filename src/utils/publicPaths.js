/**
 * Addresses a visitor can open without signing in. When the server answers "not signed in" to something the app asked for
 * in the background, the app sends the person to the login page, except on these addresses: a shopper on a business's
 * online store (or looking at their order) must never be thrown out to a login page they have no use for.
 */
const PUBLIC_FRAGMENTS = ['/login', '/register', '/signup', '/forgot-password', '/terms-of-service', '/privacy-policy', '/contact-us'];
const PUBLIC_PREFIXES = ['/shop/', '/track/'];

export const isPublicPath = (pathname = '') =>
  PUBLIC_FRAGMENTS.some((fragment) => pathname.includes(fragment)) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

export default isPublicPath;

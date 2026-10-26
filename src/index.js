/**
 * The one entry point for both builds.
 *
 *   npm run build                              the whole Murzak POS (till, back office, and the online store pages)
 *   REACT_APP_STOREFRONT_ONLY=true npm run build   only a shop's online store, for the small per-shop container
 *                                                  (deploy/storefront)
 *
 * The flag is replaced with its value at build time, so the build that is not wanted is dropped from the bundle:
 * the storefront-only build carries no till, no staff screens and no sign-in code.
 */
if (process.env.REACT_APP_STOREFRONT_ONLY === 'true') {
  import('./storefrontMain');
} else {
  import('./mainEntry');
}

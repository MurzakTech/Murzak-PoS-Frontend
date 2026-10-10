/* eslint-disable no-restricted-globals */
/**
 * Offline support, stage 1: keep the app itself on the device so it opens and
 * runs its screens without internet, instead of the browser's "no connection"
 * page. Business data (sales, stock, customers) is never stored here: the till
 * still needs the connection to save a sale, and a shared device must not keep
 * one person's data for the next.
 *
 * Built by react-scripts (Workbox InjectManifest) into build/service-worker.js.
 */
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

clientsClaim();

// The app's own files (scripts, styles, index.html), versioned by each build.
precacheAndRoute(self.__WB_MANIFEST);

// Paths served by the Frappe server on the same address (shop front doors proxy them).
// Opening these must reach the server, never the POS app shell.
const SERVER_PATHS = ['/api', '/app', '/desk', '/files', '/private', '/assets', '/printview', '/method', '/socket.io'];
const HAS_FILE_EXTENSION = /\/[^/?]+\.[^/]+$/;

// Any page of the app (/sales/pos, /inventory/...) opens from the stored index.html.
registerRoute(({ request, url }) => {
  if (request.mode !== 'navigate') return false;
  if (SERVER_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return false;
  return !HAS_FILE_EXTENSION.test(url.pathname);
}, createHandlerBoundToURL(`${process.env.PUBLIC_URL}/index.html`));

// The app's own pictures (logos, illustrations), not product photos from the server.
registerRoute(
  ({ url }) => url.origin === self.location.origin && /\.(png|jpe?g|svg|webp|ico)$/i.test(url.pathname)
    && !SERVER_PATHS.some((p) => url.pathname.startsWith(`${p}/`)),
  new CacheFirst({
    cacheName: 'app-images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// The page asks the waiting new version to take over (see serviceWorkerRegistration.js).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

import HomePage from './home/HomePage';
import ComponentPage from './ComponentPage';
import ChartsPage from './charts/ChartsPage';
import RedirectsPage from './redirects/RedirectsPage';
import PagePlaceholder from './redirects/PagePlaceholder';
import { NEW_PAGES } from './redirects/redirectTable';
import { NEW_LOOK_PREFIX } from './redirects/engine';
import { BUILT_PAGES } from './redirects/live';

/**
 * The redesigned screens built so far. Each opens inside the New look shell, and only while the shop's
 * New look switch is on (see NewLookGate). Anything not listed here is still the current screen.
 *
 * Add a screen by adding a row: { path, element }. For now these open for owners only (the access rules for
 * each role arrive with the Roles ticket, P1-8).
 */
export const newLookRoutes = [
  // Home (Phase 2): the greeting and hero band, four tiles, charts and Needs attention
  { path: '/new-look', element: HomePage },
  // Every shared component in every state, in both themes (the Phase 1 gate)
  { path: '/new-look/components', element: ComponentPage },
  // Every chart with made-up numbers (Phase 2, P2-2)
  { path: '/new-look/charts', element: ChartsPage },
  // Every old address and where it goes (acceptance check AC-06)
  { path: '/new-look/redirects', element: RedirectsPage },
  // Each new page until its real screen is built: a notice that names the page and links to the current screen.
  // A ticket that builds a page adds its own route above, and adds the page to BUILT_PAGES (redirects/live.js).
  ...NEW_PAGES.filter((page) => page.path !== '/' && !BUILT_PAGES.includes(page.path)).map((page) => ({ path: `${NEW_LOOK_PREFIX}${page.path}`, element: PagePlaceholder })),
];

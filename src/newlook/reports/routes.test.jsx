/**
 * The addresses of the Reports pages (ticket P5-2): the landing page and one page for every report each have a route of
 * their own, no address is registered twice, and every report that is a New look page has no placeholder hiding it.
 */
import { newLookRoutes } from '../newLookRoutes';
import PagePlaceholder from '../redirects/PagePlaceholder';
import { NEW_PAGES } from '../redirects/redirectTable';
import { REPORT_NAMES } from './reportsModel';

describe('the routes', () => {
  const find = (path) => newLookRoutes.filter((r) => r.path === path);

  test('the landing page and the report page each have one route of their own', () => {
    ['/new-look/reports', '/new-look/reports/:name'].forEach((path) => {
      expect(find(path)).toHaveLength(1);
      expect(find(path)[0].element).not.toBe(PagePlaceholder);
    });
  });

  test('no address is registered twice, so no placeholder hides a real page', () => {
    const paths = newLookRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('every report is a page of the New look, so its address is known', () => {
    const pages = NEW_PAGES.map((p) => p.path);
    REPORT_NAMES.forEach((name) => expect(pages).toContain(`/reports/${name}`));
  });

  test('stock movement and performance keep their placeholders, which link to the current screens', () => {
    ['/new-look/reports/stock-movement', '/new-look/reports/performance'].forEach((path) => {
      expect(find(path)[0].element).toBe(PagePlaceholder);
    });
  });
});

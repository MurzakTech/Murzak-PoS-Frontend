/**
 * The addresses of the Suppliers pages (ticket P4-6): the list, the Add form and the Edit form each have a page of their own, and no
 * address is registered twice so no placeholder hides a real page.
 */
import { newLookRoutes } from '../newLookRoutes';
import PagePlaceholder from '../redirects/PagePlaceholder';

describe('the routes', () => {
  const find = (path) => newLookRoutes.filter((r) => r.path === path);

  test('the list, the Add form and the Edit form each have one route of their own', () => {
    ['/new-look/suppliers', '/new-look/suppliers/new', '/new-look/suppliers/:id/edit'].forEach((path) => {
      expect(find(path)).toHaveLength(1);
      expect(find(path)[0].element).not.toBe(PagePlaceholder);
    });
  });

  test('no address is registered twice, so no placeholder hides a real page', () => {
    const paths = newLookRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

/**
 * The addresses of the Products pages (tickets P4-1 and P4-2): the list and the Categories tab share one page, the New product form has its
 * own, and the Import address keeps its placeholder until the import page is built.
 */
import { newLookRoutes } from '../newLookRoutes';
import PagePlaceholder from '../redirects/PagePlaceholder';
import { NEW_PAGES } from '../redirects/redirectTable';

const find = (path) => newLookRoutes.filter((r) => r.path === path);

describe('the routes', () => {
  test('the list and the Categories tab are one page, so moving between the tabs does not rebuild it', () => {
    expect(find('/new-look/products/*')).toHaveLength(1);
    expect(find('/new-look/products/*')[0].element.pageName).toBe('ProductsPage');
  });

  test('the New product form has a route of its own', () => {
    expect(find('/new-look/products/new')).toHaveLength(1);
    expect(find('/new-look/products/new')[0].element.pageName).toBe('NewProductPage');
  });

  test('no address of the Products pages is also given a placeholder', () => {
    const placeholders = newLookRoutes.filter((r) => r.element === PagePlaceholder).map((r) => r.path);
    ['/new-look/products', '/new-look/products/categories', '/new-look/products/new'].forEach((path) => expect(placeholders).not.toContain(path));
  });

  test('the Import page is still a placeholder, which the Import button reaches once it is live', () => {
    expect(NEW_PAGES.map((p) => p.path)).toContain('/products/import');
    expect(newLookRoutes.some((r) => r.path === '/new-look/products/import' && r.element === PagePlaceholder)).toBe(true);
  });

  test('no address is registered twice', () => {
    const paths = newLookRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

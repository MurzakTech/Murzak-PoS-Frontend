/**
 * The addresses of the Expenses pages (ticket P5-1): the list and the Add form each have a page of their own, they are not hidden behind
 * a placeholder, and no address is registered twice.
 */
import { newLookRoutes } from '../newLookRoutes';
import PagePlaceholder from '../redirects/PagePlaceholder';

describe('the routes', () => {
  const find = (path) => newLookRoutes.filter((r) => r.path === path);

  test('the list and the Add form each have one route of their own', () => {
    expect(find('/new-look/expenses')).toHaveLength(1);
    expect(find('/new-look/expenses')[0].element.pageName).toBe('ExpensesPage');
    expect(find('/new-look/expenses/new')).toHaveLength(1);
    expect(find('/new-look/expenses/new')[0].element.pageName).toBe('AddExpensePage');
    expect(find('/new-look/expenses')[0].element).not.toBe(PagePlaceholder);
  });

  test('no address is registered twice, so no placeholder hides a real page', () => {
    const paths = newLookRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

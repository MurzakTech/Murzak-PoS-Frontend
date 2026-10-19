/**
 * Route-level code splitting (ticket P6-3): every redesigned page loads only when its address is opened, so the chart library and the
 * page code stay out of the first load of the current screens.
 */
import fs from 'fs';
import path from 'path';
import { lazyPage, lazyNamed } from './lazyPage';
import { newLookRoutes } from './newLookRoutes';

describe('lazyPage', () => {
  test('gives a lazy component a readable name', () => {
    const Page = lazyPage(() => Promise.resolve({ default: () => null }), 'DemoPage');
    expect(Page.pageName).toBe('DemoPage');
    expect(Page.$$typeof).toBe(Symbol.for('react.lazy'));
  });

  test('lazyNamed picks one named export of a module', async () => {
    const Named = () => null;
    const Page = lazyNamed(() => Promise.resolve({ Named }), 'Named', 'Shown');
    expect(Page.pageName).toBe('Shown');
    // eslint-disable-next-line no-underscore-dangle
    const loaded = await Page._payload._result();
    expect(loaded.default).toBe(Named);
  });
});

describe('the New look routes', () => {
  test('every real page is lazy; only the placeholder is bundled with the routes', () => {
    const eager = newLookRoutes.filter((r) => !r.element.pageName && r.element.name !== 'PagePlaceholder');
    expect(eager.map((r) => r.path)).toEqual([]);
  });

  test('the routes file imports no page directly, so no page (and no chart code) joins the main bundle', () => {
    const source = fs.readFileSync(path.join(__dirname, 'newLookRoutes.js'), 'utf8');
    const staticImports = source.split('\n').filter((line) => /^import .* from '\.\//.test(line));
    const allowed = ["'./lazyPage'", "'./redirects/PagePlaceholder'", "'./redirects/redirectTable'", "'./redirects/engine'", "'./redirects/live'"];
    const stray = staticImports.filter((line) => !allowed.some((a) => line.includes(a)));
    expect(stray).toEqual([]);
  });
});

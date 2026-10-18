/**
 * Checks the table of old addresses against the real routes and against the New look address scheme.
 */
import fs from 'fs';
import path from 'path';
import { REDIRECTS, NEW_PAGES } from './redirectTable';

const read = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8');
const ROUTES_SOURCE = fs.readFileSync(path.join(__dirname, '../../routes/routes.js'), 'utf8');

// Every `path: '...'` in routes.js, including nested children. Some are listed twice (menu and route), so de-duplicate.
const oldPaths = [...new Set([...ROUTES_SOURCE.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]))];

const moved = REDIRECTS.filter((r) => r.status !== 'keep');
const tokensOf = (text) => text.match(/:[A-Za-z]\w*/g) || [];
// Two addresses match when every segment is equal, or either side is a ':name' segment.
const sameAddress = (a, b) => {
  const [x, y] = [a.split('/'), b.split('/')];
  return x.length === y.length && x.every((seg, i) => seg === y[i] || seg.startsWith(':') || y[i].startsWith(':'));
};

describe('every old address is in the table once', () => {
  test('routes.js has the addresses we expect to find', () => {
    expect(oldPaths.length).toBeGreaterThan(100);
  });

  test('each route in routes.js appears as a from', () => {
    const missing = oldPaths.filter((p) => !REDIRECTS.some((r) => r.from === p));
    expect(missing).toEqual([]);
  });

  test('no from is listed twice, and no from is a route that does not exist', () => {
    const froms = REDIRECTS.map((r) => r.from);
    expect(froms.filter((f, i) => froms.indexOf(f) !== i)).toEqual([]);
    expect(froms.filter((f) => !oldPaths.includes(f))).toEqual([]);
  });

  test('every entry has a known status, and only keep entries have no destination', () => {
    REDIRECTS.forEach((r) => {
      expect(['sure', 'unclear', 'keep']).toContain(r.status);
      expect(r.to === null).toBe(r.status === 'keep');
    });
  });
});

describe('every destination is a real New look page', () => {
  test('starts with a slash, has no transitional prefix, and lands on a page in NEW_PAGES', () => {
    const bad = moved.filter((r) => {
      const [pathPart] = r.to.split('?');
      return !r.to.startsWith('/') || r.to.includes('/new-look') || !NEW_PAGES.some((p) => sameAddress(p.path, pathPart));
    });
    expect(bad.map((r) => `${r.from} -> ${r.to}`)).toEqual([]);
  });

  test('every :token in a destination also appears in its from', () => {
    const bad = moved.filter((r) => tokensOf(r.to).some((t) => !tokensOf(r.from).includes(t)));
    expect(bad.map((r) => `${r.from} -> ${r.to}`)).toEqual([]);
  });

  test('every unclear entry explains what was assumed', () => {
    const bad = REDIRECTS.filter((r) => r.status === 'unclear' && !(typeof r.note === 'string' && r.note.trim()));
    expect(bad.map((r) => r.from)).toEqual([]);
  });
});

describe('the list of new pages', () => {
  const paths = NEW_PAGES.map((p) => p.path);

  test('is sorted, has no duplicates, and every page has a title', () => {
    expect(paths).toEqual([...new Set(paths)].sort());
    NEW_PAGES.forEach((p) => expect(p.title.trim()).not.toBe(''));
  });

  test('includes Home, the Till, the five Settings sections and the other pages in the address scheme', () => {
    const required = [
      '/', '/till',
      '/sales', '/sales/unpaid', '/sales/returns', '/sales/sessions', '/sales/new',
      '/customers', '/customers/owing', '/customers/new',
      '/products', '/products/categories', '/products/new', '/products/import',
      '/stock', '/stock/low', '/stock/movements', '/stock/count', '/stock/count/:id', '/stock/locations', '/stock/transfers', '/stock/expiry',
      '/purchases', '/purchases/orders', '/purchases/returns', '/purchases/new',
      '/suppliers', '/expenses', '/reports',
      '/settings/business', '/settings/till', '/settings/tax', '/settings/team', '/settings/advanced',
    ];
    expect(required.filter((p) => !paths.includes(p))).toEqual([]);
  });

  test('marks the pages that only some shops see', () => {
    const only = Object.fromEntries(NEW_PAGES.filter((p) => p.onlyWhen).map((p) => [p.path, p.onlyWhen]));
    expect(only).toEqual({
      '/stock/locations': 'second-location',
      '/stock/transfers': 'second-location',
      '/stock/expiry': 'tracks-expiry',
    });
  });

  test('each of the five Settings sections is the destination of at least one old address', () => {
    const used = moved.map((r) => r.to.split('?')[0]);
    ['/settings/business', '/settings/till', '/settings/tax', '/settings/team', '/settings/advanced'].forEach((section) => {
      expect(used).toContain(section);
    });
  });
});

describe('writing rules', () => {
  test('no em dash in the table, in the test, or in any note', () => {
    const emDash = String.fromCharCode(0x2014);
    expect(read('redirectTable.js')).not.toContain(emDash);
    expect(read('redirectTable.test.js')).not.toContain(emDash);
    REDIRECTS.forEach((r) => expect(`${r.from} ${r.to} ${r.note || ''}`).not.toContain(emDash));
  });
});

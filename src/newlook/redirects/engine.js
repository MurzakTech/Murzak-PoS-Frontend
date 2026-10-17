import { matchPath } from 'react-router-dom';
import { REDIRECTS } from './redirectTable';
import { isPageLive } from './live';

/**
 * Sends an old address to its new page (ticket P1-7, acceptance check AC-06).
 *
 * The table (redirectTable.js) lists every old address. The new pages live under a transitional prefix while the
 * old screens still exist; it is dropped when they are removed (rollout stage 5), by changing this one constant.
 *
 *   resolveRedirect('/sales/invoice/INV-9', '?x=1')  gives  { to: '/new-look/sales?open=INV-9&x=1', entry }
 *
 * It returns null when nothing should happen: the address is not in the table, the page is outside the redesign
 * (status "keep"), or the new page is not live yet (see live.js). When two entries match, the more specific one
 * wins (so '/purchases/new' beats '/purchases/:id'), whatever their order in the table.
 */
export const NEW_LOOK_PREFIX = '/new-look';

/**
 * Some jobs have no redesigned screen yet (a stock-only receipt, a sales return, the supplier groups). A link to the
 * current screen for one of them carries `legacy=1`, so the redirect leaves it alone and it does not bounce back to
 * the new page. `oldScreen('/sales/returns?invoice=X')` gives '/sales/returns?invoice=X&legacy=1'.
 */
export const LEGACY_KEY = 'legacy';
export const oldScreen = (address) => `${address}${address.includes('?') ? '&' : '?'}${LEGACY_KEY}=1`;

/** '/sales?open=1' gives '/new-look/sales?open=1'; '/' gives '/new-look' */
export const toNewAddress = (page) => {
  const [path, query] = page.split('?');
  const base = path === '/' ? NEW_LOOK_PREFIX : `${NEW_LOOK_PREFIX}${path}`;
  return query ? `${base}?${query}` : base;
};

const staticSegments = (pattern) => pattern.split('/').filter((s) => s && !s.startsWith(':') && s !== '*').length;

const safeDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
};

// A value in the path is encoded once; a value in the query is left plain, because URLSearchParams encodes it
const fill = (template, params) => {
  const [path, query] = template.split('?');
  const value = (name) => (params[name] !== undefined ? safeDecode(params[name]) : `:${name}`);
  const filledPath = path.replace(/:([A-Za-z0-9_]+)/g, (_, name) => encodeURIComponent(value(name)));
  const filledQuery = query === undefined ? undefined : query.replace(/:([A-Za-z0-9_]+)/g, (_, name) => value(name));
  return filledQuery === undefined ? filledPath : `${filledPath}?${filledQuery}`;
};

export const findEntry = (pathname, table = REDIRECTS) => {
  const matches = table
    .map((entry, index) => ({ entry, index, hit: matchPath({ path: entry.from, end: true }, pathname) }))
    .filter((m) => m.hit);
  if (matches.length === 0) return null;
  matches.sort((a, b) => staticSegments(b.entry.from) - staticSegments(a.entry.from) || a.index - b.index);
  return { entry: matches[0].entry, params: matches[0].hit.params };
};

export const resolveRedirect = (pathname, search = '', hash = '', { table = REDIRECTS, isLive = isPageLive } = {}) => {
  if (new URLSearchParams(search).get(LEGACY_KEY) === '1') return null;
  const found = findEntry(pathname, table);
  if (!found || found.entry.status === 'keep' || !found.entry.to) return null;
  const { entry, params } = found;
  const filled = fill(entry.to, params);
  if (!isLive(filled.split('?')[0])) return null;

  // Keep what the person had in the address (filters, a page number); the redirect's own keys win
  const [path, ownQuery] = filled.split('?');
  const query = new URLSearchParams(search);
  new URLSearchParams(ownQuery || '').forEach((value, key) => query.set(key, value));
  const text = query.toString();
  return { to: `${toNewAddress(path)}${text ? `?${text}` : ''}${hash || ''}`, entry };
};

/** The current screen that does the job of a new page, for the "being rebuilt" notice (null when there is none) */
export const oldAddressFor = (page, table = REDIRECTS) => {
  const path = page.split('?')[0];
  const hit = table.find((e) => e.status !== 'keep' && e.to && e.to.split('?')[0] === path && !e.from.includes(':') && e.from !== '*');
  return hit ? hit.from : null;
};

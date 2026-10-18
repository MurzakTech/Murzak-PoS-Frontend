/**
 * The shape of the Settings page (ticket P5-3, AC-32): five sections, addresses that resolve, the names the old addresses
 * redirect to, and links that do not bounce back.
 */
import { REDIRECTS, NEW_PAGES } from '../redirects/redirectTable';
import { findEntry, resolveRedirect } from '../redirects/engine';
import { newLookRoutes } from '../newLookRoutes';
import { ADVANCED_CARDS, SECTIONS, cardAddress, cardFromSearch, industryAddress, openFromSearch, sectionAddress, sectionFromPath } from './settingsModel';
import T from './strings.settings';

describe('the five sections', () => {
  test('are Business, Till and payments, Tax, Team and security and Advanced, in that order', () => {
    expect(SECTIONS.map((key) => T.shell.sections[key].title)).toEqual(['Business', 'Till and payments', 'Tax', 'Team and security', 'Advanced']);
  });

  test('match the Settings pages of the redirect table, with the same titles', () => {
    SECTIONS.forEach((key) => {
      const page = NEW_PAGES.find((p) => p.path === `/settings/${key}`);
      expect(page).toBeTruthy();
      expect(page.title).toBe(T.shell.sections[key].title);
    });
  });

  test('every section has a route, and so does the bare address', () => {
    const paths = newLookRoutes.map((r) => r.path);
    SECTIONS.forEach((key) => expect(paths).toContain(sectionAddress(key)));
    expect(paths).toContain('/new-look/settings');
  });

  test('a section is read from the address, and the bare address has none', () => {
    expect(sectionFromPath('/new-look/settings/tax')).toBe('tax');
    expect(sectionFromPath('/new-look/settings/team/')).toBe('team');
    expect(sectionFromPath('/new-look/settings')).toBeNull();
    expect(sectionFromPath('/new-look/settings/unknown')).toBeNull();
  });

  test('a card is asked for by ?section= and a role by ?open=', () => {
    expect(cardFromSearch('?section=brands')).toBe('brands');
    expect(cardFromSearch('')).toBe('');
    expect(openFromSearch('?open=Sales%20Manager')).toBe('Sales Manager');
  });
});

describe('the old Settings, Staff and Roles addresses', () => {
  const rows = REDIRECTS.filter((r) => /^\/(settings|staff|roles)/.test(r.from) && r.to);

  test('every row ends at one of the five sections', () => {
    const targets = rows.map((row) => row.to.split('?')[0]);
    const allowed = SECTIONS.map((key) => `/settings/${key}`);
    expect(targets.filter((target) => !allowed.includes(target))).toEqual([]);
    expect(rows.find((row) => row.from === '/settings').to).toBe('/settings/business');
  });

  test('every ?section= name the table sends to Advanced is a card there', () => {
    const names = REDIRECTS.filter((r) => r.to && r.to.startsWith('/settings/advanced?section=')).map((r) => new URLSearchParams(r.to.split('?')[1]).get('section'));
    expect(names.length).toBeGreaterThan(6);
    names.forEach((name) => expect(ADVANCED_CARDS.map((c) => c.section)).toContain(name));
  });

  test('Staff, Roles and the old Settings addresses all resolve, and open the new Settings pages now they are live', () => {
    ['/staff', '/roles', '/roles/Sales%20Manager', '/settings', '/settings/security', '/settings/audit-trail', '/settings/etims', '/settings/bank-accounts'].forEach((from) => {
      expect(findEntry(from)).not.toBeNull();
      expect(resolveRedirect(from, '').to).toMatch(/^\/new-look\/settings\//);
    });
  });

  test('a link to a current Settings screen carries the marker, so it does not bounce back', () => {
    ['/roles?legacy=1', '/settings/security?legacy=1', '/settings/etims?legacy=1', '/settings/bank-accounts?legacy=1'].forEach((from) => {
      const [path, query] = from.split('?');
      expect(resolveRedirect(path, `?${query}`)).toBeNull();
    });
  });

  test('with the redirects switched on in a test, Staff opens Team and a brand link opens Advanced on the brands card', () => {
    const live = () => true;
    expect(resolveRedirect('/staff', '', '', { isLive: live }).to).toBe('/new-look/settings/team');
    expect(resolveRedirect('/products/brands', '', '', { isLive: live }).to).toBe('/new-look/settings/advanced?section=brands');
  });
});

describe('the Advanced cards', () => {
  test('each has a title and one plain sentence', () => {
    ADVANCED_CARDS.forEach((card) => {
      const words = T.advanced.cards[card.section];
      expect(words.title).toBeTruthy();
      expect(words.text).toMatch(/\.$/);
    });
  });

  test('lists the ones the owner asked for', () => {
    expect(ADVANCED_CARDS.map((c) => T.advanced.cards[c.section].title)).toEqual(
      expect.arrayContaining(['Brands', 'Units', 'Warranties', 'Price groups', 'Supplier groups', 'Account provisioning', 'Industry starter products', 'Station screen settings', 'New look'])
    );
  });

  test('open the current screen with legacy=1, so the redirect does not send the person back here', () => {
    const brands = ADVANCED_CARDS.find((c) => c.section === 'brands');
    expect(cardAddress(brands, null)).toBe('/products/brands?legacy=1');
    const groups = ADVANCED_CARDS.find((c) => c.section === 'supplier-groups');
    expect(cardAddress(groups, null)).toBe('/suppliers/groups?legacy=1');
  });

  test('the New look switch is opened as it is, because it is not redirected', () => {
    expect(cardAddress(ADVANCED_CARDS.find((c) => c.section === 'new-look'), null)).toBe('/settings/new-look');
  });

  test('industry starter products need the shop type', () => {
    const industry = ADVANCED_CARDS.find((c) => c.section === 'industry-products');
    expect(cardAddress(industry, {})).toBeNull();
    expect(cardAddress(industry, { pos_industry: { industry_code: 'pharmacy' } })).toBe('/industry/pharmacy/products?legacy=1');
    expect(industryAddress({ pos_industry_code: 'retail shop' })).toBe('/industry/retail%20shop/products');
  });
});

import { oldScreen } from '../redirects/engine';

/**
 * The shape of the Settings page (ticket P5-3, acceptance check AC-32): the five sections, the address of each, and the
 * cards of Advanced, each with the current screen it opens. Pure data and small functions, so they are tested alone.
 */
export const SECTIONS = ['business', 'till', 'tax', 'team', 'advanced'];
/** The same names as an object, for code that names one section */
export const SECTION = { business: 'business', till: 'till', tax: 'tax', team: 'team', advanced: 'advanced' };
export const FIRST_SECTION = 'business';
export const SETTINGS_PATH = '/new-look/settings';

export const sectionAddress = (key) => `${SETTINGS_PATH}/${key}`;

/** Which section an address shows: '/new-look/settings/tax' gives 'tax'; the bare address and unknown names give null. */
export const sectionFromPath = (pathname) => {
  const last = String(pathname || '').replace(/\/+$/, '').split('/').pop();
  return SECTIONS.includes(last) ? last : null;
};

/** The card an address asks for: ?section=brands (Advanced) or ?open=<role> (Team). Empty when there is none. */
export const cardFromSearch = (search) => {
  const params = new URLSearchParams(search || '');
  return params.get('section') || '';
};
export const openFromSearch = (search) => new URLSearchParams(search || '').get('open') || '';

// The current screens that do the jobs which stay there (a link carries legacy=1, so it does not bounce back here)
export const OLD = {
  bankAccounts: '/settings/bank-accounts',
  paymentGateways: '/settings/payment-gateways',
  paymentMethods: '/settings/payment-methods',
  tillProfile: '/settings/pos-profile',
  inventoryDiscounts: '/settings/inventory-discounts',
  loyalty: '/settings/loyalty-programs',
  etims: '/settings/etims',
  security: '/settings/security',
  auditTrail: '/settings/audit-trail',
  roles: '/roles',
  staff: '/staff',
  accountProvisioning: '/settings/account-provisioning',
  brands: '/products/brands',
  units: '/products/units',
  warranties: '/products/warranties',
  priceGroups: '/products/price-groups',
  supplierGroups: '/suppliers/groups',
  kitchen: '/kitchen',
  newLook: '/settings/new-look',
};

export const legacy = (address) => oldScreen(address);

/**
 * The cards of Advanced, in order. `section` is the name the redirect table uses in ?section=; `to` is the current screen.
 * The industry starter list needs the shop type, so its address is made from it (see industryAddress).
 */
export const ADVANCED_CARDS = [
  { section: 'brands', to: OLD.brands },
  { section: 'units', to: OLD.units },
  { section: 'warranties', to: OLD.warranties },
  { section: 'price-groups', to: OLD.priceGroups },
  { section: 'supplier-groups', to: OLD.supplierGroups },
  { section: 'account-provisioning', to: OLD.accountProvisioning },
  { section: 'inventory-discounts', to: OLD.inventoryDiscounts },
  { section: 'loyalty-programs', to: OLD.loyalty },
  { section: 'industry-products', to: null },
  { section: 'station-screen', to: OLD.kitchen },
  // The New look switch is not redirected, so its address is used as it is
  { section: 'new-look', to: OLD.newLook, plain: true },
];

/** The starter products address for the shop's type, or null when the type is not known. */
export const industryAddress = (user) => {
  const code = user && ((user.pos_industry && (user.pos_industry.industry_code || user.pos_industry.name)) || user.pos_industry_code);
  return code ? `/industry/${encodeURIComponent(code)}/products` : null;
};

/** The address a card opens, made safe for the redirects (legacy=1), or null when it cannot open. */
export const cardAddress = (card, user) => {
  const to = card.section === 'industry-products' ? industryAddress(user) : card.to;
  if (!to) return null;
  return card.plain ? to : legacy(to);
};

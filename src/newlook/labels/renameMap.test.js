import {
  RENAMES,
  OLD_TERMS,
  displayName,
  isHidden,
  searchAliases,
  matchesSearch,
  formatPhone,
  toStoredPhone,
  formatReceiptNumber,
  formatMoney,
} from './renameMap';

// The visible rows of the Spec table (Language and formats), written out by hand
// so this test is an independent check of the list. Format: [old, show, where].
const SPEC_VISIBLE = [
  ['GRN', 'Receive goods', 'Purchases'],
  ['Create GRN', 'Receive goods', 'Purchases'],
  ['GRN List', 'Goods received', 'Purchases'],
  ['Submit Order', 'Send order to supplier', 'Purchases'],
  ['Material Receipts', 'Stock in', 'Stock levels'],
  ['Material Issues', 'Stock out or write-off', 'Stock levels'],
  ['Reconciliation', 'Count stock', 'Stock levels'],
  ['Opening Entries', 'Till sessions', 'Sales'],
  ['Item Group', 'Category', 'Products and till'],
  ['Item Groups', 'Categories', 'Products and till'],
  ['UOM', 'Unit', 'Products and till'],
  ['Nos', 'piece', 'Products and till'],
  ['Item Code', 'Product code', 'Products'],
  ['Customer Credit', 'Owing', 'Customers'],
  ['Posting Date', 'Date', 'New invoice'],
  ['Apply Discount On', 'Discount', 'New invoice'],
  ['Open POS', 'Go to till', 'Top bar, Sales and till'],
  ['Point of Sale', 'Till', 'Top bar, Sales and till'],
  ['New Sale (POS)', 'New sale', 'Top bar, Sales and till'],
  ['Credit Card', 'Card', 'Till'],
  ['Bank Draft', 'Other', 'Till'],
  ['Cheque', 'Other', 'Till'],
  ['Wire Transfer', 'Other', 'Till'],
  ['Profile: Admin', "The cashier's name", 'Till'],
  ['POS Profile', 'Till settings', 'Settings'],
];

// Rows whose Show column says Hidden. Format: [old, where].
const SPEC_HIDDEN = [
  ['Stock Entry', 'Stock levels'],
  ['Customer Group', 'Customers'],
  ['Territory', 'Customers'],
  ['All Warehouses', 'Stock levels and till'],
  ['Work In Progress', 'Stock levels and till'],
  ['Finished Goods', 'Stock levels and till'],
  ['Goods In Transit', 'Stock levels and till'],
];

const find = (old) => RENAMES.find((entry) => entry.old === old);

describe('RENAMES against the Spec table', () => {
  test.each(SPEC_VISIBLE)('%s shows as "%s" in %s', (old, show, where) => {
    const entry = find(old);
    expect(entry).toBeDefined();
    expect(entry.show).toBe(show);
    expect(entry.where).toBe(where);
    expect(entry.hidden).toBe(false);
  });

  test.each(SPEC_HIDDEN)('%s is hidden in %s with the rule in note', (old, where) => {
    const entry = find(old);
    expect(entry).toBeDefined();
    expect(entry.hidden).toBe(true);
    expect(entry.show).toBeNull();
    expect(entry.where).toBe(where);
    expect(entry.note).toMatch(/\S/);
  });

  test('the hidden rules carry the wording of the Spec', () => {
    expect(find('Stock Entry').note).toMatch(/Hidden unless the shop makes goods/);
    expect(find('Customer Group').note).toMatch(/Hidden unless used/);
    expect(find('Territory').note).toMatch(/Hidden unless used/);
    expect(find('All Warehouses').note).toMatch(/the one location is shown by name/);
  });

  test('the receipt number row is a pattern, not a plain string', () => {
    const entry = find('ACC-PSINV-2026-00005');
    expect(entry.pattern).toBe(true);
    expect(entry.show).toBe('Receipt #0005');
    expect(entry.where).toBe('Sales');
    expect(entry.note).toMatch(/Details/);
  });

  test('Account Provisioning needs the owner to confirm', () => {
    const entry = find('Account Provisioning');
    expect(entry.needsConfirmation).toBe(true);
    expect(entry.where).toBe('Settings');
    expect(entry.note).toMatch(/confirm/);
  });

  test('has exactly the rows above and no invented renames', () => {
    const expected = SPEC_VISIBLE.length + SPEC_HIDDEN.length + 2; // the receipt pattern and Account Provisioning
    expect(RENAMES).toHaveLength(expected);
    const olds = RENAMES.map((entry) => entry.old);
    expect(new Set(olds).size).toBe(olds.length);
  });

  test('every entry has the full shape', () => {
    RENAMES.forEach((entry) => {
      expect(typeof entry.old).toBe('string');
      expect(typeof entry.where).toBe('string');
      expect(typeof entry.hidden).toBe('boolean');
      expect(entry.show === null || typeof entry.show === 'string').toBe(true);
    });
  });
});

describe('displayName', () => {
  test('returns the display name for an exact match', () => {
    expect(displayName('Material Receipts')).toBe('Stock in');
    expect(displayName('GRN List')).toBe('Goods received');
  });

  test('ignores case and outer spaces', () => {
    expect(displayName('  material receipts ')).toBe('Stock in');
    expect(displayName('item GROUPS')).toBe('Categories');
  });

  test('does not match part of a name', () => {
    expect(displayName('Item')).toBe('Item');
    expect(displayName('Material Receipts List')).toBe('Material Receipts List');
  });

  test('keeps singular and plural apart', () => {
    expect(displayName('Item Group')).toBe('Category');
    expect(displayName('Item Groups')).toBe('Categories');
  });

  test('returns null for a hidden entry', () => {
    expect(displayName('Territory')).toBeNull();
    expect(displayName('goods in transit')).toBeNull();
  });

  test('returns unknown input unchanged', () => {
    expect(displayName('Dashboard')).toBe('Dashboard');
    expect(displayName(' Dashboard ')).toBe(' Dashboard ');
    expect(displayName('')).toBe('');
    expect(displayName(undefined)).toBeUndefined();
    expect(displayName(null)).toBeNull();
  });

  test('returns the input unchanged for the pattern and the unconfirmed row', () => {
    expect(displayName('ACC-PSINV-2026-00005')).toBe('ACC-PSINV-2026-00005');
    expect(displayName('Account Provisioning')).toBe('Account Provisioning');
  });
});

describe('isHidden', () => {
  test('is true for hidden entries', () => {
    expect(isHidden('Stock Entry')).toBe(true);
    expect(isHidden(' customer group ')).toBe(true);
  });

  test('is false for visible, unknown and empty input', () => {
    expect(isHidden('GRN')).toBe(false);
    expect(isHidden('Account Provisioning')).toBe(false);
    expect(isHidden('Dashboard')).toBe(false);
    expect(isHidden('')).toBe(false);
    expect(isHidden(undefined)).toBe(false);
  });
});

describe('searchAliases', () => {
  test('gives the old name behind a new name', () => {
    expect(searchAliases('Stock in')).toEqual(['Material Receipts']);
    expect(searchAliases('Goods received')).toEqual(['GRN List']);
  });

  test('gives every old name when several map to one', () => {
    expect(searchAliases('Receive goods')).toEqual(['GRN', 'Create GRN']);
    expect(searchAliases('Other')).toEqual(['Bank Draft', 'Cheque', 'Wire Transfer']);
  });

  test('is case-insensitive and ignores outer spaces', () => {
    expect(searchAliases('STOCK IN')).toEqual(['Material Receipts']);
    expect(searchAliases('  categories ')).toEqual(['Item Groups']);
  });

  test('gives an empty list when nothing maps to it', () => {
    expect(searchAliases('Dashboard')).toEqual([]);
    expect(searchAliases('')).toEqual([]);
    expect(searchAliases(undefined)).toEqual([]);
  });

  test('does not take an old name as a new name', () => {
    expect(searchAliases('Material Receipts')).toEqual([]);
  });

  test('leaves out hidden and pattern entries', () => {
    expect(searchAliases('Receipt #0005')).toEqual([]);
  });
});

describe('matchesSearch', () => {
  test('finds a name by part of the new name', () => {
    expect(matchesSearch('Receive goods', 'receive')).toBe(true);
    expect(matchesSearch('Receive goods', 'GOODS')).toBe(true);
  });

  test('finds a new name by its old name', () => {
    expect(matchesSearch('Receive goods', 'GRN')).toBe(true);
    expect(matchesSearch('Receive goods', 'grn')).toBe(true);
    expect(matchesSearch('Stock in', 'material rec')).toBe(true);
    expect(matchesSearch('Other', 'cheque')).toBe(true);
  });

  test('is false when neither matches', () => {
    expect(matchesSearch('Stock in', 'grn')).toBe(false);
    expect(matchesSearch('Dashboard', 'grn')).toBe(false);
  });

  test('is false for an empty query', () => {
    expect(matchesSearch('Stock in', '')).toBe(false);
    expect(matchesSearch('Stock in', '   ')).toBe(false);
    expect(matchesSearch('Stock in', undefined)).toBe(false);
  });
});

describe('consistency of the list', () => {
  const EM_DASH = String.fromCharCode(0x2014);
  const visibleShows = RENAMES.filter((entry) => !entry.hidden && !entry.pattern && entry.show).map((entry) => entry.show);
  const visibleOlds = RENAMES.filter((entry) => !entry.hidden && !entry.pattern).map((entry) => entry.old.toLowerCase());

  test('no display name is the old name of another visible entry', () => {
    visibleShows.forEach((show) => {
      expect(visibleOlds).not.toContain(show.toLowerCase());
    });
  });

  test('renaming twice changes nothing more', () => {
    visibleShows.forEach((show) => {
      expect(displayName(show)).toBe(show);
    });
  });

  test('no display name contains an em dash', () => {
    RENAMES.forEach((entry) => {
      expect(entry.show || '').not.toContain(EM_DASH);
      expect(entry.note || '').not.toContain(EM_DASH);
    });
  });
});

describe('OLD_TERMS', () => {
  test('contains the key old terms in lower case', () => {
    ['grn', 'material receipts', 'item group', 'uom', 'posting date', 'pos profile'].forEach((term) => {
      expect(OLD_TERMS).toContain(term);
    });
  });

  test('is lower case and has no duplicates', () => {
    expect(OLD_TERMS.every((term) => term === term.toLowerCase())).toBe(true);
    expect(new Set(OLD_TERMS).size).toBe(OLD_TERMS.length);
  });

  test('leaves out the receipt number pattern', () => {
    expect(OLD_TERMS.some((term) => term.startsWith('acc-psinv'))).toBe(false);
  });

  test('contains no display name', () => {
    const shows = RENAMES.map((entry) => entry.show).filter(Boolean);
    shows.forEach((show) => {
      expect(OLD_TERMS).not.toContain(show.toLowerCase());
    });
  });

  test('includes hidden names', () => {
    expect(OLD_TERMS).toEqual(expect.arrayContaining(['territory', 'stock entry', 'all warehouses']));
  });
});

describe('formatPhone', () => {
  test.each([
    ['+254712345678', '0712 345 678'],
    ['254712345678', '0712 345 678'],
    ['0712345678', '0712 345 678'],
    ['0712 345 678', '0712 345 678'],
    ['+254 712 345 678', '0712 345 678'],
    ['+254112345678', '0112 345 678'],
  ])('%s shows as %s', (input, expected) => {
    expect(formatPhone(input)).toBe(expected);
  });

  test.each([
    ['12345'],
    ['+254212345678'],
    ['+2547123456789'],
    ['+441234567890'],
    ['abc'],
    [''],
  ])('returns "%s" unchanged when it is not a Kenyan mobile', (input) => {
    expect(formatPhone(input)).toBe(input);
  });

  test('returns null and undefined unchanged', () => {
    expect(formatPhone(null)).toBeNull();
    expect(formatPhone(undefined)).toBeUndefined();
  });
});

describe('toStoredPhone', () => {
  test.each([
    ['0712 345 678', '+254712345678'],
    ['0712345678', '+254712345678'],
    ['+254712345678', '+254712345678'],
    ['254712345678', '+254712345678'],
    ['0112 345 678', '+254112345678'],
  ])('%s is stored as %s', (input, expected) => {
    expect(toStoredPhone(input)).toBe(expected);
  });

  test.each([['0212 345 678'], ['0712 345 67'], ['07123456789'], ['hello'], [''], [null], [undefined]])(
    'gives null for %s',
    (input) => {
      expect(toStoredPhone(input)).toBeNull();
    }
  );

  test('a shown number goes back to the same shown number', () => {
    expect(formatPhone(toStoredPhone('0712 345 678'))).toBe('0712 345 678');
  });
});

describe('formatReceiptNumber', () => {
  test('pads to four digits', () => {
    expect(formatReceiptNumber(33)).toBe('#0033');
    expect(formatReceiptNumber(5)).toBe('#0005');
    expect(formatReceiptNumber(0)).toBe('#0000');
    expect(formatReceiptNumber(1234)).toBe('#1234');
  });

  test('never cuts a longer number', () => {
    expect(formatReceiptNumber(12345)).toBe('#12345');
    expect(formatReceiptNumber(1000000)).toBe('#1000000');
  });

  test('accepts a number written as text', () => {
    expect(formatReceiptNumber('7')).toBe('#0007');
  });

  test('gives an empty string for anything that is not a whole number', () => {
    expect(formatReceiptNumber(null)).toBe('');
    expect(formatReceiptNumber(undefined)).toBe('');
    expect(formatReceiptNumber('')).toBe('');
    expect(formatReceiptNumber('abc')).toBe('');
    expect(formatReceiptNumber(-3)).toBe('');
    expect(formatReceiptNumber(2.5)).toBe('');
  });
});

describe('re-exports', () => {
  test('formatMoney is the shared helper, not a copy', () => {
    expect(formatMoney(2350)).toBe('KES 2,350');
  });
});

/**
 * Ticket P6-4, the static side of the language sweep (AC-34).
 *
 * labelsInOnePlace.test.js skips every strings file (they are where the words are meant to live), so on its own it
 * never reads them for old terms except the shared strings.js. This file closes that gap: every strings file of the
 * New look is read for the old names of the rename map, and a guard makes sure the scan really reaches every component
 * folder added in Phases 4 and 5 (auth, setup, settings, expenses, reports, shell and the rest).
 */
import fs from 'fs';
import path from 'path';
import { filesToScan, oldTermsIn, textsIn } from './scanLabels';

const NEWLOOK = path.join(__dirname, '..');
const STRINGS_FILE = /(^|\/)strings(\.[a-z]+)?\.js$/;

const allFiles = (dir = NEWLOOK, base = NEWLOOK) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (entry.isDirectory()) return allFiles(full, base);
    return [{ rel, full }];
  });

const stringsFiles = allFiles().filter((f) => STRINGS_FILE.test(f.rel));

// Words that are allowed in a strings file even though they match an old name, with the reason. Keep this list short.
// Each one is an internal value the server uses (never shown as it is) or a word the rename map allows in Settings, Advanced.
const ALLOWED = {
  'expenses/strings.expenses.js': ['stock entry'], // the key of a lookup from the server's record type to the plain words
  'products/strings.products.js': ['item groups', 'nos'], // the shop's top category name and the stored unit value; unitWords shows "piece"
  'settings/strings.settings.js': ['account provisioning'], // the Advanced card; the rename map places it in Settings, Advanced
};

describe('Every strings file is read for the old names of the rename map', () => {
  test('there are strings files for each area, and the list is not empty by accident', () => {
    const names = stringsFiles.map((f) => f.rel);
    expect(names).toEqual(
      expect.arrayContaining([
        'strings.js',
        'auth/strings.auth.js',
        'setup/strings.setup.js',
        'settings/strings.settings.js',
        'expenses/strings.expenses.js',
        'reports/strings.reports.js',
        'shell/strings.language.js',
        'till/strings.till.js',
        'till/strings.pay.js',
        'till/strings.shift.js',
        'sales/strings.sales.js',
        'customers/strings.customers.js',
        'products/strings.products.js',
        'stock/strings.stock.js',
        'suppliers/strings.suppliers.js',
        'purchases/strings.purchases.js',
        'forms/strings.forms.js',
      ])
    );
  });

  test.each(stringsFiles.map((f) => [f.rel, f]))('%s has no old term', (rel, file) => {
    const source = fs.readFileSync(file.full, 'utf8');
    const hits = oldTermsIn(source)
      .filter((h) => !h.text.startsWith('/')) // an address of a current screen, not a word on screen
      .filter((h) => !(ALLOWED[rel] || []).includes(h.term))
      .map((h) => `line ${h.line}: "${h.term}" in ${JSON.stringify(h.text)}`);
    expect(hits).toEqual([]);
  });

  test('a strings file has real words in it (the reader is not skipping them)', () => {
    const total = stringsFiles.reduce((sum, f) => sum + textsIn(fs.readFileSync(f.full, 'utf8')).length, 0);
    expect(total).toBeGreaterThan(500);
  });
});

describe('The component scan reaches every folder of the New look', () => {
  const folders = fs
    .readdirSync(NEWLOOK, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const scanned = filesToScan().map((f) => f.rel);

  // Folders that hold no visible words of their own: the scan is allowed to find nothing there
  const NO_WORDS = new Set(['labels', 'access', '__fixtures__']);

  test.each(folders.filter((f) => !NO_WORDS.has(f)))('folder %s has at least one scanned component', (folder) => {
    expect(scanned.some((rel) => rel.startsWith(`${folder}/`))).toBe(true);
  });

  test('the Phase 4 and 5 components are in the scan', () => {
    expect(scanned).toEqual(
      expect.arrayContaining([
        'auth/SignInPage.jsx',
        'setup/SetupWizard.jsx',
        'settings/SettingsPage.jsx',
        'settings/AdvancedSection.jsx',
        'expenses/ExpensesPage.jsx',
        'expenses/AddExpensePage.jsx',
        'reports/ReportsPage.jsx',
        'reports/ReportPage.jsx',
        'shell/TopBar.jsx',
        'till/PayScreen.jsx',
        'products/ProductsPage.jsx',
        'stock/StockLevelsPage.jsx',
        'purchases/PurchasesPage.jsx',
        'suppliers/SuppliersPage.jsx',
        'customers/CustomersPage.jsx',
        'sales/SalesPage.jsx',
        'home/HomePage.jsx',
      ])
    );
  });

  test('every component file that exists on disk is either scanned or skipped on purpose', () => {
    const SKIPPED_ON_PURPOSE = [
      /\.test\./,
      /^labels\//,
      /^redirects\/redirectTable\.js$/,
      STRINGS_FILE,
      /^(ComponentPage|DataDemo|OverlayDemo|ShellDemo)\.jsx$/,
      /^charts\/(ChartsPage\.jsx|sampleData\.js)$/,
      /^newLookRoutes\.js$/,
    ];
    const missed = allFiles()
      .filter((f) => /\.(js|jsx)$/.test(f.rel))
      .filter((f) => !scanned.includes(f.rel))
      .filter((f) => !SKIPPED_ON_PURPOSE.some((re) => re.test(f.rel)))
      .map((f) => f.rel);
    expect(missed).toEqual([]);
  });
});

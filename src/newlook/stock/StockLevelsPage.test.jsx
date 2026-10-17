/* eslint-disable testing-library/no-node-access --
   A tile is a label and a number in two spans; the check that the number is the one beside its label reads the next
   sibling of the label. No role query can say "the number of this tile". */
/**
 * The Stock levels page (tickets P4-3 and P4-4), checked at the screen level against AC-25 and AC-27: the tabs, the
 * four tiles that must equal the list below them, Locations and Transfers only with a second location, Expiry only when
 * the server says the shop tracks expiry dates, Reorder opening a purchase with the product filled in, filters in the
 * address, 20 rows to a page, Export, empty and error states, and that a cashier sees no value.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import StockLevelsPage from './StockLevelsPage';
import { PREVIEW_KEY, resyncPreview } from '../redirects/live';
import { findProducts, getStockLevels } from '../../api/stockLevelsApi';
import { getMyAccess } from '../../api/accessApi';
import { saveTextFile } from '../../utils/saveTextFile';

jest.mock('../../api/stockLevelsApi', () => ({
  getStockLevels: jest.fn(),
  findProducts: jest.fn(),
  stockIn: jest.fn(),
  stockOut: jest.fn(),
  getCountSheet: jest.fn(),
  submitCount: jest.fn(),
}));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../utils/saveTextFile', () => ({ saveTextFile: jest.fn() }));
const mockShop = {
  warehouses: [{ name: 'Duka Kuu - DS', warehouse_name: 'Duka Kuu', disabled: 0, is_group: 0 }],
};
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { company: 'Demo Shop' } }, warehouse: { warehouses: mockShop.warehouses } }),
}));
jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn(() => ({ type: 'x' })) }));

// ---------- Fixtures: made-up shop data, never real ----------
const SWAHILI = ['Maziwa 500ml', 'Unga wa Ngano 2kg', 'Sukari 1kg', 'Mchele Pishori', 'Sabuni ya Kipande', 'Mafuta ya Kupikia', 'Chai Majani 250g', 'Mkate wa Boflo'];
const TOTAL = 45;
const PRODUCTS = Array.from({ length: TOTAL }, (_, i) => {
  const level = i % 11 === 5 ? 'out' : i % 7 === 3 ? 'low' : 'ok';
  const qty = level === 'out' ? 0 : level === 'low' ? 3 : 20 + i;
  const name = i < SWAHILI.length ? SWAHILI[i] : `Zawadi ${String(i).padStart(2, '0')}`;
  return {
    item_code: `P${String(i).padStart(3, '0')}`,
    item_name: name,
    category: i % 2 === 0 ? 'Vyakula' : 'Usafi',
    unit: i % 3 === 0 ? 'Kg' : 'Nos',
    qty,
    value: qty * 50,
    level,
    warning_level: level === 'low' ? 10 : null,
    stores: 1,
  };
}).sort((a, b) => a.item_name.localeCompare(b.item_name));

const MOVEMENTS = [
  { id: 'entry:D1', date: '2026-10-13', time: '10:30', item_code: 'P001', item_name: 'Unga wa Ngano 2kg', warehouse: 'Duka Kuu - DS', kind: 'stock_out', source: 'entry', qty_change: -3, qty_after: null, status: 'draft', reference: 'MAT-STE-2026-00002', entry: 'MAT-STE-2026-00002', reason: 'lost' },
  { id: 'ledger:S1', date: '2026-10-12', time: '09:10', item_code: 'P000', item_name: 'Maziwa 500ml', warehouse: 'Duka Kuu - DS', kind: 'stock_in', source: 'ledger', qty_change: 12, qty_after: 16, status: 'submitted', reference: 'MAT-STE-2026-00001', entry: 'MAT-STE-2026-00001', reason: null },
  { id: 'ledger:S2', date: '2026-10-11', time: '16:00', item_code: 'P002', item_name: 'Sukari 1kg', warehouse: 'Duka Kuu - DS', kind: 'sale', source: 'ledger', qty_change: -2, qty_after: 8, status: 'submitted', reference: 'ACC-PSINV-2026-00007', entry: null, reason: null },
  { id: 'ledger:S3', date: '2026-10-10', time: '11:00', item_code: 'P003', item_name: 'Mchele Pishori', warehouse: 'Duka Kuu - DS', kind: 'stock_in', source: 'ledger', qty_change: 5, qty_after: 30, status: 'cancelled', reference: 'MAT-STE-2026-00000', entry: 'MAT-STE-2026-00000', reason: null },
];
const EXPIRY = [
  { item_code: 'D1', item_name: 'Dawa ya Kikohozi', warehouse: 'Duka Kuu - DS', batch_no: 'B-12', qty: 8, unit: 'Nos', expiry_date: '2026-10-20', days_left: 7, state: 'critical', value: 960 },
  { item_code: 'D2', item_name: 'Maziwa Mtindi', warehouse: 'Duka Kuu - DS', batch_no: '', qty: 3, unit: 'Nos', expiry_date: '2026-10-10', days_left: -3, state: 'expired', value: 150 },
];

const FEATURES = { expiry: false, locations: 1 };
const mockServer = { features: FEATURES, canChange: true, showValue: true, products: PRODUCTS, movements: MOVEMENTS, expiry: EXPIRY };

// The server's answer, worked out as the contract says: the tiles are counted from the same rows as the list
const answer = ({ tab = 'overview', page = 1, pageSize = 20, search = '', category = '', status = '', kind = '', ...rest } = {}) => {
  const base = { tab, features: mockServer.features, canChange: mockServer.canChange, role: mockServer.showValue ? 'owner' : 'cashier', categories: ['Usafi', 'Vyakula'], from: '', to: '', days: undefined };
  if (tab === 'movements') {
    let rows = mockServer.movements;
    if (kind === 'receipt') rows = rows.filter((r) => r.kind === 'stock_in');
    if (status) rows = rows.filter((r) => r.status === status);
    if (search) rows = rows.filter((r) => `${r.item_name} ${r.reference}`.toLowerCase().includes(search.toLowerCase()));
    return { ...base, rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, pages: Math.max(1, Math.ceil(rows.length / pageSize)), tiles: null, ...rest };
  }
  if (tab === 'expiry') {
    const rows = status ? mockServer.expiry.filter((r) => r.state === status) : mockServer.expiry;
    const shaped = mockServer.showValue ? rows : rows.map(({ value, ...r }) => r);
    return { ...base, rows: shaped, total: shaped.length, page, pageSize, pages: 1, tiles: null, days: 30 };
  }
  let scoped = mockServer.products.filter((r) => (!search || `${r.item_name} ${r.item_code}`.toLowerCase().includes(search.toLowerCase())) && (!category || r.category === category));
  const tiles = { items: scoped.length, low: scoped.filter((r) => r.level === 'low').length, out_of_stock: scoped.filter((r) => r.level === 'out').length };
  if (mockServer.showValue) tiles.stock_value = scoped.reduce((sum, r) => sum + r.value, 0);
  let listed = tab === 'low' ? scoped.filter((r) => r.level !== 'ok').sort((a, b) => (a.level === b.level ? a.qty - b.qty : a.level === 'out' ? -1 : 1)) : scoped;
  if (status) listed = listed.filter((r) => r.level === status);
  const strip = (r) => (mockServer.showValue ? r : (({ value, ...rest2 }) => rest2)(r));
  return {
    ...base,
    rows: listed.slice((page - 1) * pageSize, page * pageSize).map(strip),
    total: listed.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(listed.length / pageSize)),
    tiles: tab === 'overview' ? tiles : null,
  };
};

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderPage = async (url = '/new-look/stock', tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: tier === 'cashier' ? {} : { cost_of_goods: true, profit: true, money_owed: true } });
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <AccessProvider userKey="amina">
        <ToastProvider>
          <StockLevelsPage />
          <Where />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(getMyAccess).toHaveBeenCalled());
  return view;
};

const where = () => screen.getByTestId('where').textContent;
const row = (name) => screen.getByRole('row', { name: new RegExp(name) });
const count = (level) => PRODUCTS.filter((p) => p.level === level).length;

beforeEach(() => {
  jest.resetAllMocks();
  mockServer.features = { expiry: false, locations: 1 };
  mockServer.canChange = true;
  mockServer.showValue = true;
  mockServer.products = PRODUCTS;
  mockServer.movements = MOVEMENTS;
  mockShop.warehouses = [{ name: 'Duka Kuu - DS', warehouse_name: 'Duka Kuu', disabled: 0, is_group: 0 }];
  getStockLevels.mockImplementation(async (query) => answer(query));
  findProducts.mockResolvedValue([]);
  window.innerWidth = 1280;
  try {
    localStorage.clear();
  } catch (e) {
    // Not needed
  }
  resyncPreview();
});

describe('the page and its tabs', () => {
  test('is titled Stock levels and opens on Overview', async () => {
    await renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Stock levels' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(getStockLevels).toHaveBeenCalledWith(expect.objectContaining({ tab: 'overview', page: 1, pageSize: 20 }));
  });

  test('a shop with one location has Overview, Low stock, Movements and Count stock, and no Locations, Transfers or Expiry', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    const tabs = within(screen.getByRole('tablist', { name: 'Stock levels views' })).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Overview', 'Low stock', 'Movements', 'Count stock']);
  });

  test('with two real locations, Locations and Transfers appear', async () => {
    mockShop.warehouses = [
      { name: 'Duka Kuu - DS', warehouse_name: 'Duka Kuu', disabled: 0, is_group: 0 },
      { name: 'Duka la Pili - DS', warehouse_name: 'Duka la Pili', disabled: 0, is_group: 0 },
      { name: 'Work In Progress - DS', warehouse_name: 'Work In Progress', disabled: 0, is_group: 0 },
    ];
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    const names = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(names).toEqual(['Overview', 'Low stock', 'Movements', 'Count stock', 'Locations', 'Transfers']);
  });

  test('the warehouses every new business gets do not count as a second location', async () => {
    mockShop.warehouses = [
      { name: 'Duka Kuu - DS', warehouse_name: 'Duka Kuu', disabled: 0, is_group: 0 },
      { name: 'All Warehouses - DS', warehouse_name: 'All Warehouses', disabled: 0, is_group: 1 },
      { name: 'Finished Goods - DS', warehouse_name: 'Finished Goods', disabled: 0, is_group: 0 },
      { name: 'Goods In Transit - DS', warehouse_name: 'Goods In Transit', disabled: 0, is_group: 0 },
    ];
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    expect(screen.queryByRole('tab', { name: 'Locations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Transfers' })).not.toBeInTheDocument();
  });

  test('the Expiry tab appears only when the server says the shop tracks expiry dates', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    expect(screen.queryByRole('tab', { name: 'Expiry' })).not.toBeInTheDocument();
  });

  test('and appears when it does', async () => {
    mockServer.features = { expiry: true, locations: 1 };
    await renderPage();
    expect(await screen.findByRole('tab', { name: 'Expiry' })).toBeInTheDocument();
  });

  test('a link to Expiry in a shop that does not track expiry goes to Overview', async () => {
    await renderPage('/new-look/stock/expiry');
    await waitFor(() => expect(where()).toBe('/new-look/stock'));
    expect(await screen.findByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  test('a link to Locations in a one-store shop goes to Overview', async () => {
    await renderPage('/new-look/stock/locations');
    await waitFor(() => expect(where()).toBe('/new-look/stock'));
  });

  test('a tab is part of the address', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('tab', { name: 'Low stock' }));
    await waitFor(() => expect(where()).toBe('/new-look/stock/low'));
    await waitFor(() => expect(getStockLevels).toHaveBeenLastCalledWith(expect.objectContaining({ tab: 'low' })));
    expect(screen.getByRole('tab', { name: 'Low stock' })).toHaveAttribute('aria-selected', 'true');
  });

  test('Locations and Transfers link to the current Stores and Stock transfers screens', async () => {
    mockShop.warehouses = [
      { name: 'Duka Kuu - DS', warehouse_name: 'Duka Kuu', disabled: 0, is_group: 0 },
      { name: 'Duka la Pili - DS', warehouse_name: 'Duka la Pili', disabled: 0, is_group: 0 },
    ];
    await renderPage('/new-look/stock/locations');
    userEvent.click(await screen.findByRole('button', { name: 'Open stores' }));
    expect(where()).toBe('/warehouses');
  });

  test('Transfers opens the current Stock transfers screen', async () => {
    mockShop.warehouses = [
      { name: 'Duka Kuu - DS', warehouse_name: 'Duka Kuu', disabled: 0, is_group: 0 },
      { name: 'Duka la Pili - DS', warehouse_name: 'Duka la Pili', disabled: 0, is_group: 0 },
    ];
    await renderPage('/new-look/stock/transfers');
    userEvent.click(await screen.findByRole('button', { name: 'Open stock transfers' }));
    expect(where()).toBe('/stock-transfers');
  });
});

describe('the overview list and its tiles (AC-27)', () => {
  test('shows the four tiles above the list', async () => {
    await renderPage();
    const tiles = await screen.findByRole('region', { name: 'Stock summary' });
    ['Stock value', 'Items', 'Low', 'Out of stock'].forEach((label) => expect(within(tiles).getByText(label)).toBeInTheDocument());
  });

  test('the Items tile equals the count under the list', async () => {
    await renderPage();
    const tiles = await screen.findByRole('region', { name: 'Stock summary' });
    await screen.findByText(`Showing 20 of ${TOTAL}`);
    expect(within(tiles).getByText('Items').nextSibling).toHaveTextContent(String(TOTAL));
  });

  test('the Low and Out of stock tiles equal the rows marked Low and Out in the list', async () => {
    await renderPage('/new-look/stock?size=50');
    const tiles = await screen.findByRole('region', { name: 'Stock summary' });
    await screen.findByText(`Showing ${TOTAL} of ${TOTAL}`);
    expect(within(tiles).getByText('Low').nextSibling).toHaveTextContent(String(count('low')));
    expect(within(tiles).getByText('Out of stock').nextSibling).toHaveTextContent(String(count('out')));
    expect(screen.getAllByText('Low', { selector: '.nl-status span' })).toHaveLength(count('low'));
    expect(screen.getAllByText('Out', { selector: '.nl-status span' })).toHaveLength(count('out'));
  });

  test('the Stock value tile is the sum of the value column', async () => {
    await renderPage('/new-look/stock?size=50');
    const tiles = await screen.findByRole('region', { name: 'Stock summary' });
    await screen.findByText(`Showing ${TOTAL} of ${TOTAL}`);
    const sum = PRODUCTS.reduce((s, p) => s + p.value, 0);
    expect(within(tiles).getByText('Stock value').nextSibling).toHaveTextContent(`KES ${sum.toLocaleString('en-US')}`);
  });

  test('pressing the Low tile shows only the Low rows, as many as the tile says', async () => {
    await renderPage();
    const tiles = await screen.findByRole('region', { name: 'Stock summary' });
    await screen.findByText(`Showing 20 of ${TOTAL}`);
    userEvent.click(within(tiles).getByRole('button', { name: /Low/ }));
    await waitFor(() => expect(where()).toContain('status=low'));
    await screen.findByText(`Showing ${count('low')} of ${count('low')}`);
    expect(within(tiles).getByRole('button', { name: /Low/ })).toHaveAttribute('aria-pressed', 'true');
    userEvent.click(within(tiles).getByRole('button', { name: /Low/ }));
    await waitFor(() => expect(where()).not.toContain('status='));
  });

  test('the tiles follow a search, because they are counted from the same rows as the list', async () => {
    await renderPage();
    await screen.findByText(`Showing 20 of ${TOTAL}`);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search stock' }), { target: { value: 'maziwa' } });
    await screen.findByText('Showing 1 of 1');
    const tiles = screen.getByRole('region', { name: 'Stock summary' });
    expect(within(tiles).getByText('Items').nextSibling).toHaveTextContent('1');
  });

  test('has the columns Product, Category, In stock, Value and Level', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Product', 'Category', 'In stock', 'Value', 'Level', 'More']);
  });

  test('writes the unit in plain words and the level as an icon plus a word', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Maziwa 500ml/ });
    const milk = row('Maziwa 500ml');
    expect(within(milk).getByText(/pieces|kilograms/)).toBeInTheDocument();
    expect(within(milk).getByText(/In stock|Low|Out/, { selector: '.nl-status span' })).toBeInTheDocument();
    expect(screen.queryByText(/\bNos\b/)).not.toBeInTheDocument();
  });

  test('a low product says where its warning level is', async () => {
    await renderPage('/new-look/stock?status=low');
    const low = PRODUCTS.find((p) => p.level === 'low');
    await screen.findByRole('row', { name: new RegExp(low.item_name) });
    expect(within(row(low.item_name)).getByText('Warning at 10')).toBeInTheDocument();
  });

  test('shows 20 rows of 45, a correct count and a rows-per-page box that says 20', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText(`Showing 20 of ${TOTAL}`)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
  });

  test('the next page is in the address and the count follows', async () => {
    await renderPage();
    await screen.findByText(`Showing 20 of ${TOTAL}`);
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(where()).toContain('page=2'));
    await waitFor(() => expect(getStockLevels).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByText('Showing 5 of 45');
  });

  test('the rows-per-page box is never blank, even for a bad address', async () => {
    await renderPage('/new-look/stock?size=7');
    await screen.findByRole('row', { name: /Zawadi 10/ });
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
  });

  test('search waits for a pause in typing, then goes in the address and back to page 1', async () => {
    await renderPage('/new-look/stock?page=2');
    await screen.findByText('Showing 20 of 45');
    getStockLevels.mockClear();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search stock' }), { target: { value: 'unga' } });
    expect(getStockLevels).not.toHaveBeenCalled();
    await waitFor(() => expect(where()).toContain('q=unga'));
    expect(where()).not.toContain('page=2');
    await waitFor(() => expect(getStockLevels).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'unga', page: 1 })));
  });

  test('a category filter goes in the address and in the question', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('combobox', { name: /Category/ }));
    userEvent.click(screen.getByRole('option', { name: 'Usafi' }));
    await waitFor(() => expect(where()).toContain('category=Usafi'));
    await waitFor(() => expect(getStockLevels).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Usafi' })));
  });

  test('a store filter is offered only with two or more stores', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    expect(screen.queryByRole('combobox', { name: /Store/ })).not.toBeInTheDocument();
  });

  test('with two stores a store filter is offered and sent', async () => {
    mockShop.warehouses = [
      { name: 'Duka Kuu - DS', warehouse_name: 'Duka Kuu', disabled: 0, is_group: 0 },
      { name: 'Duka la Pili - DS', warehouse_name: 'Duka la Pili', disabled: 0, is_group: 0 },
    ];
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('combobox', { name: /Store/ }));
    userEvent.click(screen.getByRole('option', { name: 'Duka la Pili' }));
    await waitFor(() => expect(getStockLevels).toHaveBeenLastCalledWith(expect.objectContaining({ store: 'Duka la Pili - DS' })));
  });

  test('the period presets are not shown on Overview', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    expect(screen.queryByRole('radio', { name: '7 days' })).not.toBeInTheDocument();
  });

  test('Export saves a spreadsheet of the rows listed, with the value column for an owner', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^stock-overview-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(text.split('\n')[0]).toContain('"Value"');
    expect(text.trim().split('\n')).toHaveLength(21);
    expect(await screen.findByText('Saved 20 rows as a spreadsheet file')).toBeInTheDocument();
  });

  test('an empty shop gets an empty state with one action', async () => {
    mockServer.products = [];
    await renderPage();
    expect(await screen.findByRole('heading', { name: 'No stock yet' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Stock in' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  test('a search with no match says so and offers to clear the filters', async () => {
    await renderPage('/new-look/stock?q=zzzz');
    expect(await screen.findByRole('heading', { name: 'No stock matches' })).toBeInTheDocument();
    userEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    await waitFor(() => expect(where()).not.toContain('q='));
  });

  test('an error shows Try again, and Try again asks again', async () => {
    getStockLevels.mockRejectedValueOnce(new Error('We could not reach the Murzak server.'));
    await renderPage();
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByRole('row', { name: /Zawadi 10/ });
    expect(getStockLevels).toHaveBeenCalledTimes(2);
  });

  test('a page past the last goes back to the last page', async () => {
    await renderPage('/new-look/stock?page=9');
    await waitFor(() => expect(where()).toContain('page=3'));
  });
});

describe('Low stock', () => {
  test('lists the products that are low or out, with a Reorder button on each', async () => {
    await renderPage('/new-look/stock/low');
    await screen.findAllByRole('button', { name: /^Reorder / });
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(count('low') + count('out'));
    expect(screen.getAllByRole('button', { name: /^Reorder / })).toHaveLength(count('low') + count('out'));
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Product', 'Category', 'In stock', 'Level', 'Reorder']);
  });

  test('Reorder opens a new purchase with the product filled in', async () => {
    await renderPage('/new-look/stock/low');
    const first = (await screen.findAllByRole('button', { name: /^Reorder / }))[0];
    userEvent.click(first);
    await waitFor(() => expect(where()).toBe('/new-look/purchases/new?item=P005'));
  });

  test('Reorder opens the new purchase with the product filled in once that page is live', async () => {
    localStorage.setItem(PREVIEW_KEY, '1');
    resyncPreview();
    await renderPage('/new-look/stock/low');
    const out = PRODUCTS.find((p) => p.level === 'out');
    userEvent.click(await screen.findByRole('button', { name: `Reorder ${out.item_name}` }));
    await waitFor(() => expect(where()).toBe(`/new-look/purchases/new?item=${out.item_code}`));
  });

  test('a product that is out of stock comes before one that is low', async () => {
    await renderPage('/new-look/stock/low');
    await screen.findAllByRole('button', { name: /^Reorder / });
    const first = screen.getAllByRole('row')[1];
    expect(within(first).getByText('Out', { selector: '.nl-status span' })).toBeInTheDocument();
  });

  test('when nothing is low the empty state says so', async () => {
    mockServer.products = PRODUCTS.filter((p) => p.level === 'ok');
    await renderPage('/new-look/stock/low');
    expect(await screen.findByRole('heading', { name: 'Nothing is running low' })).toBeInTheDocument();
  });
});

describe('Movements', () => {
  test('joins ledger lines and draft entries, with the Draft, Submitted and Cancelled words', async () => {
    await renderPage('/new-look/stock/movements');
    await screen.findByRole('row', { name: /Sukari 1kg/ });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Date and time', 'Product', 'Type', 'Change', 'Quantity after', 'Status', 'Reference']);
    expect(within(row('Unga wa Ngano')).getByText('Draft')).toBeInTheDocument();
    expect(within(row('Maziwa 500ml')).getByText('Submitted')).toBeInTheDocument();
    expect(within(row('Mchele Pishori')).getByText('Cancelled')).toBeInTheDocument();
  });

  test('movement types are in plain words, with the reason of a write-off', async () => {
    await renderPage('/new-look/stock/movements');
    await screen.findByRole('row', { name: /Sukari 1kg/ });
    expect(within(row('Sukari 1kg')).getByText('Sale')).toBeInTheDocument();
    expect(within(row('Maziwa 500ml')).getByText('Stock in')).toBeInTheDocument();
    const write = row('Unga wa Ngano');
    expect(within(write).getByText('Stock out')).toBeInTheDocument();
    expect(within(write).getByText('Lost')).toBeInTheDocument();
  });

  test('shows the change with a sign and the quantity after it', async () => {
    await renderPage('/new-look/stock/movements');
    await screen.findByRole('row', { name: /Sukari 1kg/ });
    expect(within(row('Maziwa 500ml')).getByText('+12')).toBeInTheDocument();
    expect(within(row('Sukari 1kg')).getByText('-2')).toBeInTheDocument();
    expect(within(row('Sukari 1kg')).getByText('8')).toBeInTheDocument();
  });

  test('a stock entry can be opened on the current screen where it is edited, submitted, cancelled and printed', async () => {
    await renderPage('/new-look/stock/movements');
    await screen.findByRole('row', { name: /Sukari 1kg/ });
    const link = within(row('Unga wa Ngano')).getByRole('link', { name: 'Open stock change MAT-STE-2026-00002' });
    expect(link).toHaveAttribute('href', '/inventory/stock-entries/MAT-STE-2026-00002?legacy=1');
    expect(within(row('Sukari 1kg')).queryByRole('link')).not.toBeInTheDocument();
  });

  test('asks for the last 30 days as dates, and offers the period presets', async () => {
    await renderPage('/new-look/stock/movements');
    await screen.findByRole('row', { name: /Sukari 1kg/ });
    expect(getStockLevels).toHaveBeenCalledWith(expect.objectContaining({ tab: 'movements', from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Today', '7 days', '30 days', 'Custom']);
  });

  test('choosing 7 days goes in the address', async () => {
    await renderPage('/new-look/stock/movements');
    await screen.findByRole('row', { name: /Sukari 1kg/ });
    userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    await waitFor(() => expect(where()).toContain('period=7d'));
  });

  test('the type filter sends the kind', async () => {
    await renderPage('/new-look/stock/movements');
    await screen.findByRole('row', { name: /Sukari 1kg/ });
    userEvent.click(screen.getByRole('combobox', { name: /Type/ }));
    userEvent.click(screen.getByRole('option', { name: 'Stock in' }));
    await waitFor(() => expect(where()).toContain('kind=receipt'));
    await waitFor(() => expect(getStockLevels).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'receipt' })));
  });

  test('the status filter sends the status', async () => {
    await renderPage('/new-look/stock/movements?status=draft');
    await screen.findByRole('row', { name: /Unga wa Ngano/ });
    expect(getStockLevels).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  test('an old address with a type and a product search lands on the right list', async () => {
    await renderPage('/new-look/stock/movements?kind=receipt&q=maziwa');
    await screen.findByRole('row', { name: /Maziwa 500ml/ });
    expect(getStockLevels).toHaveBeenCalledWith(expect.objectContaining({ kind: 'receipt', search: 'maziwa' }));
  });

  test('the tab keeps its period when you come back to it', async () => {
    await renderPage('/new-look/stock/movements?period=7d');
    await screen.findByRole('row', { name: /Sukari 1kg/ });
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('href', '/new-look/stock');
    expect(screen.getByRole('tab', { name: 'Movements' })).toHaveAttribute('href', '/new-look/stock/movements?period=7d');
  });

  test('Export saves the movements with their status and reason', async () => {
    await renderPage('/new-look/stock/movements');
    await screen.findByRole('row', { name: /Sukari 1kg/ });
    userEvent.click(screen.getByRole('button', { name: 'Export' }));
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^stock-movements-/);
    expect(text).toContain('"Draft"');
    expect(text).toContain('"Lost"');
  });
});

describe('Expiry', () => {
  beforeEach(() => {
    mockServer.features = { expiry: true, locations: 1 };
  });

  test('lists the expired and expiring stock with an icon and a word for how urgent it is', async () => {
    await renderPage('/new-look/stock/expiry');
    await screen.findByRole('row', { name: /Dawa ya Kikohozi/ });
    expect(within(row('Dawa ya Kikohozi')).getByText('Within 7 days')).toBeInTheDocument();
    expect(within(row('Dawa ya Kikohozi')).getByText('7 days left')).toBeInTheDocument();
    expect(within(row('Maziwa Mtindi')).getByText('Expired')).toBeInTheDocument();
    expect(within(row('Maziwa Mtindi')).getByText('Expired 3 days ago')).toBeInTheDocument();
    expect(within(row('Maziwa Mtindi')).getByText('No batch')).toBeInTheDocument();
  });

  test('the window is chosen from a box and goes in the address', async () => {
    await renderPage('/new-look/stock/expiry');
    await screen.findByRole('row', { name: /Dawa ya Kikohozi/ });
    userEvent.click(screen.getByRole('combobox', { name: /Expiring within/ }));
    userEvent.click(screen.getByRole('option', { name: '90 days' }));
    await waitFor(() => expect(where()).toContain('within=90'));
    await waitFor(() => expect(getStockLevels).toHaveBeenLastCalledWith(expect.objectContaining({ tab: 'expiry', days: 90 })));
  });
});

describe('what each person may see and do', () => {
  beforeEach(() => {
    mockServer.canChange = false;
    mockServer.showValue = false;
  });

  test('a cashier sees no stock value tile and no value column', async () => {
    await renderPage('/new-look/stock?size=50', 'cashier');
    await screen.findByRole('row', { name: /Zawadi 10/ });
    expect(screen.queryByText('Stock value')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Value' })).not.toBeInTheDocument();
    expect(screen.queryByText(/KES/)).not.toBeInTheDocument();
  });

  test('a cashier still sees the levels and the other tiles', async () => {
    await renderPage('/new-look/stock', 'cashier');
    const tiles = await screen.findByRole('region', { name: 'Stock summary' });
    expect(within(tiles).getByText('Items')).toBeInTheDocument();
    expect(within(tiles).getByText('Low')).toBeInTheDocument();
  });

  test('a cashier is not offered Stock in, Stock out, Count stock or Reorder', async () => {
    await renderPage('/new-look/stock/low', 'cashier');
    await screen.findByRole('row', { name: new RegExp(PRODUCTS.find((p) => p.level === 'out').item_name) });
    expect(screen.queryByRole('button', { name: 'Stock in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stock out or write-off' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Count stock' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reorder / })).not.toBeInTheDocument();
  });

  test('a cashier Export has no value column', async () => {
    await renderPage('/new-look/stock', 'cashier');
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(saveTextFile.mock.calls[0][0].split('\n')[0]).not.toContain('"Value"');
  });

  test('a cashier row menu offers only the movements of the product', async () => {
    await renderPage('/new-look/stock', 'cashier');
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('button', { name: 'More actions for Maziwa 500ml' }));
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['See movements']);
  });
});

describe('the header buttons and the row menu', () => {
  test('Stock in and Stock out or write-off are header buttons that open dialogs', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('button', { name: 'Stock in' }));
    expect(await screen.findByRole('dialog', { name: 'Stock in' })).toBeInTheDocument();
    expect(where()).toContain('action=in');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(where()).not.toContain('action=');
    userEvent.click(screen.getByRole('button', { name: 'Stock out or write-off' }));
    expect(await screen.findByRole('dialog', { name: 'Stock out or write-off' })).toBeInTheDocument();
  });

  test('an old Material receipt address opens the Stock in form', async () => {
    await renderPage('/new-look/stock?action=in');
    expect(await screen.findByRole('dialog', { name: 'Stock in' })).toBeInTheDocument();
  });

  test('the row menu carries every action the old Stock List row had', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('button', { name: 'More actions for Maziwa 500ml' }));
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['See movements', 'Stock in', 'Stock out or write-off', 'Count this product', 'Edit price, unit, expiry and batch', 'Create a discount rule']);
  });

  test('See movements opens the movements of that product', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('button', { name: 'More actions for Maziwa 500ml' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'See movements' }));
    await waitFor(() => expect(where()).toBe('/new-look/stock/movements?q=P000'));
  });

  test('Count this product opens the count for that product', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('button', { name: 'More actions for Maziwa 500ml' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Count this product' }));
    await waitFor(() => expect(where()).toBe('/new-look/stock/count?item=P000'));
  });

  test('Edit price, unit, expiry and batch and Create a discount rule open the current screens', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('button', { name: 'More actions for Maziwa 500ml' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Edit price, unit, expiry and batch' }));
    await waitFor(() => expect(where()).toBe('/inventory/item-details?legacy=1'));
  });

  test('Stock out from the row menu starts with that product chosen', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Zawadi 10/ });
    userEvent.click(screen.getByRole('button', { name: 'More actions for Maziwa 500ml' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Stock out or write-off' }));
    const dialog = await screen.findByRole('dialog', { name: 'Stock out or write-off' });
    expect(within(dialog).getByText(/Maziwa 500ml \(/)).toBeInTheDocument();
  });
});

describe('on a phone', () => {
  test('rows become cards and the filters sit behind one button', async () => {
    window.innerWidth = 500;
    await renderPage();
    const cards = await screen.findByRole('list', { name: 'Stock list' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(20);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('searchbox', { name: 'Search stock' })).toBeInTheDocument();
  });
});

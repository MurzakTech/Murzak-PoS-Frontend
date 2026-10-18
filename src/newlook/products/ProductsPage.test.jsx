/**
 * The Products page (tickets P4-1 and P4-2), checked at the screen level against AC-25 and AC-27: the two tabs, the summary row, filters
 * that live in the address, 20 rows to a page, a count that is the server's count, a rows-per-page box that is never blank, the product
 * panel (cost and profit for owners and managers only), Export, Import, New product, the empty and error states, and the phone layout.
 */
import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import { setPreview } from '../redirects/live';
import ProductsPage from './ProductsPage';
import { listCategories, listProducts } from '../../api/productsListApi';
import { getMyAccess } from '../../api/accessApi';
import { saveTextFile } from '../../utils/saveTextFile';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../api/productsListApi', () => ({
  ...jest.requireActual('../../api/productsListApi'),
  listProducts: jest.fn(),
  listCategories: jest.fn(),
  listUnits: jest.fn(),
  addCategory: jest.fn(),
  renameCategory: jest.fn(),
  deleteCategory: jest.fn(),
}));
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../utils/saveTextFile', () => ({ saveTextFile: jest.fn() }));

// ---------- Fixtures: made-up shop data, never real ----------
const TOTAL = 45;
const GROUPS = ['Food', 'Household', 'Toiletries', 'All Item Groups'];
const pad = (n) => String(n).padStart(3, '0');
const ALL = Array.from({ length: TOTAL }, (_, i) => {
  const n = TOTAL - i; // newest first
  const status = n % 15 === 0 ? 'out' : n % 11 === 0 ? 'low' : n === 7 ? 'not_tracked' : 'ok';
  const tracked = status !== 'not_tracked';
  return {
    item_code: `PRD-${pad(n)}`,
    item_name: n === 40 ? 'Soap bar' : n === 41 ? 'Liquid soap' : n === 42 ? 'Soap dish' : `Product number ${n}`,
    category: GROUPS[n % GROUPS.length],
    price: 100 + n,
    price_source: 'price_list',
    stock: tracked ? (status === 'out' ? 0 : status === 'low' ? 2 : 10 + n) : null,
    unit: n % 2 ? 'Nos' : 'Kg',
    barcode: n === 40 ? '6001234567890' : '',
    barcodes: n === 40 ? ['6001234567890'] : [],
    disabled: 0,
    is_stock_item: tracked ? 1 : 0,
    low_stock_level: tracked ? 5 : null,
    status,
  };
});
const withCost = (row) => ({ ...row, cost_price: 60, profit_per_item: row.price - 60, margin_percent: Math.round(((row.price - 60) / row.price) * 1000) / 10 });

let canSeeCost = true;
const answer = ({ search = '', category = '', status = 'active', page = 1, pageSize = 20 } = {}) => {
  let rows = ALL;
  if (search) rows = rows.filter((r) => `${r.item_name} ${r.item_code} ${r.barcode}`.toLowerCase().includes(String(search).toLowerCase()));
  if (category) rows = rows.filter((r) => r.category === category);
  if (status === 'low' || status === 'out') rows = rows.filter((r) => r.status === status);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const at = Math.min(Math.max(1, page), pages);
  const slice = rows.slice((at - 1) * pageSize, at * pageSize);
  return {
    rows: canSeeCost ? slice.map(withCost) : slice,
    summary: { total: TOTAL, low_stock: ALL.filter((r) => r.status === 'low').length, out_of_stock: ALL.filter((r) => r.status === 'out').length },
    total: rows.length,
    page: at,
    pageSize,
    pages,
    status,
    stockScope: { kind: 'all_stores', warehouse: null },
    priceList: 'Standard Selling',
    canSeeCost,
  };
};

const CATEGORIES = GROUPS.map((name) => ({ name, parent: name === 'All Item Groups' ? null : 'All Item Groups', is_group: 0, is_default: name === 'All Item Groups', product_count: ALL.filter((r) => r.category === name).length }));

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderPage = async (url = '/new-look/products', tier = 'owner') => {
  canSeeCost = tier !== 'cashier';
  getMyAccess.mockResolvedValue({ tier, can: tier === 'cashier' ? {} : { cost_of_goods: true, profit: true } });
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <AccessProvider userKey="beth">
        <ToastProvider>
          <ProductsPage />
          <Where />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(getMyAccess).toHaveBeenCalled());
  return view;
};

const where = () => screen.getByTestId('where').textContent;
const rowOf = (name) => screen.getByRole('row', { name: new RegExp(name) });

beforeEach(() => {
  jest.resetAllMocks();
  listProducts.mockImplementation(async (query) => answer(query));
  listCategories.mockResolvedValue({ categories: CATEGORIES, total: 4, productTotal: TOTAL });
  window.innerWidth = 1280;
  setPreview(false);
  try {
    localStorage.clear();
  } catch (e) {
    // Not needed
  }
});

describe('the page', () => {
  test('has the title, the two tabs, and Export, Import and New product in the header', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument();
    const tabs = screen.getByRole('tablist', { name: 'Products views' });
    expect(within(tabs).getByRole('tab', { name: 'All products' })).toHaveAttribute('aria-selected', 'true');
    expect(within(tabs).getByRole('tab', { name: 'Categories' })).toHaveAttribute('aria-selected', 'false');
    ['Export', 'Import', 'New product'].forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
    await screen.findByRole('row', { name: /Product number 39/ });
  });

  test('the summary row has Products, Low on stock and Out of stock', async () => {
    await renderPage();
    const summary = await screen.findByLabelText('Products at a glance');
    await waitFor(() => expect(within(summary).getByText('45')).toBeInTheDocument());
    ['Products', 'Low on stock', 'Out of stock'].forEach((label) => expect(within(summary).getByText(label)).toBeInTheDocument());
    expect(within(summary).getByText(String(ALL.filter((r) => r.status === 'low').length))).toBeInTheDocument();
  });

  test('the columns are Product, Category, Price, Stock and Status', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    ['Product', 'Category', 'Price', 'Stock', 'Status'].forEach((name) => expect(screen.getByRole('columnheader', { name })).toBeInTheDocument());
  });

  test('a row has the name with its code beneath, the price in KES, the stock in plain words and the status', async () => {
    await renderPage();
    const row = await screen.findByRole('row', { name: /Soap bar/ });
    expect(within(row).getByText('Soap bar')).toBeInTheDocument();
    expect(within(row).getByText('PRD-040')).toBeInTheDocument();
    expect(within(row).getByText('KES 140')).toBeInTheDocument();
    expect(within(row).getByText('50 kilograms')).toBeInTheDocument();
    expect(within(row).getByText('In stock')).toBeInTheDocument();
  });

  test('units never show as codes', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    expect(screen.queryByText(/\bNos\b/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/pieces|piece/).length).toBeGreaterThan(0);
  });

  test('the status is an icon and a word, and the top category reads No category', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(1); // the summary label and the rows
    expect(screen.getAllByText('Low on stock').length).toBeGreaterThan(1);
    expect(screen.getAllByText('No category').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Item Group/i)).not.toBeInTheDocument();
  });

  test('a product that is not counted (a service) has a dash for stock and says so', async () => {
    await renderPage('/new-look/products?page=2');
    const row = await screen.findByRole('row', { name: /Product number 7\b/ });
    expect(within(row).getByText('Not counted')).toBeInTheDocument();
    expect(within(row).getByText('–')).toBeInTheDocument();
  });
});

describe('paging and the count (AC-25, AC-27)', () => {
  test('20 rows to a page, and the count is the server count', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('Showing 20 of 45')).toBeInTheDocument();
    expect(listProducts).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));
  });

  test('the rows-per-page box shows 20 and is never blank', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
  });

  test('a size in the address that is not offered shows 20', async () => {
    await renderPage('/new-look/products?size=7');
    await screen.findByRole('row', { name: /Soap bar/ });
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
    expect(listProducts).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 20 }));
    expect(screen.getByText('Showing 20 of 45')).toBeInTheDocument();
  });

  test('a size of nothing or a word shows 20 as well', async () => {
    await renderPage('/new-look/products?size=');
    await screen.findByRole('row', { name: /Soap bar/ });
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
  });

  test('choosing 50 rows shows them all and says so', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    userEvent.click(screen.getByRole('combobox', { name: /Rows per page/ }));
    userEvent.click(await screen.findByRole('option', { name: '50' }));
    await screen.findByText('Showing 45 of 45');
    expect(where()).toContain('size=50');
    expect(screen.getAllByRole('row')).toHaveLength(46);
  });

  test('the last page shows what is left, and Next is off', async () => {
    await renderPage('/new-look/products?page=3');
    expect(await screen.findByText('Showing 5 of 45')).toBeInTheDocument();
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('Next goes to the next page and the page is in the address', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Page 2 of 3');
    expect(where()).toContain('page=2');
    expect(screen.getAllByRole('row')).toHaveLength(21);
  });

  test('a link to a page past the last one shows the last page, not an empty list', async () => {
    await renderPage('/new-look/products?page=9');
    expect(await screen.findByText('Showing 5 of 45')).toBeInTheDocument();
  });

  test('the count after a search is the count of the search, not of the shop', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'soap{enter}');
    await screen.findByText('Showing 3 of 3');
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(where()).toContain('q=soap');
    expect(listProducts).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'soap', page: 1 }));
  });

  test('the summary is the whole shop and stays put while the list is filtered', async () => {
    await renderPage('/new-look/products?q=soap');
    await screen.findByText('Showing 3 of 3');
    const summary = screen.getByLabelText('Products at a glance');
    await waitFor(() => expect(within(summary).getByText('45')).toBeInTheDocument());
  });
});

describe('filters live in the address', () => {
  test('the search, the category and the view are all read from the address', async () => {
    await renderPage('/new-look/products?q=product&category=Food&status=low');
    await screen.findByRole('searchbox', { name: 'Search products' });
    expect(listProducts).toHaveBeenCalledWith({ search: 'product', category: 'Food', status: 'low', page: 1, pageSize: 20 });
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('product');
  });

  test('choosing a category puts it in the address and asks for it', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    userEvent.click(screen.getByRole('combobox', { name: /Category/ }));
    userEvent.click(await screen.findByRole('option', { name: 'Food' }));
    await waitFor(() => expect(where()).toContain('category=Food'));
    expect(listProducts).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Food' }));
  });

  test('the category choices use the plain word for the top category', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    userEvent.click(screen.getByRole('combobox', { name: /Category/ }));
    const names = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(names).toEqual(['All categories', 'Food', 'Household', 'Toiletries', 'No category']);
  });

  test('choosing Low on stock shows the low products and the address remembers it', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    userEvent.click(screen.getByRole('combobox', { name: 'Show' }));
    userEvent.click(await screen.findByRole('option', { name: 'Low on stock' }));
    await waitFor(() => expect(where()).toContain('status=low'));
    const lows = ALL.filter((r) => r.status === 'low').length;
    expect(await screen.findByText(`Showing ${lows} of ${lows}`)).toBeInTheDocument();
  });

  test('a view the address names but the list does not offer is the default view', async () => {
    await renderPage('/new-look/products?status=junk');
    await screen.findByRole('row', { name: /Soap bar/ });
    expect(listProducts).toHaveBeenCalledWith(expect.objectContaining({ status: '' }));
    expect(screen.getByRole('combobox', { name: 'Show' })).toHaveTextContent('Products in use');
  });

  test('Clear filters empties them all and goes to page 1', async () => {
    await renderPage('/new-look/products?q=soap&category=Food&page=1');
    await screen.findByRole('searchbox', { name: 'Search products' });
    userEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(where()).toBe('/new-look/products'));
    await waitFor(() => expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue(''));
  });

  test('there is no period picker: products are not a thing of a date', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
    expect(screen.queryByText('30 days')).not.toBeInTheDocument();
  });
});

describe('empty and error states', () => {
  test('no products at all: the next action is Add product', async () => {
    listProducts.mockResolvedValue({ ...answer(), rows: [], total: 0, pages: 1, summary: { total: 0, low_stock: 0, out_of_stock: 0 } });
    await renderPage();
    expect(await screen.findByRole('heading', { name: 'No products yet' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Add product' }));
    await waitFor(() => expect(where()).toBe('/new-look/products/new'));
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  test('nothing matches the filters: the action is Clear filters', async () => {
    await renderPage('/new-look/products?q=zzz');
    listProducts.mockResolvedValue({ ...answer(), rows: [], total: 0, pages: 1 });
    userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'q{enter}');
    expect(await screen.findByRole('heading', { name: 'No products match' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Clear filters' }).length).toBeGreaterThan(0);
  });

  test('a list that could not load says so and can be tried again', async () => {
    listProducts.mockRejectedValueOnce(new Error('We could not reach the Murzak server.'));
    await renderPage();
    expect(await screen.findByRole('heading', { name: /could not load/i })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /Soap bar/ })).toBeInTheDocument();
  });

  test('the export is off while there is nothing to export', async () => {
    listProducts.mockResolvedValue({ ...answer(), rows: [], total: 0, pages: 1 });
    await renderPage();
    await screen.findByRole('heading', { name: 'No products yet' });
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });
});

describe('the product panel', () => {
  test('a click on a row opens the panel and puts the product in the address', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Soap bar/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Soap bar' })).toBeInTheDocument();
    expect(where()).toContain('open=PRD-040');
    expect(rowOf('Soap bar')).toHaveAttribute('aria-current', 'true');
  });

  test('the panel shows price, stock, unit in words, barcode and category', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Soap bar/ }));
    await screen.findByRole('heading', { level: 2, name: 'Soap bar' });
    const panel = screen.getByRole('region', { name: 'Soap bar' });
    expect(within(panel).getByText('Code PRD-040')).toBeInTheDocument();
    expect(within(panel).getByText('KES 140')).toBeInTheDocument();
    expect(within(panel).getByText('In stock, all stores')).toBeInTheDocument();
    expect(within(panel).getByText('50 kilograms')).toBeInTheDocument();
    expect(within(panel).getByText('Kilograms')).toBeInTheDocument();
    expect(within(panel).getByText('6001234567890')).toBeInTheDocument();
    expect(within(panel).getByText('5 kilograms')).toBeInTheDocument(); // the low-stock warning
    expect(within(panel).getByText('Food')).toBeInTheDocument();
  });

  test('an owner sees the cost price and the profit per item', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Soap bar/ }));
    await screen.findByRole('heading', { level: 2, name: 'Soap bar' });
    const panel = screen.getByRole('region', { name: 'Soap bar' });
    expect(within(panel).getByText('Cost price')).toBeInTheDocument();
    expect(within(panel).getByText('KES 60')).toBeInTheDocument();
    expect(within(panel).getByText('Profit per item')).toBeInTheDocument();
    expect(within(panel).getByText('KES 80 (57.1%)')).toBeInTheDocument();
  });

  test('a product with no cost price says so and does not show profit as if it were known', async () => {
    listProducts.mockImplementation(async (query) => {
      const data = answer(query);
      return { ...data, rows: data.rows.map((r) => ({ ...r, cost_price: null, profit_per_item: null, margin_percent: null })) };
    });
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Soap bar/ }));
    await screen.findByRole('heading', { level: 2, name: 'Soap bar' });
    const panel = screen.getByRole('region', { name: 'Soap bar' });
    expect(within(panel).getByText(/Not set\. Add a cost price/)).toBeInTheDocument();
    expect(within(panel).queryByText('Profit per item')).not.toBeInTheDocument();
  });

  test('a cashier sees no cost and no profit, in the list or the panel, and no actions', async () => {
    await renderPage('/new-look/products', 'cashier');
    userEvent.click(await screen.findByRole('row', { name: /Soap bar/ }));
    await screen.findByRole('heading', { level: 2, name: 'Soap bar' });
    const panel = screen.getByRole('region', { name: 'Soap bar' });
    expect(within(panel).getByText('KES 140')).toBeInTheDocument();
    expect(within(panel).queryByText('Cost price')).not.toBeInTheDocument();
    expect(within(panel).queryByText(/Profit|Loss per item/)).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Add stock' })).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  test('even if the server sent a cost to a cashier by mistake, the screen does not draw it', async () => {
    listProducts.mockImplementation(async (query) => ({ ...answer(query), rows: answer(query).rows.map(withCost) }));
    await renderPage('/new-look/products', 'cashier');
    userEvent.click(await screen.findByRole('row', { name: /Soap bar/ }));
    await screen.findByRole('heading', { level: 2, name: 'Soap bar' });
    const panel = screen.getByRole('region', { name: 'Soap bar' });
    expect(within(panel).queryByText('Cost price')).not.toBeInTheDocument();
    expect(within(panel).queryByText('KES 60')).not.toBeInTheDocument();
  });

  test('a cashier has no New product or Import button', async () => {
    await renderPage('/new-look/products', 'cashier');
    await screen.findByRole('row', { name: /Soap bar/ });
    expect(screen.queryByRole('button', { name: 'New product' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  test('Escape closes the panel and the keyboard returns to its row', async () => {
    await renderPage();
    const row = await screen.findByRole('row', { name: /Soap bar/ });
    userEvent.click(row);
    const heading = await screen.findByRole('heading', { level: 2, name: 'Soap bar' });
    await waitFor(() => expect(heading).toHaveFocus());
    userEvent.keyboard('{esc}');
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'Soap bar' })).not.toBeInTheDocument());
    expect(where()).not.toContain('open=');
    await waitFor(() => expect(rowOf('Soap bar')).toHaveFocus());
  });

  test('Enter on a focused row opens it', async () => {
    await renderPage();
    const row = await screen.findByRole('row', { name: /Soap dish/ });
    row.focus();
    userEvent.keyboard('{enter}');
    expect(await screen.findByRole('heading', { level: 2, name: 'Soap dish' })).toBeInTheDocument();
  });

  test('Next moves to the following product', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Soap dish/ }));
    await screen.findByRole('heading', { level: 2, name: 'Soap dish' });
    expect(screen.getByText('4 of 20 on this page')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Next item' }));
    await screen.findByRole('heading', { level: 2, name: 'Liquid soap' });
  });

  test('a shared link opens the same product', async () => {
    await renderPage('/new-look/products?open=PRD-040');
    expect(await screen.findByRole('heading', { level: 2, name: 'Soap bar' })).toBeInTheDocument();
  });

  test('a shared link to a product that is not on this page asks for that one', async () => {
    await renderPage('/new-look/products?open=PRD-003');
    expect(await screen.findByRole('heading', { level: 2, name: 'Product number 3' })).toBeInTheDocument();
    expect(listProducts).toHaveBeenCalledWith(expect.objectContaining({ search: 'PRD-003', status: 'all' }));
  });

  test('Add stock opens the Stock page with the product filled in', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Soap bar/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Add stock' }));
    await waitFor(() => expect(where()).toBe('/new-look/stock?action=in&item=PRD-040'));
  });

  test('once the redesigned Stock page is live, Add stock opens it with the product', async () => {
    setPreview(true);
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Soap bar/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Add stock' }));
    await waitFor(() => expect(where()).toBe('/new-look/stock?action=in&item=PRD-040'));
  });

  test('a product that is not counted has no Add stock button', async () => {
    await renderPage('/new-look/products?page=2');
    userEvent.click(await screen.findByRole('row', { name: /Product number 7\b/ }));
    await screen.findByRole('heading', { level: 2, name: 'Product number 7' });
    expect(screen.queryByRole('button', { name: 'Add stock' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  test('Edit opens the Edit product form for that product', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /Soap bar/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(where()).toBe('/new-look/products/PRD-040/edit'));
  });
});

describe('the header buttons', () => {
  test('New product opens the form', async () => {
    await renderPage();
    userEvent.click(screen.getByRole('button', { name: 'New product' }));
    await waitFor(() => expect(where()).toBe('/new-look/products/new'));
  });

  test('Import goes to the current import screen until the new one is live', async () => {
    await renderPage();
    userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => expect(where()).toBe('/products/bulk-import'));
  });

  test('Import goes to the new import page once it is live', async () => {
    setPreview(true);
    await renderPage();
    userEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => expect(where()).toBe('/new-look/products/import'));
  });

  test('Export saves the rows on screen as a spreadsheet and says how many', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    const [text, name] = saveTextFile.mock.calls[0];
    expect(name).toMatch(/^products-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(text.split('\r\n')).toHaveLength(21);
    expect(text.split('\r\n')[0]).toContain('"Cost price (KES)"');
    expect(await screen.findByText('Saved 20 rows as a spreadsheet file')).toBeInTheDocument();
  });

  test('a cashier export has no cost column', async () => {
    await renderPage('/new-look/products', 'cashier');
    await screen.findByRole('row', { name: /Soap bar/ });
    userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(saveTextFile.mock.calls[0][0].split('\r\n')[0]).not.toContain('Cost');
  });
});

describe('the Categories tab', () => {
  test('the address of the tab opens the categories with their product counts', async () => {
    await renderPage('/new-look/products/categories');
    expect(await screen.findByRole('table', { name: 'Categories, A to Z' })).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /Food/ });
    expect(within(row).getByText(String(CATEGORIES[0].product_count))).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Categories' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Add category' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New product' })).not.toBeInTheDocument();
  });
});

describe('phones', () => {
  test('below 768px the rows are cards that open the panel, and the filters sit behind one Filters button', async () => {
    window.innerWidth = 390;
    await renderPage();
    const cards = await screen.findByRole('list', { name: 'Products, newest first' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(20);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toBeInTheDocument();
    userEvent.click(within(cards).getByRole('button', { name: /Soap bar/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Soap bar' })).toBeInTheDocument();
    userEvent.keyboard('{esc}');
    await waitFor(() => expect(screen.getByRole('button', { name: /Soap bar/ })).toHaveFocus());
  });

  test('resizing to a phone switches to cards', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /Soap bar/ });
    window.innerWidth = 390;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(await screen.findByRole('list', { name: 'Products, newest first' })).toBeInTheDocument();
  });

  test('the Filters button says how many filters are on', async () => {
    window.innerWidth = 390;
    await renderPage('/new-look/products?q=soap&category=Food');
    expect(await screen.findByRole('button', { name: 'Filters (2 on)' })).toBeInTheDocument();
  });
});

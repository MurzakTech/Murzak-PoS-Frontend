/* eslint-disable testing-library/no-node-access --
   Two checks need structure no role query can express: that every status draws an icon beside its word (the icon is
   an svg with no role) and that the system reference sits inside the closed Details fold-out (closest('details')). */
/**
 * The Purchases page (ticket P4-5), checked at the screen level against AC-25: the three tabs, short numbers, the system
 * reference only under Details, status as an icon plus a word, the purchase panel and its buttons shown only when the
 * server allows them, filters in the address, 20 rows to a page, the summary row, Export, empty and error states, the
 * header buttons and the menu of other purchase screens, and the phone layout.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import PurchasesPage from './PurchasesPage';
import { NEW_PATH, PURCHASES_PATH, RECEIVE_PATH, openAddress, receiveAddress } from './purchasesModel';
import { addPurchaseNote, cancelBill, cancelOrder, getPurchase, listPurchases, listSuppliers, makeBillFromNote, payBill, sendOrder } from '../../api/purchasesListApi';
import { saveTextFile } from '../../utils/saveTextFile';
import { _resetQueryCacheForTest } from '../hooks/useDataQuery';

jest.mock('../../api/purchasesListApi', () => ({
  listPurchases: jest.fn(),
  getPurchase: jest.fn(),
  listSuppliers: jest.fn(),
  payBill: jest.fn(),
  cancelOrder: jest.fn(),
  cancelBill: jest.fn(),
  sendOrder: jest.fn(),
  addPurchaseNote: jest.fn(),
  makeBillFromNote: jest.fn(),
}));
jest.mock('../../utils/saveTextFile', () => ({ saveTextFile: jest.fn() }));

// ---------- Fixtures: made-up shop data, never real ----------
const SUPPLIERS = ['Bidco Africa', 'Unga Limited', 'Kakuzi Fresh'];
const STATUSES = ['ordered', 'billed', 'paid', 'received', 'draft', 'cancelled', 'returned'];
const pad = (n, width) => String(n).padStart(width, '0');
const TOTAL = 45;
const ALL_ROWS = Array.from({ length: TOTAL }, (_, i) => {
  const n = TOTAL - i;
  const status = STATUSES[i % STATUSES.length];
  const isOrder = ['ordered', 'received', 'draft', 'cancelled'].includes(status);
  return {
    id: isOrder ? `PUR-ORD-2026-${pad(n, 5)}` : `ACC-PINV-2026-${pad(n, 5)}`,
    doctype: isOrder ? 'Purchase Order' : 'Purchase Invoice',
    number: `#${isOrder ? 'O' : status === 'returned' ? 'R' : 'B'}${pad(n, 4)}`,
    supplier: SUPPLIERS[i % SUPPLIERS.length],
    supplier_id: `SUP-${(i % SUPPLIERS.length) + 1}`,
    date: '2026-10-12',
    total: 100 * (n + 1),
    status,
    outstanding: status === 'billed' ? 100 * (n + 1) : 0,
    due_date: status === 'billed' ? '2099-01-31' : '',
    bill_no: status === 'billed' ? `INV-${n}` : '',
    is_return: status === 'returned',
    part_received: false,
  };
});

const answer = ({ tab = 'all', page = 1, pageSize = 20, search = '' } = {}) => {
  let rows = ALL_ROWS;
  if (tab === 'orders') rows = rows.filter((r) => r.doctype === 'Purchase Order');
  if (tab === 'returns') rows = rows.filter((r) => r.status === 'returned');
  if (search) rows = rows.filter((r) => `${r.number} ${r.supplier}`.toLowerCase().includes(search.toLowerCase()));
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    summary: { orders_open: 7, bills_unpaid: 123450, returned: 3200 },
    total: rows.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(rows.length / pageSize)),
  };
};

const ORDER_ROW = ALL_ROWS[0]; // ordered
const BILL_ROW = ALL_ROWS[1]; // billed
const PAID_ROW = ALL_ROWS[2]; // paid
const DRAFT_ROW = ALL_ROWS[4];

const MODES = [
  { name: 'Cash', kind: 'cash' },
  { name: 'M-Pesa', kind: 'mpesa' },
];

const panelFor = (row, over = {}) => ({
  id: row.id,
  doctype: row.doctype,
  number: row.number,
  status: row.status,
  part_received: false,
  reference: row.id,
  supplier: { id: row.supplier_id, name: row.supplier },
  date: row.date,
  bill_no: row.bill_no,
  bill_date: '',
  due_date: row.due_date,
  is_return: row.is_return,
  return_against: null,
  orders: [],
  lines: [{ item_code: 'SUG', item_name: 'Sugar 1kg', unit: 'Nos', ordered: 10, received: 4, to_arrive: 6, rate: 100, amount: 1000, warehouse: 'Stores - DS' }],
  totals: { subtotal: 1000, tax: 160, total: row.total, ...(row.doctype === 'Purchase Invoice' ? { outstanding: row.outstanding } : {}) },
  bills: [],
  returns: [],
  receipts: [],
  pay: null,
  can: { receive_goods: false, pay_bill: false, cancel: false, return: false, edit_draft: false, print: true },
  return_target: null,
  notes: [],
  ...over,
});

const orderPanel = (over = {}) => panelFor(ORDER_ROW, { can: { receive_goods: true, pay_bill: false, cancel: true, return: false, edit_draft: false, print: true }, part_received: true, ...over });
const billPanel = (over = {}) =>
  panelFor(BILL_ROW, {
    bills: [{ id: BILL_ROW.id, number: BILL_ROW.number, total: BILL_ROW.total, outstanding: BILL_ROW.outstanding, due_date: BILL_ROW.due_date }],
    pay: { invoice: BILL_ROW.id, number: BILL_ROW.number, bill_no: BILL_ROW.bill_no, outstanding: BILL_ROW.outstanding, due_date: BILL_ROW.due_date, modes: MODES },
    can: { receive_goods: false, pay_bill: true, cancel: true, return: true, edit_draft: false, print: true },
    return_target: BILL_ROW.id,
    ...over,
  });

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderPage = async (url = PURCHASES_PATH) => {
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider>
        <PurchasesPage />
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(listPurchases).toHaveBeenCalled());
  return view;
};

const where = () => screen.getByTestId('where').textContent;
const rowOf = (number) => screen.getByRole('row', { name: new RegExp(`${number}\\b`) });

beforeEach(() => {
  jest.resetAllMocks();
  _resetQueryCacheForTest();
  listPurchases.mockImplementation(async (query) => answer(query));
  listSuppliers.mockResolvedValue(SUPPLIERS.map((name, i) => ({ id: `SUP-${i + 1}`, name })));
  getPurchase.mockImplementation(async (id) => {
    const row = ALL_ROWS.find((r) => r.id === id) || ORDER_ROW;
    return row.doctype === 'Purchase Order' ? orderPanel({ id: row.id, number: row.number }) : billPanel({ id: row.id, number: row.number });
  });
  window.print = jest.fn();
  window.innerWidth = 1280;
});

describe('the list (AC-25)', () => {
  test('shows the three tabs, with All purchases open', async () => {
    await renderPage();
    const tabs = within(screen.getByRole('tablist', { name: 'Purchase views' })).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['All purchases', 'Orders', 'Returns']);
    expect(screen.getByRole('tab', { name: 'All purchases' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { level: 1, name: 'Purchases' })).toBeInTheDocument();
  });

  test('lists orders and bills with short numbers, newest first, and no system reference', async () => {
    await renderPage();
    expect(await screen.findByRole('row', { name: /#O0045\b/ })).toBeInTheDocument();
    expect(rowOf('#B0044')).toBeInTheDocument();
    const order = screen
      .getAllByRole('row')
      .slice(1, 3)
      .map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(order[0]).toContain('#O0045');
    expect(screen.queryByText(/PUR-ORD|ACC-PINV/)).not.toBeInTheDocument();
  });

  test('has the columns Purchase, Supplier, Date, Total (KES) and Status', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Purchase', 'Supplier', 'Date', 'Total (KES)', 'Status']);
  });

  test('shows the supplier, the date day first and the total as KES', async () => {
    await renderPage();
    const first = await screen.findByRole('row', { name: /#O0045\b/ });
    expect(within(first).getByText('Bidco Africa')).toBeInTheDocument();
    expect(within(first).getByText('12 Oct 2026')).toBeInTheDocument();
    expect(within(first).getByText('KES 4,600')).toBeInTheDocument();
  });

  test('a bill shows the supplier bill number under its number, and when it is due', async () => {
    await renderPage();
    const row = await screen.findByRole('row', { name: /#B0044\b/ });
    expect(within(row).getByText('Bill INV-44')).toBeInTheDocument();
    expect(within(row).getByText('Due 31 Jan 2099')).toBeInTheDocument();
  });

  test('a bill past its due date says so', async () => {
    const rows = answer().rows.map((r, i) => (i === 1 ? { ...r, due_date: '2020-01-31' } : r));
    listPurchases.mockResolvedValue({ ...answer(), rows });
    await renderPage();
    const row = await screen.findByRole('row', { name: /#B0044\b/ });
    expect(within(row).getByText('Overdue since 31 Jan 2020')).toBeInTheDocument();
  });

  test('every status is an icon plus a word: Draft, Ordered, Received, Billed, Paid, Returned, Cancelled', async () => {
    const rows = STATUSES.map((status, i) => ({ ...ALL_ROWS[i], status }));
    listPurchases.mockResolvedValue({ ...answer(), rows });
    await renderPage();
    await screen.findAllByRole('row');
    ['Draft', 'Ordered', 'Received', 'Billed', 'Paid', 'Returned', 'Cancelled'].forEach((word) => {
      const label = screen.getAllByText(word).find((el) => el.closest('.nl-status'));
      expect(label).toBeTruthy();
      expect(label.closest('.nl-status').querySelector('svg')).not.toBeNull();
    });
  });

  test('an order part received says so under its status', async () => {
    const rows = answer().rows.map((r, i) => (i === 0 ? { ...r, part_received: true } : r));
    listPurchases.mockResolvedValue({ ...answer(), rows });
    await renderPage();
    expect(within(await screen.findByRole('row', { name: /#O0045\b/ })).getByText('Part received')).toBeInTheDocument();
  });

  test('the summary row shows Orders open, Bills unpaid (KES) and Returned from the server', async () => {
    await renderPage();
    await screen.findByText('KES 123,450');
    expect(screen.getByText('Orders open')).toBeInTheDocument();
    expect(screen.getByText('Bills unpaid (KES)')).toBeInTheDocument();
    expect(screen.getByText('7')).toHaveClass('nl-summary__value');
    expect(screen.getAllByText('KES 3,200')[0]).toHaveClass('nl-summary__value');
  });

  test('shows 20 rows of 45, a correct count and a rows-per-page box that says 20', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    expect(listPurchases).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('Showing 20 of 45')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
  });

  test('the next page is in the address and the count follows', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /#R0025\b/ });
    expect(where()).toContain('page=2');
    userEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('row', { name: /#O0005\b/ });
    expect(screen.getByText('Showing 5 of 45')).toBeInTheDocument();
  });

  test('the rows-per-page box is never blank, even for a bad address, and a change goes in the address', async () => {
    await renderPage('/new-look/purchases?size=7');
    await screen.findByRole('row', { name: /#O0045\b/ });
    expect(screen.getByRole('combobox', { name: /Rows per page/ })).toHaveTextContent('20');
    userEvent.click(screen.getByRole('combobox', { name: /Rows per page/ }));
    userEvent.click(screen.getByRole('option', { name: '50' }));
    await screen.findByText('Showing 45 of 45');
    expect(where()).toContain('size=50');
  });
});

describe('tabs and filters live in the address', () => {
  test('choosing Orders changes the address and asks for the orders tab', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    userEvent.click(screen.getByRole('tab', { name: 'Orders' }));
    await waitFor(() => expect(where()).toContain('tab=orders'));
    await waitFor(() => expect(listPurchases).toHaveBeenLastCalledWith(expect.objectContaining({ tab: 'orders' })));
    await waitFor(() => expect(screen.queryByRole('row', { name: /#B0044\b/ })).not.toBeInTheDocument());
  });

  test('a link to the Returns tab opens it', async () => {
    await renderPage('/new-look/purchases?tab=returns');
    await screen.findAllByRole('row');
    expect(listPurchases).toHaveBeenCalledWith(expect.objectContaining({ tab: 'returns' }));
    expect(screen.getByRole('tab', { name: 'Returns' })).toHaveAttribute('aria-selected', 'true');
  });

  test('the period presets are Today, 7 days, 30 days and Custom, and a choice goes in the address', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Today', '7 days', '30 days', 'Custom']);
    userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    await waitFor(() => expect(where()).toContain('period=7d'));
    await waitFor(() => expect(listPurchases).toHaveBeenLastCalledWith(expect.objectContaining({ period: '7d' })));
  });

  test('a custom range sends its dates', async () => {
    await renderPage('/new-look/purchases?period=custom&from=2026-10-01&to=2026-10-07');
    await screen.findAllByRole('row');
    expect(listPurchases).toHaveBeenCalledWith(expect.objectContaining({ period: 'custom', from: '2026-10-01', to: '2026-10-07' }));
  });

  test('search waits for a pause in typing, then goes in the address and back to page 1', async () => {
    await renderPage('/new-look/purchases?page=2');
    await screen.findByRole('row', { name: /#R0025\b/ });
    listPurchases.mockClear();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search purchases' }), { target: { value: 'unga' } });
    expect(listPurchases).not.toHaveBeenCalled();
    await waitFor(() => expect(where()).toContain('q=unga'));
    expect(where()).not.toContain('page=2');
    await waitFor(() => expect(listPurchases).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'unga', page: 1 })));
    expect(listPurchases).toHaveBeenCalledTimes(1);
  });

  test('a Supplier dropdown lists the suppliers and a choice goes in the address', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    userEvent.click(await screen.findByRole('combobox', { name: /Supplier/ }));
    userEvent.click(screen.getByRole('option', { name: 'Unga Limited' }));
    await waitFor(() => expect(where()).toContain('supplier=SUP-2'));
    await waitFor(() => expect(listPurchases).toHaveBeenLastCalledWith(expect.objectContaining({ supplier: 'SUP-2' })));
  });

  test('a link with a supplier already chosen asks for it', async () => {
    await renderPage('/new-look/purchases?supplier=SUP-3');
    await screen.findAllByRole('row');
    expect(listPurchases).toHaveBeenCalledWith(expect.objectContaining({ supplier: 'SUP-3' }));
  });

  test('a tab keeps the period and supplier when you move to the next tab', async () => {
    await renderPage('/new-look/purchases?period=7d&supplier=SUP-1');
    await screen.findAllByRole('row');
    expect(screen.getByRole('tab', { name: 'Orders' })).toHaveAttribute('href', expect.stringContaining('period=7d'));
    expect(screen.getByRole('tab', { name: 'Orders' })).toHaveAttribute('href', expect.stringContaining('supplier=SUP-1'));
  });
});

describe('the Show filter: goods received notes and every supplier bill', () => {
  const receipts = {
    rows: [
      {
        id: 'MAT-PRE-2026-00004',
        doctype: 'Purchase Receipt',
        number: '#G0004',
        supplier: 'Bidco Africa',
        supplier_id: 'SUP-1',
        date: '2026-10-03',
        total: 1160,
        status: 'received',
        outstanding: 0,
        due_date: '',
        bill_no: '',
        is_return: false,
        part_received: false,
      },
    ],
    summary: { orders_open: 7, bills_unpaid: 123450, returned: 3200 },
    total: 1,
    page: 1,
    pageSize: 20,
    pages: 1,
  };

  test('offers Orders, bills and returns, Goods received notes and All supplier bills', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    userEvent.click(await screen.findByRole('combobox', { name: /Show/ }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Orders, bills and returns', 'Goods received notes', 'All supplier bills']);
  });

  test('choosing Goods received notes puts it in the address, asks for it and lists the notes', async () => {
    listPurchases.mockImplementation(async (query) => (query.kind === 'receipts' ? receipts : answer(query)));
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    userEvent.click(await screen.findByRole('combobox', { name: /Show/ }));
    userEvent.click(screen.getByRole('option', { name: 'Goods received notes' }));
    await waitFor(() => expect(where()).toContain('kind=receipts'));
    expect(await screen.findByRole('row', { name: /#G0004\b/ })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Goods received notes, newest first/ })).toBeInTheDocument();
  });

  test('a goods received note that has no bill yet offers Make the bill, which asks for the bill number and date', async () => {
    listPurchases.mockResolvedValue(receipts);
    makeBillFromNote.mockResolvedValue({ invoice: 'ACC-PINV-2026-00071' });
    getPurchase.mockResolvedValue(panelFor({ ...receipts.rows[0] }, { can: { receive_goods: false, pay_bill: false, cancel: false, return: false, edit_draft: false, make_bill: true, print: true } }));
    await renderPage('/new-look/purchases?kind=receipts');
    userEvent.click(await screen.findByRole('row', { name: /#G0004\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Make the bill' }));
    const dialog = await screen.findByRole('dialog', { name: 'Make the bill' });
    userEvent.type(within(dialog).getByRole('textbox', { name: 'Bill number' }), 'INV-71');
    userEvent.click(within(dialog).getByRole('button', { name: 'Make the bill' }));
    await waitFor(() => expect(makeBillFromNote).toHaveBeenCalledWith({ receipt: 'MAT-PRE-2026-00004', billNo: 'INV-71', billDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
    expect(await screen.findByText('The bill was made')).toBeInTheDocument();
  });

  test('a note that is already billed does not offer Make the bill', async () => {
    listPurchases.mockResolvedValue(receipts);
    getPurchase.mockResolvedValue(
      panelFor({ ...receipts.rows[0] }, { can: { receive_goods: false, pay_bill: false, cancel: false, return: false, edit_draft: false, make_bill: false, print: true } })
    );
    await renderPage('/new-look/purchases?kind=receipts');
    userEvent.click(await screen.findByRole('row', { name: /#G0004\b/ }));
    await screen.findByText('Sugar 1kg');
    expect(screen.queryByRole('button', { name: 'Make the bill' })).not.toBeInTheDocument();
  });

  test('a bill that cannot be made keeps the dialog open with the reason', async () => {
    listPurchases.mockResolvedValue(receipts);
    makeBillFromNote.mockRejectedValue(new Error('GRN is not ready for invoicing.'));
    getPurchase.mockResolvedValue(panelFor({ ...receipts.rows[0] }, { can: { receive_goods: false, pay_bill: false, cancel: false, return: false, edit_draft: false, make_bill: true, print: true } }));
    await renderPage('/new-look/purchases?kind=receipts');
    userEvent.click(await screen.findByRole('row', { name: /#G0004\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Make the bill' }));
    const dialog = await screen.findByRole('dialog', { name: 'Make the bill' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Make the bill' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('not ready for invoicing');
  });

  test('a goods received note opens in the panel', async () => {
    listPurchases.mockResolvedValue(receipts);
    getPurchase.mockResolvedValue(
      panelFor(
        { ...receipts.rows[0] },
        { can: { receive_goods: false, pay_bill: false, cancel: false, return: false, edit_draft: false, print: true }, orders: [{ id: 'PUR-ORD-2026-00012', number: '#O0012' }] }
      )
    );
    await renderPage('/new-look/purchases?kind=receipts');
    userEvent.click(await screen.findByRole('row', { name: /#G0004\b/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Purchase #G0004' })).toBeInTheDocument();
    expect(getPurchase).toHaveBeenCalledWith('MAT-PRE-2026-00004', 'Purchase Receipt');
    expect(await screen.findByRole('link', { name: '#O0012' })).toHaveAttribute('href', openAddress('PUR-ORD-2026-00012'));
  });

  test('a view ignores the tab: All purchases is the one marked', async () => {
    await renderPage('/new-look/purchases?kind=bills&tab=returns');
    await screen.findAllByRole('row');
    expect(listPurchases).toHaveBeenCalledWith(expect.objectContaining({ kind: 'bills', tab: 'all' }));
    expect(screen.getByRole('tab', { name: 'All purchases' })).toHaveAttribute('aria-selected', 'true');
  });

  test('choosing a tab leaves the view', async () => {
    await renderPage('/new-look/purchases?kind=bills');
    await screen.findAllByRole('row');
    expect(screen.getByRole('tab', { name: 'Orders' })).toHaveAttribute('href', expect.not.stringContaining('kind='));
  });

  test('an empty view names what it is, and offers all purchases', async () => {
    listPurchases.mockResolvedValue({ ...answer(), rows: [], total: 0 });
    await renderPage('/new-look/purchases?kind=bills');
    expect(await screen.findByText('No purchases match')).toBeInTheDocument();
  });

  test('an unknown view in the address is ignored', async () => {
    await renderPage('/new-look/purchases?kind=nonsense');
    await screen.findAllByRole('row');
    expect(listPurchases).toHaveBeenCalledWith(expect.objectContaining({ kind: '' }));
  });
});

// The header holds the main button and a More menu; everything else is one click further in
const MORE = 'More actions for this page';
const inMore = (name) => {
  userEvent.click(screen.getByRole('button', { name: MORE }));
  return screen.getByRole('menuitem', { name });
};

describe('Export, empty and error states, and the header', () => {
  test('Export is in the page header and saves what is on screen as a spreadsheet', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    userEvent.click(inMore('Export'));
    expect(saveTextFile).toHaveBeenCalledTimes(1);
    expect(saveTextFile.mock.calls[0][0]).toContain('"Purchase","Supplier","Date","Total","Status"');
    expect(saveTextFile.mock.calls[0][1]).toMatch(/^purchases-all-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('Export waits when there is nothing to export', async () => {
    listPurchases.mockResolvedValue({ ...answer(), rows: [], total: 0 });
    await renderPage();
    await screen.findByText('No purchases yet');
    expect(inMore('Export')).toBeDisabled();
  });

  test('an empty list names the next action: a new purchase', async () => {
    listPurchases.mockResolvedValue({ ...answer(), rows: [], total: 0 });
    await renderPage();
    expect(await screen.findByText('No purchases yet')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'New purchase' });
    expect(buttons).toHaveLength(2); // the header and the empty state
    userEvent.click(buttons[1]);
    expect(where()).toBe(NEW_PATH);
  });

  test('an empty Returns tab offers to show all purchases', async () => {
    listPurchases.mockResolvedValue({ ...answer(), rows: [], total: 0 });
    await renderPage('/new-look/purchases?tab=returns');
    expect(await screen.findByText('No returns in this period')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all purchases' })).toBeInTheDocument();
  });

  test('a search with no match says so and offers to clear the filters', async () => {
    listPurchases.mockResolvedValue({ ...answer(), rows: [], total: 0 });
    await renderPage('/new-look/purchases?q=zzz');
    expect(await screen.findByText('No purchases match')).toBeInTheDocument();
    userEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    await waitFor(() => expect(where()).not.toContain('q=zzz'));
  });

  test('a list that cannot load says so and Try again asks once more', async () => {
    listPurchases.mockRejectedValueOnce(new Error('Could not load the purchases. Please try again.'));
    await renderPage();
    userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /#O0045\b/ })).toBeInTheDocument();
    expect(listPurchases).toHaveBeenCalledTimes(2);
  });

  test('the header has New purchase and a More menu with Receive goods', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    const header = screen.getByRole('heading', { level: 1, name: 'Purchases' }).closest('.nl-page-header');
    expect(within(header).getAllByRole('button').map((b) => b.textContent)).toEqual(['More', 'New purchase']);
    userEvent.click(inMore('Receive goods'));
    expect(where()).toBe(RECEIVE_PATH);
  });

  test('New purchase opens the form', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    const header = screen.getByRole('heading', { level: 1, name: 'Purchases' }).closest('.nl-page-header');
    userEvent.click(within(header).getByRole('button', { name: 'New purchase' }));
    expect(where()).toBe(NEW_PATH);
  });

  test('the other purchase lists stay one menu away: goods received notes, all supplier bills, and recording goods with no order', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    userEvent.click(screen.getByRole('button', { name: MORE }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Receive goods', 'Export', 'Goods received notes', 'All supplier bills', 'Record goods with no order (earlier screen)']);
    userEvent.click(screen.getByRole('menuitem', { name: 'Record goods with no order (earlier screen)' }));
    expect(where()).toBe('/purchases/receipts/new?legacy=1');
  });

  test('Goods received notes in the menu shows that view in this page', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    userEvent.click(inMore('Goods received notes'));
    await waitFor(() => expect(where()).toContain('kind=receipts'));
    await waitFor(() => expect(listPurchases).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'receipts', tab: 'all' })));
  });

  test('the old Create GRN address (?action=receive) goes straight to Receive goods', async () => {
    listPurchases.mockImplementation(async (query) => answer(query));
    render(
      <MemoryRouter initialEntries={[`${PURCHASES_PATH}?action=receive`]}>
        <ToastProvider>
          <PurchasesPage />
          <Where />
        </ToastProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(where()).toBe(RECEIVE_PATH));
  });
});

describe('the purchase panel', () => {
  test('a click on a row opens the purchase, asks the server for it and puts the choice in the address', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Purchase #O0045' })).toBeInTheDocument();
    expect(getPurchase).toHaveBeenCalledWith('PUR-ORD-2026-00045', 'Purchase Order');
    expect(where()).toContain('open=PUR-ORD-2026-00045');
    expect(await screen.findByText('Sugar 1kg')).toBeInTheDocument();
    expect(rowOf('#O0045')).toHaveAttribute('aria-current', 'true');
  });

  test('a shared link opens the same purchase, even for a number that is not in the list', async () => {
    await renderPage('/new-look/purchases?open=ACC-PINV-2026-00099');
    expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(getPurchase).toHaveBeenCalledWith('ACC-PINV-2026-00099', undefined);
  });

  test('a link with a short number opens the purchase matching that number in the list', async () => {
    await renderPage('/new-look/purchases?open=%23O0045');
    expect(await screen.findByRole('heading', { level: 2, name: 'Purchase #O0045' })).toBeInTheDocument();
    expect(getPurchase).toHaveBeenCalledWith('PUR-ORD-2026-00045', 'Purchase Order');
  });

  test('shows the status, supplier, lines and totals', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    await screen.findByText('Sugar 1kg');
    const panel = screen.getByRole('heading', { level: 2, name: 'Purchase #O0045' }).closest('section');
    expect(within(panel).getAllByText('Ordered').length).toBeGreaterThan(0);
    expect(within(panel).getByText('Bidco Africa')).toBeInTheDocument();
    expect(within(panel).getByRole('columnheader', { name: 'Still to arrive' })).toBeInTheDocument();
    expect(within(panel).getByText('KES 160')).toBeInTheDocument();
    expect(within(panel).getByText('Part of this order has arrived. The rest is still to come.')).toBeInTheDocument();
  });

  test('the system reference appears only inside Details', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    await screen.findByText('Sugar 1kg');
    const found = screen.getAllByText(/PUR-ORD-2026-00045/).filter((el) => !el.dataset.testid);
    expect(found).toHaveLength(1);
    expect(found[0].closest('details')).not.toBeNull();
  });

  test('an order with items still to arrive offers Receive goods, which opens the steps with that order', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    await screen.findByText('Sugar 1kg');
    const panel = screen.getByRole('heading', { level: 2, name: 'Purchase #O0045' }).closest('section');
    userEvent.click(within(panel).getByRole('button', { name: 'Receive goods' }));
    expect(where()).toBe(receiveAddress('PUR-ORD-2026-00045'));
  });

  test('Receive goods is not offered when the server says nothing is left to arrive', async () => {
    getPurchase.mockResolvedValue(orderPanel({ can: { receive_goods: false, pay_bill: false, cancel: false, return: false, edit_draft: false, print: true } }));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    await screen.findByText('Sugar 1kg');
    const panel = screen.getByRole('heading', { level: 2, name: 'Purchase #O0045' }).closest('section');
    expect(within(panel).queryByRole('button', { name: 'Receive goods' })).not.toBeInTheDocument();
  });

  test('Pay bill is offered only when the bill has an amount outstanding', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#B0044\b/ }));
    expect(await screen.findByRole('button', { name: 'Pay bill' })).toBeInTheDocument();
    getPurchase.mockResolvedValue(panelFor(PAID_ROW, { can: { receive_goods: false, pay_bill: false, cancel: true, return: true, edit_draft: false, print: true }, return_target: PAID_ROW.id }));
    userEvent.click(rowOf('#B0043'));
    await screen.findByRole('heading', { level: 2, name: 'Purchase #B0043' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Pay bill' })).not.toBeInTheDocument());
  });

  test('Pay bill asks for the amount (filled with what is owed) and how it was paid, then pays the bill', async () => {
    payBill.mockResolvedValue({ paid: 4500, outstanding: 0 });
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#B0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Pay bill' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pay bill' });
    expect(within(dialog).getByRole('textbox', { name: /Amount/ })).toHaveValue('4500');
    expect(within(dialog).getByRole('radio', { name: 'Cash' })).toBeChecked();
    userEvent.click(within(dialog).getByRole('button', { name: 'Pay' }));
    await waitFor(() => expect(payBill).toHaveBeenCalledWith({ invoice: 'ACC-PINV-2026-00044', amount: 4500, mode: 'Cash', reference: undefined }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Pay bill' })).not.toBeInTheDocument());
    expect(await screen.findByText('Paid KES 4,500 to Unga Limited')).toBeInTheDocument();
  });

  test('a partial payment sends the smaller amount', async () => {
    payBill.mockResolvedValue({ paid: 1000, outstanding: 3500 });
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#B0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Pay bill' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pay bill' });
    userEvent.clear(within(dialog).getByRole('textbox', { name: /Amount/ }));
    userEvent.type(within(dialog).getByRole('textbox', { name: /Amount/ }), '1000');
    userEvent.click(within(dialog).getByRole('button', { name: 'Pay' }));
    await waitFor(() => expect(payBill).toHaveBeenCalledWith(expect.objectContaining({ amount: 1000 })));
  });

  test('paying more than is owed is stopped beside the field', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#B0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Pay bill' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pay bill' });
    userEvent.clear(within(dialog).getByRole('textbox', { name: /Amount/ }));
    userEvent.type(within(dialog).getByRole('textbox', { name: /Amount/ }), '99999');
    userEvent.click(within(dialog).getByRole('button', { name: 'Pay' }));
    expect(await within(dialog).findByText('You owe KES 4,500. Enter that or less.')).toBeInTheDocument();
    expect(payBill).not.toHaveBeenCalled();
  });

  test('paying by M-Pesa needs the code', async () => {
    payBill.mockResolvedValue({ paid: 4500, outstanding: 0 });
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#B0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Pay bill' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pay bill' });
    userEvent.click(within(dialog).getByRole('radio', { name: 'M-Pesa' }));
    userEvent.click(within(dialog).getByRole('button', { name: 'Pay' }));
    expect(await within(dialog).findByText('Enter the M-Pesa code.')).toBeInTheDocument();
    expect(payBill).not.toHaveBeenCalled();
    userEvent.type(within(dialog).getByRole('textbox', { name: 'M-Pesa code' }), 'QGH7K2LMN4');
    userEvent.click(within(dialog).getByRole('button', { name: 'Pay' }));
    await waitFor(() => expect(payBill).toHaveBeenCalledWith({ invoice: 'ACC-PINV-2026-00044', amount: 4500, mode: 'M-Pesa', reference: 'QGH7K2LMN4' }));
  });

  test('a payment the server refuses keeps the dialog open with the reason', async () => {
    payBill.mockRejectedValue(new Error('Purchase Invoice is already fully paid'));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#B0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Pay bill' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pay bill' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Pay' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already fully paid');
    expect(screen.getByRole('dialog', { name: 'Pay bill' })).toBeInTheDocument();
  });

  test('Print opens the print window with a block that has no system reference', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#B0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Print' }));
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    expect(document.querySelector('.nl-purchase-print')).toBeNull();
  });

  test('Create return goes to the current returns screen with the bill', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#B0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Create return' }));
    expect(where()).toBe('/purchases/returns?purchase=ACC-PINV-2026-00044&legacy=1');
  });

  test('Create return is not offered when the server does not allow it', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    await screen.findByText('Sugar 1kg');
    expect(screen.queryByRole('button', { name: 'Create return' })).not.toBeInTheDocument();
  });

  test('Cancel asks first and names what is lost; Keep it changes nothing', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancel order #O0045?' });
    expect(within(dialog).getByText(/Nothing has arrived on it, so your stock does not change/)).toBeInTheDocument();
    userEvent.click(within(dialog).getByRole('button', { name: 'Keep it' }));
    expect(cancelOrder).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('cancelling an order uses the current cancel call and says so', async () => {
    cancelOrder.mockResolvedValue(true);
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel it' }));
    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith('PUR-ORD-2026-00045'));
    expect(await screen.findByText('#O0045 cancelled')).toBeInTheDocument();
  });

  test('cancelling a bill says the stock it added comes out again and uses the bill call', async () => {
    cancelBill.mockResolvedValue(true);
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#B0044\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancel bill #B0044?' });
    expect(within(dialog).getByText(/stock it added is taken out again/)).toBeInTheDocument();
    userEvent.click(within(dialog).getByRole('button', { name: 'Cancel it' }));
    await waitFor(() => expect(cancelBill).toHaveBeenCalledWith('ACC-PINV-2026-00044'));
  });

  test('a cancel the server refuses shows the reason', async () => {
    cancelOrder.mockRejectedValue(new Error('Purchase Order has submitted receipts or invoices and cannot be cancelled'));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel it' }));
    expect(await screen.findByText(/cannot be cancelled/)).toBeInTheDocument();
  });

  test('a draft order offers Send order to supplier and Edit draft, which opens the current screen', async () => {
    getPurchase.mockResolvedValue(panelFor(DRAFT_ROW, { can: { receive_goods: false, pay_bill: false, cancel: false, return: false, edit_draft: true, print: true } }));
    sendOrder.mockResolvedValue({ waitingForApproval: false });
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: new RegExp(`${DRAFT_ROW.number}\\b`) }));
    userEvent.click(await screen.findByRole('button', { name: 'Send order to supplier' }));
    const dialog = await screen.findByRole('dialog', { name: 'Send this order to the supplier?' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Send order' }));
    await waitFor(() => expect(sendOrder).toHaveBeenCalledWith(DRAFT_ROW.id));
    userEvent.click(screen.getByRole('button', { name: 'Edit draft' }));
    expect(where()).toBe(`/purchases/new?draft=${DRAFT_ROW.id}&legacy=1`);
  });

  test('a panel with notes lists them and Add a note saves one', async () => {
    getPurchase.mockResolvedValue(orderPanel({ notes: [{ text: 'Call before delivery', date: '2026-10-02' }] }));
    addPurchaseNote.mockResolvedValue({ note: { text: 'Fragile', date: '2026-10-14' } });
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    expect(await screen.findByText('Call before delivery')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Add a note' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a note' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Save note' }));
    expect(await within(dialog).findByText('Write the note first.')).toBeInTheDocument();
    userEvent.type(within(dialog).getByRole('textbox', { name: 'Note' }), 'Fragile');
    userEvent.click(within(dialog).getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect(addPurchaseNote).toHaveBeenCalledWith({ id: 'PUR-ORD-2026-00045', doctype: 'Purchase Order', note: 'Fragile' }));
  });

  test('the bills and goods received notes of an order link to their own panels', async () => {
    getPurchase.mockResolvedValue(
      orderPanel({
        bills: [{ id: 'ACC-PINV-2026-00060', number: '#B0060', total: 1160, outstanding: 0, due_date: '2026-11-02' }],
        receipts: [{ id: 'MAT-PRE-2026-00004', number: '#G0004', total: 1160, date: '2026-10-03' }],
      })
    );
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    expect(await screen.findByRole('link', { name: /#B0060/ })).toHaveAttribute('href', openAddress('ACC-PINV-2026-00060'));
    expect(screen.getByRole('link', { name: /#G0004/ })).toHaveAttribute('href', openAddress('MAT-PRE-2026-00004'));
  });

  test('a purchase that cannot load says so with Try again', async () => {
    getPurchase.mockRejectedValueOnce(new Error('Your connection is down'));
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    expect(await screen.findByText('We could not load this purchase')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Sugar 1kg')).toBeInTheDocument();
  });

  test('a purchase that is not found says so without a retry button', async () => {
    const error = new Error('Purchase X was not found.');
    error.errorType = 'not_found';
    getPurchase.mockRejectedValue(error);
    await renderPage('/new-look/purchases?open=NOPE');
    expect(await screen.findByText('We could not find this purchase')).toBeInTheDocument();
  });

  test('opening a purchase by sequence number matches the full ID in the rows', async () => {
    await renderPage(`${PURCHASES_PATH}?open=00045`);
    expect(await screen.findByRole('heading', { level: 2, name: 'Purchase #O0045' })).toBeInTheDocument();
  });

  test('Previous and Next move between purchases, and Escape closes the panel and returns to the row', async () => {
    await renderPage();
    userEvent.click(await screen.findByRole('row', { name: /#O0045\b/ }));
    const panel = (await screen.findByRole('heading', { level: 2, name: 'Purchase #O0045' })).closest('section');
    userEvent.click(within(panel).getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Purchase #B0044' })).toBeInTheDocument();
    userEvent.keyboard('{esc}');
    await waitFor(() => expect(where()).not.toContain('open='));
  });
});

describe('phones', () => {
  const narrow = () => {
    window.innerWidth = 390;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  test('below 768px the rows are cards that open the purchase, and filters sit behind one Filters button', async () => {
    window.innerWidth = 390;
    await renderPage();
    const cards = await screen.findByRole('list', { name: 'Purchases, newest first' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(20);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('searchbox', { name: 'Search purchases' })).toBeInTheDocument();
    userEvent.click(within(cards).getByRole('button', { name: /#O0045\b/ }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Purchase #O0045' })).toBeInTheDocument();
  });

  test('resizing to a phone switches to cards', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0045\b/ });
    narrow();
    expect(await screen.findByRole('list', { name: 'Purchases, newest first' })).toBeInTheDocument();
  });

  test('the Filters button says how many filters are on', async () => {
    window.innerWidth = 390;
    await renderPage('/new-look/purchases?q=unga&period=7d');
    expect(await screen.findByRole('button', { name: 'Filters (2 on)' })).toBeInTheDocument();
  });
});

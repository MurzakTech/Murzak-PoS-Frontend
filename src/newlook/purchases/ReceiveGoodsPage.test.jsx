/* eslint-disable testing-library/no-node-access --
   One check needs structure no role query can express: that the step marked aria-current is the step the person is on
   (the list item holds the number and the words). */
/**
 * Receive goods (ticket P4-5), checked at the screen level against AC-29: the guided steps (choose the order, tick what arrived
 * and enter the quantity received, check and confirm), quantities capped at what is still to arrive, one server call on Confirm
 * that makes the goods received note, raises the stock and creates the bill together, a failure that keeps the page and what was
 * typed, a repeat that cannot double the entry, and the links to the bill and the note on success.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import ReceiveGoodsPage from './ReceiveGoodsPage';
import { NEW_PATH, openAddress, PURCHASES_PATH } from './purchasesModel';
import { createPurchaseReturn, getPurchase, listPurchases, listSuppliers, receiveGoods } from '../../api/purchasesListApi';

jest.mock('../../api/purchasesListApi', () => ({ listPurchases: jest.fn(), getPurchase: jest.fn(), listSuppliers: jest.fn(), receiveGoods: jest.fn(), createPurchaseReturn: jest.fn() }));
const mockStores = { current: [] };
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { company: 'Demo Shop' } }, warehouse: { warehouses: mockStores.current } }),
}));
jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn(() => ({ type: 'x' })) }));

// ---------- Fixtures: made-up shop data, never real ----------
const OPEN_ORDERS = [
  { id: 'PUR-ORD-2026-00012', doctype: 'Purchase Order', number: '#O0012', supplier: 'Bidco Africa', supplier_id: 'SUP-1', date: '2026-10-01', total: 2320, status: 'ordered', part_received: true },
  { id: 'PUR-ORD-2026-00013', doctype: 'Purchase Order', number: '#O0013', supplier: 'Unga Limited', supplier_id: 'SUP-2', date: '2026-10-05', total: 900, status: 'ordered', part_received: false },
];

const orderPanel = (over = {}) => ({
  id: 'PUR-ORD-2026-00012',
  doctype: 'Purchase Order',
  number: '#O0012',
  status: 'ordered',
  part_received: true,
  reference: 'PUR-ORD-2026-00012',
  supplier: { id: 'SUP-1', name: 'Bidco Africa' },
  date: '2026-10-01',
  lines: [
    { item_code: 'SUG', item_name: 'Sugar 1kg', unit: 'Nos', ordered: 10, received: 4, to_arrive: 6, rate: 100, amount: 1000, warehouse: 'Stores - DS' },
    { item_code: 'RIC', item_name: 'Rice 2kg', unit: 'Nos', ordered: 5, received: 0, to_arrive: 5, rate: 200, amount: 1000, warehouse: 'Stores - DS' },
    { item_code: 'SLT', item_name: 'Salt 500g', unit: 'Nos', ordered: 2, received: 2, to_arrive: 0, rate: 50, amount: 100, warehouse: 'Stores - DS' },
  ],
  totals: { subtotal: 2100, tax: 0, total: 2100 },
  can: { receive_goods: true, pay_bill: false, cancel: false, return: false, edit_draft: false, print: true },
  ...over,
});

const done = (over = {}) => ({
  receipt: 'MAT-PRE-2026-00004',
  receipt_number: '#G0004',
  invoice: 'ACC-PINV-2026-00030',
  invoice_number: '#B0030',
  bill: { bill_no: 'INV-55', due_date: '2026-11-13', total: 1600 },
  stock: [
    { item_code: 'SUG', received: 6, before: 10, after: 16 },
    { item_code: 'RIC', received: 5, before: 3, after: 8 },
  ],
  stock_ok: true,
  order: { id: 'PUR-ORD-2026-00012', open: false, still_to_arrive: [] },
  repeat: false,
  ...over,
});

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderPage = async (url = '/new-look/purchases/receive') => {
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider>
        <ReceiveGoodsPage />
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(listPurchases.mock.calls.length + getPurchase.mock.calls.length).toBeGreaterThan(0));
  return view;
};

const where = () => screen.getByTestId('where').textContent;
const qtyField = (name) => screen.getByRole('textbox', { name: `Quantity received of ${name}` });
const spoiltField = (name) => screen.getByRole('textbox', { name: `Spoilt quantity of ${name}` });
const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }));
// The toast area is also an alert region, so wait for the alert that holds the words
const alertWith = async (text) => {
  await waitFor(() => expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual(expect.arrayContaining([expect.stringContaining(text)])));
  return screen.getAllByRole('alert').find((a) => a.textContent.includes(text));
};

// Chooses the first order and goes to the items step
const toItems = async () => {
  userEvent.click(await screen.findByRole('row', { name: /#O0012\b/ }));
  next();
  await screen.findByRole('heading', { level: 2, name: 'What arrived' });
};
const toReview = async () => {
  await toItems();
  next();
  await screen.findByRole('heading', { level: 2, name: 'Check and confirm' });
};

beforeEach(() => {
  jest.resetAllMocks();
  mockStores.current = [];
  listPurchases.mockResolvedValue({ rows: OPEN_ORDERS, total: 2, summary: {}, page: 1, pageSize: 100, pages: 1 });
  listSuppliers.mockResolvedValue([
    { id: 'SUP-1', name: 'Bidco Africa' },
    { id: 'SUP-2', name: 'Unga Limited' },
  ]);
  getPurchase.mockResolvedValue(orderPanel());
  receiveGoods.mockResolvedValue(done());
  createPurchaseReturn.mockResolvedValue({ success: true, return_invoice: 'ACC-PINV-2026-00031' });
});

describe('step 1: choose the order', () => {
  test('shows the three steps with the first one marked, and the open orders', async () => {
    await renderPage();
    const steps = screen.getByRole('list', { name: 'Steps' });
    expect(
      within(steps)
        .getAllByRole('listitem')
        .map((i) => i.textContent)
    ).toEqual(['1Choose the order', '2Tick what arrived', '3Check and confirm']);
    expect(within(steps).getByText('Choose the order').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(await screen.findByRole('row', { name: /#O0012\b/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /#O0013\b/ })).toBeInTheDocument();
  });

  test('asks the server only for orders still waiting for goods', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0012\b/ });
    expect(listPurchases).toHaveBeenCalledWith(expect.objectContaining({ tab: 'orders', openOnly: true, pageSize: 100 }));
  });

  test('lists the order number, supplier, date, total and whether part has arrived', async () => {
    await renderPage();
    const row = await screen.findByRole('row', { name: /#O0012\b/ });
    expect(within(row).getByText('Bidco Africa')).toBeInTheDocument();
    expect(within(row).getByText('1 Oct 2026')).toBeInTheDocument();
    expect(within(row).getByText('KES 2,320')).toBeInTheDocument();
    expect(within(row).getByText('Part received')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /#O0013\b/ })).getByText('Nothing yet')).toBeInTheDocument();
  });

  test('choosing a supplier lists only that supplier’s orders', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0012\b/ });
    userEvent.click(await screen.findByRole('combobox', { name: /Supplier/ }));
    userEvent.click(screen.getByRole('option', { name: 'Unga Limited' }));
    await waitFor(() => expect(listPurchases).toHaveBeenLastCalledWith(expect.objectContaining({ supplier: 'SUP-2' })));
  });

  test('going on with no order chosen says so beside the list and in the summary', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0012\b/ });
    next();
    expect((await screen.findAllByText('Choose an order to go on.')).length).toBeGreaterThanOrEqual(1);
    expect(getPurchase).not.toHaveBeenCalled();
  });

  test('with no open orders the page says so and offers a new purchase', async () => {
    listPurchases.mockResolvedValue({ rows: [], total: 0, summary: {}, page: 1, pageSize: 100, pages: 1 });
    await renderPage();
    expect(await screen.findByText('No orders are waiting for goods')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'New purchase' }));
    expect(where()).toBe(NEW_PATH);
  });

  test('choosing an order and going on asks the server for that order and shows its items', async () => {
    await renderPage();
    await toItems();
    expect(getPurchase).toHaveBeenCalledWith('PUR-ORD-2026-00012', 'Purchase Order');
    expect(screen.getByText('Order #O0012 from Bidco Africa, 1 Oct 2026')).toBeInTheDocument();
  });

  test('an order opened from the panel (?order=) goes straight to the items', async () => {
    await renderPage('/new-look/purchases/receive?order=PUR-ORD-2026-00012');
    expect(await screen.findByRole('heading', { level: 2, name: 'What arrived' })).toBeInTheDocument();
    expect(getPurchase).toHaveBeenCalledWith('PUR-ORD-2026-00012', 'Purchase Order');
  });

  test('an order that cannot be received sends the person back to the list with a reason', async () => {
    getPurchase.mockResolvedValue(orderPanel({ can: { receive_goods: false } }));
    await renderPage('/new-look/purchases/receive?order=PUR-ORD-2026-00012');
    expect(await screen.findByText('Nothing is left to arrive on this order, or it cannot be received.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Choose an order' })).toBeInTheDocument();
  });

  test('an order that cannot be opened says why', async () => {
    getPurchase.mockRejectedValue(new Error('Purchase X was not found.'));
    await renderPage('/new-look/purchases/receive?order=X');
    expect(await screen.findByText('We could not open this order. Purchase X was not found.')).toBeInTheDocument();
  });
});

describe('step 2: tick what arrived and enter the quantity received', () => {
  test('lists the lines with ordered, received so far and still to arrive, and fills in what is still to arrive', async () => {
    await renderPage();
    await toItems();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Arrived', 'Ordered', 'Received so far', 'Still to arrive', 'Cost each', 'Quantity received', 'Spoilt', 'Good stock', 'Value']);
    expect(qtyField('Sugar 1kg')).toHaveValue('6');
    expect(qtyField('Rice 2kg')).toHaveValue('5');
    expect(screen.getByRole('checkbox', { name: 'Sugar 1kg' })).toBeChecked();
  });

  test('a line with nothing left to arrive cannot be ticked and has no quantity field', async () => {
    await renderPage();
    await toItems();
    expect(screen.getByRole('checkbox', { name: 'Salt 500g' })).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: /Salt/ })).not.toBeInTheDocument();
    expect(screen.getByText('Nothing left to arrive')).toBeInTheDocument();
  });

  test('more than is still to arrive is stopped beside the field and in the summary, and the step does not change', async () => {
    await renderPage();
    await toItems();
    userEvent.clear(qtyField('Sugar 1kg'));
    userEvent.type(qtyField('Sugar 1kg'), '7');
    next();
    const message = 'Only 6 of Sugar 1kg is still to arrive. Enter that or less.';
    expect((await screen.findAllByText(message)).length).toBe(2);
    expect(screen.getByRole('heading', { level: 2, name: 'What arrived' })).toBeInTheDocument();
    expect(receiveGoods).not.toHaveBeenCalled();
  });

  test('exactly what is still to arrive is accepted', async () => {
    await renderPage();
    await toReview();
    expect(screen.getByRole('heading', { level: 2, name: 'Check and confirm' })).toBeInTheDocument();
  });

  test('a blank quantity is stopped', async () => {
    await renderPage();
    await toItems();
    userEvent.clear(qtyField('Rice 2kg'));
    next();
    expect((await screen.findAllByText('Enter how many of Rice 2kg arrived.')).length).toBe(2);
  });

  test('a quantity of zero is stopped', async () => {
    await renderPage();
    await toItems();
    userEvent.clear(qtyField('Rice 2kg'));
    userEvent.type(qtyField('Rice 2kg'), '0');
    next();
    expect((await screen.findAllByText('Enter a number above 0 for Rice 2kg.')).length).toBe(2);
  });

  test('only digits and one dot can be typed in a quantity', async () => {
    await renderPage();
    await toItems();
    userEvent.clear(qtyField('Rice 2kg'));
    userEvent.type(qtyField('Rice 2kg'), '-2a.5');
    expect(qtyField('Rice 2kg')).toHaveValue('2.5');
  });

  test('unticking a line leaves it out; nothing ticked is stopped', async () => {
    await renderPage();
    await toItems();
    userEvent.click(screen.getByRole('button', { name: 'Untick all' }));
    expect(qtyField('Sugar 1kg')).toBeDisabled();
    next();
    expect((await screen.findAllByText('Tick at least one item that arrived.')).length).toBeGreaterThanOrEqual(1);
    userEvent.click(screen.getByRole('button', { name: 'Tick all' }));
    expect(screen.getByRole('checkbox', { name: 'Rice 2kg' })).toBeChecked();
  });

  test('an order that lists the same product twice points to the earlier screen and cannot be confirmed here', async () => {
    getPurchase.mockResolvedValue(
      orderPanel({ lines: [...orderPanel().lines, { item_code: 'SUG', item_name: 'Sugar 1kg', unit: 'Nos', ordered: 2, received: 0, to_arrive: 2, rate: 100, amount: 200, warehouse: 'Stores - DS' }] })
    );
    await renderPage();
    await toItems();
    expect(screen.getByRole('link', { name: 'Open the earlier screen' })).toHaveAttribute('href', '/purchases/create-grn?legacy=1');
    next();
    expect((await screen.findAllByText(/more than once/)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('heading', { level: 2, name: 'What arrived' })).toBeInTheDocument();
  });

  test('Back returns to the order list', async () => {
    await renderPage();
    await toItems();
    userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Choose an order' })).toBeInTheDocument();
  });
});

describe('step 3: check and confirm', () => {
  test('shows the supplier, the order, what will be received, its value and the bill fields', async () => {
    await renderPage();
    await toReview();
    expect(screen.getByText('Bidco Africa')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Product', 'Quantity', 'Cost each', 'Amount']);
    expect(screen.getByText('Sugar 1kg')).toBeInTheDocument();
    expect(screen.getByText('Rice 2kg')).toBeInTheDocument();
    expect(screen.queryByText('Salt 500g')).not.toBeInTheDocument();
    expect(screen.getByText('KES 1,600')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bill number' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bill date' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Due date' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm: receive goods and make the bill' })).toBeInTheDocument();
  });

  test('a delivery that completes the order says so', async () => {
    await renderPage();
    await toReview();
    expect(screen.getByText('This completes the order.')).toBeInTheDocument();
  });

  test('a partial delivery says what will still be to arrive, and keeps the typed quantity', async () => {
    await renderPage();
    await toItems();
    userEvent.clear(qtyField('Sugar 1kg'));
    userEvent.type(qtyField('Sugar 1kg'), '2');
    next();
    await screen.findByRole('heading', { level: 2, name: 'Check and confirm' });
    expect(screen.getByText('Still to arrive after this: Sugar 1kg 4. The order stays open for the rest.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('textbox', { name: 'Quantity received of Sugar 1kg' })).toHaveValue('2');
  });

  test('a due date before the bill date is stopped beside the field', async () => {
    await renderPage();
    await toReview();
    userEvent.type(screen.getByRole('textbox', { name: 'Bill date' }), '{selectall}13102026');
    userEvent.type(screen.getByRole('textbox', { name: 'Due date' }), '01102026');
    userEvent.click(screen.getByRole('button', { name: 'Confirm: receive goods and make the bill' }));
    expect((await screen.findAllByText('The due date cannot be before the bill date.')).length).toBe(2);
    expect(receiveGoods).not.toHaveBeenCalled();
  });

  test('the store choice appears only with two or more stores', async () => {
    await renderPage();
    await toReview();
    expect(screen.queryByRole('combobox', { name: 'Receive into' })).not.toBeInTheDocument();
  });

  test('with two stores the person can choose where the goods go', async () => {
    mockStores.current = [
      { name: 'Stores - DS', warehouse_name: 'Main store' },
      { name: 'Back - DS', warehouse_name: 'Back store' },
    ];
    await renderPage();
    await toReview();
    userEvent.click(screen.getByRole('combobox', { name: 'Receive into' }));
    userEvent.click(screen.getByRole('option', { name: 'Back store' }));
    userEvent.click(screen.getByRole('button', { name: 'Confirm: receive goods and make the bill' }));
    await waitFor(() => expect(receiveGoods).toHaveBeenCalledWith(expect.objectContaining({ warehouse: 'Back - DS' })));
  });
});

describe('Confirm (AC-29)', () => {
  const confirm = () => userEvent.click(screen.getByRole('button', { name: 'Confirm: receive goods and make the bill' }));

  test('calls the server ONCE with the order, what arrived, the bill details and a request id', async () => {
    await renderPage();
    await toReview();
    userEvent.type(screen.getByRole('textbox', { name: 'Bill number' }), 'INV-55');
    confirm();
    await waitFor(() => expect(receiveGoods).toHaveBeenCalledTimes(1));
    expect(receiveGoods).toHaveBeenCalledWith({
      order: 'PUR-ORD-2026-00012',
      items: [
        { item_code: 'SUG', qty_received: 6 },
        { item_code: 'RIC', qty_received: 5 },
      ],
      billNo: 'INV-55',
      billDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      dueDate: undefined,
      warehouse: undefined,
      requestId: expect.stringMatching(/^recv-/),
    });
  });

  test('a double tap sends one call only', async () => {
    let finish;
    receiveGoods.mockImplementation(() => new Promise((resolve) => (finish = () => resolve(done()))));
    await renderPage();
    await toReview();
    confirm();
    confirm();
    confirm();
    await waitFor(() => expect(receiveGoods).toHaveBeenCalledTimes(1));
    finish();
    await screen.findByText('Stock raised and bill created');
    expect(receiveGoods).toHaveBeenCalledTimes(1);
  });

  test('on success says "Stock raised and bill created" and shows the stock before and now', async () => {
    await renderPage();
    await toReview();
    confirm();
    expect(await screen.findByRole('heading', { level: 2, name: 'Stock raised and bill created' })).toBeInTheDocument();
    expect(screen.getByText('Sugar 1kg: 10 before, 16 now')).toBeInTheDocument();
    expect(screen.getByText('Rice 2kg: 3 before, 8 now')).toBeInTheDocument();
    expect(screen.getByText('The goods are in your stock and the bill from Bidco Africa is made.')).toBeInTheDocument();
  });

  test('on success links to the bill and to the goods received note', async () => {
    await renderPage();
    await toReview();
    confirm();
    expect(await screen.findByRole('link', { name: 'Open the bill #B0030' })).toHaveAttribute('href', openAddress('ACC-PINV-2026-00030'));
    expect(screen.getByRole('link', { name: 'Open the goods received note #G0004' })).toHaveAttribute('href', openAddress('MAT-PRE-2026-00004'));
    expect(screen.getByRole('link', { name: 'Open the order' })).toHaveAttribute('href', openAddress('PUR-ORD-2026-00012'));
  });

  test('a complete delivery offers another order, not the rest', async () => {
    await renderPage();
    await toReview();
    confirm();
    await screen.findByText('Stock raised and bill created');
    expect(screen.queryByRole('button', { name: 'Receive the rest' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Receive another order' })).toBeInTheDocument();
  });

  test('a partly delivered order stays open and offers Receive the rest', async () => {
    receiveGoods.mockResolvedValue(done({ order: { id: 'PUR-ORD-2026-00012', open: true, still_to_arrive: [{ item_code: 'SUG', to_arrive: 4 }] } }));
    await renderPage();
    await toItems();
    userEvent.clear(qtyField('Sugar 1kg'));
    userEvent.type(qtyField('Sugar 1kg'), '2');
    next();
    await screen.findByRole('heading', { level: 2, name: 'Check and confirm' });
    confirm();
    await screen.findByText('Stock raised and bill created');
    expect(screen.getByText('The order stays open for the rest.')).toBeInTheDocument();
    getPurchase.mockResolvedValue(orderPanel({ lines: [{ item_code: 'SUG', item_name: 'Sugar 1kg', unit: 'Nos', ordered: 10, received: 6, to_arrive: 4, rate: 100, amount: 1000 }] }));
    userEvent.click(screen.getByRole('button', { name: 'Receive the rest' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'What arrived' })).toBeInTheDocument();
    expect(qtyField('Sugar 1kg')).toHaveValue('4');
  });

  test('a stock figure that does not add up is flagged', async () => {
    receiveGoods.mockResolvedValue(done({ stock_ok: false }));
    await renderPage();
    await toReview();
    confirm();
    expect(await alertWith('The stock figures do not add up')).toBeInTheDocument();
  });

  test('a repeat of an earlier delivery says nothing was added twice', async () => {
    receiveGoods.mockResolvedValue(done({ repeat: true, stock: [] }));
    await renderPage();
    await toReview();
    confirm();
    expect(await screen.findByText('This delivery was already saved, so nothing was added twice.')).toBeInTheDocument();
  });

  test('a server that does not say nothing was changed gets the app\'s own sentence', async () => {
    receiveGoods.mockRejectedValue(new Error('Supplier is on hold.'));
    await renderPage();
    await toReview();
    confirm();
    expect(await alertWith('We could not receive these goods.')).toHaveTextContent('Supplier is on hold. Nothing was changed.');
  });

  test('the server\'s code and other details are shown for whoever supports the shop', async () => {
    const error = new Error('The goods were not received and no bill was made, so nothing was changed. Please try again.');
    error.details = '{"error_type":"receipt_failed","step":"bill"}';
    receiveGoods.mockRejectedValue(error);
    await renderPage();
    await toReview();
    confirm();
    expect(await screen.findByText('Details for support: {"error_type":"receipt_failed","step":"bill"}')).toBeInTheDocument();
  });

  test('a failure keeps the page and the typed quantities, and says nothing was changed', async () => {
    receiveGoods.mockRejectedValue(new Error('The goods were not received and no bill was made, so nothing was changed. Supplier is on hold'));
    await renderPage();
    await toItems();
    userEvent.clear(qtyField('Sugar 1kg'));
    userEvent.type(qtyField('Sugar 1kg'), '3');
    next();
    await screen.findByRole('heading', { level: 2, name: 'Check and confirm' });
    userEvent.type(screen.getByRole('textbox', { name: 'Bill number' }), 'INV-9');
    confirm();
    const alert = await alertWith('We could not receive these goods.');
    expect(alert).toHaveTextContent('Supplier is on hold');
    expect(alert.textContent.match(/nothing was changed/gi)).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Check and confirm' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bill number' })).toHaveValue('INV-9');
    expect(screen.queryByText('Stock raised and bill created')).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('textbox', { name: 'Quantity received of Sugar 1kg' })).toHaveValue('3');
  });

  test('trying again after a failure sends the same request id, so a delivery that did save is never doubled', async () => {
    receiveGoods.mockRejectedValueOnce(new Error('Your connection is down'));
    await renderPage();
    await toReview();
    confirm();
    await alertWith('We could not receive these goods.');
    confirm();
    await screen.findByText('Stock raised and bill created');
    expect(receiveGoods).toHaveBeenCalledTimes(2);
    expect(receiveGoods.mock.calls[1][0].requestId).toBe(receiveGoods.mock.calls[0][0].requestId);
  });

  test('a server refusal for too much stays on the review step with the sentence', async () => {
    const error = new Error('Only 6 of SUG is still to arrive. Enter that or less.');
    error.errorType = 'too_much';
    receiveGoods.mockRejectedValue(error);
    await renderPage();
    await toReview();
    confirm();
    expect(await alertWith('Only 6 of SUG is still to arrive.')).toBeInTheDocument();
  });
});

describe('leaving the page', () => {
  test('Cancel with nothing typed goes back to Purchases at once', async () => {
    await renderPage();
    await screen.findByRole('row', { name: /#O0012\b/ });
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(where()).toBe(PURCHASES_PATH);
  });

  test('Cancel after choosing and changing things asks first', async () => {
    await renderPage();
    await toItems();
    userEvent.clear(qtyField('Sugar 1kg'));
    userEvent.type(qtyField('Sugar 1kg'), '2');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(where()).toBe('/new-look/purchases/receive');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Leave without saving' }));
    expect(where()).toBe(PURCHASES_PATH);
  });
});

describe('spoilt goods and the return note', () => {
  const confirm = () => userEvent.click(screen.getByRole('button', { name: 'Confirm: receive goods and make the bill' }));
  const spoil = async () => {
    await toItems();
    userEvent.type(spoiltField('Sugar 1kg'), '2');
  };

  test('shows the order facts, the cost of each item and the good stock as the spoilt quantity is typed', async () => {
    await renderPage();
    await toItems();
    expect(screen.getByText('Order value')).toBeInTheDocument();
    expect(screen.getByText('Cost each')).toBeInTheDocument();
    userEvent.type(spoiltField('Sugar 1kg'), '2');
    expect(screen.getByText('Spoilt, to be returned')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Why Sugar 1kg is spoilt' })).toBeInTheDocument();
  });

  test('more spoilt than received is refused and named', async () => {
    await renderPage();
    await toItems();
    userEvent.type(spoiltField('Sugar 1kg'), '7');
    next();
    expect(await screen.findAllByText('You received 6 of Sugar 1kg, so no more than that can be spoilt.')).not.toHaveLength(0);
    expect(screen.getByRole('heading', { level: 2, name: 'What arrived' })).toBeInTheDocument();
  });

  test('the review shows the spoilt goods and the bill after the return note', async () => {
    await renderPage();
    await spoil();
    next();
    await screen.findByRole('heading', { level: 2, name: 'Check and confirm' });
    expect(screen.getByText('Sugar 1kg: 2 (Damaged)')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Make a return note to the supplier for the spoilt goods' })).toBeChecked();
  });

  test('Confirm receives everything that arrived, then makes the return note for the spoilt part against the bill', async () => {
    await renderPage();
    await spoil();
    next();
    await screen.findByRole('heading', { level: 2, name: 'Check and confirm' });
    userEvent.type(screen.getByRole('textbox', { name: 'Note on the return' }), 'DN 77');
    confirm();
    await screen.findByText('Return note made.');
    expect(receiveGoods.mock.calls[0][0].items).toEqual([
      { item_code: 'SUG', qty_received: 6 },
      { item_code: 'RIC', qty_received: 5 },
    ]);
    expect(createPurchaseReturn).toHaveBeenCalledTimes(1);
    expect(createPurchaseReturn).toHaveBeenCalledWith({
      returnAgainst: 'ACC-PINV-2026-00030',
      items: [{ item_code: 'SUG', item_name: 'Sugar 1kg', qty: 2, rate: 100 }],
      remarks: 'Damaged: Sugar 1kg 2. DN 77',
      company: 'Demo Shop',
    });
    expect(screen.getByRole('link', { name: /Open the return note/ })).toBeInTheDocument();
  });

  test('with the return note switched off nothing is returned', async () => {
    await renderPage();
    await spoil();
    next();
    await screen.findByRole('heading', { level: 2, name: 'Check and confirm' });
    userEvent.click(screen.getByRole('checkbox', { name: 'Make a return note to the supplier for the spoilt goods' }));
    confirm();
    await screen.findByText('Stock raised and bill created');
    expect(createPurchaseReturn).not.toHaveBeenCalled();
  });

  test('no spoilt goods means no return note and no spoilt section', async () => {
    await renderPage();
    await toReview();
    expect(screen.queryByText('Spoilt goods')).not.toBeInTheDocument();
    confirm();
    await screen.findByText('Stock raised and bill created');
    expect(createPurchaseReturn).not.toHaveBeenCalled();
  });

  test('a repeated delivery does not make a second return note', async () => {
    receiveGoods.mockResolvedValue(done({ repeat: true }));
    await renderPage();
    await spoil();
    next();
    await screen.findByRole('heading', { level: 2, name: 'Check and confirm' });
    confirm();
    await screen.findByText('This delivery was already saved, so nothing was added twice.');
    expect(createPurchaseReturn).not.toHaveBeenCalled();
  });

  test('when the return note fails the goods stay received and the person can try the note again', async () => {
    createPurchaseReturn.mockRejectedValueOnce(new Error('Server busy.'));
    await renderPage();
    await spoil();
    next();
    await screen.findByRole('heading', { level: 2, name: 'Check and confirm' });
    confirm();
    expect(await alertWith('the return note was not made')).toHaveTextContent('Server busy.');
    expect(receiveGoods).toHaveBeenCalledTimes(1);
    userEvent.click(screen.getByRole('button', { name: 'Try the return note again' }));
    await screen.findByText('Return note made.');
    expect(createPurchaseReturn).toHaveBeenCalledTimes(2);
    expect(receiveGoods).toHaveBeenCalledTimes(1);
  });
});

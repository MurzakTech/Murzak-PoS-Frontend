/**
 * The New purchase form (ticket P4-5), checked at the screen level against AC-26: supplier required, the item lines (add,
 * change, remove, no second line for a product already there), a product filled in from ?item=<code> (the Reorder links),
 * errors beside the field and in the summary, "Not saved yet", the question before leaving with typed changes, the order
 * path (saved and sent to the supplier; stock comes later in Receive goods) and the direct-bill options under More options
 * (bill number, dates, mark as paid; stock goes up at once).
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import NewPurchasePage from './NewPurchasePage';
import { addPurchaseNote, createDirectBill, findProductsToBuy, getPaymentModes, getProductToBuy, listSuppliers, saveOrder } from '../../api/purchasesListApi';

jest.mock('../../api/purchasesListApi', () => ({
  addPurchaseNote: jest.fn(),
  createDirectBill: jest.fn(),
  findProductsToBuy: jest.fn(),
  getPaymentModes: jest.fn(),
  getProductToBuy: jest.fn(),
  listSuppliers: jest.fn(),
  saveOrder: jest.fn(),
}));
const mockStores = { current: [] };
jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (select) => select({ auth: { user: { company: 'Demo Shop' } }, warehouse: { warehouses: mockStores.current } }),
}));
jest.mock('../../store/warehouseSlice', () => ({ listWarehouses: jest.fn(() => ({ type: 'x' })) }));

// ---------- Fixtures: made-up shop data, never real ----------
const SUGAR = { item_code: 'SUG', item_name: 'Sugar 1kg', unit: 'Nos', cost: 95.5 };
const RICE = { item_code: 'RIC', item_name: 'Rice 2kg', unit: 'Nos', cost: null };
const MODES = [
  { name: 'Cash', kind: 'cash' },
  { name: 'M-Pesa', kind: 'mpesa' },
];

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderPage = async (url = '/new-look/purchases/new') => {
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <ToastProvider>
        <NewPurchasePage />
        <Where />
      </ToastProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(listSuppliers).toHaveBeenCalled());
  await screen.findByRole('combobox', { name: /Supplier/ });
  return view;
};

const where = () => screen.getByTestId('where').textContent;
const save = () => userEvent.click(screen.getByRole('button', { name: /^Save/ }));
const chooseSupplier = async (name = 'Bidco Africa') => {
  userEvent.click(screen.getByRole('combobox', { name: /Supplier/ }));
  userEvent.click(await screen.findByRole('option', { name }));
};
const addProduct = async (name) => {
  userEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
};
const alertWith = async (text) => {
  await waitFor(() => expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual(expect.arrayContaining([expect.stringContaining(text)])));
};
const moreOptions = () => userEvent.click(screen.getByRole('button', { name: 'More options' }));

beforeEach(() => {
  jest.resetAllMocks();
  mockStores.current = [];
  listSuppliers.mockResolvedValue([
    { id: 'SUP-1', name: 'Bidco Africa' },
    { id: 'SUP-2', name: 'Unga Limited' },
  ]);
  getPaymentModes.mockResolvedValue(MODES);
  findProductsToBuy.mockResolvedValue([SUGAR, RICE]);
  getProductToBuy.mockResolvedValue(SUGAR);
  saveOrder.mockResolvedValue({ order: 'PUR-ORD-2026-00050', waitingForApproval: false });
  createDirectBill.mockResolvedValue({ invoice: 'ACC-PINV-2026-00070', invoice_number: '#B0070', total: 955, outstanding: 955 });
  addPurchaseNote.mockResolvedValue({ note: { text: 'x', date: '2026-10-14' } });
});

describe('the form (AC-26)', () => {
  test('shows the title, the supplier, the date, the items and the total', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'New purchase' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Supplier/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Date/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Items' })).toBeInTheDocument();
    expect(screen.getByText('No items yet. Search for a product below to add it.')).toBeInTheDocument();
  });

  test('the sticky footer says "Not saved yet" with Cancel and a Save button', async () => {
    await renderPage();
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save and send order' })).toBeInTheDocument();
  });

  test('the date starts as today', async () => {
    await renderPage();
    const now = new Date();
    const text = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    expect(screen.getByRole('textbox', { name: /Date/ })).toHaveValue(text);
  });

  test('the suppliers are in the chooser', async () => {
    await renderPage();
    userEvent.click(screen.getByRole('combobox', { name: /Supplier/ }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Bidco Africa', 'Unga Limited']);
  });

  test('with no suppliers the form says so and offers to add one', async () => {
    listSuppliers.mockResolvedValue([]);
    await renderPage();
    expect(screen.getByText(/You have no suppliers yet./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a supplier' })).toHaveAttribute('href', '/new-look/suppliers/new');
  });

  test('suppliers that cannot load say so, with Try again', async () => {
    listSuppliers.mockRejectedValueOnce(new Error('down'));
    render(
      <MemoryRouter>
        <ToastProvider>
          <NewPurchasePage />
        </ToastProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText('We could not load your suppliers. Try again.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(listSuppliers).toHaveBeenCalledTimes(2));
  });
});

describe('the items', () => {
  test('picking a product adds a line with quantity 1 and the cost on record', async () => {
    await renderPage();
    await addProduct('Sugar 1kg');
    expect(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' })).toHaveValue('1');
    expect(screen.getByRole('textbox', { name: 'Cost each of Sugar 1kg (KES)' })).toHaveValue('95.5');
    expect(screen.getAllByText('KES 95.50').length).toBeGreaterThanOrEqual(1);
  });

  test('a product with no cost on record starts with a blank cost', async () => {
    await renderPage();
    await addProduct('Rice 2kg');
    expect(screen.getByRole('textbox', { name: 'Cost each of Rice 2kg (KES)' })).toHaveValue('');
  });

  test('picking the same product again raises its quantity instead of adding a second line', async () => {
    await renderPage();
    await addProduct('Sugar 1kg');
    await addProduct('Sugar 1kg');
    expect(screen.getAllByRole('textbox', { name: 'Quantity of Sugar 1kg' })).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' })).toHaveValue('2');
    expect(await screen.findByText('Sugar 1kg is already on the list, so its quantity went up by one.')).toBeInTheDocument();
  });

  test('changing the quantity and cost updates the amount and the total', async () => {
    await renderPage();
    await addProduct('Sugar 1kg');
    userEvent.clear(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' }));
    userEvent.type(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' }), '10');
    userEvent.clear(screen.getByRole('textbox', { name: 'Cost each of Sugar 1kg (KES)' }));
    userEvent.type(screen.getByRole('textbox', { name: 'Cost each of Sugar 1kg (KES)' }), '100');
    expect(screen.getAllByText('KES 1,000').length).toBeGreaterThanOrEqual(2);
  });

  test('a line can be removed', async () => {
    await renderPage();
    await addProduct('Sugar 1kg');
    userEvent.click(screen.getByRole('button', { name: 'Remove Sugar 1kg' }));
    expect(screen.queryByRole('textbox', { name: 'Quantity of Sugar 1kg' })).not.toBeInTheDocument();
    expect(screen.getByText('No items yet. Search for a product below to add it.')).toBeInTheDocument();
  });

  test('searching for a product asks the server and lists what it finds', async () => {
    await renderPage();
    await screen.findByRole('button', { name: /^Sugar 1kg/ });
    userEvent.type(screen.getByRole('textbox', { name: 'Add a product' }), 'ric');
    await waitFor(() => expect(findProductsToBuy).toHaveBeenLastCalledWith({ search: 'ric' }));
  });

  test('Create a new product links to the New product form', async () => {
    await renderPage();
    expect(screen.getByRole('link', { name: 'Create a new product' })).toHaveAttribute('href', '/new-look/products/new');
  });

  test('a link to the New product form asks first once something is typed, and Leave goes there', async () => {
    await renderPage();
    await addProduct('Sugar 1kg');
    userEvent.click(screen.getByRole('link', { name: 'Create a new product' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    expect(where()).toBe('/new-look/purchases/new');
    userEvent.click(within(dialog).getByRole('button', { name: 'Leave without saving' }));
    await waitFor(() => expect(where()).toBe('/new-look/products/new'));
  });

  test('the link goes straight there when nothing has been typed', async () => {
    await renderPage();
    userEvent.click(screen.getByRole('link', { name: 'Create a new product' }));
    await waitFor(() => expect(where()).toBe('/new-look/products/new'));
  });
});

describe('a product filled in from ?item= (Reorder)', () => {
  test('starts with that product, quantity 1 and its current cost', async () => {
    await renderPage('/new-look/purchases/new?item=SUG');
    expect(await screen.findByRole('textbox', { name: 'Quantity of Sugar 1kg' })).toHaveValue('1');
    expect(screen.getByRole('textbox', { name: 'Cost each of Sugar 1kg (KES)' })).toHaveValue('95.5');
    expect(getProductToBuy).toHaveBeenCalledWith('SUG');
  });

  test('a form that arrives filled in is not "dirty": Cancel leaves without a question', async () => {
    await renderPage('/new-look/purchases/new?item=SUG');
    await screen.findByRole('textbox', { name: 'Quantity of Sugar 1kg' });
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(where()).toBe('/new-look/purchases');
  });

  test('an unknown product says so and leaves the list empty', async () => {
    getProductToBuy.mockResolvedValue(null);
    await renderPage('/new-look/purchases/new?item=NOPE');
    expect(await screen.findByText('We could not find that product, so the list is empty. Add it below.')).toBeInTheDocument();
    expect(screen.getByText('No items yet. Search for a product below to add it.')).toBeInTheDocument();
  });

  test('saving a reorder saves the order with the product and its cost', async () => {
    await renderPage('/new-look/purchases/new?item=SUG');
    await screen.findByRole('textbox', { name: 'Quantity of Sugar 1kg' });
    await chooseSupplier();
    save();
    await waitFor(() => expect(saveOrder).toHaveBeenCalledWith(expect.objectContaining({ supplier: 'SUP-1', items: [{ item_code: 'SUG', qty: 1, rate: 95.5 }] })));
  });
});

describe('errors beside the field and in the summary', () => {
  test('saving with nothing filled in names the supplier and the items, in both places', async () => {
    await renderPage();
    save();
    expect((await screen.findAllByText('Choose the supplier.')).length).toBe(2);
    expect(screen.getAllByText('Add at least one product.').length).toBe(2);
    expect(screen.getByText('Fix 2 things before saving')).toBeInTheDocument();
    expect(saveOrder).not.toHaveBeenCalled();
  });

  test('the summary links to the field', async () => {
    await renderPage();
    save();
    userEvent.click(await screen.findByRole('button', { name: 'Choose the supplier.' }));
    expect(screen.getByRole('combobox', { name: /Supplier/ })).toHaveFocus();
  });

  test('a quantity of 0 is stopped beside its field', async () => {
    await renderPage();
    await chooseSupplier();
    await addProduct('Sugar 1kg');
    userEvent.clear(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' }));
    userEvent.type(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' }), '0');
    save();
    expect((await screen.findAllByText('Enter how many of Sugar 1kg you are buying.')).length).toBe(2);
    expect(saveOrder).not.toHaveBeenCalled();
  });

  test('a blank cost is stopped beside its field', async () => {
    await renderPage();
    await chooseSupplier();
    await addProduct('Rice 2kg');
    save();
    expect((await screen.findAllByText('Enter what Rice 2kg costs you each, 0 or more.')).length).toBe(2);
  });

  test('fixing a field clears its message', async () => {
    await renderPage();
    save();
    await screen.findAllByText('Choose the supplier.');
    await chooseSupplier();
    await waitFor(() => expect(screen.queryByText('Choose the supplier.')).not.toBeInTheDocument());
  });

  test('only digits and one dot can be typed in a quantity or a cost', async () => {
    await renderPage();
    await addProduct('Sugar 1kg');
    userEvent.clear(screen.getByRole('textbox', { name: 'Cost each of Sugar 1kg (KES)' }));
    userEvent.type(screen.getByRole('textbox', { name: 'Cost each of Sugar 1kg (KES)' }), 'KES 1.2.5');
    expect(screen.getByRole('textbox', { name: 'Cost each of Sugar 1kg (KES)' })).toHaveValue('1.25');
  });
});

describe('saving an order (stock comes later, in Receive goods)', () => {
  const fillIn = async () => {
    await chooseSupplier();
    await addProduct('Sugar 1kg');
    userEvent.clear(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' }));
    userEvent.type(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' }), '10');
  };

  test('saves the order with the supplier, the lines and the date, then opens it', async () => {
    await renderPage();
    await fillIn();
    save();
    await waitFor(() => expect(saveOrder).toHaveBeenCalledTimes(1));
    expect(saveOrder).toHaveBeenCalledWith({
      supplier: 'SUP-1',
      items: [{ item_code: 'SUG', qty: 10, rate: 95.5 }],
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      warehouse: undefined,
      requestId: expect.stringMatching(/^buy-/),
    });
    expect(createDirectBill).not.toHaveBeenCalled();
    await waitFor(() => expect(where()).toBe('/new-look/purchases?open=PUR-ORD-2026-00050'));
    expect(await screen.findByText('Order PUR-ORD-2026-00050 saved and sent to Bidco Africa')).toBeInTheDocument();
  });

  test('a double tap sends one call only', async () => {
    let finish;
    saveOrder.mockImplementation(() => new Promise((resolve) => (finish = () => resolve({ order: 'PO-1' }))));
    await renderPage();
    await fillIn();
    save();
    save();
    save();
    await waitFor(() => expect(saveOrder).toHaveBeenCalledTimes(1));
    finish();
    await waitFor(() => expect(where()).toContain('open=PO-1'));
    expect(saveOrder).toHaveBeenCalledTimes(1);
  });

  test('an order that needs approval says so', async () => {
    saveOrder.mockResolvedValue({ order: 'PO-9', waitingForApproval: true });
    await renderPage();
    await fillIn();
    save();
    expect(await screen.findByText('Order PO-9 is above the approval limit and was sent for approval first.')).toBeInTheDocument();
  });

  test('a note is saved on the order after it is saved', async () => {
    await renderPage();
    await fillIn();
    moreOptions();
    userEvent.type(screen.getByRole('textbox', { name: 'Notes' }), 'Call before delivery');
    save();
    await waitFor(() => expect(addPurchaseNote).toHaveBeenCalledWith({ id: 'PUR-ORD-2026-00050', doctype: 'Purchase Order', note: 'Call before delivery' }));
  });

  test('a note that cannot be saved does not lose the order', async () => {
    addPurchaseNote.mockRejectedValue(new Error('down'));
    await renderPage();
    await fillIn();
    moreOptions();
    userEvent.type(screen.getByRole('textbox', { name: 'Notes' }), 'Hello');
    save();
    expect(await screen.findByText('The purchase was saved, but the note was not. Add it again from the purchase.')).toBeInTheDocument();
    await waitFor(() => expect(where()).toContain('open=PUR-ORD-2026-00050'));
  });

  test('a failure keeps the page and what was typed, with the reason in the summary', async () => {
    saveOrder.mockRejectedValue(new Error('Choose a warehouse for SUG.'));
    await renderPage();
    await fillIn();
    save();
    await alertWith('We could not save this purchase. Choose a warehouse for SUG.');
    expect(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' })).toHaveValue('10');
    expect(where()).toBe('/new-look/purchases/new');
    saveOrder.mockResolvedValue({ order: 'PO-2' });
    save();
    await waitFor(() => expect(saveOrder).toHaveBeenCalledTimes(2));
    expect(saveOrder.mock.calls[1][0].requestId).toBe(saveOrder.mock.calls[0][0].requestId);
  });

  test('the store choice appears under More options only with two or more stores', async () => {
    await renderPage();
    moreOptions();
    expect(screen.queryByRole('combobox', { name: 'Receive into' })).not.toBeInTheDocument();
  });

  test('with two stores the order goes to the chosen store', async () => {
    mockStores.current = [
      { name: 'Stores - DS', warehouse_name: 'Main store' },
      { name: 'Back - DS', warehouse_name: 'Back store' },
    ];
    await renderPage();
    await fillIn();
    moreOptions();
    userEvent.click(screen.getByRole('combobox', { name: 'Receive into' }));
    userEvent.click(screen.getByRole('option', { name: 'Back store' }));
    save();
    await waitFor(() => expect(saveOrder).toHaveBeenCalledWith(expect.objectContaining({ warehouse: 'Back - DS' })));
  });
});

describe('"I already have the bill" (the direct bill)', () => {
  const fillIn = async () => {
    await chooseSupplier();
    await addProduct('Sugar 1kg');
    userEvent.clear(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' }));
    userEvent.type(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' }), '10');
    moreOptions();
    userEvent.click(screen.getByRole('checkbox', { name: 'I already have the bill' }));
  };

  test('is under More options, off at first, with no bill fields showing', async () => {
    await renderPage();
    moreOptions();
    expect(screen.getByRole('checkbox', { name: 'I already have the bill' })).not.toBeChecked();
    expect(screen.queryByRole('textbox', { name: 'Bill number' })).not.toBeInTheDocument();
  });

  test('points to the earlier New Purchase screen for a spreadsheet upload, another currency or skipping tax submission', async () => {
    await renderPage();
    moreOptions();
    expect(screen.getByRole('link', { name: 'Use the earlier New Purchase screen' })).toHaveAttribute('href', '/purchases/new?legacy=1');
  });

  test('turning it on shows the bill number and dates and changes the Save button', async () => {
    await renderPage();
    await fillIn();
    expect(screen.getByRole('textbox', { name: 'Bill number' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Bill date' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Due date' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save bill and add stock' })).toBeInTheDocument();
  });

  test('saves a bill (not an order) and opens it', async () => {
    await renderPage();
    await fillIn();
    userEvent.type(screen.getByRole('textbox', { name: 'Bill number' }), 'INV-55');
    save();
    await waitFor(() => expect(createDirectBill).toHaveBeenCalledTimes(1));
    expect(saveOrder).not.toHaveBeenCalled();
    expect(createDirectBill).toHaveBeenCalledWith(
      expect.objectContaining({
        supplier: 'SUP-1',
        items: [{ item_code: 'SUG', qty: 10, rate: 95.5 }],
        billNo: 'INV-55',
        paidAmount: undefined,
        mode: undefined,
        requestId: expect.stringMatching(/^buy-/),
      })
    );
    await waitFor(() => expect(where()).toBe('/new-look/purchases?open=ACC-PINV-2026-00070'));
    expect(await screen.findByText('Bill #B0070 saved and the stock added')).toBeInTheDocument();
  });

  test('a note goes with the bill', async () => {
    await renderPage();
    await fillIn();
    userEvent.type(screen.getByRole('textbox', { name: 'Notes' }), 'By van');
    save();
    await waitFor(() => expect(createDirectBill).toHaveBeenCalledWith(expect.objectContaining({ notes: 'By van' })));
  });

  test('marking it paid asks for the amount (filled with the total) and how it was paid', async () => {
    await renderPage();
    await fillIn();
    userEvent.click(screen.getByRole('checkbox', { name: 'I have already paid this bill' }));
    expect(screen.getByRole('textbox', { name: 'Amount paid' })).toHaveValue('955');
    expect(screen.getByRole('radio', { name: 'Cash' })).toBeChecked();
  });

  test('a paid bill sends the amount and the way', async () => {
    await renderPage();
    await fillIn();
    userEvent.click(screen.getByRole('checkbox', { name: 'I have already paid this bill' }));
    userEvent.clear(screen.getByRole('textbox', { name: 'Amount paid' }));
    userEvent.type(screen.getByRole('textbox', { name: 'Amount paid' }), '500');
    save();
    await waitFor(() => expect(createDirectBill).toHaveBeenCalledWith(expect.objectContaining({ paidAmount: 500, mode: 'Cash', reference: undefined })));
  });

  test('paying by M-Pesa needs the code, and the code is sent', async () => {
    await renderPage();
    await fillIn();
    userEvent.click(screen.getByRole('checkbox', { name: 'I have already paid this bill' }));
    userEvent.click(screen.getByRole('radio', { name: 'M-Pesa' }));
    save();
    expect((await screen.findAllByText('Enter the M-Pesa code (8 to 12 letters and numbers).')).length).toBe(2);
    expect(createDirectBill).not.toHaveBeenCalled();
    userEvent.type(screen.getByRole('textbox', { name: 'M-Pesa code' }), 'QGH7K2LMN4');
    save();
    await waitFor(() => expect(createDirectBill).toHaveBeenCalledWith(expect.objectContaining({ mode: 'M-Pesa', reference: 'QGH7K2LMN4' })));
  });

  test('paying more than the total is stopped beside the field', async () => {
    await renderPage();
    await fillIn();
    userEvent.click(screen.getByRole('checkbox', { name: 'I have already paid this bill' }));
    userEvent.clear(screen.getByRole('textbox', { name: 'Amount paid' }));
    userEvent.type(screen.getByRole('textbox', { name: 'Amount paid' }), '99999');
    save();
    expect((await screen.findAllByText('You cannot pay more than the total of KES 955.')).length).toBe(2);
    expect(createDirectBill).not.toHaveBeenCalled();
  });

  test('a due date before the bill date is stopped, and the options open so the field can be seen', async () => {
    await renderPage();
    await fillIn();
    userEvent.type(screen.getByRole('textbox', { name: 'Bill date' }), '{selectall}13102026');
    userEvent.type(screen.getByRole('textbox', { name: 'Due date' }), '01102026');
    save();
    expect((await screen.findAllByText('The due date cannot be before the bill date.')).length).toBe(2);
    expect(createDirectBill).not.toHaveBeenCalled();
  });

  test('a bill the server refuses keeps the page with the reason', async () => {
    createDirectBill.mockRejectedValue(new Error('The bill was not saved and no stock was added, so nothing was changed.'));
    await renderPage();
    await fillIn();
    save();
    await alertWith('nothing was changed');
    expect(where()).toBe('/new-look/purchases/new');
  });
});

describe('leaving the form', () => {
  test('Cancel with nothing typed goes straight back', async () => {
    await renderPage();
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(where()).toBe('/new-look/purchases');
  });

  test('Cancel with typed changes asks first; Stay keeps the form', async () => {
    await renderPage();
    await addProduct('Sugar 1kg');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(where()).toBe('/new-look/purchases/new');
    expect(screen.getByRole('textbox', { name: 'Quantity of Sugar 1kg' })).toBeInTheDocument();
  });

  test('Cancel with typed changes and then Leave goes back to Purchases', async () => {
    await renderPage();
    await chooseSupplier();
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Leave without saving' }));
    expect(where()).toBe('/new-look/purchases');
  });
});

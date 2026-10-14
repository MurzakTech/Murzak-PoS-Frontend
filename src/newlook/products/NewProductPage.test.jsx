/**
 * The one-screen New product form (ticket P4-1, acceptance check AC-26): only a name and a price are needed; errors beside the field and
 * in the summary; "Not saved yet" until saved; the profit per item line; cost price for owners and managers only; Save and add another
 * keeps the category and the unit; a question before leaving with unsaved changes; the server's refusals beside the right field.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import NewProductPage from './NewProductPage';
import { addCategory, createProduct, listCategories, listUnits } from '../../api/productsListApi';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../api/productsListApi', () => {
  const actual = jest.requireActual('../../api/productsListApi');
  return { ...actual, createProduct: jest.fn(), listCategories: jest.fn(), listUnits: jest.fn(), addCategory: jest.fn(), renameCategory: jest.fn() };
});
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const { ProductSaveError } = jest.requireActual('../../api/productsListApi');

const CATEGORIES = [
  { name: 'Food', parent: 'All Item Groups', is_group: 0, is_default: false, product_count: 5 },
  { name: 'Household', parent: 'All Item Groups', is_group: 0, is_default: false, product_count: 3 },
  { name: 'Toiletries', parent: 'All Item Groups', is_group: 0, is_default: false, product_count: 1 },
];
const UNITS = [
  { name: 'Nos', uom_name: 'Nos' },
  { name: 'Kg', uom_name: 'Kg' },
  { name: 'Box', uom_name: 'Box' },
  { name: 'Litre', uom_name: 'Litre' },
];

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderForm = async (tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: tier === 'cashier' ? {} : { cost_of_goods: true, profit: true } });
  const view = render(
    <MemoryRouter initialEntries={['/new-look/products/new']}>
      <AccessProvider userKey="beth">
        <ToastProvider>
          <Link to="/new-look/products">Back to products</Link>
          <NewProductPage />
          <Where />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(getMyAccess).toHaveBeenCalled());
  await waitFor(() => expect(listCategories).toHaveBeenCalled());
  await screen.findByRole('button', { name: 'More options' });
  return view;
};

const openMore = async () => {
  userEvent.click(screen.getByRole('button', { name: 'More options' }));
  await screen.findByLabelText(/Opening stock/);
};
const where = () => screen.getByTestId('where').textContent;
// The form's own summary of problems (the toast area is also an alert region)
const summary = () => screen.getAllByRole('alert').find((el) => /Fix \d/.test(el.textContent));
const fillNameAndPrice = (name = 'Soap bar', price = '120') => {
  userEvent.type(screen.getByLabelText('Product name'), name);
  userEvent.type(screen.getByLabelText('Price'), price);
};

beforeEach(() => {
  jest.resetAllMocks();
  listCategories.mockResolvedValue({ categories: CATEGORIES, total: 3, productTotal: 9 });
  listUnits.mockResolvedValue(UNITS);
  createProduct.mockResolvedValue({ product: { item_code: 'PRD-00001', item_name: 'Soap bar' }, notes: [] });
  try {
    localStorage.clear();
  } catch (e) {
    // Not needed
  }
});

describe('what the form asks for', () => {
  test('the name and the price come first and everything else waits under More options', async () => {
    await renderForm();
    expect(screen.getByRole('heading', { name: 'New product' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product name')).toBeVisible();
    expect(screen.getByLabelText('Price')).toBeVisible();
    expect(screen.getByLabelText('Barcode')).not.toBeVisible();
    expect(screen.getByLabelText(/Opening stock/)).not.toBeVisible();
    expect(screen.getByLabelText(/Low-stock warning/)).not.toBeVisible();
  });

  test('the name has the keyboard when the page opens', async () => {
    await renderForm();
    await waitFor(() => expect(screen.getByLabelText('Product name')).toHaveFocus());
  });

  test('under More options: cost price, opening stock, low-stock warning, unit, category, barcode and the product code', async () => {
    await renderForm();
    await openMore();
    ['Cost price', 'Opening stock', 'Low-stock warning', 'Unit', 'Barcode', 'Product code'].forEach((label) => expect(screen.getByLabelText(new RegExp(label))).toBeVisible());
    expect(screen.getByRole('group', { name: 'Category' })).toBeVisible();
  });

  test('the product code says it is filled in automatically and cannot be typed', async () => {
    await renderForm();
    await openMore();
    const code = screen.getByLabelText('Product code');
    expect(code).toHaveValue('Filled in automatically');
    expect(code).toHaveAttribute('readonly');
  });

  test('the price takes digits only and shows KES', async () => {
    await renderForm();
    userEvent.type(screen.getByLabelText('Price'), '12a3,4');
    expect(screen.getByLabelText('Price')).toHaveValue('1234');
    expect(screen.getAllByText('KES').length).toBeGreaterThan(0);
  });

  test('opening stock and the warning take numbers, with a decimal point', async () => {
    await renderForm();
    await openMore();
    userEvent.type(screen.getByLabelText(/Opening stock/), '2.5kg');
    expect(screen.getByLabelText(/Opening stock/)).toHaveValue('2.5');
    userEvent.type(screen.getByLabelText(/Low-stock warning/), '-5');
    expect(screen.getByLabelText(/Low-stock warning/)).toHaveValue('5');
  });
});

describe('saving with only a name and a price', () => {
  test('Save sends the name and the price and goes to the list with the new product open', async () => {
    await renderForm();
    fillNameAndPrice();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1));
    expect(createProduct).toHaveBeenCalledWith({ name: 'Soap bar', price: '120', unit: 'Nos', category: '', barcode: '', stock: '', warning: '', cost: '' });
    await waitFor(() => expect(where()).toBe('/new-look/products?open=PRD-00001'));
    expect(await screen.findByText('Soap bar saved')).toBeInTheDocument();
  });

  test('pressing Enter in a field saves too', async () => {
    await renderForm();
    userEvent.type(screen.getByLabelText('Product name'), 'Bread');
    userEvent.type(screen.getByLabelText('Price'), '60{enter}');
    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1));
  });

  test('nothing but the name and the price is checked before sending', async () => {
    await renderForm();
    fillNameAndPrice('Bread', '60');
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(createProduct).toHaveBeenCalled());
    expect(screen.queryByText(/Fix \d/)).not.toBeInTheDocument();
  });

  test('while saving, Save waits and the page says Saving', async () => {
    let finish;
    createProduct.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await renderForm();
    fillNameAndPrice();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saving')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(createProduct).toHaveBeenCalledTimes(1);
    finish({ product: { item_code: 'PRD-00009', item_name: 'Soap bar' }, notes: [] });
    await waitFor(() => expect(where()).toContain('PRD-00009'));
  });

  test('a step that did not work is told in words, and the product is still saved', async () => {
    createProduct.mockResolvedValue({ product: { item_code: 'PRD-00002', item_name: 'Soap bar' }, notes: [{ step: 'opening_stock', message: 'The product was saved, but the opening stock was not added. Use Stock in to add it.' }] });
    await renderForm();
    fillNameAndPrice();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/opening stock was not added/)).toBeInTheDocument();
    await waitFor(() => expect(where()).toContain('PRD-00002'));
  });

  test('everything filled in is sent', async () => {
    await renderForm();
    fillNameAndPrice('Rice 2kg', '300');
    await openMore();
    userEvent.type(screen.getByLabelText(/Cost price/), '220');
    userEvent.type(screen.getByLabelText(/Opening stock/), '12');
    userEvent.type(screen.getByLabelText(/Low-stock warning/), '3');
    userEvent.type(screen.getByLabelText('Barcode'), '6001234567890');
    userEvent.click(screen.getByRole('button', { name: 'Food' }));
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(createProduct).toHaveBeenCalled());
    expect(createProduct).toHaveBeenCalledWith({ name: 'Rice 2kg', price: '300', cost: '220', stock: '12', warning: '3', barcode: '6001234567890', category: 'Food', unit: 'Nos' });
  });
});

describe('errors', () => {
  test('a blank name and a blank price are reported beside each field and in the summary', async () => {
    await renderForm();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(createProduct).not.toHaveBeenCalled();
    expect(await screen.findByText('Fix 2 things before saving')).toBeInTheDocument();
    const name = screen.getByLabelText('Product name');
    const price = screen.getByLabelText('Price');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(price).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Enter a name for the product');
    expect(price).toHaveAccessibleDescription('Enter a price in KES');
    // and the same two messages in the summary, which links to the fields
    const list = summary();
    expect(within(list).getByRole('button', { name: 'Enter a name for the product' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Enter a price in KES' })).toBeInTheDocument();
  });

  test('the first field with a problem gets the keyboard, and the summary links go to each field', async () => {
    await renderForm();
    userEvent.type(screen.getByLabelText('Product name'), 'Soap');
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByLabelText('Price')).toHaveFocus());
    expect(screen.getByText('Fix 1 thing before saving')).toBeInTheDocument();
    userEvent.click(screen.getByLabelText('Product name'));
    userEvent.click(within(summary()).getByRole('button', { name: 'Enter a price in KES' }));
    expect(screen.getByLabelText('Price')).toHaveFocus();
  });

  test('a problem goes away when the field is fixed', async () => {
    await renderForm();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    userEvent.type(await screen.findByLabelText('Product name'), 'S');
    expect(screen.getByLabelText('Product name')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Fix 1 thing before saving')).toBeInTheDocument();
  });

  test('only a name missing is only the name that is reported', async () => {
    await renderForm();
    userEvent.type(screen.getByLabelText('Price'), '50');
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Fix 1 thing before saving')).toBeInTheDocument();
    expect(screen.getByLabelText('Price')).not.toHaveAttribute('aria-invalid');
  });

  test('a barcode the server refuses shows beside the barcode, which opens under More options', async () => {
    createProduct.mockRejectedValue(new ProductSaveError('This barcode is already used by another product.', { barcode: 'This barcode is already used by another product.' }));
    await renderForm();
    fillNameAndPrice();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Fix 1 thing before saving');
    await waitFor(() => expect(screen.getByLabelText('Barcode')).toBeVisible());
    const barcode = screen.getByLabelText('Barcode');
    expect(barcode).toHaveAttribute('aria-invalid', 'true');
    expect(barcode).toHaveAccessibleDescription(/already used by another product/);
    expect(within(summary()).getByRole('button', { name: /already used by another product/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Barcode')).toHaveFocus());
    expect(where()).toBe('/new-look/products/new');
  });

  test('a refusal that cannot be told apart is in the summary only', async () => {
    createProduct.mockRejectedValue(new ProductSaveError('We could not reach the Murzak server. Check your internet connection and try again.'));
    await renderForm();
    fillNameAndPrice();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Fix 1 thing before saving');
    expect(summary()).toHaveTextContent('could not reach the Murzak server');
    expect(screen.getByLabelText('Product name')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Price')).not.toHaveAttribute('aria-invalid');
    // the form keeps what was typed
    expect(screen.getByLabelText('Product name')).toHaveValue('Soap bar');
  });

  test('after a refusal Save can be tried again', async () => {
    createProduct.mockRejectedValueOnce(new ProductSaveError('Something went wrong.'));
    await renderForm();
    fillNameAndPrice();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Fix 1 thing before saving');
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(where()).toContain('PRD-00001'));
  });
});

describe('profit per item and who sees the cost', () => {
  test('the profit shows as soon as there is a price and a cost', async () => {
    await renderForm();
    await openMore();
    expect(screen.queryByText(/Profit per item/)).not.toBeInTheDocument();
    userEvent.type(screen.getByLabelText('Price'), '120');
    expect(screen.queryByText(/Profit per item/)).not.toBeInTheDocument();
    userEvent.type(screen.getByLabelText(/Cost price/), '80');
    expect(screen.getAllByRole('status').some((el) => el.textContent.includes('Profit per item: KES 40'))).toBe(true);
    expect(screen.getByText('Profit per item: KES 40')).toBeInTheDocument();
  });

  test('the profit follows each change', async () => {
    await renderForm();
    await openMore();
    userEvent.type(screen.getByLabelText('Price'), '1200');
    userEvent.type(screen.getByLabelText(/Cost price/), '800');
    expect(screen.getByText('Profit per item: KES 400')).toBeInTheDocument();
    userEvent.clear(screen.getByLabelText(/Cost price/));
    expect(screen.queryByText(/Profit per item/)).not.toBeInTheDocument();
  });

  test('a cost above the price says loss, in words', async () => {
    await renderForm();
    await openMore();
    userEvent.type(screen.getByLabelText('Price'), '100');
    userEvent.type(screen.getByLabelText(/Cost price/), '130');
    expect(screen.getByText('Loss per item: KES 30')).toBeInTheDocument();
  });

  test('a cashier has no cost price field and no profit line', async () => {
    await renderForm('cashier');
    await openMore();
    expect(screen.queryByLabelText(/Cost price/)).not.toBeInTheDocument();
    userEvent.type(screen.getByLabelText('Price'), '100');
    expect(screen.queryByText(/Profit per item/)).not.toBeInTheDocument();
  });

  test('a cashier never sends a cost', async () => {
    await renderForm('cashier');
    fillNameAndPrice();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(createProduct).toHaveBeenCalled());
    expect(createProduct.mock.calls[0][0]).not.toHaveProperty('cost');
  });
});

describe('Save and add another', () => {
  test('keeps the category and the unit and clears the name, the price and the barcode', async () => {
    await renderForm();
    fillNameAndPrice('Rice 2kg', '300');
    await openMore();
    userEvent.type(screen.getByLabelText('Barcode'), '6001');
    userEvent.click(screen.getByRole('button', { name: 'Food' }));
    userEvent.click(screen.getByRole('combobox', { name: /Unit/ }));
    userEvent.click(await screen.findByRole('option', { name: 'Kilograms' }));
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1));
    expect(createProduct.mock.calls[0][0]).toMatchObject({ name: 'Rice 2kg', category: 'Food', unit: 'Kg' });

    await waitFor(() => expect(screen.getByLabelText('Product name')).toHaveValue(''));
    expect(screen.getByLabelText('Price')).toHaveValue('');
    expect(screen.getByLabelText('Barcode')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Food' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox', { name: /Unit/ })).toHaveTextContent('Kilograms');
    expect(where()).toBe('/new-look/products/new');
    await waitFor(() => expect(screen.getByLabelText('Product name')).toHaveFocus());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Soap bar saved. Add the next one.')).toBeInTheDocument();
  });

  test('clears the cost, the stock and the warning too, which belong to one product', async () => {
    await renderForm();
    fillNameAndPrice();
    await openMore();
    userEvent.type(screen.getByLabelText(/Cost price/), '80');
    userEvent.type(screen.getByLabelText(/Opening stock/), '4');
    userEvent.type(screen.getByLabelText(/Low-stock warning/), '2');
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    await waitFor(() => expect(screen.getByLabelText(/Cost price/)).toHaveValue(''));
    expect(screen.getByLabelText(/Opening stock/)).toHaveValue('');
    expect(screen.getByLabelText(/Low-stock warning/)).toHaveValue('');
  });

  test('a blank form is checked the same way', async () => {
    await renderForm();
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    expect(await screen.findByText('Fix 2 things before saving')).toBeInTheDocument();
    expect(createProduct).not.toHaveBeenCalled();
  });

  test('after saving the page can be left without a question until something is typed', async () => {
    await renderForm();
    fillNameAndPrice();
    userEvent.click(screen.getByRole('button', { name: 'Save and add another' }));
    await screen.findByText('Saved');
    userEvent.click(screen.getByRole('link', { name: 'Back to products' }));
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument();
    await waitFor(() => expect(where()).toBe('/new-look/products'));
  });
});

describe('Not saved yet, and the question before leaving', () => {
  test('says Not saved yet from the start', async () => {
    await renderForm();
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
  });

  test('a form with nothing typed can be left at once', async () => {
    await renderForm();
    userEvent.click(screen.getByRole('link', { name: 'Back to products' }));
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument();
    await waitFor(() => expect(where()).toBe('/new-look/products'));
  });

  test('leaving with something typed asks first, and Stay keeps the form', async () => {
    await renderForm();
    userEvent.type(screen.getByLabelText('Product name'), 'Soap');
    userEvent.click(screen.getByRole('link', { name: 'Back to products' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    userEvent.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(where()).toBe('/new-look/products/new');
    expect(screen.getByLabelText('Product name')).toHaveValue('Soap');
  });

  test('Leave without saving goes where the person was going', async () => {
    await renderForm();
    userEvent.type(screen.getByLabelText('Product name'), 'Soap');
    userEvent.click(screen.getByRole('link', { name: 'Back to products' }));
    const dialog = await screen.findByRole('alertdialog');
    userEvent.click(within(dialog).getByRole('button', { name: 'Leave without saving' }));
    await waitFor(() => expect(where()).toBe('/new-look/products'));
  });

  test('Cancel on a clean form goes back to the list', async () => {
    await renderForm();
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(where()).toBe('/new-look/products'));
  });

  test('Cancel after typing asks first', async () => {
    await renderForm();
    userEvent.type(screen.getByLabelText('Price'), '5');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    expect(where()).toBe('/new-look/products/new');
    userEvent.click(within(dialog).getByRole('button', { name: 'Leave without saving' }));
    await waitFor(() => expect(where()).toBe('/new-look/products'));
  });

  test('the footer holds Cancel, Save and add another, and Save', async () => {
    await renderForm();
    ['Cancel', 'Save and add another', 'Save'].forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
  });
});

describe('unit and category', () => {
  test('units are in plain words, the common ones first', async () => {
    await renderForm();
    await openMore();
    const box = screen.getByRole('combobox', { name: /Unit/ });
    expect(box).toHaveTextContent('Pieces');
    userEvent.click(box);
    const names = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(names).toEqual(['Pieces', 'Kilograms', 'Litres', 'Boxes']);
    expect(names.join(' ')).not.toMatch(/Nos|Kg\b/);
  });

  test('the shop is not blocked when the units cannot be loaded: pieces still work', async () => {
    listUnits.mockRejectedValue(new Error('offline'));
    await renderForm();
    await openMore();
    expect(screen.getByRole('combobox', { name: /Unit/ })).toHaveTextContent('Pieces');
    expect(await screen.findByText('We could not load the units')).toBeInTheDocument();
    fillNameAndPrice();
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ unit: 'Nos' })));
  });

  test('categories are chips and one is chosen at a time', async () => {
    await renderForm();
    await openMore();
    const food = await screen.findByRole('button', { name: 'Food' });
    const household = screen.getByRole('button', { name: 'Household' });
    expect(food).toHaveAttribute('aria-pressed', 'false');
    userEvent.click(food);
    expect(food).toHaveAttribute('aria-pressed', 'true');
    userEvent.click(household);
    expect(food).toHaveAttribute('aria-pressed', 'false');
    expect(household).toHaveAttribute('aria-pressed', 'true');
    userEvent.click(household);
    expect(household).toHaveAttribute('aria-pressed', 'false');
  });

  test('the top category is not offered as a chip', async () => {
    listCategories.mockResolvedValue({ categories: [...CATEGORIES, { name: 'All Item Groups', parent: null, is_default: true, product_count: 2 }], total: 4, productTotal: 11 });
    await renderForm();
    await openMore();
    await screen.findByRole('button', { name: 'Food' });
    expect(screen.queryByRole('button', { name: /All Item Groups/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Item Group/i)).not.toBeInTheDocument();
  });

  test('a new category can be added from the form and is chosen at once', async () => {
    addCategory.mockResolvedValue({ item_group: { name: 'Drinks' } });
    await renderForm();
    await openMore();
    userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a category' });
    userEvent.type(within(dialog).getByLabelText('Category name'), 'Drinks');
    listCategories.mockResolvedValue({ categories: [...CATEGORIES, { name: 'Drinks', parent: 'All Item Groups', is_group: 0, product_count: 0 }], total: 4, productTotal: 9 });
    userEvent.click(within(dialog).getByRole('button', { name: 'Save category' }));
    await waitFor(() => expect(addCategory).toHaveBeenCalledWith({ name: 'Drinks', parent: undefined }));
    const chip = await screen.findByRole('button', { name: 'Drinks' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  test('with no categories the form says how to add one', async () => {
    listCategories.mockResolvedValue({ categories: [], total: 0, productTotal: 0 });
    await renderForm();
    await openMore();
    expect(await screen.findByText(/You have no categories yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New category' })).toBeInTheDocument();
  });

  test('a long list of categories shows a few, with a way to see them all', async () => {
    listCategories.mockResolvedValue({ categories: Array.from({ length: 20 }, (_, i) => ({ name: `Category ${i + 1}`, product_count: 0 })), total: 20, productTotal: 0 });
    await renderForm();
    await openMore();
    await screen.findByRole('button', { name: 'Category 1' });
    expect(screen.queryByRole('button', { name: 'Category 20' })).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Show all categories' }));
    expect(screen.getByRole('button', { name: 'Category 20' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByRole('button', { name: 'Category 20' })).not.toBeInTheDocument();
  });

  test('a category that could not be loaded can be tried again', async () => {
    listCategories.mockRejectedValueOnce(new Error('offline'));
    await renderForm();
    await openMore();
    expect(await screen.findByText(/We could not load the categories/)).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Food' })).toBeInTheDocument();
  });
});

/**
 * The Categories tab (ticket P4-2): the word is Categories everywhere; every category with its product count; add, rename and delete
 * with the server's refusals shown in words; a cashier can read but not change.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import ProductsPage from './ProductsPage';
import { addCategory, deleteCategory, listCategories, listProducts, renameCategory } from '../../api/productsListApi';
import { getMyAccess } from '../../api/accessApi';

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

const CATEGORIES = [
  { name: 'Empty shelf', parent: 'All Item Groups', is_group: 0, is_default: false, product_count: 0 },
  { name: 'Food', parent: 'All Item Groups', is_group: 0, is_default: false, product_count: 12 },
  { name: 'Snacks', parent: 'Food', is_group: 0, is_default: false, product_count: 4 },
  { name: 'All Item Groups', parent: null, is_group: 1, is_default: true, product_count: 2 },
];

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderTab = async (tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: tier === 'cashier' ? {} : { cost_of_goods: true } });
  render(
    <MemoryRouter initialEntries={['/new-look/products/categories']}>
      <AccessProvider userKey="beth">
        <ToastProvider>
          <ProductsPage />
          <Where />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(listCategories).toHaveBeenCalled());
};
const where = () => screen.getByTestId('where').textContent;
const rowOf = (name) => screen.getByRole('row', { name: new RegExp(`^See the products in ${name}\\b`) });
const findRow = (name) => screen.findByRole('row', { name: new RegExp(`^See the products in ${name}\\b`) });
const menuFor = (name) => screen.getByRole('button', { name: `More actions for ${name}` });

beforeEach(() => {
  jest.resetAllMocks();
  listCategories.mockResolvedValue({ categories: CATEGORIES, total: 4, productTotal: 18 });
  listProducts.mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 20, pages: 1, summary: null, status: 'active', stockScope: { kind: 'all_stores' }, canSeeCost: true });
  try {
    localStorage.clear();
  } catch (e) {
    // Not needed
  }
});

describe('the list', () => {
  test('every category is listed with how many products it holds', async () => {
    await renderTab();
    const table = await screen.findByRole('table', { name: 'Categories, A to Z' });
    ['Category', 'Part of', 'Products', 'Actions'].forEach((name) => expect(within(table).getByRole('columnheader', { name })).toBeInTheDocument());
    const food = rowOf('Food');
    expect(within(food).getByText('12')).toBeInTheDocument();
    expect(within(food).getByText('Top level')).toBeInTheDocument();
    const snacks = rowOf('Snacks');
    expect(within(snacks).getByText('Food')).toBeInTheDocument();
    expect(within(snacks).getByText('4')).toBeInTheDocument();
  });

  test('the word is Categories and the old term never shows', async () => {
    await renderTab();
    await screen.findByRole('table', { name: 'Categories, A to Z' });
    expect(screen.getByRole('tab', { name: 'Categories' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText(/Item Group/i)).not.toBeInTheDocument();
    expect(screen.getByText('No category')).toBeInTheDocument();
  });

  test('the top category has no menu, since it cannot be renamed or deleted', async () => {
    await renderTab();
    await screen.findByRole('table', { name: 'Categories, A to Z' });
    expect(screen.queryByRole('button', { name: /More actions for All Item Groups/ })).not.toBeInTheDocument();
    expect(menuFor('Food')).toBeInTheDocument();
  });

  test('a category name opens the product list for it', async () => {
    await renderTab();
    const link = await screen.findByRole('link', { name: 'See the products in Food' });
    expect(link).toHaveAttribute('href', '/new-look/products?category=Food');
    userEvent.click(link);
    await waitFor(() => expect(where()).toBe('/new-look/products?category=Food'));
  });

  test('with no categories the page says what to do', async () => {
    listCategories.mockResolvedValue({ categories: [], total: 0, productTotal: 0 });
    await renderTab();
    expect(await screen.findByRole('heading', { name: 'No categories yet' })).toBeInTheDocument();
    userEvent.click(screen.getAllByRole('button', { name: 'Add category' })[0]);
    expect(await screen.findByRole('dialog', { name: 'Add a category' })).toBeInTheDocument();
  });

  test('a list that could not load can be tried again', async () => {
    listCategories.mockRejectedValueOnce(new Error('offline'));
    await renderTab();
    expect(await screen.findByRole('heading', { name: /could not load/i })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await findRow('Food')).toBeInTheDocument();
  });
});

describe('adding a category', () => {
  test('the header button opens a short dialog, and Save adds the category and shows it', async () => {
    addCategory.mockResolvedValue({ item_group: { name: 'Drinks' } });
    await renderTab();
    await findRow('Food');
    userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a category' });
    expect(within(dialog).getByLabelText('Category name')).toHaveFocus();
    userEvent.type(within(dialog).getByLabelText('Category name'), 'Drinks');
    listCategories.mockResolvedValue({ categories: [...CATEGORIES, { name: 'Drinks', parent: 'All Item Groups', is_group: 0, product_count: 0 }], total: 5, productTotal: 18 });
    userEvent.click(within(dialog).getByRole('button', { name: 'Save category' }));
    await waitFor(() => expect(addCategory).toHaveBeenCalledWith({ name: 'Drinks', parent: undefined }));
    expect(await screen.findByText('Category Drinks added')).toBeInTheDocument();
    expect(await findRow('Drinks')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Enter in the name saves too', async () => {
    addCategory.mockResolvedValue({});
    await renderTab();
    await findRow('Food');
    userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    userEvent.type(await screen.findByLabelText('Category name'), 'Cleaning{enter}');
    await waitFor(() => expect(addCategory).toHaveBeenCalledWith({ name: 'Cleaning', parent: undefined }));
  });

  test('a category can be made inside another', async () => {
    addCategory.mockResolvedValue({});
    await renderTab();
    await findRow('Food');
    userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    const dialog = await screen.findByRole('dialog');
    userEvent.type(within(dialog).getByLabelText('Category name'), 'Fruit');
    userEvent.click(within(dialog).getByRole('combobox', { name: /Part of/ }));
    userEvent.click(await screen.findByRole('option', { name: 'Food' }));
    userEvent.click(within(dialog).getByRole('button', { name: 'Save category' }));
    await waitFor(() => expect(addCategory).toHaveBeenCalledWith({ name: 'Fruit', parent: 'Food' }));
  });

  test('a blank name is reported beside the field and nothing is sent', async () => {
    await renderTab();
    await findRow('Food');
    userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    const dialog = await screen.findByRole('dialog');
    userEvent.click(within(dialog).getByRole('button', { name: 'Save category' }));
    expect(within(dialog).getByLabelText('Category name')).toHaveAccessibleDescription('Enter a name for the category');
    expect(addCategory).not.toHaveBeenCalled();
  });

  test('a name the server refuses is shown beside the name and the dialog stays open', async () => {
    addCategory.mockRejectedValue(new Error('Item Group Food already exists.'));
    await renderTab();
    await findRow('Food');
    userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    const dialog = await screen.findByRole('dialog');
    userEvent.type(within(dialog).getByLabelText('Category name'), 'Food{enter}');
    await waitFor(() => expect(within(dialog).getByLabelText('Category name')).toHaveAccessibleDescription(/already exists/));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('Escape closes the dialog without adding anything', async () => {
    await renderTab();
    await findRow('Food');
    userEvent.click(screen.getByRole('button', { name: 'Add category' }));
    await screen.findByRole('dialog');
    userEvent.keyboard('{esc}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(addCategory).not.toHaveBeenCalled();
  });
});

describe('renaming a category', () => {
  test('the row menu opens the dialog with the name filled in, and Save sends the new name', async () => {
    renameCategory.mockResolvedValue({});
    await renderTab();
    await findRow('Food');
    userEvent.click(menuFor('Food'));
    userEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const dialog = await screen.findByRole('dialog', { name: 'Change Food' });
    const name = within(dialog).getByLabelText('Category name');
    expect(name).toHaveValue('Food');
    userEvent.clear(name);
    userEvent.type(name, 'Groceries');
    userEvent.click(within(dialog).getByRole('button', { name: 'Save category' }));
    await waitFor(() => expect(renameCategory).toHaveBeenCalledWith({ name: 'Food', newName: 'Groceries', parent: 'All Item Groups' }));
    expect(await screen.findByText('Category Groceries saved')).toBeInTheDocument();
  });

  test('a category inside another keeps its parent in the dialog', async () => {
    renameCategory.mockResolvedValue({});
    await renderTab();
    await findRow('Snacks');
    userEvent.click(menuFor('Snacks'));
    userEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const dialog = await screen.findByRole('dialog', { name: 'Change Snacks' });
    expect(within(dialog).getByRole('combobox', { name: /Part of/ })).toHaveTextContent('Food');
    userEvent.click(within(dialog).getByRole('button', { name: 'Save category' }));
    await waitFor(() => expect(renameCategory).toHaveBeenCalledWith({ name: 'Snacks', newName: 'Snacks', parent: 'Food' }));
  });

  test('a category cannot be put inside itself', async () => {
    await renderTab();
    await findRow('Food');
    userEvent.click(menuFor('Food'));
    userEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const dialog = await screen.findByRole('dialog');
    userEvent.click(within(dialog).getByRole('combobox', { name: /Part of/ }));
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).not.toContain('Food');
    expect(options[0]).toBe('Top level');
  });
});

describe('deleting a category', () => {
  test('asks first, in words that say what is kept, then deletes and says so', async () => {
    deleteCategory.mockResolvedValue({ success: true });
    await renderTab();
    await findRow('Empty shelf');
    userEvent.click(menuFor('Empty shelf'));
    userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Empty shelf?' });
    expect(dialog).toHaveAccessibleDescription(/Products are not deleted/);
    expect(deleteCategory).not.toHaveBeenCalled();
    listCategories.mockResolvedValue({ categories: CATEGORIES.slice(1), total: 3, productTotal: 18 });
    userEvent.click(within(dialog).getByRole('button', { name: 'Delete category' }));
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith('Empty shelf'));
    expect(await screen.findByText('Category Empty shelf deleted')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'See the products in Empty shelf' })).not.toBeInTheDocument());
  });

  test('Keep it leaves the category alone', async () => {
    await renderTab();
    await findRow('Empty shelf');
    userEvent.click(menuFor('Empty shelf'));
    userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Keep it' }));
    expect(deleteCategory).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('a category with products in it cannot be deleted, and the page says why', async () => {
    await renderTab();
    await findRow('Food');
    userEvent.click(menuFor('Food'));
    expect(await screen.findByRole('menuitem', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByText('A category can be deleted once no products are in it.')).toBeInTheDocument();
  });

  test('a refusal from the server is shown in its own words', async () => {
    deleteCategory.mockRejectedValue(new Error("Cannot delete item group 'Empty shelf' because it has 1 child item group."));
    await renderTab();
    await findRow('Empty shelf');
    userEvent.click(menuFor('Empty shelf'));
    userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete category' }));
    expect(await screen.findByText(/has 1 child item group/)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('who can change categories', () => {
  test('a cashier can read the categories but has no Add category button and no menus', async () => {
    await renderTab('cashier');
    await findRow('Food');
    expect(screen.queryByRole('button', { name: 'Add category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More actions for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
  });
});

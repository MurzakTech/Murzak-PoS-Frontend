/**
 * The Edit product form: it opens with what the product has now, sends only what was changed, shows the cost to owners and
 * managers only, explains a cost change with no store, asks before leaving with unsaved changes, and says so when the product
 * cannot be found.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import { ToastProvider } from '../components/Toast';
import EditProductPage from './EditProductPage';
import { findProduct, listCategories, listUnits, updateProduct } from '../../api/productsListApi';
import { getMyAccess } from '../../api/accessApi';
import { useAppSelector } from '../../store/hooks';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: {} }));
jest.mock('../../api/productsListApi', () => {
  const actual = jest.requireActual('../../api/productsListApi');
  return { ...actual, findProduct: jest.fn(), updateProduct: jest.fn(), listCategories: jest.fn(), listUnits: jest.fn() };
});
jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));
jest.mock('../../store/hooks', () => ({ useAppSelector: jest.fn(), useAppDispatch: jest.fn() }));

const ROW = { item_code: 'SOAP-1', item_name: 'Soap bar', price: 120, cost_price: 80, unit: 'Nos', category: 'Household', barcode: '6001', status: 'ok', is_stock_item: 1 };
const CATEGORIES = [
  { name: 'Food', parent: 'All Item Groups', is_group: 0, product_count: 5 },
  { name: 'Household', parent: 'All Item Groups', is_group: 0, product_count: 3 },
];

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const renderEdit = async ({ tier = 'owner', warehouse = 'Main Store - X', found = { row: ROW, canSeeCost: true } } = {}) => {
  getMyAccess.mockResolvedValue({ tier, can: tier === 'cashier' ? {} : { cost_of_goods: true, profit: true } });
  findProduct.mockResolvedValue(found);
  useAppSelector.mockImplementation((select) => select({ auth: { user: { company: 'X', default_warehouse: warehouse } }, warehouse: { warehouses: [] } }));
  render(
    <MemoryRouter initialEntries={['/new-look/products/SOAP-1/edit']}>
      <AccessProvider userKey="beth">
        <ToastProvider>
          <Routes>
            <Route path="/new-look/products/:code/edit" element={<EditProductPage />} />
            <Route path="*" element={<p>the list</p>} />
          </Routes>
          <Where />
        </ToastProvider>
      </AccessProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(findProduct).toHaveBeenCalledWith('SOAP-1'));
};
const where = () => screen.getByTestId('where').textContent;
const openMore = () => userEvent.click(screen.getByRole('button', { name: 'More options' }));

beforeEach(() => {
  jest.resetAllMocks();
  listCategories.mockResolvedValue({ categories: CATEGORIES, total: 2, productTotal: 8 });
  listUnits.mockResolvedValue([{ name: 'Nos', uom_name: 'Nos' }, { name: 'Kg', uom_name: 'Kg' }]);
});

describe('Edit product', () => {
  test('opens with what the product has now', async () => {
    await renderEdit();
    expect(await screen.findByDisplayValue('Soap bar')).toBeInTheDocument();
    expect(screen.getByLabelText('Price')).toHaveValue('120');
    openMore();
    expect(await screen.findByLabelText('Cost price')).toHaveValue('80');
    expect(screen.getByLabelText('Barcode')).toHaveValue('6001');
    expect(screen.getByLabelText('Barcode')).toHaveAttribute('readonly');
  });

  test('sends only what was changed, then opens the product in the list', async () => {
    updateProduct.mockResolvedValue({ item_code: 'SOAP-1', item_name: 'Soap bar' });
    await renderEdit();
    const price = await screen.findByLabelText('Price');
    userEvent.clear(price);
    userEvent.type(price, '150');
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalled());
    expect(updateProduct).toHaveBeenCalledWith({ code: 'SOAP-1', changes: { price: '150' }, warehouse: 'Main Store - X', company: 'X' });
    await waitFor(() => expect(where()).toBe('/new-look/products?open=SOAP-1'));
  });

  test('a cost change goes with the default store', async () => {
    updateProduct.mockResolvedValue({ item_code: 'SOAP-1' });
    await renderEdit();
    await screen.findByLabelText('Price');
    openMore();
    const cost = await screen.findByLabelText('Cost price');
    userEvent.clear(cost);
    userEvent.type(cost, '90');
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith({ code: 'SOAP-1', changes: { cost: '90' }, warehouse: 'Main Store - X', company: 'X' }));
  });

  test('a cost change with no default store is explained beside the cost field and nothing is sent', async () => {
    await renderEdit({ warehouse: '' });
    await screen.findByLabelText('Price');
    openMore();
    const cost = await screen.findByLabelText('Cost price');
    userEvent.clear(cost);
    userEvent.type(cost, '90');
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findAllByText('Choose your default store before changing the cost price.')).length).toBeGreaterThan(0);
    expect(updateProduct).not.toHaveBeenCalled();
  });

  test('a cashier does not see the cost price', async () => {
    await renderEdit({ tier: 'cashier', found: { row: { ...ROW, cost_price: undefined }, canSeeCost: false } });
    await screen.findByLabelText('Price');
    openMore();
    await screen.findByLabelText('Barcode');
    expect(screen.queryByLabelText('Cost price')).not.toBeInTheDocument();
  });

  test('stopping the sale of a product sends the disabled switch', async () => {
    updateProduct.mockResolvedValue({ item_code: 'SOAP-1' });
    await renderEdit();
    await screen.findByLabelText('Price');
    openMore();
    userEvent.click(await screen.findByLabelText('Sell this product'));
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith(expect.objectContaining({ changes: { disabled: true } })));
  });

  test('a refusal from the server is shown and the form stays', async () => {
    const { ProductSaveError } = jest.requireActual('../../api/productsListApi');
    updateProduct.mockRejectedValue(new ProductSaveError('That category does not exist.'));
    await renderEdit();
    const name = await screen.findByLabelText('Product name');
    userEvent.type(name, ' large');
    userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findAllByText('That category does not exist.')).length).toBeGreaterThan(0);
    expect(where()).toBe('/new-look/products/SOAP-1/edit');
  });

  test('asks before leaving with unsaved changes', async () => {
    await renderEdit();
    userEvent.type(await screen.findByLabelText('Product name'), ' large');
    userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog', { name: 'Leave without saving?' })).toBeInTheDocument();
    expect(where()).toBe('/new-look/products/SOAP-1/edit');
  });

  test('a product that cannot be found says so', async () => {
    await renderEdit({ found: null });
    expect(await screen.findByText('We could not find this product. It may have been removed.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Back to Products' }));
    await waitFor(() => expect(where()).toBe('/new-look/products'));
  });
});

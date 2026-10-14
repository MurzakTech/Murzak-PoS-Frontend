import axiosInstance from './axiosInstance';
import { addCategory, createProduct, deleteCategory, listCategories, listProducts, listUnits, ProductSaveError, renameCategory } from './productsListApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const refusal = (extra) => ({ data: { message: { success: false, ...extra } } });

beforeEach(() => jest.resetAllMocks());

describe('listProducts', () => {
  test('asks for the page, the size and the filters, and leaves out what is empty', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], total: 0 }));
    await listProducts({ search: 'soap', category: 'Food', status: 'low', page: 2, pageSize: 50 });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.products_list_api.list_products', {
      params: { search: 'soap', category: 'Food', status: 'low', page: 2, page_size: 50 },
    });
    await listProducts();
    expect(axiosInstance.get).toHaveBeenLastCalledWith('murzak_pos.api.products_list_api.list_products', { params: { page: 1, page_size: 20 } });
  });

  test('the default view and an unknown view are not sent', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], total: 0 }));
    await listProducts({ status: 'active' });
    await listProducts({ status: 'expensive' });
    axiosInstance.get.mock.calls.forEach(([, options]) => expect(options.params.status).toBeUndefined());
  });

  test('a view that is known is sent', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], total: 0 }));
    for (const status of ['all', 'low', 'out', 'disabled']) {
      await listProducts({ status });
      expect(axiosInstance.get.mock.calls.pop()[1].params.status).toBe(status);
    }
  });

  test('returns the rows with the count and the paging the server worked out', async () => {
    const rows = [{ item_code: 'P-1', item_name: 'Soap' }];
    axiosInstance.get.mockResolvedValue(
      reply({ rows, total: 135, page: 3, page_size: 20, pages: 7, summary: { total: 135, low_stock: 4, out_of_stock: 2 }, status: 'active', stock_scope: { kind: 'store', warehouse: 'Stores' }, price_list: 'Standard Selling', can_see_cost: true })
    );
    await expect(listProducts({ page: 3 })).resolves.toEqual({
      rows,
      summary: { total: 135, low_stock: 4, out_of_stock: 2 },
      total: 135,
      page: 3,
      pageSize: 20,
      pages: 7,
      status: 'active',
      stockScope: { kind: 'store', warehouse: 'Stores' },
      priceList: 'Standard Selling',
      canSeeCost: true,
    });
  });

  test('works out the count and the pages when the server leaves them out, and never lets the size be blank', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ item_code: 'a' }, { item_code: 'b' }] }));
    const result = await listProducts({ pageSize: 10 });
    expect(result.total).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.pages).toBe(1);
    expect(result.summary).toBeNull();
    expect(result.canSeeCost).toBe(false);
  });

  test('turns a refusal or a missing answer into a plain message', async () => {
    axiosInstance.get.mockResolvedValue(refusal({ message: 'Could not load the products. Please try again.' }));
    await expect(listProducts()).rejects.toThrow('Could not load the products. Please try again.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(listProducts()).rejects.toThrow();
  });

  test('turns a network failure into a plain message', async () => {
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(listProducts()).rejects.toThrow(/could not reach|internet/i);
  });
});

describe('listCategories', () => {
  test('returns the categories with their counts', async () => {
    axiosInstance.get.mockResolvedValue(reply({ categories: [{ name: 'Food', product_count: 4 }], total: 1, product_total: 4 }));
    await expect(listCategories()).resolves.toEqual({ categories: [{ name: 'Food', product_count: 4 }], total: 1, productTotal: 4 });
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.products_list_api.list_categories');
  });

  test('a missing list is an empty one', async () => {
    axiosInstance.get.mockResolvedValue(reply({ total: 0 }));
    await expect(listCategories()).resolves.toEqual({ categories: [], total: 0, productTotal: 0 });
  });
});

describe('createProduct', () => {
  test('sends only what was filled in, under the server names', async () => {
    axiosInstance.post.mockResolvedValue(reply({ product: { item_code: 'PRD-00001' } }));
    await createProduct({ name: 'Soap bar', price: '120', code: '', category: 'Food', unit: 'Nos', barcode: '  ', cost: '80', stock: '12', warning: '5' });
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.products_list_api.create_product_simple', {
      item_name: 'Soap bar',
      price: '120',
      category: 'Food',
      unit: 'Nos',
      cost_price: '80',
      opening_stock: '12',
      low_stock_warning: '5',
    });
  });

  test('a name and a price are enough', async () => {
    axiosInstance.post.mockResolvedValue(reply({ product: { item_code: 'PRD-00002' } }));
    await createProduct({ name: 'Bread', price: '60' });
    expect(axiosInstance.post.mock.calls[0][1]).toEqual({ item_name: 'Bread', price: '60' });
  });

  test('returns the saved product and the notes about extra steps', async () => {
    axiosInstance.post.mockResolvedValue(reply({ product: { item_code: 'PRD-00003' }, code_made_automatically: true, notes: [{ step: 'opening_stock', message: 'The product was saved, but the opening stock was not added.' }] }));
    const result = await createProduct({ name: 'Bread', price: '60' });
    expect(result.product.item_code).toBe('PRD-00003');
    expect(result.notes).toHaveLength(1);
  });

  test('a refusal carries its words and the form field each belongs to', async () => {
    axiosInstance.post.mockResolvedValue(
      refusal({ message: 'Enter a name for the product.', errors: [{ field: 'item_name', message: 'Enter a name for the product.' }, { field: 'price', message: 'Enter a price.' }, { field: 'opening_stock', message: 'Opening stock must be a number, 0 or more.' }] })
    );
    const error = await createProduct({ name: '', price: '' }).catch((e) => e);
    expect(error).toBeInstanceOf(ProductSaveError);
    expect(error.message).toBe('Enter a name for the product.');
    expect(error.fields).toEqual({ name: 'Enter a name for the product.', price: 'Enter a price.', stock: 'Opening stock must be a number, 0 or more.' });
  });

  test('a refusal that cannot be told apart has words and no field', async () => {
    axiosInstance.post.mockResolvedValue(refusal({ message: 'An error occurred while creating the product.', errors: [] }));
    const error = await createProduct({ name: 'A', price: '1' }).catch((e) => e);
    expect(error.fields).toEqual({});
    expect(error.message).toMatch(/creating the product/);
  });

  test('a barcode already used goes to the barcode field', async () => {
    axiosInstance.post.mockResolvedValue(refusal({ message: 'This barcode is already used by another product.', errors: [{ field: 'barcode', message: 'This barcode is already used by another product.' }] }));
    const error = await createProduct({ name: 'A', price: '1', barcode: '6001' }).catch((e) => e);
    expect(error.fields.barcode).toBe('This barcode is already used by another product.');
  });

  test('a failed request is a ProductSaveError in plain words', async () => {
    axiosInstance.post.mockRejectedValue(new Error('Network Error'));
    const error = await createProduct({ name: 'A', price: '1' }).catch((e) => e);
    expect(error).toBeInstanceOf(ProductSaveError);
    expect(error.message).toMatch(/could not reach|internet/i);
    expect(error.fields).toEqual({});
  });

  test('a permission refusal from the server is shown in plain words', async () => {
    axiosInstance.post.mockRejectedValue({ response: { status: 403, data: { exc_type: 'PermissionError', _server_messages: JSON.stringify([JSON.stringify({ message: 'Your role cannot change prices or the product catalogue.', indicator: 'red' })]) } } });
    const error = await createProduct({ name: 'A', price: '1' }).catch((e) => e);
    expect(error.message).toMatch(/role cannot/);
  });
});

describe('listUnits', () => {
  test('returns the units', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { uoms: [{ name: 'Nos', uom_name: 'Nos' }, { name: 'Kg', uom_name: 'Kg' }], count: 2 } } });
    await expect(listUnits()).resolves.toHaveLength(2);
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.product_api.get_uoms');
  });

  test('no list is an empty list', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: {} } });
    await expect(listUnits()).resolves.toEqual([]);
  });
});

describe('categories', () => {
  test('add sends the name and, only when chosen, the parent', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { item_group: { name: 'Drinks' } } } });
    await addCategory({ name: 'Drinks' });
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.product_api.create_item_group', { item_group_name: 'Drinks' });
    await addCategory({ name: 'Soda', parent: 'Drinks' });
    expect(axiosInstance.post).toHaveBeenLastCalledWith('murzak_pos.api.product_api.create_item_group', { item_group_name: 'Soda', parent_item_group: 'Drinks' });
  });

  test('rename sends the old name, the new name and the parent', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { item_group: { name: 'Beverages' } } } });
    await renameCategory({ name: 'Drinks', newName: 'Beverages', parent: 'All Item Groups' });
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.product_api.update_item_group', { name: 'Drinks', item_group_name: 'Beverages', parent_item_group: 'All Item Groups' });
  });

  test('delete sends the name', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true, message: 'deleted' } } });
    await deleteCategory('Drinks');
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.product_api.delete_item_group', { name: 'Drinks' });
  });

  test('a category that cannot be deleted says why, in the server words', async () => {
    axiosInstance.post.mockRejectedValue({ response: { status: 400, data: { success: false, message: "Cannot delete item group 'Food' because it is currently assigned to 5 items." } } });
    await expect(deleteCategory('Food')).rejects.toThrow(/assigned to 5 items/);
  });

  test('a refusal that is a reply and not an error is also an error', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'That category is in use.' } } });
    await expect(deleteCategory('Food')).rejects.toThrow('That category is in use.');
  });

  test('a duplicate name is reported in plain words', async () => {
    axiosInstance.post.mockRejectedValue({ response: { status: 417, data: { _server_messages: JSON.stringify([JSON.stringify({ message: 'Item Group Drinks already exists', indicator: 'red' })]) } } });
    await expect(addCategory({ name: 'Drinks' })).rejects.toThrow(/already exists/);
  });
});

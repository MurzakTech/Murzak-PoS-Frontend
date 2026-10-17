import axiosInstance from './axiosInstance';
import { createSupplier, getSupplierOverview, listSupplierGroups, listSuppliers, updateSupplier } from './suppliersListApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const LIST = 'murzak_pos.api.suppliers_list_api';
const SUPPLIER = 'murzak_pos.api.supplier_api';

beforeEach(() => jest.resetAllMocks());

describe('listSuppliers', () => {
  test('asks for the Owed filter, the search, the group and the page, leaving out what is empty', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], summary: {}, total: 0 }));
    await listSuppliers({ owed: true, search: 'bidco', group: 'Goods', status: 'disabled', page: 2, pageSize: 50, company: 'Demo Shop' });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${LIST}.list_suppliers_overview`, { params: { owed: 1, search: 'bidco', supplier_group: 'Goods', status: 'disabled', page: 2, page_size: 50, company: 'Demo Shop' } });
    await listSuppliers();
    expect(axiosInstance.get).toHaveBeenLastCalledWith(`${LIST}.list_suppliers_overview`, { params: { page: 1, page_size: 20 } });
  });

  test('the Owed filter is only sent when it is on', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await listSuppliers({ owed: false });
    expect(axiosInstance.get.mock.calls[0][1].params).not.toHaveProperty('owed');
  });

  test('an unknown status is not sent', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await listSuppliers({ status: 'gone' });
    expect(axiosInstance.get.mock.calls[0][1].params).toEqual({ page: 1, page_size: 20 });
  });

  test('returns the rows, the summary and the counts', async () => {
    const summary = { suppliers: 12, owed_total: 5000, suppliers_owed: 2, bills_due_soon: 1 };
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }], summary, total: 41, page: 2, page_size: 20, pages: 3 }));
    await expect(listSuppliers({ page: 2 })).resolves.toEqual({ rows: [{ id: 'A' }], summary, total: 41, page: 2, pageSize: 20, pages: 3 });
  });

  test('fills in what the server leaves out', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }] }));
    await expect(listSuppliers()).resolves.toEqual({ rows: [{ id: 'A' }], summary: {}, total: 1, page: 1, pageSize: 20, pages: 1 });
  });

  test('a refusal, a missing answer or a network failure becomes a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Could not load the suppliers. Please try again.' } } });
    await expect(listSuppliers()).rejects.toThrow('Could not load the suppliers. Please try again.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(listSuppliers()).rejects.toThrow();
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(listSuppliers()).rejects.toThrow(/internet|connection/i);
  });
});

describe('getSupplierOverview', () => {
  test('asks for one supplier and gives back the panel as the server sent it', async () => {
    const panel = { id: 'SUP-1', name: 'Bidco', owed: 20000, bills: [] };
    axiosInstance.get.mockResolvedValue(reply(panel));
    await expect(getSupplierOverview('SUP-1', 'Demo Shop')).resolves.toEqual(panel);
    expect(axiosInstance.get).toHaveBeenCalledWith(`${LIST}.get_supplier_overview`, { params: { supplier: 'SUP-1', company: 'Demo Shop' } });
  });

  test('a supplier that was not found is an error with the server words', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Supplier SUP-9 was not found.' } } });
    await expect(getSupplierOverview('SUP-9')).rejects.toThrow('Supplier SUP-9 was not found.');
  });
});

describe('listSupplierGroups', () => {
  test('gives the groups that can hold a supplier, as choices, and leaves out the folders', async () => {
    axiosInstance.get.mockResolvedValue({
      data: {
        message: {
          success: true,
          data: [
            { name: 'All Supplier Groups', supplier_group_name: 'All Supplier Groups', is_group: 1 },
            { name: 'Goods', supplier_group_name: 'Goods', is_group: 0 },
            { name: 'Farm', is_group: 0 },
          ],
        },
      },
    });
    await expect(listSupplierGroups()).resolves.toEqual([
      { value: 'Goods', label: 'Goods' },
      { value: 'Farm', label: 'Farm' },
    ]);
    expect(axiosInstance.get).toHaveBeenCalledWith(`${SUPPLIER}.get_supplier_groups`, { params: { limit: 200 } });
  });

  test('a failure becomes a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Error getting supplier groups' } } });
    await expect(listSupplierGroups()).rejects.toThrow();
  });
});

describe('createSupplier', () => {
  test('sends the fields the current call takes and gives back the new number', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true, name: 'Bidco Distributors', supplier_name: 'Bidco Distributors' } } });
    await expect(createSupplier({ name: 'Bidco Distributors', type: 'Company', group: 'Goods', taxId: 'P051234567A', country: 'Kenya', currency: 'KES', internal: false, company: 'Demo Shop' })).resolves.toEqual({ id: 'Bidco Distributors', name: 'Bidco Distributors' });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${SUPPLIER}.create_supplier`, {
      supplier_name: 'Bidco Distributors',
      supplier_type: 'Company',
      supplier_group: 'Goods',
      tax_id: 'P051234567A',
      country: 'Kenya',
      default_currency: 'KES',
      is_internal_supplier: 0,
      company: 'Demo Shop',
    });
  });

  test('leaves out what was not filled in', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true, name: 'X', supplier_name: 'X' } } });
    await createSupplier({ name: 'X', type: 'Individual', taxId: '', internal: true });
    expect(axiosInstance.post.mock.calls[0][1]).toEqual({ supplier_name: 'X', supplier_type: 'Individual', is_internal_supplier: 1 });
  });

  test('a name already used by this business comes back with the code duplicate', async () => {
    axiosInstance.post.mockRejectedValue({ response: { status: 417, data: { _server_messages: JSON.stringify([JSON.stringify({ message: "A supplier with the name 'X' already exists. Please use a different name." })]) } } });
    await expect(createSupplier({ name: 'X', type: 'Company' })).rejects.toMatchObject({ code: 'duplicate' });
  });

  test('a refusal in the answer becomes a plain message', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Not saved.' } } });
    await expect(createSupplier({ name: 'X', type: 'Company' })).rejects.toThrow('Not saved.');
  });
});

describe('updateSupplier', () => {
  test('sends only what is given, and the disabled switch as 1 or 0', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true } } });
    await expect(updateSupplier({ id: 'SUP-1', disabled: true })).resolves.toEqual({ id: 'SUP-1' });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${SUPPLIER}.update_supplier`, { name: 'SUP-1', disabled: 1 });
    await updateSupplier({ id: 'SUP-1', disabled: false });
    expect(axiosInstance.post).toHaveBeenLastCalledWith(`${SUPPLIER}.update_supplier`, { name: 'SUP-1', disabled: 0 });
  });

  test('sends the changed fields under the names the current call knows', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true } } });
    await updateSupplier({ id: 'SUP-1', name: 'Bidco', group: 'Goods', taxId: 'P051234567A', country: 'Kenya', currency: 'KES', disabled: false });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${SUPPLIER}.update_supplier`, { name: 'SUP-1', supplier_name: 'Bidco', supplier_group: 'Goods', country: 'Kenya', default_currency: 'KES', tax_id: 'P051234567A', disabled: 0 });
  });

  test('an empty tax ID is sent as empty text so it can be cleared', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true } } });
    await updateSupplier({ id: 'SUP-1', taxId: '' });
    expect(axiosInstance.post.mock.calls[0][1]).toEqual({ name: 'SUP-1', tax_id: '' });
  });

  test('a refusal becomes a plain message', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Not saved.' } } });
    await expect(updateSupplier({ id: 'SUP-1', disabled: true })).rejects.toThrow('Not saved.');
  });
});

import axiosInstance from './axiosInstance';
import { ENDPOINTS, HeldSalesError, listHeldSales, saveHeldSale, deleteHeldSale, toServer, fromServer } from './heldSalesApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { post: jest.fn() } }));

const held = (over = {}) => ({
  id: 1760000000000,
  heldAt: '2026-10-10T10:00:00.000Z',
  label: 'Table 4',
  customer: 'Walk-in Customer',
  customerId: null,
  selectedCustomerObj: null,
  customerPriceList: 'Standard Selling',
  manualDiscountType: 'percentage',
  manualDiscountValue: 0,
  cart: [{ item_code: 'A', qty: 2, subtotal: 500 }, { item_code: 'B', qty: 1, subtotal: 80 }],
  ...over,
});

const reply = (message) => Promise.resolve({ data: { message } });
const fail = (response, message) => Promise.reject(Object.assign(new Error(message || 'Request failed'), response ? { response } : { request: {} }));

beforeEach(() => axiosInstance.post.mockReset());

describe('what is sent to the server', () => {
  it('describes a held sale by a few fields to list it by, and carries the sale itself', () => {
    const body = toServer(held(), { company: 'Shop A', warehouse: 'Main Store - SA' });
    expect(body).toMatchObject({ company: 'Shop A', warehouse: 'Main Store - SA', id: '1760000000000', label: 'Table 4', item_count: 2, total: 580, held_at: '2026-10-10T10:00:00.000Z' });
    expect(body.payload.cart).toHaveLength(2);
    expect(body.payload.customerPriceList).toBe('Standard Selling');
  });

  it('carries the kitchen history of the bill, and brings it back', () => {
    const kitchen = { round: 2, voids: [{ item_code: 'A', qty: 1 }] };
    const body = toServer(held({ kitchen }), { company: 'Shop A' });
    expect(body.payload.kitchen).toEqual(kitchen);
    expect(fromServer({ id: 'x', payload: body.payload }).kitchen).toEqual(kitchen);
    expect(toServer(held(), { company: 'Shop A' }).payload.kitchen).toBeNull();
  });

  it('leaves the store out when none is chosen', () => {
    expect(toServer(held(), { company: 'Shop A' })).not.toHaveProperty('warehouse');
  });

  it('lists with the business and store', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { held_sales: [] } }));
    await listHeldSales({ company: 'Shop A', warehouse: 'Main Store - SA' });
    expect(axiosInstance.post).toHaveBeenCalledWith(ENDPOINTS.list, { company: 'Shop A', warehouse: 'Main Store - SA' });
  });
});

describe('listing', () => {
  it('turns server rows into the till\'s own shape, including who held it', async () => {
    const row = { id: 'h1', label: 'Bar', held_at: '2026-10-10T09:00:00.000Z', held_by_name: 'Amina', payload: { cart: [{ subtotal: 5 }], customer: 'John', customerPriceList: 'Bar Prices' } };
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { held_sales: [row] } }));
    const [h] = await listHeldSales({ company: 'Shop A' });
    expect(h).toMatchObject({ id: 'h1', label: 'Bar', heldAt: '2026-10-10T09:00:00.000Z', customer: 'John', customerPriceList: 'Bar Prices', heldBy: 'Amina' });
    expect(h.cart).toHaveLength(1);
  });

  it('accepts the payload as text, and leaves out rows it cannot use', async () => {
    const rows = [
      { id: 'a', payload: JSON.stringify({ cart: [{ subtotal: 1 }] }) },
      { id: 'b', payload: 'not json' },
      { id: 'c', payload: { cart: [] } },
      null,
      { payload: { cart: [{}] } },
    ];
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { held_sales: rows } }));
    expect((await listHeldSales({ company: 'Shop A' })).map((h) => h.id)).toEqual(['a']);
  });

  it('also accepts a bare list', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: [{ id: 'a', payload: { cart: [{}] } }] }));
    expect(await listHeldSales({ company: 'Shop A' })).toHaveLength(1);
  });

  it('refuses a reply that is not a list', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { something: 1 } }));
    await expect(listHeldSales({ company: 'Shop A' })).rejects.toMatchObject({ kind: 'failed' });
  });
});

describe('saving and deleting', () => {
  it('saves, and keeps the sale it sent even if the server answers with little', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { id: '1760000000000' } }));
    const saved = await saveHeldSale({ company: 'Shop A', held: held() });
    expect(axiosInstance.post.mock.calls[0][0]).toBe(ENDPOINTS.save);
    expect(saved.cart).toHaveLength(2);
    expect(saved.id).toBe('1760000000000');
  });

  it('takes who held it from the server\'s answer', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { id: '1760000000000', held_by_name: 'Amina' } }));
    expect((await saveHeldSale({ company: 'Shop A', held: held() })).heldBy).toBe('Amina');
  });

  it('says whether a bill was still there when it was deleted', async () => {
    axiosInstance.post.mockReturnValueOnce(reply({ success: true, data: { id: 'h1', deleted: true } }));
    expect(await deleteHeldSale({ company: 'Shop A', id: 'h1' })).toEqual({ deleted: true });
    axiosInstance.post.mockReturnValueOnce(reply({ success: true, data: { id: 'h1', deleted: false } }));
    expect(await deleteHeldSale({ company: 'Shop A', id: 'h1' })).toEqual({ deleted: false });
    expect(axiosInstance.post).toHaveBeenLastCalledWith(ENDPOINTS.remove, { company: 'Shop A', id: 'h1' });
  });

  it('sends the id as text, even for an old numeric id', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: true, data: { deleted: true } }));
    await deleteHeldSale({ company: 'Shop A', id: 42 });
    expect(axiosInstance.post.mock.calls[0][1].id).toBe('42');
  });
});

describe('failures', () => {
  const kindOf = async (p) => p.then(() => null, (e) => e);

  it('knows a server that has no such calls', async () => {
    axiosInstance.post.mockReturnValue(fail({ status: 404, data: { exc: 'frappe.exceptions.DoesNotExistError' } }));
    const e = await kindOf(listHeldSales({ company: 'Shop A' }));
    expect(e).toBeInstanceOf(HeldSalesError);
    expect(e.kind).toBe('unavailable');
  });

  it('knows Frappe naming a missing method', async () => {
    axiosInstance.post.mockReturnValue(fail({ status: 500, data: { exception: 'AttributeError: module techsavanna_pos.api.held_sales_api has no attribute list_held_sales' } }));
    expect((await kindOf(listHeldSales({ company: 'Shop A' }))).kind).toBe('unavailable');
  });

  it.each([
    ['no answer at all (offline)', null],
    ['a server error', { status: 500, data: { message: 'boom' } }],
    ['a refusal for permission', { status: 403, data: { message: 'Not permitted' } }],
  ])('treats %s as a failure to retry, not as a missing server', async (_, response) => {
    axiosInstance.post.mockReturnValue(fail(response));
    const e = await kindOf(saveHeldSale({ company: 'Shop A', held: held() }));
    expect(e.kind).toBe('failed');
    expect(e.message).not.toMatch(/\[object|undefined/);
  });

  it('reports a refusal inside a normal reply, with the server\'s reason', async () => {
    axiosInstance.post.mockReturnValue(reply({ success: false, message: 'You do not belong to this company.' }));
    const e = await kindOf(deleteHeldSale({ company: 'Shop A', id: 'h1' }));
    expect(e.kind).toBe('failed');
    expect(e.message).toContain('do not belong');
  });
});

describe('fromServer', () => {
  it('copes with a row that has almost nothing', () => {
    const h = fromServer({ id: 7 });
    expect(h).toMatchObject({ id: '7', label: '', customer: 'Walk-in Customer', cart: [], heldBy: '' });
  });
});

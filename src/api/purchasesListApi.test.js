import axiosInstance from './axiosInstance';
import { listProducts } from './productsListApi';
import {
  addPurchaseNote,
  cancelBill,
  cancelOrder,
  createDirectBill,
  findProductsToBuy,
  getPaymentModes,
  getProductToBuy,
  getPurchase,
  listPurchases,
  listSuppliers,
  makeBillFromNote,
  payBill,
  receiveGoods,
  saveOrder,
  sendOrder,
} from './purchasesListApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('./productsListApi', () => ({ listProducts: jest.fn() }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const URL = 'murzak_pos.api.purchases_list_api';
const CURRENT = 'murzak_pos.api.purchase';

beforeEach(() => jest.resetAllMocks());

describe('listPurchases', () => {
  test('asks for the tab, period and page, and sends dates only for a custom range', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], summary: {}, total: 0 }));
    await listPurchases({ tab: 'orders', period: '7d', from: '2026-10-01', to: '2026-10-07', search: '', page: 2, pageSize: 50 });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${URL}.list_purchases`, { params: { tab: 'orders', period: '7d', page: 2, page_size: 50 } });
    await listPurchases({ period: 'custom', from: '2026-10-01', to: '2026-10-07', search: 'bidco', supplier: 'SUP-1' });
    expect(axiosInstance.get).toHaveBeenLastCalledWith(`${URL}.list_purchases`, {
      params: { tab: 'all', period: 'custom', from_date: '2026-10-01', to_date: '2026-10-07', search: 'bidco', supplier: 'SUP-1', page: 1, page_size: 20 },
    });
  });

  test('an unknown tab is asked for as All purchases', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await listPurchases({ tab: 'sessions' });
    expect(axiosInstance.get.mock.calls[0][1].params.tab).toBe('all');
  });

  test('asks for goods received notes or every supplier bill when a view is chosen, and ignores anything else', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await listPurchases({ kind: 'receipts' });
    expect(axiosInstance.get.mock.calls[0][1].params.kind).toBe('receipts');
    await listPurchases({ kind: 'bills' });
    expect(axiosInstance.get.mock.calls[1][1].params.kind).toBe('bills');
    await listPurchases({ kind: 'nonsense' });
    expect(axiosInstance.get.mock.calls[2][1].params).not.toHaveProperty('kind');
  });

  test('openOnly asks for the orders still waiting for goods', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await listPurchases({ tab: 'orders', openOnly: true, pageSize: 100 });
    expect(axiosInstance.get.mock.calls[0][1].params).toMatchObject({ open_only: 1, tab: 'orders', page_size: 100 });
  });

  test('returns the rows, the summary and the counts', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }], summary: { orders_open: 2, bills_unpaid: 900, returned: 50 }, total: 41, page: 2, page_size: 20, pages: 3 }));
    await expect(listPurchases({ page: 2 })).resolves.toEqual({ rows: [{ id: 'A' }], summary: { orders_open: 2, bills_unpaid: 900, returned: 50 }, total: 41, page: 2, pageSize: 20, pages: 3 });
  });

  test('fills in what the server leaves out', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }] }));
    await expect(listPurchases()).resolves.toEqual({ rows: [{ id: 'A' }], summary: { orders_open: 0, bills_unpaid: 0, returned: 0 }, total: 1, page: 1, pageSize: 20, pages: 1 });
  });

  test('turns a refusal, a missing answer or a network failure into a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Could not load the purchases. Please try again.' } } });
    await expect(listPurchases()).rejects.toThrow('Could not load the purchases. Please try again.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(listPurchases()).rejects.toThrow();
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(listPurchases()).rejects.toThrow(/internet|connection/i);
  });
});

describe('getPurchase and getPaymentModes', () => {
  test('asks for one purchase by id and kind', async () => {
    axiosInstance.get.mockResolvedValue(reply({ id: 'PO-1', number: '#O0001' }));
    await expect(getPurchase('PO-1', 'Purchase Order')).resolves.toEqual({ id: 'PO-1', number: '#O0001' });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${URL}.get_purchase`, { params: { id: 'PO-1', doctype: 'Purchase Order' } });
  });

  test('the kind is left out when only the number is known', async () => {
    axiosInstance.get.mockResolvedValue(reply({ id: 'X' }));
    await getPurchase('X');
    expect(axiosInstance.get).toHaveBeenCalledWith(`${URL}.get_purchase`, { params: { id: 'X' } });
  });

  test('a purchase that is not found becomes a plain message with its code', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Purchase X was not found.', error_type: 'not_found' } } });
    const error = await getPurchase('X').catch((e) => e);
    expect(error.message).toBe('Purchase X was not found.');
    expect(error.errorType).toBe('not_found');
  });

  test('the ways of paying come back as a list', async () => {
    axiosInstance.get.mockResolvedValue(reply({ modes: [{ name: 'Cash', kind: 'cash' }] }));
    await expect(getPaymentModes()).resolves.toEqual([{ name: 'Cash', kind: 'cash' }]);
    axiosInstance.get.mockResolvedValue(reply({}));
    await expect(getPaymentModes()).resolves.toEqual([]);
  });
});

describe('receiveGoods', () => {
  const done = { receipt: 'MAT-PRE-1', invoice: 'PINV-1', stock: [{ item_code: 'A', received: 6, before: 10, after: 16 }] };

  test('sends the order, what arrived, the bill details and the request id in one call', async () => {
    axiosInstance.post.mockResolvedValue(reply(done));
    await expect(
      receiveGoods({ order: 'PO-1', items: [{ item_code: 'A', qty_received: 6 }], billNo: 'INV-9', billDate: '2026-10-13', dueDate: '', warehouse: undefined, requestId: 'recv-abc12345' })
    ).resolves.toEqual(done);
    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      `${URL}.receive_goods`,
      { order: 'PO-1', items: '[{"item_code":"A","qty_received":6}]', bill_no: 'INV-9', bill_date: '2026-10-13', request_id: 'recv-abc12345' },
      { allowRefusal: true }
    );
  });

  test('a refusal keeps the server sentence and its code', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Only 6 of A is still to arrive. Enter that or less.', error_type: 'too_much' } } });
    const error = await receiveGoods({ order: 'PO-1', items: [] }).catch((e) => e);
    expect(error.message).toBe('Only 6 of A is still to arrive. Enter that or less.');
    expect(error.errorType).toBe('too_much');
  });

  test('a network failure is a plain message', async () => {
    axiosInstance.post.mockRejectedValue(new Error('Network Error'));
    await expect(receiveGoods({ order: 'PO-1', items: [] })).rejects.toThrow(/internet|connection/i);
  });
});

describe('createDirectBill and addPurchaseNote', () => {
  test('sends the lines, the bill, the payment and the request id', async () => {
    axiosInstance.post.mockResolvedValue(reply({ invoice: 'PINV-2' }));
    await createDirectBill({
      supplier: 'SUP-1',
      items: [{ item_code: 'A', qty: 2, rate: 50 }],
      billNo: 'B1',
      billDate: '2026-10-01',
      paidAmount: 100,
      mode: 'Cash',
      notes: 'By van',
      requestId: 'bill-abc12345',
    });
    expect(axiosInstance.post).toHaveBeenCalledWith(
      `${URL}.create_direct_bill`,
      {
        supplier: 'SUP-1',
        items: '[{"item_code":"A","qty":2,"rate":50}]',
        bill_no: 'B1',
        bill_date: '2026-10-01',
        paid_amount: 100,
        mode_of_payment: 'Cash',
        notes: 'By van',
        request_id: 'bill-abc12345',
      },
      { allowRefusal: true }
    );
  });

  test('a refusal on the bill is a plain message', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'You cannot pay more than the bill total of KES 100.' } } });
    await expect(createDirectBill({ supplier: 'S', items: [] })).rejects.toThrow('You cannot pay more than the bill total of KES 100.');
  });

  test('a note is sent with the purchase it belongs to', async () => {
    axiosInstance.post.mockResolvedValue(reply({ note: { text: 'Hello', date: '2026-10-14' } }));
    await expect(addPurchaseNote({ id: 'PO-1', doctype: 'Purchase Order', note: 'Hello' })).resolves.toEqual({ note: { text: 'Hello', date: '2026-10-14' } });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${URL}.add_purchase_note`, { id: 'PO-1', doctype: 'Purchase Order', note: 'Hello' }, { allowRefusal: true });
  });
});

describe('saveOrder and sendOrder', () => {
  test('saves the order with submit on, so goods can be received on it', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'success', purchase_order: 'PO-7' } } });
    await expect(saveOrder({ supplier: 'SUP-1', items: [{ item_code: 'A', qty: 2, rate: 5 }], date: '2026-10-14', warehouse: 'Main - A', requestId: 'po-abc12345' })).resolves.toEqual({
      order: 'PO-7',
      waitingForApproval: false,
    });
    expect(axiosInstance.post).toHaveBeenCalledWith(
      `${CURRENT}.upsert_purchase_order`,
      { supplier: 'SUP-1', items: '[{"item_code":"A","qty":2,"rate":5}]', transaction_date: '2026-10-14', warehouse: 'Main - A', idempotency_key: 'po-abc12345', submit: 1 },
      { allowRefusal: true }
    );
  });

  test('an order that needs approval says so', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'success', purchase_order: 'PO-8', approval: { waiting: true } } } });
    await expect(saveOrder({ supplier: 'S', items: [] })).resolves.toEqual({ order: 'PO-8', waitingForApproval: true });
  });

  test('a refusal on the order is a plain message', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'error', message: 'Choose a supplier.' } } });
    await expect(saveOrder({ supplier: '', items: [] })).rejects.toThrow('Choose a supplier.');
  });

  test('sending a draft uses the current Submit Order call', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'success', code: 'PO_SUBMITTED' } } });
    await expect(sendOrder('PO-1')).resolves.toEqual({ waitingForApproval: false });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${CURRENT}.submit_purchase_order`, { lpo_no: 'PO-1' }, { allowRefusal: true });
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'success', code: 'APPROVAL_REQUIRED' } } });
    await expect(sendOrder('PO-1')).resolves.toEqual({ waitingForApproval: true });
  });

  test('a draft that cannot be sent gives the reason', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'error', message: 'LPO already submitted' } } });
    await expect(sendOrder('PO-1')).rejects.toThrow('LPO already submitted');
  });
});

describe('payBill', () => {
  test('uses the current Pay Invoice call with the amount, the way and the M-Pesa code', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'success', data: { payment_entry: { paid_amount: 500 }, purchase_invoice: { outstanding_amount: 0 } } } } });
    await expect(payBill({ invoice: 'PINV-1', amount: 500, mode: 'M-Pesa', reference: 'QGH7K2LMN4' })).resolves.toEqual({ paid: 500, outstanding: 0 });
    expect(axiosInstance.post).toHaveBeenCalledWith(
      `${CURRENT}.pay_purchase_invoice`,
      { invoice_no: 'PINV-1', paid_amount: 500, mode_of_payment: 'M-Pesa', reference_no: 'QGH7K2LMN4' },
      { allowRefusal: true }
    );
  });

  test('the way is left out when the shop has none to choose', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'success', data: {} } } });
    await payBill({ invoice: 'PINV-1', amount: 5 });
    expect(axiosInstance.post.mock.calls[0][1]).toEqual({ invoice_no: 'PINV-1', paid_amount: 5 });
  });

  test('a payment the server refuses becomes a plain message', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'error', message: 'Purchase Invoice PINV-1 is already fully paid' } } });
    await expect(payBill({ invoice: 'PINV-1', amount: 5 })).rejects.toThrow('already fully paid');
  });
});

describe('makeBillFromNote', () => {
  test('uses the current call that bills a goods received note, with the bill number and date', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'success', data: { invoice_name: 'PINV-9' } } } });
    await expect(makeBillFromNote({ receipt: 'MAT-PRE-1', billNo: 'INV-1', billDate: '2026-10-13' })).resolves.toEqual({ invoice: 'PINV-9' });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${CURRENT}.create_purchase_invoice_from_grn`, { grn_no: 'MAT-PRE-1', bill_no: 'INV-1', bill_date: '2026-10-13' }, { allowRefusal: true });
  });

  test('the bill number and date are left out when blank', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'success', data: {} } } });
    await makeBillFromNote({ receipt: 'MAT-PRE-1', billNo: '', billDate: undefined });
    expect(axiosInstance.post.mock.calls[0][1]).toEqual({ grn_no: 'MAT-PRE-1' });
  });

  test('a refusal gives the reason', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'error', message: 'GRN MAT-PRE-1 is not ready for invoicing.' } } });
    await expect(makeBillFromNote({ receipt: 'MAT-PRE-1' })).rejects.toThrow('not ready for invoicing');
  });
});

describe('cancelOrder and cancelBill', () => {
  test('cancel an order with the current call', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true } } });
    await expect(cancelOrder('PO-1')).resolves.toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith('murzak_pos.api.stock.cancel_purchase_order', { purchase_order: 'PO-1' }, { allowRefusal: true });
  });

  test('an order that cannot be cancelled gives the reason', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Purchase Order has submitted receipts or invoices and cannot be cancelled', errors: [] } } });
    await expect(cancelOrder('PO-1')).rejects.toThrow('cannot be cancelled');
  });

  test('cancel a bill with the current call', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true } } });
    await expect(cancelBill('PINV-1')).resolves.toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith(`${CURRENT}.cancel_purchase_invoice`, { name: 'PINV-1' }, { allowRefusal: true });
  });
});

describe('suppliers and products', () => {
  test('suppliers come back as id and name', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: [{ name: 'SUP-1', supplier_name: 'Bidco' }, { name: 'SUP-2' }] } } });
    await expect(listSuppliers()).resolves.toEqual([
      { id: 'SUP-1', name: 'Bidco' },
      { id: 'SUP-2', name: 'SUP-2' },
    ]);
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.supplier_api.get_suppliers', { params: { limit: 200 } });
  });

  test('a supplier list that fails is a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Error getting suppliers' } } });
    await expect(listSuppliers()).rejects.toThrow();
  });

  test('products come back with the cost on record', async () => {
    listProducts.mockResolvedValue({
      rows: [
        { item_code: 'A', item_name: 'Sugar', unit: 'Kg', cost_price: '95.5' },
        { item_code: 'B', item_name: 'Rice' },
      ],
    });
    await expect(findProductsToBuy({ search: 'su' })).resolves.toEqual([
      { item_code: 'A', item_name: 'Sugar', unit: 'Kg', cost: 95.5 },
      { item_code: 'B', item_name: 'Rice', unit: '', cost: null },
    ]);
    expect(listProducts).toHaveBeenCalledWith({ search: 'su', pageSize: 8 });
  });

  test('one product is found by its exact code', async () => {
    listProducts.mockResolvedValue({
      rows: [
        { item_code: 'A-2', item_name: 'Sugar 2', cost_price: 10 },
        { item_code: 'A', item_name: 'Sugar', cost_price: 8 },
      ],
    });
    await expect(getProductToBuy('A')).resolves.toEqual({ item_code: 'A', item_name: 'Sugar', unit: '', cost: 8 });
    listProducts.mockResolvedValue({ rows: [] });
    await expect(getProductToBuy('Z')).resolves.toBeNull();
  });
});

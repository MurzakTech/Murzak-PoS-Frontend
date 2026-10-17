import axiosInstance from './axiosInstance';
import { listProducts } from './productsListApi';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The Purchases page of the redesign (ticket P4-5): the list with the tabs All purchases, Orders and Returns, the panel for
 * one purchase, the guided Receive goods step (goods received note, stock and supplier bill in one server call), the direct
 * bill, and the calls the panel and the New purchase form reuse from the current screens (save an order, send it, pay a bill,
 * cancel). The exact shapes are in the back end's docs/redesign/P4-5-contract.md.
 *
 * Everything that depends on the shape of a server answer is in this file, so a change in the contract touches only here.
 */
const PURCHASES = 'murzak_pos.api.purchases_list_api';
const CURRENT = 'murzak_pos.api.purchase';
const STOCK = 'murzak_pos.api.stock';
const SUPPLIERS = 'murzak_pos.api.supplier_api';

// Frappe wraps return values in { message }; the new calls answer { success, message, data }.
const body = (response) => response.data?.message ?? response.data;
const failure = (reply, fallback = 'That did not work. Please try again.') => {
  const error = new Error(humanizeMessage(reply?.message, fallback));
  error.errorType = reply?.error_type || '';
  return error;
};
const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));

// Only the network call is wrapped, so a refusal from the server keeps its own plain sentence
const send = async (go) => {
  try {
    return await go();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
};

const call = async (method, go) => {
  const reply = body(await send(() => go(`${PURCHASES}.${method}`)));
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

const TABS = ['all', 'orders', 'returns'];
const ZERO = { orders_open: 0, bills_unpaid: 0, returned: 0 };

/**
 * One page of the list. tab is all, orders or returns; period is today, week, 7d, 30d, month or custom (from and to, as
 * yyyy-mm-dd, are sent only for custom). kind is receipts (goods received notes) or bills (every supplier bill) for the views of their
 * own, otherwise the tabs decide. openOnly lists the orders still waiting for goods, whatever their date.
 * Resolves to { rows, summary, total, page, pageSize, pages }.
 */
export const listPurchases = async ({ tab = 'all', period = '30d', from, to, search, supplier, kind, page = 1, pageSize = 20, openOnly = false } = {}) => {
  const data = await call('list_purchases', (url) =>
    axiosInstance.get(url, {
      params: compact({
        tab: TABS.includes(tab) ? tab : 'all',
        period,
        from_date: period === 'custom' ? from : undefined,
        to_date: period === 'custom' ? to : undefined,
        search,
        supplier,
        kind: kind === 'receipts' || kind === 'bills' ? kind : undefined,
        page,
        page_size: pageSize,
        open_only: openOnly ? 1 : undefined,
      }),
    })
  );
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const size = Number(data.page_size) || pageSize;
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : rows.length;
  return {
    rows,
    summary: { ...ZERO, ...(data.summary || {}) },
    total,
    page: Number(data.page) || page,
    pageSize: size,
    pages: Number(data.pages) || Math.max(1, Math.ceil(total / size)),
  };
};

/** One purchase for the panel. doctype is 'Purchase Order', 'Purchase Invoice' or 'Purchase Receipt'; leave it out when only the number is known. */
export const getPurchase = (id, doctype) => call('get_purchase', (url) => axiosInstance.get(url, { params: compact({ id, doctype }) }));

/** The ways the shop pays a supplier: [{ name, kind }] with kind cash, mpesa, card or other */
export const getPaymentModes = async () => {
  const data = await call('get_payment_modes', (url) => axiosInstance.get(url));
  return Array.isArray(data.modes) ? data.modes : [];
};

/**
 * Receive goods: ONE server call that makes the goods received note (the stock goes up) and the supplier bill together, or
 * changes nothing. items is [{ item_code, qty_received }]. requestId is made once per page and sent with every try, so a double tap
 * or a retry can never add the stock or the bill twice. Resolves to { receipt, invoice, stock, order, ... }; a refusal comes back
 * as an Error with the server's plain sentence (and errorType).
 */
export const receiveGoods = ({ order, items, billNo, billDate, dueDate, warehouse, requestId }) =>
  call('receive_goods', (url) =>
    axiosInstance.post(url, compact({ order, items: JSON.stringify(items), bill_no: billNo, bill_date: billDate, due_date: dueDate, warehouse, request_id: requestId }), { allowRefusal: true })
  );

/**
 * A bill the shop already holds: saved with the stock raised at once. items is [{ item_code, qty, rate }]. paidAmount, mode and
 * reference mark it as paid in the same step. Resolves to { invoice, invoice_number, total, outstanding, repeat }.
 */
export const createDirectBill = ({ supplier, items, billNo, billDate, dueDate, warehouse, paidAmount, mode, reference, notes, requestId }) =>
  call('create_direct_bill', (url) =>
    axiosInstance.post(
      url,
      compact({
        supplier,
        items: JSON.stringify(items),
        bill_no: billNo,
        bill_date: billDate,
        due_date: dueDate,
        warehouse,
        paid_amount: paidAmount,
        mode_of_payment: mode,
        reference_no: reference,
        notes,
        request_id: requestId,
      }),
      { allowRefusal: true }
    )
  );

/** A note on an order or a bill. Resolves to { note: { text, date } }. */
export const addPurchaseNote = ({ id, doctype, note }) => call('add_purchase_note', (url) => axiosInstance.post(url, compact({ id, doctype, note }), { allowRefusal: true }));

/**
 * Saves a purchase order and sends it to the supplier (the current call, with submit on, because goods can only be received on a
 * sent order). Resolves to { order, waitingForApproval }.
 */
export const saveOrder = async ({ supplier, items, date, warehouse, requestId }) => {
  const response = await send(() =>
    axiosInstance.post(`${CURRENT}.upsert_purchase_order`, compact({ supplier, items: JSON.stringify(items), transaction_date: date, warehouse, idempotency_key: requestId, submit: 1 }), {
      allowRefusal: true,
    })
  );
  const reply = body(response);
  if (!reply || reply.success === false || reply.status === 'error') throw failure(reply, 'We could not save the order.');
  return { order: reply.purchase_order || reply.lpo_no || (reply.data && reply.data.name) || '', waitingForApproval: Boolean(reply.approval) };
};

/** Sends a draft order to the supplier (the current Submit Order call). Resolves to { waitingForApproval }. */
export const sendOrder = async (id) => {
  const response = await send(() => axiosInstance.post(`${CURRENT}.submit_purchase_order`, { lpo_no: id }, { allowRefusal: true }));
  const reply = body(response);
  if (!reply || reply.status === 'error' || reply.success === false) throw failure(reply, 'We could not send the order.');
  return { waitingForApproval: reply.code === 'APPROVAL_REQUIRED' };
};

/**
 * Pays a supplier bill (the current Pay Invoice call). mode is the Mode of Payment name; reference is the M-Pesa code.
 * Resolves to { paid, outstanding }.
 */
export const payBill = async ({ invoice, amount, mode, reference }) => {
  const response = await send(() =>
    axiosInstance.post(`${CURRENT}.pay_purchase_invoice`, compact({ invoice_no: invoice, paid_amount: amount, mode_of_payment: mode, reference_no: reference }), { allowRefusal: true })
  );
  const reply = body(response);
  if (!reply || reply.status !== 'success') throw failure(reply, 'We could not record the payment.');
  const data = reply.data || {};
  return { paid: Number(data.payment_entry && data.payment_entry.paid_amount) || Number(amount), outstanding: Number(data.purchase_invoice && data.purchase_invoice.outstanding_amount) || 0 };
};

/**
 * Makes the supplier bill for goods that were received but not billed yet (the current Create Purchase Invoice from a goods received
 * note call). Resolves to { invoice }.
 */
export const makeBillFromNote = async ({ receipt, billNo, billDate }) => {
  const response = await send(() => axiosInstance.post(`${CURRENT}.create_purchase_invoice_from_grn`, compact({ grn_no: receipt, bill_no: billNo, bill_date: billDate }), { allowRefusal: true }));
  const reply = body(response);
  if (!reply || reply.status !== 'success') throw failure(reply, 'We could not make the bill.');
  return { invoice: (reply.data && reply.data.invoice_name) || '' };
};

/** Cancels an order that nothing has arrived on (the current cancel call). */
export const cancelOrder = async (id) => {
  const response = await send(() => axiosInstance.post(`${STOCK}.cancel_purchase_order`, { purchase_order: id }, { allowRefusal: true }));
  const reply = body(response);
  if (!reply || reply.success === false) throw failure({ message: (reply && (reply.message || (reply.errors && reply.errors[0]))) || '' }, 'We could not cancel the order.');
  return true;
};

/** Cancels a submitted bill; the stock it added and the money owed on it are reversed (the current cancel call). */
export const cancelBill = async (id) => {
  const response = await send(() => axiosInstance.post(`${CURRENT}.cancel_purchase_invoice`, { name: id }, { allowRefusal: true }));
  const reply = body(response);
  if (!reply || reply.success === false) throw failure(reply, 'We could not cancel the bill.');
  return true;
};

/** The shop's suppliers for the choosers: [{ id, name }] by name, at most `limit` */
export const listSuppliers = async ({ limit = 200 } = {}) => {
  const response = await send(() => axiosInstance.get(`${SUPPLIERS}.get_suppliers`, { params: { limit } }));
  const reply = body(response);
  if (!reply || reply.success === false) throw failure(reply, 'We could not load your suppliers.');
  const rows = Array.isArray(reply.data) ? reply.data : [];
  return rows.map((s) => ({ id: s.name, name: s.supplier_name || s.name }));
};

const asProduct = (r) => ({
  item_code: r.item_code,
  item_name: r.item_name || r.item_code,
  unit: r.unit || '',
  cost: r.cost_price === undefined || r.cost_price === null ? null : Number(r.cost_price),
});

/** Products by name or code for the New purchase form, with the cost price the shop has on record (owners and managers): [{ item_code, item_name, unit, cost }] */
export const findProductsToBuy = async ({ search, limit = 8 } = {}) => {
  const data = await listProducts({ search, pageSize: limit });
  return data.rows.map(asProduct);
};

/** One product by its code (for ?item=), or null when there is none */
export const getProductToBuy = async (itemCode) => {
  const data = await listProducts({ search: itemCode, pageSize: 5 });
  const found = data.rows.find((r) => r.item_code === itemCode);
  return found ? asProduct(found) : null;
};

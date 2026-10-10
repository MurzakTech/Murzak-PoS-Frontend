/**
 * The server side of held sales (bills put on hold at a till).
 *
 * Three calls, described in HELD_SALES_SERVER_API.md:
 *   list_held_sales   the bills on hold for a business (and store)
 *   save_held_sale    add a bill, or change one (the same id replaces it)
 *   delete_held_sale  remove a bill; says whether it was still there
 *
 * Every failure is turned into a HeldSalesError with a kind the till can act on:
 *   'unavailable'  this server does not have these calls (yet): keep using the device
 *   'failed'       the server did not answer, or refused: the message says why
 */
import axiosInstance from './axiosInstance';
import { friendlyErrorMessage } from '../utils/friendlyError';
import { heldTotal } from '../utils/heldSales';

const BASE = 'techsavanna_pos.api.held_sales_api';
export const ENDPOINTS = {
  list: `${BASE}.list_held_sales`,
  save: `${BASE}.save_held_sale`,
  remove: `${BASE}.delete_held_sale`,
};

export class HeldSalesError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'HeldSalesError';
    this.kind = kind;
  }
}

// Signs that the server simply has no such call (Frappe answers 404, or names the missing method)
const MISSING = /failed to get method|not a valid whitelisted|has no attribute|no module named|not found/i;

const toError = (error) => {
  if (error instanceof HeldSalesError) return error;
  const status = error?.response?.status;
  const text = `${JSON.stringify(error?.response?.data ?? '')} ${error?.message ?? ''}`;
  if (status === 404 || status === 501 || (status && status >= 400 && MISSING.test(text) && /held_sales/i.test(text))) {
    return new HeldSalesError('unavailable', 'This server cannot store held sales yet.');
  }
  return new HeldSalesError('failed', friendlyErrorMessage(error));
};

// Replies look like { message: { success, data } } (Frappe) or { success, data }
const unwrap = (response) => {
  const body = response?.data?.message ?? response?.data ?? {};
  if (body && body.success === false) {
    throw new HeldSalesError('failed', friendlyErrorMessage(String(body.message || 'The server refused the request.')));
  }
  return body?.data ?? body;
};

const call = async (url, payload) => {
  try {
    return unwrap(await axiosInstance.post(url, payload));
  } catch (error) {
    throw toError(error);
  }
};

// ------------------------------------------------------- shapes

/** What the server stores for a held sale: a few fields to list it by, and the sale itself */
export const toServer = (held, { company, warehouse }) => ({
  company,
  ...(warehouse ? { warehouse } : {}),
  id: String(held.id),
  label: held.label || '',
  held_at: held.heldAt,
  customer: held.customer || '',
  item_count: held.cart.length,
  total: heldTotal(held),
  payload: {
    cart: held.cart,
    customer: held.customer,
    customerId: held.customerId ?? null,
    selectedCustomerObj: held.selectedCustomerObj ?? null,
    customerPriceList: held.customerPriceList,
    manualDiscountType: held.manualDiscountType,
    manualDiscountValue: held.manualDiscountValue,
  },
});

/** A held sale from the server, in the shape the till uses */
export const fromServer = (row) => {
  const payload = typeof row.payload === 'string' ? safeParse(row.payload) : row.payload || {};
  return {
    ...payload,
    id: String(row.id),
    label: row.label || '',
    heldAt: row.held_at || row.modified || new Date().toISOString(),
    customer: payload.customer || row.customer || 'Walk-in Customer',
    cart: Array.isArray(payload.cart) ? payload.cart : [],
    heldBy: row.held_by_name || row.held_by || '',
  };
};

const safeParse = (text) => {
  try {
    return JSON.parse(text) || {};
  } catch (e) {
    return {};
  }
};

// ------------------------------------------------------- calls

export const listHeldSales = async ({ company, warehouse }) => {
  const data = await call(ENDPOINTS.list, { company, ...(warehouse ? { warehouse } : {}) });
  const rows = Array.isArray(data) ? data : data?.held_sales;
  if (!Array.isArray(rows)) throw new HeldSalesError('failed', 'The server sent back a list we could not read.');
  // A row we cannot make sense of is left out rather than breaking the whole list
  return rows.filter((r) => r && r.id !== undefined).map(fromServer).filter((h) => h.cart.length > 0);
};

export const saveHeldSale = async ({ company, warehouse, held }) => {
  const data = await call(ENDPOINTS.save, toServer(held, { company, warehouse }));
  // Keep what we sent; take only the server's own details (who held it, and when it was saved)
  const saved = data && typeof data === 'object' && data.id !== undefined ? fromServer({ ...toServer(held, { company, warehouse }), ...data }) : null;
  return saved && saved.cart.length ? saved : { ...held, id: String(held.id) };
};

/** Resolves { deleted } : false means it was already gone (brought back on another till, or discarded) */
export const deleteHeldSale = async ({ company, id }) => {
  const data = await call(ENDPOINTS.remove, { company, id: String(id) });
  return { deleted: data?.deleted !== false };
};

import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The calls a business makes to run its online store: the store's settings, which products are shown, and the online orders
 * that come in (backend: online_store_api.py and online_orders.py). What shoppers do is in storefrontApi.js.
 */
const STORE = 'murzak_pos.api.online_store_api';
const ORDERS = 'murzak_pos.api.online_orders';

const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));
const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
const list = (value) => (Array.isArray(value) ? value : []);
const number = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const send = async (request) => {
  let response;
  try {
    response = await request();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false) throw failure(reply);
  return reply;
};

// ---------- The store's settings ----------

export const getOnlineStore = async (company) => {
  const reply = await send(() => axiosInstance.get(`${STORE}.get_online_store`, { params: compact({ company }) }));
  const data = reply.data || {};
  return { ...data, delivery_areas: list(data.delivery_areas), links: data.links || {}, product_count: number(data.product_count) };
};

export const checkStoreSlug = async ({ slug, company }) => {
  const reply = await send(() => axiosInstance.get(`${STORE}.check_store_slug`, { params: compact({ slug, company }) }));
  return { available: Boolean(reply.data?.available), message: reply.data?.message || '' };
};

export const saveOnlineStore = async (settings, company) => {
  const reply = await send(() => axiosInstance.post(`${STORE}.save_online_store`, compact({ settings, company }), { allowRefusal: true }));
  return reply.data;
};

/** Shows products on the online store (show true) or hides them (show false). */
export const setItemsOnline = async ({ itemCodes, show, company }) => {
  const reply = await send(() =>
    axiosInstance.post(`${STORE}.set_items_online`, compact({ item_codes: itemCodes, show: show ? 1 : 0, company }), { allowRefusal: true })
  );
  return reply.data;
};

// ---------- Online orders ----------

export const listOnlineOrders = async ({ company, status, channel, page = 1, pageSize = 20 } = {}) => {
  const reply = await send(() =>
    axiosInstance.get(`${ORDERS}.list_online_orders`, { params: compact({ company, status, channel, page, page_size: pageSize }) })
  );
  const data = reply.data || {};
  return { rows: list(data.rows), total: number(data.total), page: number(data.page) || page, pageSize: number(data.page_size) || pageSize };
};

export const getOnlineOrder = async (order, company) => {
  const reply = await send(() => axiosInstance.get(`${ORDERS}.get_online_order`, { params: compact({ order, company }) }));
  const data = reply.data || {};
  return { ...data, lines: list(data.lines) };
};

export const setOnlineOrderStatus = async ({ order, status, company }) => {
  const reply = await send(() => axiosInstance.post(`${ORDERS}.set_online_order_status`, compact({ order, status, company }), { allowRefusal: true }));
  return reply.data;
};

export const markOnlineOrderPaid = async (order, company) => {
  const reply = await send(() => axiosInstance.post(`${ORDERS}.mark_online_order_paid`, compact({ order, company }), { allowRefusal: true }));
  return reply.data;
};

/** Makes a draft invoice from the order; the owner reviews and submits it. Resolves with the invoice's name. */
export const createInvoiceForOnlineOrder = async (order, company) => {
  const reply = await send(() => axiosInstance.post(`${ORDERS}.create_invoice_for_online_order`, compact({ order, company }), { allowRefusal: true }));
  return reply.data?.invoice || '';
};

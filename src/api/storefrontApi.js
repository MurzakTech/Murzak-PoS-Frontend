import axios from 'axios';
import { friendlyErrorMessage } from '../utils/friendlyError';

/**
 * The calls a shopper's browser makes to a business's online store (backend: storefront_api.py and
 * online_orders.track_online_order).
 *
 * A shopper is not signed in, and may be a business owner who happens to be signed in on the same browser, so these
 * calls use their own plain client: no staff token is ever attached, and a refusal never signs anyone out or
 * redirects to the login page (the shared client in axiosInstance.js does both).
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || '';

const STORE = 'murzak_pos.api.storefront_api';
const ORDERS = 'murzak_pos.api.online_orders';

export const guestClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/** The shop does not exist, or has not opened its online store. Shown as "this shop is not open", not as a fault. */
export class ShopNotFoundError extends Error {
  constructor(message) {
    super(message || 'This shop is not open.');
    this.name = 'ShopNotFoundError';
    this.notFound = true;
  }
}

const isNotFound = (error) => {
  const data = error?.response?.data;
  return error?.response?.status === 404 || data?.exc_type === 'DoesNotExistError';
};

const number = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const list = (value) => (Array.isArray(value) ? value : []);
const compact = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));

/** Runs a request and returns the reply's data; any failure becomes an Error with a sentence a shopper can act on. */
const send = async (request) => {
  let response;
  try {
    response = await request();
  } catch (error) {
    if (isNotFound(error)) throw new ShopNotFoundError();
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = response?.data?.message ?? response?.data;
  if (!reply || reply.success === false) {
    throw new Error(reply?.message || 'That did not work. Please try again.');
  }
  return reply;
};

export const getShop = async (slug) => {
  const reply = await send(() => guestClient.get(`${STORE}.get_store`, { params: { slug } }));
  return reply.data;
};

export const listShopProducts = async ({ slug, search, category, page = 1, pageSize = 20 } = {}) => {
  const reply = await send(() =>
    guestClient.get(`${STORE}.list_products`, {
      params: compact({ slug, search, category, page, page_size: pageSize }),
    })
  );
  return { rows: list(reply.data?.rows), total: number(reply.data?.total), page: number(reply.data?.page) || page };
};

/** What delivery would cost for this basket to this area or place. The server decides; the page only shows it. */
export const quoteDelivery = async ({ slug, lines, area, latitude, longitude }) => {
  const reply = await send(() =>
    guestClient.get(`${STORE}.quote_delivery`, {
      params: compact({
        slug,
        lines: JSON.stringify(lines),
        delivery_area: area,
        latitude,
        longitude,
      }),
    })
  );
  const data = reply.data || {};
  return {
    deliverable: data.deliverable !== false,
    fee: number(data.fee),
    distanceKm: data.distance_km === null || data.distance_km === undefined ? null : number(data.distance_km),
    message: data.message || '',
  };
};

export const placeOrder = async ({
  slug,
  customerName,
  phone,
  lines,
  deliveryMethod,
  payment,
  address,
  notes,
  area,
  latitude,
  longitude,
}) => {
  const reply = await send(() =>
    guestClient.post(
      `${STORE}.checkout`,
      compact({
        slug,
        customer_name: customerName,
        phone,
        lines,
        delivery_method: deliveryMethod,
        payment,
        address,
        notes,
        delivery_area: area,
        latitude,
        longitude,
      })
    )
  );
  const data = reply.data || {};
  return {
    order: data.order,
    token: data.token,
    total: number(data.total),
    deliveryFee: number(data.delivery_fee),
    currency: data.currency || '',
    lines: list(data.lines),
    payment: data.payment,
    paymentPrompt: data.payment_prompt || null,
    whatsappLink: data.whatsapp_link || '',
    message: reply.message || '',
  };
};

/** Sends the M-Pesa prompt again for an unpaid order. Resolves with {sent, message}. */
export const payForOrder = async (token) => {
  let response;
  try {
    response = await guestClient.post(`${STORE}.pay_for_order`, { token });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = response?.data?.message ?? response?.data ?? {};
  return {
    sent: Boolean(reply.success),
    paid: Boolean(reply.data?.paid),
    message: reply.message || reply.data?.payment_prompt?.message || '',
  };
};

export const trackOrder = async (token) => {
  const reply = await send(() => guestClient.get(`${ORDERS}.track_online_order`, { params: { token } }));
  const data = reply.data || {};
  return {
    order: data.order,
    status: data.status || 'New',
    deliveryMethod: data.delivery_method || '',
    paid: Boolean(data.paid),
    total: number(data.total),
    date: data.date || '',
    shop: data.shop || '',
  };
};

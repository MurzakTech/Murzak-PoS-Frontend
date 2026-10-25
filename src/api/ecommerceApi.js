import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

const ECOMMERCE = 'murzak_pos.api.ecommerce_api';

const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));
const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
const list = (value) => (Array.isArray(value) ? value : []);
const number = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const sendReply = async (request) => {
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

const send = async (request) => (await sendReply(request)).data;

export const getEcommerceSettings = async (company) => {
  return send(() =>
    axiosInstance.get(`${ECOMMERCE}.get_ecommerce_settings`, {
      params: compact({ company }),
    })
  );
};

export const saveEcommerceSettings = async (settings, company) => {
  return send(() =>
    axiosInstance.post(
      `${ECOMMERCE}.save_ecommerce_settings`,
      compact({ settings, company }),
      { allowRefusal: true }
    )
  );
};

export const testWooCommerceConnection = async ({ storeUrl, consumerKey, consumerSecret, company } = {}) => {
  return send(() =>
    axiosInstance.post(
      `${ECOMMERCE}.test_woocommerce_connection`,
      compact({
        store_url: storeUrl,
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        company,
      }),
      { allowRefusal: true }
    )
  );
};

/**
 * Sends the catalogue to the website. Resolves with the server's counts and its own sentence about what happened,
 * and a status: 'success', or 'partial' when some products could not be sent. Nothing sent at all is an error.
 */
export const syncWooCommerceCatalog = async ({ company, warehouse, syncType = 'all' } = {}) => {
  const reply = await sendReply(() =>
    axiosInstance.post(
      `${ECOMMERCE}.sync_woocommerce_catalog`,
      compact({
        company,
        warehouse,
        sync_type: syncType,
      }),
      { allowRefusal: true }
    )
  );
  return { ...reply.data, message: reply.message };
};

/** visibility: 'shown' (the default on the server), 'hidden' or 'all'. Each row says whether it is shown online (show_online). */
export const getEcommerceProducts = async ({ company, warehouse, search, page = 1, pageSize = 20, visibility } = {}) => {
  const data = await send(() =>
    axiosInstance.get(`${ECOMMERCE}.get_ecommerce_products`, {
      params: compact({
        company,
        warehouse,
        search,
        visibility,
        page,
        page_size: pageSize,
      }),
    })
  );
  return {
    rows: list(data.rows),
    total: number(data.total),
    page: number(data.page) || page,
    pageSize: number(data.page_size) || pageSize,
    warehouse: data.warehouse || '',
  };
};

/** The web address and secret to paste into WooCommerce so the shop's orders reach the POS. Made on first use. */
export const getOrderWebhook = async (company) => {
  const data = await send(() =>
    axiosInstance.post(`${ECOMMERCE}.get_order_webhook`, compact({ company }), { allowRefusal: true })
  );
  return { deliveryUrl: data.delivery_url || '', secret: data.secret || '', steps: list(data.steps) };
};

/** Replaces the address and secret (the old ones stop working at once). */
export const regenerateOrderWebhook = async (company) => {
  const data = await send(() =>
    axiosInstance.post(`${ECOMMERCE}.regenerate_order_webhook`, compact({ company }), { allowRefusal: true })
  );
  return { deliveryUrl: data.delivery_url || '', secret: data.secret || '', steps: list(data.steps) };
};

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

const send = async (request) => {
  let response;
  try {
    response = await request();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false) throw failure(reply);
  return reply.data;
};

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

export const syncWooCommerceCatalog = async ({ company, warehouse, syncType = 'all' } = {}) => {
  return send(() =>
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
};

export const getEcommerceProducts = async ({ company, warehouse, search, page = 1, pageSize = 20 } = {}) => {
  const data = await send(() =>
    axiosInstance.get(`${ECOMMERCE}.get_ecommerce_products`, {
      params: compact({
        company,
        warehouse,
        search,
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

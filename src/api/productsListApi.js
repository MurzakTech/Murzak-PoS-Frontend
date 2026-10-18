import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The Products page of the redesign (tickets P4-1 and P4-2): the list with its exact count, the categories, and the
 * one-screen New product form. The server decides what each person may see: a cashier's list has no cost price and
 * no profit.
 *
 * Everything that depends on the shape of the server's answer is in this file, so a change in the contract
 * (docs/redesign/P4-1-contract.md in the back end repository) touches only here.
 */
const PRODUCTS = 'murzak_pos.api.products_list_api';
const CATALOGUE = 'murzak_pos.api.product_api';

const FALLBACK = 'That did not work. Please try again.';

// Frappe wraps return values in { message }; the new calls answer { success, message, data }.
const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, FALLBACK));
const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));

const call = async (method, send) => {
  let response;
  try {
    response = await send(`${PRODUCTS}.${method}`);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

const STATUSES = ['active', 'all', 'low', 'out', 'disabled'];

/**
 * One page of the list. status is active (the default), all, low, out or disabled.
 * Resolves to { rows, summary, total, page, pageSize, pages, status, stockScope, priceList, canSeeCost }.
 * `total` is the exact number of products matching the filters; a cashier's rows have no cost_price or profit_per_item.
 */
export const listProducts = async ({ search, category, status, page = 1, pageSize = 20, warehouse } = {}) => {
  const data = await call('list_products', (url) =>
    axiosInstance.get(url, {
      params: compact({ search, category, status: STATUSES.includes(status) && status !== 'active' ? status : undefined, page, page_size: pageSize, warehouse }),
    })
  );
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const size = Number(data.page_size) || pageSize;
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : rows.length;
  return {
    rows,
    summary: data.summary || null,
    total,
    page: Number(data.page) || page,
    pageSize: size,
    pages: Number(data.pages) || Math.max(1, Math.ceil(total / size)),
    status: data.status || 'active',
    stockScope: data.stock_scope || { kind: 'all_stores', warehouse: null },
    priceList: data.price_list || null,
    canSeeCost: Boolean(data.can_see_cost),
  };
};

/** The categories with how many products each holds: { categories: [{ name, parent, is_group, is_default, product_count }], total, productTotal } */
export const listCategories = async () => {
  const data = await call('list_categories', (url) => axiosInstance.get(url));
  const categories = Array.isArray(data.categories) ? data.categories : [];
  return { categories, total: Number(data.total) || categories.length, productTotal: Number(data.product_total) || 0 };
};

/** Why a New product was refused: `message` for the summary, and `fields` as { fieldName: message } to show beside each field */
export class ProductSaveError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ProductSaveError';
    this.fields = fields;
  }
}

const KEYS = {
  name: 'item_name',
  price: 'price',
  code: 'item_code',
  category: 'category',
  unit: 'unit',
  barcode: 'barcode',
  cost: 'cost_price',
  stock: 'opening_stock',
  warning: 'low_stock_warning',
  store: 'warehouse',
};

/**
 * Saves a new product. values: { name, price, code?, category?, unit?, barcode?, cost?, stock?, warning?, store? }; only name and
 * price are needed. Resolves to the server's data: { product, code_made_automatically, low_stock_warning, opening_stock, store,
 * notes } where notes lists extra steps that did not work (the product itself is saved). Rejects with a ProductSaveError
 * whose `fields` name the form fields the server refused, so each message can sit beside its field.
 */
export const createProduct = async (values) => {
  const params = {};
  Object.entries(KEYS).forEach(([key, name]) => {
    if (values[key] !== undefined && values[key] !== null && String(values[key]).trim() !== '') params[name] = values[key];
  });
  let response;
  try {
    response = await axiosInstance.post(`${PRODUCTS}.create_product_simple`, params);
  } catch (error) {
    throw new ProductSaveError(friendlyErrorMessage(error, 'We could not save the product. Please try again.'));
  }
  const reply = body(response);
  if (!reply || reply.success === false) {
    const fields = {};
    const inverse = Object.fromEntries(Object.entries(KEYS).map(([key, name]) => [name, key]));
    (Array.isArray(reply?.errors) ? reply.errors : []).forEach((e) => {
      const key = inverse[e.field];
      if (key && e.message && !fields[key]) fields[key] = humanizeMessage(e.message, FALLBACK);
    });
    throw new ProductSaveError(humanizeMessage(reply?.message, 'We could not save the product. Please try again.'), fields);
  }
  return { ...(reply.data || {}), notes: Array.isArray(reply.data?.notes) ? reply.data.notes : [] };
};

/**
 * Saves changes to one product with the current update call, which leaves anything not sent as it was.
 * changes: { name?, price?, cost?, unit?, category?, disabled? }. A cost needs a store to belong to.
 * Resolves to the server's product; rejects with a ProductSaveError.
 */
export const updateProduct = async ({ code, changes, warehouse, company }) => {
  const params = { item_code: code };
  if (changes.name !== undefined) params.item_name = changes.name;
  if (changes.price !== undefined) params.standard_rate = Number(changes.price);
  if (changes.category !== undefined) params.item_group = changes.category;
  if (changes.unit !== undefined) params.stock_uom = changes.unit;
  if (changes.disabled !== undefined) params.disabled = changes.disabled;
  if (changes.cost !== undefined) {
    params.buying_price = Number(changes.cost);
    params.warehouse = warehouse;
    if (company) params.company = company;
  }
  let response;
  try {
    response = await axiosInstance.post(`${CATALOGUE}.update_product`, params);
  } catch (error) {
    throw new ProductSaveError(friendlyErrorMessage(error, 'We could not save the product. Please try again.'));
  }
  const reply = body(response);
  if (!reply || !reply.product) throw new ProductSaveError(humanizeMessage(reply?.message, 'We could not save the product. Please try again.'));
  return reply.product;
};

/** One product by its code, as a row of the list (or null when there is none). Uses the list call with the code as the search. */
export const findProduct = async (code) => {
  const { rows, canSeeCost } = await listProducts({ search: code, status: 'all', pageSize: 20 });
  const row = rows.find((r) => r.item_code === code);
  return row ? { row, canSeeCost } : null;
};

/** The units the shop can choose from, as { name, uom_name }. Uses the current call; the screen writes them in plain words. */
export const listUnits = async () => {
  let response;
  try {
    response = await axiosInstance.get(`${CATALOGUE}.get_uoms`);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  return Array.isArray(reply?.uoms) ? reply.uoms : [];
};

// ---------- Categories: the current calls, unchanged ----------

const post = async (method, params, fallback) => {
  let response;
  try {
    response = await axiosInstance.post(`${CATALOGUE}.${method}`, params);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error, fallback));
  }
  const reply = body(response);
  if (reply && reply.success === false) throw new Error(humanizeMessage(reply.message, fallback));
  return reply;
};

/** Adds a category. parent is optional (the top level when left out). */
export const addCategory = ({ name, parent }) =>
  post('create_item_group', compact({ item_group_name: name, parent_item_group: parent }), 'We could not add the category. Please try again.');

/** Renames a category and/or moves it under another. */
export const renameCategory = ({ name, newName, parent }) =>
  post('update_item_group', compact({ name, item_group_name: newName, parent_item_group: parent }), 'We could not change the category. Please try again.');

/** Deletes a category. The server refuses while products or sub-categories are in it, and says so. */
export const deleteCategory = (name) => post('delete_item_group', { name }, 'We could not delete the category. Please try again.');

import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The Stock levels page and its short forms (tickets P4-3 and P4-4): the overview, low stock, movements and expiry
 * lists, the product picker, Stock in, Stock out or write-off, and the guided count.
 *
 * The server decides what each person may see (a cashier gets no stock value or cost) and what they may change.
 * Everything that depends on the shape of the server's answer is in this file, so a change in the contract
 * (docs/redesign/P4-3-contract.md of the back end) touches only here.
 */
const STOCK = 'murzak_pos.api.stock_levels_api';

// Frappe wraps return values in { message }; these calls answer { success, message, data }.
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
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

export const TABS = ['overview', 'low', 'movements', 'expiry'];

const NO_FEATURES = { expiry: false, locations: 0 };

/**
 * One page of a tab. tab is overview, low, movements or expiry. For movements, period is today, 7d, 30d or custom
 * (from and to are sent as dates; the other presets are turned into dates by the caller). Resolves to
 * { tab, rows, total, page, pageSize, pages, tiles, categories, features, canChange, role, ... }.
 */
export const getStockLevels = async ({ tab = 'overview', search, category, store, status, kind, from, to, days, page = 1, pageSize = 20 } = {}) => {
  const data = await send(() =>
    axiosInstance.get(`${STOCK}.get_stock_levels`, {
      params: compact({
        tab: TABS.includes(tab) ? tab : 'overview',
        search,
        category,
        warehouse: store,
        status,
        kind,
        from_date: from,
        to_date: to,
        days,
        page,
        page_size: pageSize,
      }),
    })
  );
  const rows = list(data.rows);
  const size = number(data.page_size) || pageSize;
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : rows.length;
  return {
    tab: data.tab || tab,
    rows,
    total,
    page: number(data.page) || page,
    pageSize: size,
    pages: number(data.pages) || Math.max(1, Math.ceil(total / size)),
    // The tiles are absent outside the overview; stock_value is absent for a cashier
    tiles: data.tiles || null,
    categories: list(data.categories),
    features: { ...NO_FEATURES, ...(data.features || {}) },
    canChange: Boolean(data.can && data.can.change_stock),
    role: data.role || '',
    from: data.from_date || '',
    to: data.to_date || '',
    days: number(data.days) || undefined,
  };
};

/** Products by name or code for the pickers, with the quantity in stock: [{ item_code, item_name, category, unit, qty }] */
export const findProducts = async ({ search, store, limit = 8 } = {}) => {
  const data = await send(() => axiosInstance.get(`${STOCK}.find_products`, { params: compact({ search, warehouse: store, limit }) }));
  return list(data.rows);
};

/** Stock in: a material receipt with no supplier. Resolves to { entry, item_code, qty, warehouse, in_stock }. */
export const stockIn = ({ itemCode, qty, store, note, unitCost }) =>
  send(() => axiosInstance.post(`${STOCK}.stock_in`, compact({ item_code: itemCode, qty, warehouse: store, note, unit_cost: unitCost }), { allowRefusal: true }));

/** Stock out or write-off. The reason is required by the server too: damaged, expired, lost, used_in_shop or other. */
export const stockOut = ({ itemCode, qty, reason, store, note }) =>
  send(() => axiosInstance.post(`${STOCK}.stock_out`, compact({ item_code: itemCode, qty, reason, warehouse: store, note }), { allowRefusal: true }));

/** What the system says is in a store, for the count: { warehouse, rows: [{ item_code, item_name, category, unit, expected }], total, truncated } */
export const getCountSheet = async ({ scope = 'all', category, store } = {}) => {
  const data = await send(() => axiosInstance.get(`${STOCK}.get_count_sheet`, { params: compact({ scope, category, warehouse: store }) }));
  return { warehouse: data.warehouse || '', rows: list(data.rows), total: number(data.total) || list(data.rows).length, truncated: Boolean(data.truncated) };
};

/**
 * Saves a count: counts is [{ item_code, counted }]. Resolves to { warehouse, differences, totals, reconciliation }.
 * reconciliation is null when every line matched and nothing was changed.
 */
export const submitCount = async ({ counts, store }) => {
  const data = await send(() =>
    axiosInstance.post(
      `${STOCK}.submit_count`,
      compact({ counts: list(counts).map((c) => ({ item_code: c.item_code, counted: c.counted })), warehouse: store }),
      { allowRefusal: true }
    )
  );
  return {
    warehouse: data.warehouse || '',
    differences: list(data.differences),
    totals: { lines: 0, short: 0, over: 0, matches: 0, net_difference: 0, ...(data.totals || {}) },
    reconciliation: data.reconciliation || null,
  };
};

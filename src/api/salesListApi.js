import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The Sales page of the redesign (ticket P3-8): one list of POS invoices and sales invoices with the tabs All sales,
 * Unpaid, Returns and Till sessions, and one receipt for the panel. The server decides what each person may see:
 * a cashier only gets their own sales.
 *
 * Everything that depends on the shape of the server's answer is in this file, so a change in the contract
 * (docs/redesign/P3-7-contract.md) touches only here.
 */
const SALES = 'murzak_pos.api.sales_list_api';

// Frappe wraps return values in { message }; these calls answer { success, message, data }.
const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));
const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));

const call = async (method, send) => {
  let response;
  try {
    response = await send(`${SALES}.${method}`);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

const TABS = ['all', 'unpaid', 'returns', 'sessions'];
const ZERO = { sold: 0, unpaid: 0, returned: 0 };

/**
 * One page of the list. tab is all, unpaid, returns or sessions; period is today, 7d, 30d, month or custom
 * (from and to, as yyyy-mm-dd, are sent only for custom). Resolves to { rows, summary, total, page, pageSize, pages }.
 */
export const listSales = async ({ tab = 'all', period = '30d', from, to, search, cashier, store, page = 1, pageSize = 20 } = {}) => {
  const data = await call('list_sales', (url) =>
    axiosInstance.get(url, {
      params: compact({
        tab: TABS.includes(tab) ? tab : 'all',
        period,
        from_date: period === 'custom' ? from : undefined,
        to_date: period === 'custom' ? to : undefined,
        search,
        cashier,
        store,
        page,
        page_size: pageSize,
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

/** One receipt for the panel. doctype is 'POS Invoice' or 'Sales Invoice'. */
export const getSale = (id, doctype) => call('get_sale', (url) => axiosInstance.get(url, { params: compact({ id, doctype }) }));

/**
 * Takes a payment on an unpaid invoice. mode is cash, mpesa or card; reference is the M-Pesa code when there is one.
 * NOTE: this call is not in the first contract proposal; the receipt panel offers Take payment only when the
 * server says can.take_payment, so it stays hidden until the server supports it.
 */
export const takePayment = ({ id, doctype, amount, mode, reference }) =>
  call('take_payment', (url) => axiosInstance.post(url, compact({ id, doctype, amount, mode, reference })));

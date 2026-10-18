import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The Expenses page of the redesign (ticket P5-1): the choices the form offers, adding an expense, the list of running costs and one
 * receipt photo. There is no older expense call: these are all new. Only an owner or a manager may use them (the server refuses a
 * cashier). The exact shape of every answer is in the back end's docs/redesign/P5-1-contract.md.
 *
 * Everything that depends on the shape of a server answer is in this file, so a change in the contract touches only here.
 */
const EXPENSES = 'murzak_pos.api.expenses_api';

// Frappe wraps return values in { message }; these calls answer { success, data } or { success: false, message, error_type, field }
const body = (response) => response.data?.message ?? response.data;
const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));

/** An error carrying the server's plain sentence, its short code and, when it belongs beside one field, that field */
const failure = (reply, fallback = 'That did not work. Please try again.') => {
  const error = new Error(humanizeMessage(reply?.message, fallback));
  if (reply?.error_type) error.code = reply.error_type;
  if (reply?.field) error.field = reply.field;
  return error;
};

const call = async (method, send) => {
  let response;
  try {
    response = await send(`${EXPENSES}.${method}`);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

const PERIODS = ['today', 'week', '7d', '30d', 'month', 'custom'];

/**
 * What the Add expense form offers. Resolves to
 * { company, today, categories: [{ id, label, group }], paidFrom: [{ key, label, available, reason, modeOfPayment }], limits }.
 * `today` is the shop's date (the latest the form accepts); `reason` says why a paid-from choice cannot be used.
 */
export const getExpenseOptions = async (company) => {
  const data = await call('get_expense_options', (url) => axiosInstance.get(url, { params: compact({ company }) }));
  return {
    company: data.company,
    today: data.today,
    categories: Array.isArray(data.categories) ? data.categories : [],
    paidFrom: (Array.isArray(data.paid_from) ? data.paid_from : []).map((p) => ({ key: p.key, label: p.label, available: Boolean(p.available), reason: p.reason || '', modeOfPayment: p.mode_of_payment || '' })),
    limits: data.limits || {},
  };
};

/**
 * One page of the list. period is today, 7d, 30d, week, month or custom (from and to, as yyyy-mm-dd, are sent only for custom);
 * category is an account id. Resolves to { rows, summary: { total, count, topCategory }, total, page, pageSize, pages, period, spentInList }.
 * `summary` follows the period only, so its total is what Home shows as Running costs for the same days.
 */
export const listExpenses = async ({ period = '30d', from, to, category, search, page = 1, pageSize = 20, company } = {}) => {
  const data = await call('list_expenses', (url) =>
    axiosInstance.get(url, {
      params: compact({
        period: PERIODS.includes(period) ? period : '30d',
        from_date: period === 'custom' ? from : undefined,
        to_date: period === 'custom' ? to : undefined,
        category,
        search,
        page,
        page_size: pageSize,
        company,
      }),
    })
  );
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const size = Number(data.page_size) || pageSize;
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : rows.length;
  const summary = data.summary || {};
  return {
    rows,
    summary: { total: Number(summary.total) || 0, count: Number(summary.count) || 0, topCategory: summary.top_category || null },
    total,
    page: Number(data.page) || page,
    pageSize: size,
    pages: Number(data.pages) || Math.max(1, Math.ceil(total / size)),
    period: data.period || null,
    spentInList: Number(data.spent_in_list) || 0,
  };
};

/**
 * Adds an expense: ONE entry in the books, with the optional receipt photo saved in the same step, so nothing is left half done.
 *   amount     whole shillings (digits)          category   an account id from getExpenseOptions
 *   paidFrom   cash, mpesa or bank               date       yyyy-mm-dd (today or earlier)
 *   note       up to 140 characters (optional)   receipt    a data URL of a picture of at most 5 MB (optional)
 *   requestId  one value per form, kept for a retry: a repeat with the same value changes nothing and returns the first expense
 * Resolves to { expense, repeat }. A refusal is an Error with .code and, when it belongs beside one field, .field
 * (amount, category, paid_from, date, note or receipt).
 */
export const createExpense = async ({ amount, category, paidFrom, date, note, receipt, company, requestId }) => {
  const data = await call('create_expense', (url) => axiosInstance.post(url, compact({ amount, category, paid_from: paidFrom, date, note, receipt, company, request_id: requestId })));
  return { expense: data.expense, repeat: Boolean(data.repeat) };
};

/** The receipt photo of an expense made on the Expenses page, as { dataUrl, contentType, size } ready to show in an image */
export const getReceipt = async (expense) => {
  const data = await call('get_receipt', (url) => axiosInstance.get(url, { params: compact({ expense }) }));
  return { dataUrl: data.data_url, contentType: data.content_type, size: Number(data.size) || 0 };
};

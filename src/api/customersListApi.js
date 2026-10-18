import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The Customers page of the redesign (ticket P4-7). Two groups of calls:
 *
 *   new   customers_list_api: the list with its Owing tab, the panel, the statement and the form options. The server decides
 *         what each person may see: a cashier gets no balances, no Owing tab and no statement.
 *         The exact shape is in the back end's docs/redesign/P4-7-contract.md.
 *   old   customer_api and loyalty, unchanged: adding and editing a customer, credit limits and their history, and the loyalty
 *         actions (assign a programme, redeem points, balance, history). The new page calls them as they are.
 *
 * Everything that depends on the shape of a server answer is in this file, so a change in the contract touches only here.
 */
const LIST = 'murzak_pos.api.customers_list_api';
const CUSTOMER = 'murzak_pos.api.customer_api';
const LOYALTY = 'murzak_pos.api.loyalty';

// Frappe wraps return values in { message }
const body = (response) => response.data?.message ?? response.data;
const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));

const failure = (reply, fallback = 'That did not work. Please try again.') => {
  const error = new Error(humanizeMessage(reply?.message, fallback));
  if (reply?.error_type) error.code = reply.error_type;
  return error;
};

/** Sends a request and gives back the reply object; network trouble and refusals become plain messages */
const send = async (request) => {
  let response;
  try {
    response = await request();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  return body(response);
};

/** The new calls: { success, data } */
const callData = async (method, request) => {
  const reply = await send(() => request(`${LIST}.${method}`));
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

/** The old customer calls: { success, message, data } */
const callCustomer = async (method, request, fallback) => {
  const reply = await send(() => request(`${CUSTOMER}.${method}`));
  if (!reply || reply.success === false) throw failure(reply, fallback);
  return reply.data === undefined ? reply : reply.data;
};

/** The loyalty calls: { status: 'success' | 'failure', message, ... } */
const callLoyalty = async (method, request, fallback) => {
  const reply = await send(() => request(`${LOYALTY}.${method}`));
  if (!reply || reply.status === 'failure' || reply.success === false) throw failure(reply, fallback);
  return reply;
};

const TABS = ['all', 'owing'];
const TYPES = ['Individual', 'Company', 'Partnership'];

// ---------- The list, the panel and the statement ----------

/**
 * One page of customers. tab is all or owing; type is Individual, Company or Partnership; status is active, disabled or all.
 * Resolves to { rows, summary, total, page, pageSize, pages }. The balance fields are absent for a cashier.
 */
export const listCustomers = async ({ tab = 'all', search, type, status, page = 1, pageSize = 20, company } = {}) => {
  const data = await callData('list_customers_overview', (url) =>
    axiosInstance.get(url, {
      params: compact({ tab: TABS.includes(tab) ? tab : 'all', search, customer_type: TYPES.includes(type) ? type : undefined, status, page, page_size: pageSize, company }),
    })
  );
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const size = Number(data.page_size) || pageSize;
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : rows.length;
  return {
    rows,
    summary: data.summary || {},
    total,
    page: Number(data.page) || page,
    pageSize: size,
    pages: Number(data.pages) || Math.max(1, Math.ceil(total / size)),
  };
};

/** The panel of one customer: facts, last purchase and (owner and manager only) the balance owed */
export const getCustomerOverview = (customer, company) => callData('get_customer_overview', (url) => axiosInstance.get(url, { params: compact({ customer, company }) }));

/** A statement for a period (from and to as yyyy-mm-dd; both optional). Owner and manager only. */
export const getCustomerStatement = ({ customer, from, to, company } = {}) =>
  callData('get_customer_statement', (url) => axiosInstance.get(url, { params: compact({ customer, from_date: from, to_date: to, company }) }));

/** { features: { groups, territories }, groups: [], territories: [] } for the New and Edit forms */
export const getCustomerFormOptions = async (company) => {
  const data = await callData('get_customer_form_options', (url) => axiosInstance.get(url, { params: compact({ company }) }));
  return { features: { groups: false, territories: false, ...(data.features || {}) }, groups: data.groups || [], territories: data.territories || [] };
};

// ---------- Adding and editing a customer (the current calls, unchanged) ----------

const personFields = ({ name, mobile, email, taxId, type, group, territory }) =>
  compact({ customer_name: name, mobile_no: mobile, email_id: email, tax_id: taxId, customer_type: type, customer_group: group, territory });

/** Adds a customer. Resolves to { id, name }. A name already used by this business is an error with code 'duplicate'. */
export const createCustomer = async (values) => {
  const data = await callCustomer('create_customer', (url) => axiosInstance.post(url, compact({ ...personFields(values), company: values.company })), 'The customer could not be saved. Please try again.');
  return { id: data.name, name: data.customer_name || values.name };
};

/** Changes a customer. Empty email, PIN or mobile are sent as empty text so they can be cleared. */
export const updateCustomer = async ({ id, company, disabled, ...values }) => {
  const fields = personFields(values);
  ['email_id', 'tax_id', 'mobile_no'].forEach((key) => {
    const field = { email_id: 'email', tax_id: 'taxId', mobile_no: 'mobile' }[key];
    if (values[field] === '') fields[key] = '';
  });
  const payload = { name: id, ...fields, ...(disabled === undefined ? {} : { disabled }), ...(company ? { company } : {}) };
  await callCustomer('update_customer', (url) => axiosInstance.post(url, payload), 'The customer could not be saved. Please try again.');
  return { id };
};

// ---------- Credit (the current calls, unchanged) ----------

/** The credit limit, what is owed and what is left, for one business: { limit, effective, owed, available, source, over } */
export const getCreditLimit = async (customer, company) => {
  const data = await callCustomer('get_customer_credit_limit', (url) => axiosInstance.get(url, { params: compact({ customer, company }) }), 'The credit limit could not be loaded.');
  const row = Array.isArray(data.credit_limits) ? data.credit_limits[0] : data.credit_limits;
  const info = row || {};
  return {
    limit: Number(info.credit_limit) || 0,
    effective: Number(info.effective_credit_limit) || 0,
    owed: Number(info.outstanding_amount) || 0,
    available: Number(info.available_credit) || 0,
    source: info.limit_source || '',
    over: Boolean(info.is_over_limit),
    bypass: Boolean(info.bypass_credit_limit_check),
  };
};

/** Sets the customer's own credit limit (0 means no limit is enforced) */
export const setCreditLimit = ({ customer, company, limit }) =>
  callCustomer('set_customer_credit_limit', (url) => axiosInstance.post(url, { customer, company, credit_limit: Number(limit) }), 'The credit limit could not be saved.');

/** Takes away the customer's own credit limit, so the group or business default applies */
export const removeCreditLimit = ({ customer, company }) =>
  callCustomer('remove_customer_credit_limit', (url) => axiosInstance.post(url, { customer, company }), 'The credit limit could not be removed.');

/** Credit history, newest first: resolves to { rows, total } with the rows as the server gives them (voucher_no, voucher_type, posting_date, amount, outstanding_amount, status) */
export const getCreditHistory = async ({ customer, company, from, to, limit = 50, offset = 0 } = {}) => {
  const data = await callCustomer(
    'get_customer_credit_history',
    (url) => axiosInstance.get(url, { params: compact({ customer, company, from_date: from, to_date: to, limit, offset }) }),
    'The credit history could not be loaded.'
  );
  return { rows: Array.isArray(data.transactions) ? data.transactions : [], total: Number(data.total_count) || 0 };
};

// ---------- Loyalty (the current calls, unchanged) ----------

/** The loyalty programmes of the business: [{ name, title, type, from, to, active }] */
export const listLoyaltyPrograms = async (company, today = new Date().toISOString().slice(0, 10)) => {
  const reply = await callLoyalty('list_loyalty_programs', (url) => axiosInstance.get(url, { params: compact({ company }) }), 'The loyalty programmes could not be loaded.');
  return (reply.programs || []).map((p) => ({
    name: p.name,
    title: p.loyalty_program_name || p.name,
    type: p.loyalty_program_type || '',
    from: p.from_date || '',
    to: p.to_date || '',
    active: !p.to_date || String(p.to_date) >= today,
  }));
};

/** Puts the customer on a programme (owner or the roles allowed to manage loyalty) */
export const assignLoyaltyProgram = ({ customer, program, company }) =>
  callLoyalty('assign_loyalty_program', (url) => axiosInstance.post(url, compact({ customer_id: customer, loyalty_program_name: program, company })), 'The programme could not be assigned.');

/** Points the customer has, and the last few movements: { points, recent } */
export const getLoyaltyBalance = async (customer, company, limit = 5) => {
  const reply = await callLoyalty('get_loyalty_balance', (url) => axiosInstance.get(url, { params: compact({ customer_id: customer, company, limit }) }), 'The points balance could not be loaded.');
  return { points: Number(reply.points_balance) || 0, recent: reply.recent_transactions || [] };
};

/** Uses up points (a whole number above zero). Resolves to { redeemed, remaining }. */
export const redeemPoints = async ({ customer, points, reference, company }) => {
  const reply = await callLoyalty(
    'redeem_points',
    (url) => axiosInstance.post(url, compact({ customer_id: customer, points_to_redeem: Number(points), reference_document: reference, company })),
    'The points could not be redeemed.'
  );
  return { redeemed: Number(reply.redeemed_points) || Number(points), remaining: Number(reply.remaining_points) || 0 };
};

/** Points history, newest first: resolves to { rows, total, pages } (date, transaction_type, points_earned, purchase_amount, reference_document) */
export const getPointsHistory = async ({ customer, company, from, to, type, page = 1, limit = 20 } = {}) => {
  const reply = await callLoyalty(
    'get_points_history',
    (url) => axiosInstance.get(url, { params: compact({ customer_id: customer, company, start_date: from, end_date: to, transaction_type: type, page, limit }) }),
    'The points history could not be loaded.'
  );
  const paging = reply.pagination || {};
  return { rows: reply.transactions || [], total: Number(paging.total_records) || 0, pages: Number(paging.total_pages) || 1 };
};

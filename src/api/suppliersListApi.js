import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The Suppliers page of the redesign (ticket P4-6). Two groups of calls:
 *
 *   new   suppliers_list_api: the list with its Owed filter, and the supplier panel. The server decides what each person may see:
 *         a cashier gets no owed amounts, no next bill due and no Owed filter. The exact shape is in the back end's
 *         docs/redesign/P4-6-contract.md.
 *   old   supplier_api, unchanged: adding and editing a supplier, and the supplier groups. The new page calls them as they are.
 *
 * Everything that depends on the shape of a server answer is in this file, so a change in the contract touches only here.
 */
const LIST = 'murzak_pos.api.suppliers_list_api';
const SUPPLIER = 'murzak_pos.api.supplier_api';

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
    const wrapped = new Error(friendlyErrorMessage(error));
    // A name already used by this business comes back as a refusal; the form shows it beside the name
    if (/already exists/i.test(wrapped.message)) wrapped.code = 'duplicate';
    throw wrapped;
  }
  return body(response);
};

/** The new calls: { success, data } */
const callData = async (method, request) => {
  const reply = await send(() => request(`${LIST}.${method}`));
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

/** The old supplier calls: { success, message, ... } */
const callSupplier = async (method, request, fallback) => {
  const reply = await send(() => request(`${SUPPLIER}.${method}`));
  if (!reply || reply.success === false) throw failure(reply, fallback);
  return reply;
};

const STATUSES = ['active', 'disabled', 'all'];

// ---------- The list and the panel ----------

/**
 * One page of suppliers. owed (true) lists only the suppliers the shop owes; group is a supplier group; status is active, disabled or all.
 * Resolves to { rows, summary, total, page, pageSize, pages }. The money fields are absent for a cashier.
 */
export const listSuppliers = async ({ owed = false, search, group, status, page = 1, pageSize = 20, company } = {}) => {
  const data = await callData('list_suppliers_overview', (url) =>
    axiosInstance.get(url, {
      params: compact({ owed: owed ? 1 : undefined, search, supplier_group: group, status: STATUSES.includes(status) ? status : undefined, page, page_size: pageSize, company }),
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

/** The panel of one supplier: facts and (owner and manager only) what is owed, the next bill due and the unpaid bills */
export const getSupplierOverview = (supplier, company) => callData('get_supplier_overview', (url) => axiosInstance.get(url, { params: compact({ supplier, company }) }));

// ---------- Supplier groups (the current call, unchanged) ----------

/** The groups a supplier can be put in: [{ value, label }] (the folders that only hold other groups are left out) */
export const listSupplierGroups = async () => {
  const reply = await callSupplier('get_supplier_groups', (url) => axiosInstance.get(url, { params: { limit: 200 } }), 'The supplier groups could not be loaded.');
  return (Array.isArray(reply.data) ? reply.data : []).filter((g) => !g.is_group).map((g) => ({ value: g.name, label: g.supplier_group_name || g.name }));
};

// ---------- Adding and editing a supplier (the current calls, unchanged) ----------

/** Adds a supplier. Resolves to { id, name }. A name already used by this business is an error with code 'duplicate'. */
export const createSupplier = async ({ name, type, group, taxId, country, currency, internal, company }) => {
  const reply = await callSupplier(
    'create_supplier',
    (url) =>
      axiosInstance.post(
        url,
        compact({ supplier_name: name, supplier_type: type, supplier_group: group, tax_id: taxId, country, default_currency: currency, is_internal_supplier: internal ? 1 : 0, company })
      ),
    'The supplier could not be saved. Please try again.'
  );
  return { id: reply.name, name: reply.supplier_name || name };
};

/**
 * Changes a supplier (the name, group, tax ID, country, currency and whether it is disabled; the server does not change the type
 * or the internal flag of an existing supplier). An empty tax ID is sent as empty text so it can be cleared.
 */
export const updateSupplier = async ({ id, name, group, taxId, country, currency, disabled }) => {
  const payload = {
    name: id,
    ...compact({ supplier_name: name, supplier_group: group, country, default_currency: currency }),
    ...(taxId === undefined ? {} : { tax_id: taxId }),
    ...(disabled === undefined ? {} : { disabled: disabled ? 1 : 0 }),
  };
  await callSupplier('update_supplier', (url) => axiosInstance.post(url, payload), 'The supplier could not be saved. Please try again.');
  return { id };
};

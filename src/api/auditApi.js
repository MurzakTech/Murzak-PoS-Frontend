import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * Audit trail: who did what, and when, in this business.
 * The server limits results to the business's own staff and to owners,
 * Accounts Managers and Auditors.
 */

const AUDIT = 'techsavanna_pos.api.audit_api';

// Frappe wraps return values in { message }. Our endpoints answer { success, data, ... }.
const get = async (method, params) => {
  let response;
  try {
    response = await axiosInstance.get(`${AUDIT}.${method}`, { params });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const body = response.data?.message ?? response.data;
  if (!body || body.success === false) {
    throw new Error(humanizeMessage(body?.message, 'The audit trail could not be loaded.'));
  }
  return body;
};

// Drops empty filters so the server applies only the ones the user set.
export const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const listAuditEvents = async (params) => {
  const body = await get('list_audit_events', cleanParams(params));
  return { events: body.data || [], hasMore: Boolean(body.has_more) };
};

export const getAuditFilterOptions = async (company) => {
  const body = await get('get_audit_filter_options', cleanParams({ company }));
  return body.data || { users: [], modules: [], doctypes: [], actions: [] };
};

import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';
import { isConnectionProblem } from '../utils/offlineSales';

const SALES = 'techsavanna_pos.api.sales_api';

const post = async (method, payload) => {
  try {
    // A refusal is an answer we handle here, not a pop-up
    const response = await axiosInstance.post(`${SALES}.${method}`, payload, { allowRefusal: true });
    const body = response.data?.message ?? response.data;
    if (body && body.success === false) {
      return {
        ok: false,
        connection: false,
        raw: String(body.message || ''),
        message: humanizeMessage(body.message, 'The server refused this sale.'),
      };
    }
    return { ok: true, invoice: body?.data || body };
  } catch (error) {
    const message = friendlyErrorMessage(error);
    // No reply at all (offline, timeout): try again later. A reply with an error: flag it.
    const connection = !error.response || isConnectionProblem(message);
    const raw = String(error.response?.data?.message?.message || error.rawMessage || error.message || '');
    return { ok: false, connection, raw, message };
  }
};

/**
 * Upload one sale that was made offline. Businesses set to record till sales as
 * Sales Invoices get the same fallback the till uses online.
 */
export const sendQueuedSale = async (payload) => {
  const reply = await post('create_pos_invoice', payload);
  if (!reply.ok && !reply.connection && /Sales Invoice mode|create Sales Invoice instead/i.test(`${reply.raw} ${reply.message}`)) {
    return post('create_sales_invoice', { ...payload, is_pos: 1 });
  }
  return reply;
};

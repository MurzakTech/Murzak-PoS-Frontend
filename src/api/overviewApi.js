import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The numbers behind the redesigned Home (ticket P2-1). One call returns the hero band, the four tiles, the four
 * charts and the Needs attention list. The server decides what each role may see: a cashier's answer simply has no
 * Net profit, Money owed or profit figures, and only that person's own sales.
 *
 * The exact shape is in docs/redesign/P2-1-overview-contract.md.
 */
const OVERVIEW = 'murzak_pos.api.dashboard_overview';

// Frappe wraps return values in { message }; these calls answer { success, message, data }.
const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));

const compact = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));

/** period is today, 7d, 30d, month or custom; custom needs from and to as yyyy-mm-dd */
export const getOverview = async ({ period = '30d', from, to, store, staff } = {}) => {
  let response;
  try {
    response = await axiosInstance.get(`${OVERVIEW}.get_overview`, {
      params: compact({ period, from_date: period === 'custom' ? from : undefined, to_date: period === 'custom' ? to : undefined, store, staff }),
    });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

/** The products that sold in the period but have no cost price, for the "Add the costs" list (owner and manager only) */
export const getProductsWithoutCost = async ({ from, to, limit = 50 } = {}) => {
  let response;
  try {
    response = await axiosInstance.get(`${OVERVIEW}.get_products_without_cost`, { params: compact({ from_date: from, to_date: to, limit }) });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false) throw failure(reply);
  return Array.isArray(reply.data) ? reply.data : reply.data?.products || [];
};

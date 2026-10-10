import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * Expiry alerts: stock that has expired or will expire soon, for this business.
 * The server combines batch expiry dates with the dates entered when stock was loaded.
 */

const EXPIRY = 'techsavanna_pos.api.expiry_api';

export const getExpiryAlerts = async ({ company, days = 30, warehouse, includeExpired = true } = {}) => {
  const params = { days, include_expired: includeExpired ? 1 : 0 };
  if (company) params.company = company;
  if (warehouse) params.warehouse = warehouse;

  let response;
  try {
    response = await axiosInstance.get(`${EXPIRY}.get_expiry_alerts`, { params });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  // Frappe wraps return values in { message }. Our endpoint answers { success, data, summary }.
  const body = response.data?.message ?? response.data;
  if (!body || body.success === false) {
    throw new Error(humanizeMessage(body?.message, 'Expiry alerts could not be loaded.'));
  }
  return {
    alerts: body.data || [],
    summary: body.summary || { by_status: [], total_lines: 0, value_at_risk: 0 },
    days: body.days || days,
  };
};

import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The shop type (Settings > Business). The server (shop_type_api) answers { success, data: { company, current, current_label,
 * options: [{ value, label, description }], can_change, next_change_on, next_change_text } }.
 * Reading resolves to that data, or null when it cannot be read; saving throws an Error with a plain sentence.
 */
const BASE = 'murzak_pos.api.shop_type_api';

const bodyOf = (response) => response.data?.message ?? response.data;

export const getShopType = async (company) => {
  try {
    const response = await axiosInstance.get(`${BASE}.get_shop_type`, { params: company ? { company } : {} });
    const body = bodyOf(response);
    if (!body || body.success === false || !body.data || !Array.isArray(body.data.options)) return null;
    return body.data;
  } catch (error) {
    return null;
  }
};

export const setShopType = async ({ industry, company }) => {
  let response;
  try {
    response = await axiosInstance.post(`${BASE}.set_shop_type`, company ? { industry, company } : { industry });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const body = bodyOf(response);
  if (!body || body.success === false || body.error) throw new Error(humanizeMessage(body && (body.message || body.error), 'The shop type could not be saved.'));
  return body.data || null;
};

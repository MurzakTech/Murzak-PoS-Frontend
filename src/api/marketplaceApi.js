import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * What a business can buy for its shop from inside the POS (backend: marketplace_api.py). The list and the prices come
 * from the Murzak website, which also takes the payment; this only reads them.
 */
const MARKET = 'murzak_pos.api.marketplace_api';

const list = (value) => (Array.isArray(value) ? value : []);
const number = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** { groups: [{ key, items: [{ id, name, monthly, setup, checkoutUrl }] }] }. Throws an Error with a sentence an owner can act on. */
export const getMarketplace = async () => {
  let response;
  try {
    response = await axiosInstance.get(`${MARKET}.get_marketplace`);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = response.data?.message ?? response.data;
  if (!reply || reply.success === false) throw new Error(humanizeMessage(reply?.message, 'The marketplace could not be loaded.'));
  return {
    groups: list(reply.data?.groups).map((group) => ({
      key: String(group.key || ''),
      items: list(group.items).map((item) => ({
        id: String(item.id || ''),
        name: String(item.name || ''),
        monthly: number(item.monthly),
        setup: number(item.setup),
        checkoutUrl: String(item.checkout_url || ''),
      })),
    })),
  };
};

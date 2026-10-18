import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * Which kind of person is signed in: owner, manager or cashier, and what they may see.
 * The server decides (murzak_pos.api.role_tiers); the screens only use the answer to choose what to draw. The
 * server checks every protected call itself, so a number hidden here is also refused there.
 */
const ROLE_TIERS = 'murzak_pos.api.role_tiers';

const body = (response) => response.data?.message ?? response.data;

/** Resolves to { tier: 'owner' | 'manager' | 'cashier', can: { profit, cost_of_goods, money_owed, all_sales, team } } */
export const getMyAccess = async () => {
  let response;
  try {
    response = await axiosInstance.get(`${ROLE_TIERS}.get_my_access`);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false) throw new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));
  const { tier, can } = reply.data || {};
  if (!['owner', 'manager', 'cashier'].includes(tier)) throw new Error('That did not work. Please try again.');
  return { tier, can: can || {} };
};

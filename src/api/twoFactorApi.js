import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * Two-step sign-in with an authenticator app (Google Authenticator, Microsoft
 * Authenticator and similar). Each person manages it for their own account.
 */

const TWO_FACTOR = 'techsavanna_pos.api.two_factor_api';

// Frappe wraps return values in { message }; these endpoints answer { success, message, data }.
const call = async (method, data, { get = false } = {}) => {
  let response;
  try {
    response = get
      ? await axiosInstance.get(`${TWO_FACTOR}.${method}`)
      // A wrong code is an expected answer here, shown on the form, not a failure pop-up
      : await axiosInstance.post(`${TWO_FACTOR}.${method}`, data || {}, { allowRefusal: true });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const body = response.data?.message ?? response.data;
  if (!body || body.success === false) {
    throw new Error(humanizeMessage(body?.message, 'That did not work. Please try again.'));
  }
  return body;
};

export const getTwoFactorStatus = async () => Boolean((await call('get_two_factor_status', null, { get: true })).data?.enabled);
export const startTwoFactorSetup = async () => (await call('start_two_factor_setup')).data;
export const confirmTwoFactorSetup = (otp) => call('confirm_two_factor_setup', { otp });
export const disableTwoFactor = (otp) => call('disable_two_factor', { otp });

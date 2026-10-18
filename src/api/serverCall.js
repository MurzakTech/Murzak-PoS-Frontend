import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * One way to call a server method and read its answer.
 *
 * Frappe wraps return values in { message }. The calls of this app answer { success, message, data }.
 * A refusal (success: false) becomes an Error carrying a plain message, with the server's whole reply kept
 * on `error.body` for the few screens that need it.
 */
export const callServer = async (method, data = {}, { get = false, fallback = 'The request could not be completed.' } = {}) => {
  let response;
  try {
    response = get
      ? await axiosInstance.get(method, { params: cleanParams(data) })
      : await axiosInstance.post(method, data);
  } catch (error) {
    const err = new Error(friendlyErrorMessage(error));
    // The shared client turns a { success: false } reply to an action into an error; keep the reply
    if (error.isRefusal) err.body = error.response?.data?.message ?? error.response?.data;
    throw err;
  }
  const body = response.data?.message ?? response.data;
  if (!body || body.success === false) {
    const err = new Error(humanizeMessage(body?.message, fallback));
    err.body = body;
    throw err;
  }
  return body;
};

// Leave out empty filters so the server applies only the ones the person set.
export const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined));

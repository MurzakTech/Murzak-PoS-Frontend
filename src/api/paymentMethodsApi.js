import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The payment method switches (ticket P3-1): which ways of taking money the till offers. Owners change them in Settings;
 * the till reads the resulting list when it opens. The exact shape is in the back end's docs/redesign/P3-1-contract.md.
 */
const METHODS = 'murzak_pos.api.payment_methods_api';

const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));

const unwrap = (response) => {
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

const companyParams = (company) => (company ? { params: { company } } : undefined);

// Only the network call is wrapped, so a refusal from the server keeps its own plain sentence
const send = async (call) => {
  try {
    return await call();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
};

/** { company, methods: [{ key, label, enabled, available, modes, needs_code }], other: [{ mode, label, enabled, available }] } */
export const getPaymentMethods = async (company) => unwrap(await send(() => axiosInstance.get(`${METHODS}.get_payment_methods`, companyParams(company))));

/** Switch one method on or off; `mode` names the method when key is 'other'. Resolves to the new list (same shape as get). */
export const setPaymentMethod = async ({ key, enabled, mode, company }) =>
  // A refusal (such as "at least one way of taking money must stay on") is shown beside the switch, not as a pop-up
  unwrap(await send(() => axiosInstance.post(`${METHODS}.set_payment_method`, { key, enabled: Boolean(enabled), ...(mode ? { mode } : {}), ...(company ? { company } : {}) }, { allowRefusal: true })));

/** The Mode of Payment names the till should offer, in order. An empty list means "keep the till's own list". */
export const getTillPaymentModes = async (company) => {
  const data = unwrap(await send(() => axiosInstance.get(`${METHODS}.get_till_payment_modes`, companyParams(company))));
  return Array.isArray(data.modes) ? data.modes : [];
};

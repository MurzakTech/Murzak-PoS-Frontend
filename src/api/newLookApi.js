import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The New look switch: whether this business sees the redesigned screens.
 * It is kept on the server, one setting per business, and is off until an owner turns it on.
 * Anyone signed in may read it; only an owner may change it (the server checks).
 */

const NEW_LOOK = 'murzak_pos.api.new_look_api';

// Frappe wraps return values in { message }; these calls answer { success, message, data }.
const body = (response) => response.data?.message ?? response.data;

const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));

/** True when the New look is on for the business. The company is optional: the server knows who is asking. */
export const getNewLook = async (company) => {
  let response;
  try {
    response = await axiosInstance.get(`${NEW_LOOK}.get_new_look`, company ? { params: { company } } : undefined);
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false) throw failure(reply);
  return reply.data?.enabled === true;
};

/** Turn the New look on or off for the business. Resolves to the new state. */
export const setNewLook = async (enabled, company) => {
  let response;
  try {
    // A refusal (for example "only an owner can do this") is shown on the page, not as a pop-up
    response = await axiosInstance.post(
      `${NEW_LOOK}.set_new_look`,
      { enabled: Boolean(enabled), ...(company ? { company } : {}) },
      { allowRefusal: true }
    );
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false) throw failure(reply);
  return reply.data?.enabled === true;
};

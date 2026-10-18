import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * Whether eTIMS (the KRA tax link) is on, for Settings, Tax (ticket P5-3). It reads the same server call the current
 * eTIMS screen reads (onboarding_api.get_etims_settings). The server never sends keys or passwords with it, and this
 * client keeps only three yes or no facts, so nothing secret can reach the page.
 */
const ONBOARDING = 'murzak_pos.api.onboarding_api';

const bodyOf = (response) => response.data?.message ?? response.data;

/** { found, active, test } from whichever shape the server answered with; found is false when there are no eTIMS settings. */
export const readEtimsStatus = (reply) => {
  const raw = reply && (reply.etims_settings !== undefined ? reply.etims_settings : reply.data && reply.data.etims_settings);
  if (!raw || typeof raw !== 'object') return { found: false, active: false, test: false };
  const yes = (value) => value === true || value === 1 || value === '1';
  return { found: true, active: yes(raw.is_active), test: yes(raw.sandbox) };
};

export const getEtimsStatus = async (company) => {
  let response;
  try {
    response = await axiosInstance.get(`${ONBOARDING}.get_etims_settings`, { params: { company } });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = bodyOf(response);
  if (reply && reply.success === false) throw new Error(humanizeMessage(reply.message, 'The eTIMS status could not be loaded.'));
  return readEtimsStatus(reply);
};

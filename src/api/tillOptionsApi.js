import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The till options of Settings, Till and payments (ticket P5-3): the four switches of the POS profile. These are the same
 * server calls the current Till settings screen uses (onboarding_api.get_pos_profile and update_pos_profile), asked in the
 * same way; nothing about them is changed.
 */
const ONBOARDING = 'murzak_pos.api.onboarding_api';

const bodyOf = (response) => response.data?.message ?? response.data;

/** The switches the page shows, from whichever shape the server answered with. Null when the shop has no till profile. */
export const readProfile = (reply) => {
  const raw = reply && (reply.pos_profile !== undefined ? reply.pos_profile : reply.data && reply.data.pos_profile !== undefined ? reply.data.pos_profile : null);
  if (!raw || typeof raw !== 'object') return null;
  // The current screen treats a missing switch as its usual default
  const flag = (value, fallback) => (value === undefined || value === null ? fallback : Boolean(Number(value)) || value === true);
  return {
    name: String(raw.name || raw.profile_name || ''),
    updateStock: flag(raw.update_stock, true),
    allowDiscountChange: flag(raw.allow_discount_change, true),
    allowRateChange: flag(raw.allow_rate_change, true),
    allowPartialPayment: flag(raw.allow_partial_payment, false),
  };
};

export const getPosProfile = async (company) => {
  let response;
  try {
    response = await axiosInstance.get(`${ONBOARDING}.get_pos_profile`, { params: { company } });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = bodyOf(response);
  if (reply && reply.success === false) throw new Error(humanizeMessage(reply.message, 'The till options could not be loaded.'));
  return readProfile(reply);
};

/** Save the four switches (the whole set, as the current screen does). Resolves to the profile that was sent. */
export const updatePosProfile = async ({ company, profile }) => {
  let response;
  try {
    response = await axiosInstance.post(
      `${ONBOARDING}.update_pos_profile`,
      {
        name: profile.name,
        company,
        profile_name: profile.name,
        update_stock: profile.updateStock,
        allow_discount_change: profile.allowDiscountChange,
        allow_rate_change: profile.allowRateChange,
        allow_partial_payment: profile.allowPartialPayment,
      },
      { allowRefusal: true }
    );
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = bodyOf(response);
  if (reply && reply.success === false) throw new Error(humanizeMessage(reply.message, 'The till options could not be saved.'));
  return profile;
};

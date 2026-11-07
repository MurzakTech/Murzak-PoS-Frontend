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

/**
 * The eTIMS details the owner may see and change (Settings, Tax): the PIN and branch the Kenya tax app holds (read only here), the
 * device serial number, and the two switches. The server never sends keys or passwords, so none are here.
 * Resolves to null when the business has no eTIMS settings yet.
 */
export const readEtimsDetails = (reply) => {
  const raw = reply && (reply.etims_settings !== undefined ? reply.etims_settings : reply.data && reply.data.etims_settings);
  if (!raw || typeof raw !== 'object') return null;
  const yes = (value) => value === true || value === 1 || value === '1';
  return {
    name: String(raw.name || ''),
    pin: String(raw.tin || ''),
    branch: String(raw.bhfid || ''),
    deviceSerial: String(raw.dvcsrlno || ''),
    active: yes(raw.is_active),
    test: yes(raw.sandbox),
  };
};

export const getEtimsDetails = async (company) => {
  let response;
  try {
    response = await axiosInstance.get(`${ONBOARDING}.get_etims_settings`, { params: { company } });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = bodyOf(response);
  if (reply && reply.success === false) throw new Error(humanizeMessage(reply.message, 'The eTIMS settings could not be loaded.'));
  return readEtimsDetails(reply);
};

/** Saves the device serial number and the two switches. Resolves to { details, changed, message }. */
export const saveEtimsDetails = async ({ company, name, deviceSerial, test, active }) => {
  let response;
  try {
    response = await axiosInstance.post(`${ONBOARDING}.update_etims_settings`, {
      company,
      name,
      dvcsrlno: deviceSerial,
      sandbox: test ? 1 : 0,
      is_active: active ? 1 : 0,
    });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = bodyOf(response);
  if (reply && reply.success === false) throw new Error(humanizeMessage(reply.message, 'The eTIMS settings could not be saved.'));
  return { details: readEtimsDetails(reply), changed: (reply && reply.changed) || [], message: (reply && reply.message) || '' };
};

import axiosInstance from './axiosInstance';

/**
 * Setup health (Settings > Business): a read-only list of whether the shop is ready to sell, receive stock and take payments.
 * The server (setup_health_api.get_setup_health) answers { success, data: { company, checks, summary, ok } } where each check is
 * { id, title, status: 'green' | 'amber' | 'red', detail, where }. Resolves to that data, or null when it cannot be read: the
 * page treats a missing answer as "nothing to show" rather than an error, because this is an extra, not a requirement.
 */
const METHOD = 'murzak_pos.api.setup_health_api.get_setup_health';

export const getSetupHealth = async (company) => {
  try {
    const response = await axiosInstance.get(METHOD, { params: company ? { company } : {} });
    const body = response.data?.message ?? response.data;
    if (!body || body.success === false || !body.data || !Array.isArray(body.data.checks)) return null;
    return body.data;
  } catch (error) {
    return null;
  }
};

const EXPORT_METHOD = 'murzak_pos.api.settings_export_api.export_settings';

/** The shop's settings as one secret-free document (owners only). Throws an Error with a plain sentence when it cannot be read. */
export const exportSettings = async (company) => {
  let response;
  try {
    response = await axiosInstance.get(EXPORT_METHOD, { params: company ? { company } : {} });
  } catch (error) {
    throw new Error('We could not get your settings. Check your connection and try again.');
  }
  const body = response.data?.message ?? response.data;
  if (!body || body.success === false || !body.data) throw new Error('We could not get your settings. Please try again.');
  return body.data;
};

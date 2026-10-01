import axiosInstance from './axiosInstance';

const API_BASE = 'techsavanna_pos.api.account_provisioning_api';

// Helper function to extract data from nested message response
const extractResponseData = (response) => {
  // API returns data wrapped in message object based on documentation
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};

/**
 * Account Provisioning API Client
 * Handles all API calls related to account provisioning
 */
class AccountProvisioningClient {
  /**
   * Get provisional accounting status for a company
   * @param {string} company - Company name
   * @returns {Promise<Object>} API response with status data
   */
  async getStatus(company) {
    const response = await axiosInstance.get(`${API_BASE}.get_provisional_accounting_status`, {
      params: { company },
    });
    return extractResponseData(response);
  }

  /**
   * Set default provisional account
   * @param {string} company - Company name
   * @param {string} account - Account name
   * @param {Object} options - Optional settings
   * @param {boolean} options.autoEnable - Automatically enable provisional accounting
   * @returns {Promise<Object>} API response
   */
  async setDefaultAccount(company, account, options = {}) {
    const response = await axiosInstance.post(`${API_BASE}.set_default_provisional_account`, {
      company,
      account,
      auto_enable_provisional_accounting: options.autoEnable ?? false,
    });
    return extractResponseData(response);
  }

  /**
   * List available provisional accounts
   * @param {string} company - Company name
   * @param {Object} options - Optional filters
   * @param {string} options.accountType - Filter by account type
   * @param {string} options.searchTerm - Search term
   * @param {number} options.limit - Limit results (default: 50)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @returns {Promise<Object>} API response with accounts list
   */
  async listAccounts(company, options = {}) {
    const response = await axiosInstance.get(`${API_BASE}.list_available_provisional_accounts`, {
      params: {
        company,
        account_type: options.accountType,
        search_term: options.searchTerm,
        limit: options.limit ?? 50,
        offset: options.offset ?? 0,
      },
    });
    return extractResponseData(response);
  }

  /**
   * Auto-configure provisional account (Autoprovisioning)
   * @param {string} company - Company name
   * @param {Object} options - Optional settings
   * @param {boolean} options.createAccountIfMissing - Create account if missing (default: false)
   * @param {string} options.accountName - Custom account name
   * @returns {Promise<Object>} API response
   */
  async autoConfigure(company, options = {}) {
    const response = await axiosInstance.post(`${API_BASE}.auto_configure_provisional_account`, {
      company,
      create_account_if_missing: options.createAccountIfMissing ?? false,
      account_name: options.accountName,
    });
    return extractResponseData(response);
  }

  /**
   * Validate provisional accounting setup
   * @param {string} company - Company name
   * @returns {Promise<Object>} API response with validation results
   */
  async validate(company) {
    const response = await axiosInstance.get(`${API_BASE}.validate_provisional_accounting_setup`, {
      params: { company },
    });
    return extractResponseData(response);
  }
}

// Export singleton instance
export const accountProvisioningClient = new AccountProvisioningClient();

// Export class for custom instances if needed
export { AccountProvisioningClient };


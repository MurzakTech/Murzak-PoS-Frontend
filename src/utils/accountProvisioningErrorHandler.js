/**
 * Error Handler Utility for Account Provisioning
 * Maps API error types to user-friendly messages with severity levels
 */

/**
 * Error types from the API
 * @typedef {'company_not_found'|'account_not_found'|'account_company_mismatch'|'group_account_error'|'disabled_account_error'|'missing_provisional_account'|'invalid_provisional_account'|'parent_account_not_found'|'validation_error'|'general_error'} ErrorType
 */

/**
 * Handle account provisioning error and return user-friendly message
 * @param {Object} error - Error object from API
 * @param {ErrorType} error.error_type - Error type from API
 * @param {string} error.message - Error message
 * @param {string} [error.company] - Company name if available
 * @returns {Object} Error information with message, severity, and optional action
 */
export function handleAccountProvisioningError(error) {
  // Extract error type and message
  const errorType = error?.error_type || error?.errorType || 'general_error';
  const errorMessage = error?.message || 'An unexpected error occurred.';

  const errorMessages = {
    company_not_found: {
      message: 'Company not found. Please check the company name.',
      severity: 'error',
    },
    account_not_found: {
      message: 'Account not found. Please select a different account.',
      severity: 'error',
      action: 'Select Account',
    },
    account_company_mismatch: {
      message: 'The selected account belongs to a different company.',
      severity: 'error',
      action: 'Select Account',
    },
    group_account_error: {
      message: 'Group accounts cannot be used. Please select a ledger account.',
      severity: 'error',
      action: 'Select Account',
    },
    disabled_account_error: {
      message: 'The selected account is disabled. Please select an active account.',
      severity: 'error',
      action: 'Select Account',
    },
    missing_provisional_account: {
      message: 'Provisional accounting is enabled but no default account is set.',
      severity: 'warning',
      action: 'Auto-Configure',
    },
    invalid_provisional_account: {
      message: 'The default provisional account no longer exists.',
      severity: 'error',
      action: 'Set Account',
    },
    parent_account_not_found: {
      message: 'Could not find a suitable parent account for creating the provisional account.',
      severity: 'error',
    },
    validation_error: {
      message: `Validation error: ${errorMessage}`,
      severity: 'error',
    },
    general_error: {
      message: errorMessage || 'An unexpected error occurred.',
      severity: 'error',
    },
  };

  return errorMessages[errorType] || errorMessages.general_error;
}

/**
 * Extract error from API response
 * @param {Object} error - Error object from axios or API
 * @returns {Object} Normalized error object
 */
export function extractAccountProvisioningError(error) {
  // Handle axios errors
  if (error.response?.data) {
    const errorData = error.response.data;
    
    // Check for nested message structure
    if (errorData.message && typeof errorData.message === 'object') {
      return {
        error_type: errorData.message.error_type || errorData.message.errorType || 'general_error',
        message: errorData.message.message || errorData.message.error || 'An error occurred',
        company: errorData.message.company,
      };
    }
    
    // Direct error structure
    return {
      error_type: errorData.error_type || errorData.errorType || 'general_error',
      message: errorData.message || errorData.error || 'An error occurred',
      company: errorData.company,
    };
  }
  
  // Handle network errors or other errors
  if (error.message) {
    return {
      error_type: 'general_error',
      message: error.message,
    };
  }
  
  return {
    error_type: 'general_error',
    message: 'An unexpected error occurred.',
  };
}


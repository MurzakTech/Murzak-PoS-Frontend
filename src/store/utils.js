import { friendlyErrorMessage } from '../utils/friendlyError';
// Helper function to extract error message
export const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Helper function to determine notification severity based on HTTP status code
export const getErrorSeverity = (error) => {
  // 409 Conflict should be shown as warning instead of error
  if (error.response?.status === 409) {
    return 'warning';
  }
  return 'error';
};



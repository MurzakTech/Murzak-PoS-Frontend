// Helper function to extract error message
export const extractErrorMessage = (error) => {
  if (error.response?.data) {
    const errorData = error.response.data;
    if (errorData.message) {
      if (typeof errorData.message === 'string') {
        return errorData.message;
      }
      if (typeof errorData.message === 'object' && errorData.message.message) {
        return errorData.message.message;
      }
    }
    if (errorData.exc) {
      return errorData.exc;
    }
    if (errorData.exc_type) {
      return `${errorData.exc_type}: ${errorData.message || 'An error occurred'}`;
    }
    if (errorData._server_messages) {
      try {
        const messages = JSON.parse(errorData._server_messages);
        if (messages[0]?.message) {
          return messages[0].message;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  return error.message || 'An unexpected error occurred';
};

// Helper function to determine notification severity based on HTTP status code
export const getErrorSeverity = (error) => {
  // 409 Conflict should be shown as warning instead of error
  if (error.response?.status === 409) {
    return 'warning';
  }
  return 'error';
};



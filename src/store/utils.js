import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';
// Helper function to extract error message
export const extractErrorMessage = (error) => friendlyErrorMessage(error);

// Helper function to determine notification severity based on HTTP status code
export const getErrorSeverity = (error) => errorSeverity(error);



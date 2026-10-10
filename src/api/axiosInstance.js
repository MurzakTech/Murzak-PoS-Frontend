import axios from 'axios';
import { friendlyErrorMessage } from '../utils/friendlyError';

// Support both variable names for backward compatibility
const API_BASE_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL;

if (!API_BASE_URL) {
  console.error(
    '⚠️ REACT_APP_API_URL or REACT_APP_API_BASE_URL must be set in .env file.\n' +
    'Requests will be made relative to the current origin, which may cause issues.'
  );
} else {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
  console.log('✅ API Base URL:', API_BASE_URL);
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL || '', // Fallback to empty string (relative URLs) if not set
  headers: {
    'Content-Type': 'application/json',
  },
  // Note: withCredentials is disabled to avoid duplicate CORS header issues
  // If server requires credentials, it should be fixed on the server side first
  // withCredentials: true,
});

// Add JWT to every request except login and register
axiosInstance.interceptors.request.use(
  (config) => {
    // Endpoints that must NOT carry an Authorization header: signing in and
    // signing up, where a stale token from a previous session would make
    // Frappe reject the request (an invalid Bearer token is a 401, not Guest).
    //
    // Everything else sends the token when there is one. Guest-callable
    // endpoints such as seed_products still work for a signed-in user, and
    // tenant front doors (<shop>.pos.murzaktech.tech) refuse unauthenticated
    // calls to them, so stripping the token there would break onboarding.
    const publicEndpoints = [
      'techsavanna_pos.api.auth_api.login_user',
      'techsavanna_pos.api.auth_api.register_user',
      'techsavanna_pos.api.password_reset.',
    ];
    
    // Check if this is a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );
    
    // Only add Authorization header for authenticated endpoints
    if (!isPublicEndpoint) {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // Ensure Content-Type is set
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors according to API documentation
// Many server functions report a refusal inside a normal reply:
// { message: { success: false, message: "Only 3 left" } }. Screens that did not check
// the flag treated it as success and showed the refusal in a green "success" pop-up.
// For actions (saving, creating, closing...) such a reply now becomes a failure, shown
// in amber. Lookups (get_, list_, check_...) are left alone: some use success: false
// simply to mean "nothing set up yet".
const READ_FUNCTION = /\.(get|list|check|search|fetch|bulk_get|validate|verify|count)_[\w]*$/;

const refusalIn = (response) => {
  const config = response.config || {};
  const method = (config.method || 'get').toLowerCase();
  if (method === 'get' || config.allowRefusal) return null;
  if (READ_FUNCTION.test(String(config.url || '').split('?')[0])) return null;
  const body = response.data;
  const result = body?.message && typeof body.message === 'object' ? body.message : body;
  return result && typeof result === 'object' && result.success === false ? result : null;
};

axiosInstance.interceptors.response.use(
  (response) => {
    const refusal = refusalIn(response);
    if (refusal) {
      const error = new Error(refusal.message || refusal.error || 'The server could not complete this.');
      error.isAxiosError = true;
      error.isRefusal = true;
      error.config = response.config;
      error.response = response;
      error.rawMessage = error.message;
      error.message = friendlyErrorMessage(error);
      return Promise.reject(error);
    }
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  (error) => {
    // Handle different status codes according to API documentation
    if (error.response) {
      const status = error.response.status;
      
      // 401 Unauthorized - Not authenticated
      if (status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('api_key');
        localStorage.removeItem('api_secret');
        // Only redirect if not on public pages or onboarding page
        const currentPath = window.location.pathname;
        const isPublicPage = currentPath.includes('/login') || 
                            currentPath.includes('/register') || 
                            currentPath === '/';
        const isOnboardingPage = currentPath.includes('/onboarding');
        
        // Don't redirect during onboarding - let the error be displayed
        if (!isPublicPage && !isOnboardingPage) {
          window.location.href = '/login';
        }
      }
      
      // Log error responses in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${status}`, error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received
      // This often indicates a CORS issue
      const errorMessage = error.message || '';
      const isCorsError = errorMessage.includes('CORS') || 
                         errorMessage.includes('Access-Control-Allow-Origin') ||
                         errorMessage.includes('blocked by CORS policy');
      
      if (isCorsError) {
        // Check for duplicate CORS header issue
        const isDuplicateHeaderError = errorMessage.includes('multiple values') && 
                                      errorMessage.includes('Access-Control-Allow-Origin');
        
        if (isDuplicateHeaderError) {
          console.error('❌ CORS Error: Duplicate Access-Control-Allow-Origin headers detected.');
          console.error('This is a server-side configuration issue. The server is sending the');
          console.error('Access-Control-Allow-Origin header multiple times, which browsers reject.');
          console.error('Request URL:', error.config?.url);
          console.error('Request Method:', error.config?.method);
          console.error('Solution: Fix server CORS configuration to send the header only once.');
          console.error('Common causes:');
          console.error('  - Multiple CORS middleware layers');
          console.error('  - Reverse proxy and application both adding headers');
          console.error('  - CORS configured in multiple places');
        } else {
          console.error('❌ CORS Error: The request was blocked by CORS policy.');
          console.error('Request URL:', error.config?.url);
          console.error('Request Method:', error.config?.method);
          console.error('Check server CORS configuration.');
        }
      } else {
        console.error('Network error - No response received:', error.request);
      }
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }

    // Screens that show error.message directly get plain language too; the original stays in rawMessage
    error.rawMessage = error.message;
    error.message = friendlyErrorMessage(error);

    return Promise.reject(error);
  }
);

export default axiosInstance;


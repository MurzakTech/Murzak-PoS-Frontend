/**
 * @deprecated This service is kept for backward compatibility.
 * Please use Redux actions and selectors from '../store/authSlice' instead.
 * 
 * Example:
 * import { useAppDispatch, useAppSelector } from '../store/hooks';
 * import { loginUser, logout, fetchCurrentUser } from '../store/authSlice';
 */

import { store } from '../store/store';
import { 
  loginUser as loginUserAction, 
  registerUser as registerUserAction,
  logout as logoutAction,
  fetchCurrentUser as fetchCurrentUserAction,
} from '../store/authSlice';
import { jwtDecode } from 'jwt-decode';

// Compatibility functions that use Redux store
export const register = async (userData) => {
  const result = await store.dispatch(registerUserAction(userData));
  if (registerUserAction.fulfilled.match(result)) {
    return {
      user: result.payload.user,
      jwt_token: {
        access_token: result.payload.token,
      },
      api_key: result.payload.apiKey,
      api_secret: result.payload.apiSecret,
    };
  }
  throw new Error(result.payload || 'Registration failed');
};

export const login = async (email, password) => {
  const result = await store.dispatch(loginUserAction({ email, password }));
  if (loginUserAction.fulfilled.match(result)) {
    return {
      user: result.payload.user,
      jwt_token: {
        access_token: result.payload.token,
      },
      api_key: result.payload.apiKey,
    };
  }
  throw new Error(result.payload || 'Login failed');
};

export const logout = () => {
  store.dispatch(logoutAction());
  window.location.href = '/login';
};

export const getCurrentUser = () => {
  const state = store.getState();
  return state.auth.user;
};

export const getToken = () => {
  const state = store.getState();
  return state.auth.token || localStorage.getItem('access_token');
};

export const isAuthenticated = () => {
  const state = store.getState();
  return state.auth.isAuthenticated;
};

// Optional: Fetch fresh user data from server (useful after login)
export const fetchCurrentUser = async () => {
  const result = await store.dispatch(fetchCurrentUserAction());
  if (fetchCurrentUserAction.fulfilled.match(result)) {
    return result.payload;
  }
  throw new Error(result.payload || 'Failed to fetch user');
};
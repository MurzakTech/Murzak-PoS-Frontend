import axios from 'axios';
import axiosInstance, { refreshClient, PUBLIC_AUTH_ENDPOINTS, _resetRefreshStateForTest } from './axiosInstance';

jest.mock('../utils/session', () => ({
  clearSession: jest.fn(),
}));

describe('axiosInstance', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    _resetRefreshStateForTest();
    jest.clearAllMocks();
    delete window.location;
    window.location = { pathname: '/dashboard', href: 'http://localhost/dashboard' };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  it('includes refresh_token in public endpoints list', () => {
    expect(PUBLIC_AUTH_ENDPOINTS).toContain('murzak_pos.api.auth_api.refresh_token');
    expect(PUBLIC_AUTH_ENDPOINTS).toContain('murzak_pos.api.auth_api.login_user');
  });

  it('adds Authorization header for authenticated endpoints when access_token exists', async () => {
    localStorage.setItem('access_token', 'valid-jwt-token');

    // Spy on the request interceptor handler directly
    const interceptor = axiosInstance.interceptors.request.handlers[0];
    const config = await interceptor.fulfilled({
      url: 'murzak_pos.api.sales_list_api.get_sales',
      headers: {},
    });

    expect(config.headers.Authorization).toBe('Bearer valid-jwt-token');
    expect(config.headers['Content-Type']).toBe('application/json');
  });

  it('does NOT add Authorization header for public endpoints', async () => {
    localStorage.setItem('access_token', 'stale-token');

    const interceptor = axiosInstance.interceptors.request.handlers[0];
    const config = await interceptor.fulfilled({
      url: 'murzak_pos.api.auth_api.refresh_token',
      headers: {},
    });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('converts action refusals ({ success: false }) to rejected promises', async () => {
    const interceptor = axiosInstance.interceptors.response.handlers[0];
    const response = {
      config: { method: 'post', url: 'murzak_pos.api.till_api.close_shift' },
      data: { message: { success: false, message: 'Shift is already closed' } },
      status: 200,
    };

    await expect(interceptor.fulfilled(response)).rejects.toThrow();
  });

  it('performs silent token refresh on 401 when refresh_token exists', async () => {
    localStorage.setItem('access_token', 'expired-token');
    localStorage.setItem('refresh_token', 'valid-refresh-token');

    // Mock refreshClient.post to return a new access token
    jest.spyOn(refreshClient, 'post').mockResolvedValueOnce({
      data: {
        message: {
          access_token: 'new-fresh-token',
          refresh_token: 'new-refresh-token',
        },
      },
    });

    // Mock axiosInstance call for retried request
    const retrySpy = jest.spyOn(axiosInstance, 'request').mockResolvedValueOnce({
      data: { success: true },
      status: 200,
    });

    const error = {
      config: { url: 'murzak_pos.api.customer_api.get_customer', headers: {} },
      response: { status: 401 },
      message: 'Request failed with status code 401',
    };

    const interceptor = axiosInstance.interceptors.response.handlers[0];
    const result = await interceptor.rejected(error);

    expect(refreshClient.post).toHaveBeenCalledWith(
      'murzak_pos.api.auth_api.refresh_token',
      { refresh_token: 'valid-refresh-token' }
    );
    expect(localStorage.getItem('access_token')).toBe('new-fresh-token');
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
    expect(result.data).toEqual({ success: true });

    retrySpy.mockRestore();
  });

  it('clears session and redirects to /login on 401 when no refresh_token is available', async () => {
    const error = {
      config: { url: 'murzak_pos.api.customer_api.get_customer', headers: {} },
      response: { status: 401 },
      message: 'Unauthorized',
    };

    const interceptor = axiosInstance.interceptors.response.handlers[0];
    await expect(interceptor.rejected(error)).rejects.toThrow();

    const { clearSession } = require('../utils/session');
    expect(clearSession).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });
});

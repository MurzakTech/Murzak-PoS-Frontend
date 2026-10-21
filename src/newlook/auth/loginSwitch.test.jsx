/**
 * Ticket P5-5: src/pages/Login.js shows the redesigned page only when this device's New look flag is on, and the current page
 * otherwise; and both pages send the same requests for the same steps (the sign-in logic is not changed or copied differently).
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import authReducer from '../../store/authSlice';
import onboardingReducer from '../../store/onboardingSlice';
import { ThemeProvider } from '../../theme/ThemeProvider';
import axiosInstance from '../../api/axiosInstance';
import Login from '../../pages/Login';
import { DEVICE_KEY } from './deviceFlag';
import T from './strings.auth';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));
jest.mock('../../realtime/realtimeClient', () => ({ disconnectRealtime: jest.fn() }));

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
const reply = (message) => ({ data: { message } });
const refusal = (status, message) => Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status, data: { message } } });
const SIGNED_IN = reply({ access_token: 'tok-1', refresh_token: 'ref-1', user: { name: 'asha@example.test', email: 'asha@example.test' } });
const PROFILE = reply({ user: { name: 'asha@example.test', email: 'asha@example.test' }, company: { name: 'Demo Shop' }, roles: [] });

const mount = () =>
  render(
    <Provider store={configureStore({ reducer: { auth: authReducer, onboarding: onboardingReducer } })}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

const CURRENT_SUBTITLE = 'Sign in to continue to your dashboard.';

jest.setTimeout(15000);

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

describe('which sign-in page opens', () => {
  test('a device that was never signed in shows the redesigned page, because the New look is the default', () => {
    mount();
    expect(screen.queryByText(CURRENT_SUBTITLE)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: T.signIn.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: T.theme.toDark })).toBeInTheDocument();
  });

  test('the flag off (an owner switched the New look off) shows the current page', () => {
    localStorage.setItem(DEVICE_KEY, '0');
    mount();
    expect(screen.getByText(CURRENT_SUBTITLE)).toBeInTheDocument();
  });

  test('the flag on shows the redesigned page, with the theme toggle', () => {
    localStorage.setItem(DEVICE_KEY, '1');
    mount();
    expect(screen.queryByText(CURRENT_SUBTITLE)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: T.signIn.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: T.theme.toDark })).toBeInTheDocument();
  });

  test('blocked storage shows the redesigned page, the default', () => {
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      mount();
      expect(screen.queryByText(CURRENT_SUBTITLE)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: T.signIn.title })).toBeInTheDocument();
    } finally {
      get.mockRestore();
    }
  });
});

describe('both pages send the same requests', () => {
  const run = async (flag) => {
    jest.resetAllMocks();
    localStorage.clear();
    localStorage.setItem(DEVICE_KEY, flag ? '1' : '0');
    // the code is asked for, then accepted
    axiosInstance.post.mockRejectedValueOnce(refusal(401, { two_factor_required: true, message: 'Enter the code.' }));
    axiosInstance.post.mockResolvedValueOnce(SIGNED_IN);
    axiosInstance.get.mockResolvedValue(PROFILE);
    const view = mount();
    userEvent.type(screen.getByLabelText(/Email or phone number/i), 'asha@example.test');
    userEvent.type(screen.getByLabelText(/^Password/i), 'made-up-secret');
    userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const codeBox = await screen.findByLabelText(/6-digit code|Authenticator code/i);
    userEvent.type(codeBox, '123456');
    userEvent.click(screen.getByRole('button', { name: /Verify and sign in/i }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/'));
    const calls = { post: axiosInstance.post.mock.calls, get: axiosInstance.get.mock.calls };
    view.unmount();
    return calls;
  };

  test('password, then code, then profile, then the dashboard', async () => {
    const current = await run(false);
    const redesigned = await run(true);
    expect(redesigned).toEqual(current);
    expect(redesigned.post).toHaveLength(2);
    expect(redesigned.post[1][1]).toEqual({ email: 'asha@example.test', password: 'made-up-secret', otp: '123456' });
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import authReducer, { isTokenValid } from '../store/authSlice';
import onboardingReducer from '../store/onboardingSlice';
import { ThemeProvider } from '../theme/ThemeProvider';

jest.mock('../pages/Landing', () => ({
  __esModule: true,
  default: () => <div data-testid="landing-page">Marketing Landing</div>,
}));

jest.mock('../newlook/home/HomePage', () => ({
  __esModule: true,
  default: () => <div data-testid="home-page">POS Dashboard Home</div>,
}));

jest.mock('../newlook/NewLookGate', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="nl-gate">{children}</div>,
}));

jest.mock('../newlook/NewLookShellConnected', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="nl-shell">{children}</div>,
}));

// We test RootRoute after mocks are declared
const RootRoute = require('./RootRoute').default;

const Where = () => {
  const { pathname } = useLocation();
  return <div data-testid="current-path">{pathname}</div>;
};

const createMockStore = (authState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      onboarding: onboardingReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...authState,
      },
      onboarding: {
        isCompleted: true,
        isLoading: false,
      },
    },
  });
};

describe('isTokenValid helper', () => {
  test('recognizes opaque Frappe OAuth Bearer tokens as valid', () => {
    expect(isTokenValid('7Bw4kF9xLm3Q1a0Zp2Rt5Vy8Uc6IeO')).toBe(true);
    expect(isTokenValid('abc1234567890')).toBe(true);
  });

  test('rejects empty or excessively short tokens', () => {
    expect(isTokenValid('')).toBe(false);
    expect(isTokenValid(null)).toBe(false);
    expect(isTokenValid(undefined)).toBe(false);
    expect(isTokenValid('   ')).toBe(false);
    expect(isTokenValid('short')).toBe(false);
  });

  test('checks JWT expiration when token has 3 dot-separated segments', () => {
    // Header: {"alg":"none"} -> eyJhbGciOiJub25lIn0
    // Payload with exp in the future (year 2099: 4102444800)
    const futureJwt = 'eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDAsInN1YiI6InVzZXIifQ.sig';
    expect(isTokenValid(futureJwt)).toBe(true);

    // Payload with exp in the past (year 2000: 946684800)
    const expiredJwt = 'eyJhbGciOiJub25lIn0.eyJleHAiOjk0NjY4NDgwMCwic3ViIjoidXNlciJ9.sig';
    expect(isTokenValid(expiredJwt)).toBe(false);
  });
});

describe('RootRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders POS Dashboard when user is authenticated in Redux state', async () => {
    const store = createMockStore({
      isAuthenticated: true,
      token: 'valid-token-12345',
      user: { name: 'cashier@shop.co.ke', company: 'Shop Ltd' },
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
  });

  test('renders POS Dashboard when valid token is in localStorage even before Redux sync', async () => {
    localStorage.setItem('access_token', 'valid-oauth-bearer-token-12345');
    const store = createMockStore({
      isAuthenticated: false,
      token: null,
      user: null,
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
  });

  test('handles unauthenticated visitors appropriately without crashing', async () => {
    const store = createMockStore({
      isAuthenticated: false,
      token: null,
      user: null,
    });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    const element = await screen.findByTestId(/(landing-page|current-path)/);
    expect(element).toBeInTheDocument();
  });
});

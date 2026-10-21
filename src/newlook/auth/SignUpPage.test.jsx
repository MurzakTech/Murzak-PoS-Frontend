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
import SignUpPage from './SignUpPage';
import T from './strings.auth';

jest.mock('../../api/axiosInstance', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));
jest.mock('../../realtime/realtimeClient', () => ({ disconnectRealtime: jest.fn() }));

const reply = (message) => ({ data: { message } });
const refusal = (status, message) =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: { status, data: { message } },
  });

const Where = () => {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
};

const renderPage = ({ entry = '/register', auth } = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer, onboarding: onboardingReducer },
    ...(auth
      ? {
          preloadedState: {
            auth: { ...authReducer(undefined, { type: 'init' }), ...auth },
            onboarding: onboardingReducer(undefined, { type: 'init' }),
          },
        }
      : {}),
  });

  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/register" element={<SignUpPage />} />
            <Route path="/" element={<Where />} />
            <Route path="/login" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

  return store;
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

describe('SignUpPage', () => {
  test('renders all signup fields and title', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: T.signUp.title })).toBeInTheDocument();
    expect(screen.getByLabelText(T.signUp.fullName)).toBeInTheDocument();
    expect(screen.getByLabelText(T.signUp.shopName)).toBeInTheDocument();
    expect(screen.getByLabelText(T.signUp.email)).toBeInTheDocument();
    expect(screen.getByLabelText(T.signUp.phone)).toBeInTheDocument();
    expect(screen.getByLabelText(T.signUp.password)).toBeInTheDocument();
    expect(screen.getByLabelText(T.signUp.confirmPassword)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: T.signUp.submit })).toBeInTheDocument();
  });

  test('validates required fields before sending', async () => {
    renderPage();
    userEvent.click(screen.getByRole('button', { name: T.signUp.submit }));

    await waitFor(() => {
      expect(screen.getByText(T.check.fullNameEmpty)).toBeInTheDocument();
    });
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  test('validates full name must have first and last name', async () => {
    renderPage();
    userEvent.type(screen.getByLabelText(T.signUp.fullName), 'Grace');
    userEvent.type(screen.getByLabelText(T.signUp.shopName), 'Grace Tech');
    userEvent.type(screen.getByLabelText(T.signUp.email), 'grace@example.com');
    userEvent.type(screen.getByLabelText(T.signUp.password), 'Secret123!');
    userEvent.type(screen.getByLabelText(T.signUp.confirmPassword), 'Secret123!');

    userEvent.click(screen.getByRole('button', { name: T.signUp.submit }));

    await waitFor(() => {
      expect(screen.getByText(T.check.fullNameTwoParts)).toBeInTheDocument();
    });
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  test('validates password policy before sending', async () => {
    renderPage();
    userEvent.type(screen.getByLabelText(T.signUp.fullName), 'Grace Hopper');
    userEvent.type(screen.getByLabelText(T.signUp.shopName), 'Grace Tech');
    userEvent.type(screen.getByLabelText(T.signUp.email), 'grace@example.com');
    userEvent.type(screen.getByLabelText(T.signUp.password), 'weakpass');
    userEvent.type(screen.getByLabelText(T.signUp.confirmPassword), 'weakpass');

    userEvent.click(screen.getByRole('button', { name: T.signUp.submit }));

    await waitFor(() => {
      expect(screen.getByText(T.check.passwordComplexity)).toBeInTheDocument();
    });
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  test('validates password match', async () => {
    renderPage();
    userEvent.type(screen.getByLabelText(T.signUp.fullName), 'Grace Hopper');
    userEvent.type(screen.getByLabelText(T.signUp.shopName), 'Grace Tech');
    userEvent.type(screen.getByLabelText(T.signUp.email), 'grace@example.com');
    userEvent.type(screen.getByLabelText(T.signUp.password), 'Secret123!');
    userEvent.type(screen.getByLabelText(T.signUp.confirmPassword), 'Secret456!');

    userEvent.click(screen.getByRole('button', { name: T.signUp.submit }));

    await waitFor(() => {
      expect(screen.getByText(T.check.passwordMismatch)).toBeInTheDocument();
    });
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  test('submits successfully and navigates to home', async () => {
    // 1. auth register
    axiosInstance.post.mockImplementation((url) => {
      if (url.includes('register_user')) {
        return Promise.resolve(
          reply({
            access_token: 'tok-saas-1',
            refresh_token: 'ref-saas-1',
            user: { email: 'grace@example.com', first_name: 'Grace', last_name: 'Hopper' },
          })
        );
      }
      if (url.includes('create_company')) {
        return Promise.resolve(
          reply({
            company: { name: 'Grace Tech', company_name: 'Grace Tech' },
          })
        );
      }
      if (url.includes('create_pos_profile')) {
        return Promise.resolve(reply({ pos_profile: { name: 'Grace Tech POS' } }));
      }
      return Promise.resolve(reply({}));
    });

    axiosInstance.get.mockImplementation((url) => {
      if (url.includes('get_current_user')) {
        return Promise.resolve(
          reply({
            user: { email: 'grace@example.com', company: 'Grace Tech' },
            roles: ['System Manager'],
          })
        );
      }
      return Promise.resolve(reply({}));
    });

    renderPage();

    userEvent.type(screen.getByLabelText(T.signUp.fullName), 'Grace Hopper');
    userEvent.type(screen.getByLabelText(T.signUp.shopName), 'Grace Tech');
    userEvent.type(screen.getByLabelText(T.signUp.email), 'grace@example.com');
    userEvent.type(screen.getByLabelText(T.signUp.phone), '0712345678');
    userEvent.type(screen.getByLabelText(T.signUp.password), 'Secret123!');
    userEvent.type(screen.getByLabelText(T.signUp.confirmPassword), 'Secret123!');

    userEvent.click(screen.getByRole('button', { name: T.signUp.submit }));

    await waitFor(() => {
      expect(screen.getByTestId('where')).toHaveTextContent('/');
    });

    expect(localStorage.getItem('access_token')).toBe('tok-saas-1');
    expect(localStorage.getItem('onboarding_completed')).toBe('true');
  });

  test('displays server error alert when registration is refused', async () => {
    axiosInstance.post.mockRejectedValue(
      refusal(400, 'Email grace@example.com already exists')
    );

    renderPage();

    userEvent.type(screen.getByLabelText(T.signUp.fullName), 'Grace Hopper');
    userEvent.type(screen.getByLabelText(T.signUp.shopName), 'Grace Tech');
    userEvent.type(screen.getByLabelText(T.signUp.email), 'grace@example.com');
    userEvent.type(screen.getByLabelText(T.signUp.password), 'Secret123!');
    userEvent.type(screen.getByLabelText(T.signUp.confirmPassword), 'Secret123!');

    userEvent.click(screen.getByRole('button', { name: T.signUp.submit }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });
});

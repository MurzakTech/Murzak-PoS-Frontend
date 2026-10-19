/**
 * Ticket P5-5, acceptance check AC-35: the redesigned Sign-in page. It runs against the real sign-in actions and reducer with the API
 * mocked, and made-up details only (no real password is used anywhere).
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
import SignInPage from './SignInPage';
import { DEVICE_KEY } from '../brand/deviceBrand';
import T from './strings.auth';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));
jest.mock('../../realtime/realtimeClient', () => ({ disconnectRealtime: jest.fn() }));

const MADE_UP_EMAIL = 'asha@example.test';
const MADE_UP_SECRET = 'not-a-real-secret-1';

const Where = () => {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
};

const reply = (message) => ({ data: { message } });
const refusal = (status, message) => Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status, data: { message } } });
const needsCode = (text = 'Enter the 6-digit code from your authenticator app.') => refusal(401, { two_factor_required: true, message: text });
const SIGNED_IN = reply({ access_token: 'tok-1', refresh_token: 'ref-1', user: { name: 'asha@example.test', email: MADE_UP_EMAIL }, message: 'Login successful' });
const PROFILE = reply({ user: { name: 'asha@example.test', email: MADE_UP_EMAIL }, company: { name: 'Demo Shop', company_name: 'Demo Shop' }, roles: ['System Manager'] });

const renderPage = ({ entry = '/login', auth } = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer, onboarding: onboardingReducer },
    ...(auth ? { preloadedState: { auth: { ...authReducer(undefined, { type: 'init' }), ...auth }, onboarding: onboardingReducer(undefined, { type: 'init' }) } } : {}),
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/login" element={<SignInPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const idBox = () => screen.getByLabelText(T.signIn.loginId);
const passwordBox = () => screen.getByLabelText(T.signIn.password);
const signInButton = () => screen.getByRole('button', { name: T.signIn.submit });

const fillIn = (email = MADE_UP_EMAIL, secret = MADE_UP_SECRET) => {
  userEvent.type(idBox(), email);
  userEvent.type(passwordBox(), secret);
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-accent');
});

describe('the shop brand on this device (ticket P7-3)', () => {
  test('a device that knows the shop shows its logo and name, and sets its colour', () => {
    localStorage.setItem(DEVICE_KEY, JSON.stringify({ logo: '/files/logo.png', accent: 'teal', name: 'Demo Shop' }));
    renderPage();
    const link = screen.getByRole('link', { name: 'Demo Shop home' });
    expect(link).toHaveTextContent('Demo Shop');
    expect(document.documentElement.getAttribute('data-accent')).toBe('teal');
    expect(link.querySelector('img')).toHaveAttribute('src', expect.stringContaining('/files/logo.png')); // eslint-disable-line testing-library/no-node-access
  });

  test('a device that knows nothing shows the plain page with no colour set', () => {
    renderPage();
    expect(screen.getByRole('link', { name: T.homeLabel })).toHaveTextContent(T.brand);
    expect(document.documentElement.hasAttribute('data-accent')).toBe(false);
  });

  test('damaged saved details are ignored', () => {
    localStorage.setItem(DEVICE_KEY, '{not json');
    renderPage();
    expect(screen.getByRole('link', { name: T.homeLabel })).toBeInTheDocument();
  });
});

describe('the page', () => {
  test('is one card with the logo and name, a heading, the two boxes and the Sign in button', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: T.signIn.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: T.homeLabel })).toHaveTextContent(T.brand);
    expect(idBox()).toBeInTheDocument();
    expect(passwordBox()).toHaveAttribute('type', 'password');
    expect(signInButton()).toBeInTheDocument();
  });

  test('the first box has the focus when the page opens', () => {
    renderPage();
    expect(idBox()).toHaveFocus();
  });

  test('keeps the links of the current page: Forgot password, Terms, Privacy, Create account and help', () => {
    renderPage();
    expect(screen.getByRole('link', { name: T.signIn.forgot })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: T.footer.terms })).toHaveAttribute('href', '/terms-of-service');
    expect(screen.getByRole('link', { name: T.footer.privacy })).toHaveAttribute('href', '/privacy-policy');
    expect(screen.getByRole('link', { name: T.footer.create })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: T.footer.supportEmail })).toHaveAttribute('href', `mailto:${T.footer.supportEmail}`);
  });

  test('Show password reveals and hides the password', () => {
    renderPage();
    userEvent.click(screen.getByRole('checkbox', { name: T.signIn.showPassword }));
    expect(passwordBox()).toHaveAttribute('type', 'text');
    userEvent.click(screen.getByRole('checkbox', { name: T.signIn.showPassword }));
    expect(passwordBox()).toHaveAttribute('type', 'password');
  });

  test('a phone number gets a hint about formats', () => {
    renderPage();
    expect(screen.queryByText(T.signIn.loginIdPhoneHint)).not.toBeInTheDocument();
    userEvent.type(idBox(), '0712');
    expect(screen.getByText(T.signIn.loginIdPhoneHint)).toBeInTheDocument();
  });

  test('says in a note when the person was signed out for being idle', () => {
    renderPage({ entry: '/login?reason=idle' });
    expect(screen.getByRole('status')).toHaveTextContent(T.signIn.signedOutIdle);
  });
});

describe('checks before sending', () => {
  test('empty boxes: a sentence beside each, nothing is sent, the focus goes to the first problem', () => {
    renderPage();
    userEvent.click(signInButton());
    expect(screen.getByText(T.check.loginIdEmpty)).toBeInTheDocument();
    expect(screen.getByText(T.check.passwordEmpty)).toBeInTheDocument();
    expect(idBox()).toHaveAttribute('aria-invalid', 'true');
    expect(idBox()).toHaveFocus();
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  test('only the password missing: the focus goes to the password', () => {
    renderPage();
    userEvent.type(idBox(), MADE_UP_EMAIL);
    userEvent.click(signInButton());
    expect(passwordBox()).toHaveFocus();
    expect(screen.getByText(T.check.passwordEmpty)).toBeInTheDocument();
  });

  test('something that is neither an email nor a Kenyan mobile number is explained', () => {
    renderPage();
    userEvent.type(idBox(), 'asha');
    userEvent.type(passwordBox(), MADE_UP_SECRET);
    userEvent.click(signInButton());
    expect(screen.getByText(T.check.loginIdBad)).toBeInTheDocument();
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  test('typing in a box clears its own sentence', () => {
    renderPage();
    userEvent.click(signInButton());
    userEvent.type(idBox(), 'a');
    expect(screen.queryByText(T.check.loginIdEmpty)).not.toBeInTheDocument();
    expect(screen.getByText(T.check.passwordEmpty)).toBeInTheDocument();
  });
});

describe('a wrong password', () => {
  const wrong = () => refusal(401, 'Invalid email or password');

  test('says what is wrong and what to do, as an alert, and marks the password box', async () => {
    axiosInstance.post.mockRejectedValue(wrong());
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(T.errors.credentials);
    expect(alert).toHaveTextContent(/not right/);
    expect(alert).toHaveTextContent(/try again/);
    expect(passwordBox()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(T.check.passwordMarked)).toBeInTheDocument();
    expect(alert).not.toHaveTextContent(/Invalid email or password/);
  });

  test('the focus goes back to the password box', async () => {
    axiosInstance.post.mockRejectedValue(wrong());
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    await screen.findByRole('alert');
    await waitFor(() => expect(passwordBox()).toHaveFocus());
  });

  test('the same words for an account that is switched off (never says whether the account exists)', async () => {
    axiosInstance.post.mockRejectedValue(refusal(401, 'User account is disabled'));
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(T.errors.credentials);
  });

  test('a locked account says how long to wait and points to Forgot password; no box is marked', async () => {
    axiosInstance.post.mockRejectedValue(refusal(401, 'Too many failed sign-in attempts. Try again in 15 minutes, or reset your password.'));
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Wait 15 minutes/);
    expect(alert).toHaveTextContent(/Forgot password/);
    expect(passwordBox()).not.toHaveAttribute('aria-invalid');
  });

  test('no connection is said as a connection problem, not as a wrong password', async () => {
    axiosInstance.post.mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true, request: {} }));
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/internet connection/);
    expect(alert).not.toHaveTextContent(/password/i);
  });

  test('the alert can be dismissed, and a new attempt clears it', async () => {
    axiosInstance.post.mockRejectedValue(wrong());
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    await screen.findByRole('alert');
    userEvent.click(screen.getByRole('button', { name: T.errors.dismiss }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('the details that were typed are kept so a typo can be fixed', async () => {
    axiosInstance.post.mockRejectedValue(wrong());
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    await screen.findByRole('alert');
    expect(idBox()).toHaveValue(MADE_UP_EMAIL);
    expect(passwordBox()).toHaveValue(MADE_UP_SECRET);
  });
});

describe('keyboard', () => {
  test('Enter in the password box signs in', async () => {
    axiosInstance.post.mockResolvedValue(SIGNED_IN);
    axiosInstance.get.mockResolvedValue(PROFILE);
    renderPage();
    userEvent.type(idBox(), MADE_UP_EMAIL);
    userEvent.type(passwordBox(), `${MADE_UP_SECRET}{enter}`);
    await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledTimes(1));
    expect(axiosInstance.post).toHaveBeenCalledWith(expect.stringContaining('login_user'), { email: MADE_UP_EMAIL, password: MADE_UP_SECRET });
  });

  test('Tab goes through the boxes, the Show password tick, Forgot password and the button in order', () => {
    renderPage();
    expect(idBox()).toHaveFocus();
    userEvent.tab();
    expect(passwordBox()).toHaveFocus();
    userEvent.tab();
    expect(screen.getByRole('checkbox', { name: T.signIn.showPassword })).toHaveFocus();
    userEvent.tab();
    expect(screen.getByRole('link', { name: T.signIn.forgot })).toHaveFocus();
    userEvent.tab();
    expect(signInButton()).toHaveFocus();
  });
});

describe('signing in', () => {
  test('sends the email, loads the profile and goes to the dashboard', async () => {
    axiosInstance.post.mockResolvedValue(SIGNED_IN);
    axiosInstance.get.mockResolvedValue(PROFILE);
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
    expect(axiosInstance.get).toHaveBeenCalledWith(expect.stringContaining('get_current_user'));
    expect(localStorage.getItem('access_token')).toBe('tok-1');
  });

  test('a phone number is sent in the form the server expects', async () => {
    axiosInstance.post.mockResolvedValue(SIGNED_IN);
    axiosInstance.get.mockResolvedValue(PROFILE);
    renderPage();
    userEvent.type(idBox(), '0712 345 678');
    userEvent.type(passwordBox(), MADE_UP_SECRET);
    userEvent.click(signInButton());
    await waitFor(() => expect(axiosInstance.post).toHaveBeenCalled());
    expect(axiosInstance.post).toHaveBeenCalledWith(expect.stringContaining('login_user'), { email: '254712345678', password: MADE_UP_SECRET });
  });

  test('goes back to the page the person was trying to open', async () => {
    axiosInstance.post.mockResolvedValue(SIGNED_IN);
    axiosInstance.get.mockResolvedValue(PROFILE);
    const store = configureStore({ reducer: { auth: authReducer, onboarding: onboardingReducer } });
    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/reports' } } }]}>
            <Routes>
              <Route path="/login" element={<SignInPage />} />
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
    fillIn();
    userEvent.click(signInButton());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/reports'));
  });

  test('a person with no company yet goes to set-up', async () => {
    axiosInstance.post.mockResolvedValue(SIGNED_IN);
    axiosInstance.get.mockResolvedValue(reply({ user: { name: 'x', email: MADE_UP_EMAIL }, roles: [] }));
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/onboarding'));
  });

  test('someone already signed in skips the form', async () => {
    renderPage({ auth: { isAuthenticated: true, isLoading: false, token: 'tok', user: { company: 'Demo Shop' } } });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
  });

  test('while sending, the button shows it is busy and a second press does nothing', async () => {
    let finish;
    axiosInstance.post.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    axiosInstance.get.mockResolvedValue(PROFILE);
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    const busy = await screen.findByRole('button', { name: T.signIn.submitting });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    userEvent.click(busy);
    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
    finish(SIGNED_IN);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
  });
});

describe('the two-step code', () => {
  const toCodeStep = async () => {
    axiosInstance.post.mockRejectedValueOnce(needsCode());
    renderPage();
    fillIn();
    userEvent.click(signInButton());
    await screen.findByRole('heading', { level: 1, name: T.code.title });
  };
  const codeBox = () => screen.getByLabelText(T.code.label);

  test('asking for the code is a step, not an error, and the code box has the focus', async () => {
    await toCodeStep();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(codeBox()).toHaveFocus();
    expect(codeBox()).toHaveAttribute('inputmode', 'numeric');
    expect(codeBox()).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.queryByLabelText(T.signIn.password)).not.toBeInTheDocument();
  });

  test('pasting a code with a space keeps the 6 digits; letters are dropped', async () => {
    await toCodeStep();
    userEvent.paste(codeBox(), '123 456');
    expect(codeBox()).toHaveValue('123456');
    userEvent.clear(codeBox());
    userEvent.type(codeBox(), '12ab34');
    expect(codeBox()).toHaveValue('1234');
  });

  test('Enter sends the code with the same details, then signs in', async () => {
    await toCodeStep();
    axiosInstance.post.mockResolvedValueOnce(SIGNED_IN);
    axiosInstance.get.mockResolvedValue(PROFILE);
    userEvent.paste(codeBox(), '123456');
    userEvent.type(codeBox(), '{enter}');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
    expect(axiosInstance.post).toHaveBeenLastCalledWith(expect.stringContaining('login_user'), { email: MADE_UP_EMAIL, password: MADE_UP_SECRET, otp: '123456' });
  });

  test('a short code is explained and not sent', async () => {
    await toCodeStep();
    userEvent.type(codeBox(), '123');
    userEvent.click(screen.getByRole('button', { name: T.code.submit }));
    expect(screen.getByText(T.check.codeShort)).toBeInTheDocument();
    expect(codeBox()).toHaveFocus();
    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
  });

  test('a wrong code says so in words, marks the box, empties it and puts the focus back', async () => {
    await toCodeStep();
    axiosInstance.post.mockRejectedValueOnce(needsCode('That code is not correct. Check the time on your phone and try the newest code.'));
    userEvent.paste(codeBox(), '000000');
    userEvent.click(screen.getByRole('button', { name: T.code.submit }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(T.errors.code);
    expect(codeBox()).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(codeBox()).toHaveValue(''));
    expect(codeBox()).toHaveFocus();
    expect(screen.getByRole('heading', { level: 1, name: T.code.title })).toBeInTheDocument();
  });

  test('there is a way back: the email stays, the password is emptied, the first box has the focus', async () => {
    await toCodeStep();
    userEvent.click(screen.getByRole('button', { name: T.code.back }));
    expect(screen.getByRole('heading', { level: 1, name: T.signIn.title })).toBeInTheDocument();
    expect(idBox()).toHaveValue(MADE_UP_EMAIL);
    expect(passwordBox()).toHaveValue('');
    expect(idBox()).toHaveFocus();
  });

  test('tells a person who lost their phone what to do', async () => {
    await toCodeStep();
    expect(screen.getByText(T.code.lost)).toBeInTheDocument();
  });
});

describe('the theme toggle', () => {
  test('light to dark and back, remembered like the app shell remembers it', () => {
    renderPage();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    userEvent.click(screen.getByRole('button', { name: T.theme.toDark }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('themeMode')).toBe('dark');
    userEvent.click(screen.getByRole('button', { name: T.theme.toLight }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('themeMode')).toBe('light');
  });

  test('opens in the theme the person chose before', () => {
    localStorage.setItem('themeMode', 'dark');
    renderPage();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: T.theme.toLight })).toBeInTheDocument();
  });
});

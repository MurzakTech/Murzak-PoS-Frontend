import { clearSession } from './session';

test('clearSession removes everything about the last person but keeps device preferences', () => {
  ['access_token', 'user', 'api_secret', 'company', 'pos_profile', 'activeWarehouse', 'onboarding_completed'].forEach((key) =>
    localStorage.setItem(key, 'x')
  );
  localStorage.setItem('themeMode', 'dark');

  clearSession();

  expect(localStorage.getItem('access_token')).toBeNull();
  expect(localStorage.getItem('company')).toBeNull();
  expect(localStorage.getItem('activeWarehouse')).toBeNull();
  expect(localStorage.getItem('onboarding_completed')).toBeNull();
  expect(localStorage.getItem('themeMode')).toBe('dark');
});

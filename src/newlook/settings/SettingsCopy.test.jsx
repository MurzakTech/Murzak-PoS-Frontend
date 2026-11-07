/** Settings, Business: Keep a copy of your settings. Owners only; one file, named for the shop and the day; errors in words. */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import SettingsCopyCard from './SettingsCopyCard';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const show = (props, tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Linda mwananchi' } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">
          <SettingsCopyCard {...props} />
        </AccessProvider>
      </MemoryRouter>
    </Provider>
  );
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

test('downloads the settings as a file named for the shop and the day', async () => {
  const load = jest.fn().mockResolvedValue({ company: 'Linda mwananchi', exported_on: '2026-11-07', till: { update_stock: true } });
  const save = jest.fn();
  show({ load, save });
  userEvent.click(await screen.findByRole('button', { name: 'Download my settings' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  const [text, name, type] = save.mock.calls[0];
  expect(name).toBe('settings-linda-mwananchi-2026-11-07.json');
  expect(type).toBe('application/json');
  expect(JSON.parse(text).till.update_stock).toBe(true);
  expect(await screen.findByText('Your settings were saved to a file.')).toBeInTheDocument();
});

test('a failure is said in words and nothing is saved', async () => {
  const save = jest.fn();
  show({ load: jest.fn().mockRejectedValue(new Error('We could not get your settings. Please try again.')), save });
  userEvent.click(await screen.findByRole('button', { name: 'Download my settings' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('We could not get your settings');
  expect(save).not.toHaveBeenCalled();
});

test('only the owner sees it', async () => {
  const { container } = show({ load: jest.fn(), save: jest.fn() }, 'manager');
  await screen.findByText(() => false).catch(() => undefined);
  expect(container.querySelector('[data-card="settings-copy"]')).toBeNull();
});

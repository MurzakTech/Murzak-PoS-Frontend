/** Settings, Business: Recent changes to settings. Owners only; plain sentences; nothing when the trail cannot be read. */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import RecentChangesCard from './RecentChangesCard';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const EVENTS = [
  { id: 'v-1', timestamp: '2026-11-04 11:02:10', user: 'linda@shop.test', summary: "Turned off 'Take sold items out of stock'" },
  { id: 'v-2', timestamp: '2026-11-03 09:00:00', user: 'amina@shop.test', summary: "Turned on 'Let cashiers change discounts'" },
];

const show = (load, tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">
          <RecentChangesCard load={load} />
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

test('lists the last changes with when, who and what, and asks only for the Settings module', async () => {
  const load = jest.fn().mockResolvedValue({ events: EVENTS, hasMore: false });
  show(load);
  expect(await screen.findByText("04/11/2026 11:02, linda@shop.test: Turned off 'Take sold items out of stock'")).toBeInTheDocument();
  expect(load).toHaveBeenCalledWith(expect.objectContaining({ module: 'Settings', limit_page_length: 5 }));
});

test('says so when nothing has been changed yet', async () => {
  show(jest.fn().mockResolvedValue({ events: [], hasMore: false }));
  expect(await screen.findByText('No changes to settings have been recorded yet.')).toBeInTheDocument();
});

test('shows nothing when the trail cannot be read', async () => {
  const { container } = show(jest.fn().mockRejectedValue(new Error('no')));
  await screen.findByText(() => false).catch(() => undefined);
  expect(container.querySelector('[data-card="recent-changes"]')).toBeNull();
});

test('a manager does not see it, and nothing is asked', async () => {
  const load = jest.fn();
  const { container } = show(load, 'manager');
  await screen.findByText(() => false).catch(() => undefined);
  expect(load).not.toHaveBeenCalled();
  expect(container.querySelector('[data-card="recent-changes"]')).toBeNull();
});

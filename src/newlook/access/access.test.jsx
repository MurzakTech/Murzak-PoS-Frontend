/**
 * Ticket P1-8: owner, manager and cashier on the screens. The server decides and enforces; the screens only ask
 * and draw. Until it has answered, nothing protected is drawn.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { getMyAccess } from '../../api/accessApi';
import { AccessProvider, accessCacheKey, useAccess } from './AccessProvider';
import { TopBar } from '../shell';

jest.mock('../../api/axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (tier, can) => ({ data: { message: { success: true, data: { tier, can } } } });
const OWNER = reply('owner', { profit: true, cost_of_goods: true, money_owed: true, all_sales: true, team: true });
const CASHIER = reply('cashier', { profit: false, cost_of_goods: false, money_owed: false, all_sales: false, team: false });

beforeEach(() => {
  localStorage.clear();
  axiosInstance.get.mockReset();
});

describe('getMyAccess', () => {
  test('asks the server which kind of person is signed in', async () => {
    axiosInstance.get.mockResolvedValue(OWNER);
    const access = await getMyAccess();
    expect(axiosInstance.get).toHaveBeenCalledWith('murzak_pos.api.role_tiers.get_my_access');
    expect(access.tier).toBe('owner');
    expect(access.can.profit).toBe(true);
  });

  test('refuses an answer it does not understand', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: { tier: 'boss' } } } });
    await expect(getMyAccess()).rejects.toThrow();
  });

  test('a refusal or a failure becomes a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Please sign in first.' } } });
    await expect(getMyAccess()).rejects.toThrow('Please sign in first.');
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(getMyAccess()).rejects.toThrow();
  });
});

describe('AccessProvider', () => {
  const Probe = () => {
    const { tier, label, status, can } = useAccess();
    return (
      <div>
        <output data-testid="state">{`${status}|${tier}|${label}`}</output>
        <output data-testid="profit">{can('profit') ? 'shown' : 'hidden'}</output>
        <output data-testid="team">{can('team') ? 'shown' : 'hidden'}</output>
      </div>
    );
  };
  const show = (userKey = 'a@shop.test') =>
    render(
      <AccessProvider userKey={userKey}>
        <Probe />
      </AccessProvider>
    );

  test('before the server answers, nothing protected is shown', () => {
    axiosInstance.get.mockReturnValue(new Promise(() => {}));
    show();
    expect(screen.getByTestId('state')).toHaveTextContent('loading|null|null');
    expect(screen.getByTestId('profit')).toHaveTextContent('hidden');
  });

  test('an owner may see profit and the team', async () => {
    axiosInstance.get.mockResolvedValue(OWNER);
    show();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready|owner|Owner'));
    expect(screen.getByTestId('profit')).toHaveTextContent('shown');
    expect(screen.getByTestId('team')).toHaveTextContent('shown');
  });

  test('a cashier may not see profit or the team', async () => {
    axiosInstance.get.mockResolvedValue(CASHIER);
    show();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready|cashier|Cashier'));
    expect(screen.getByTestId('profit')).toHaveTextContent('hidden');
    expect(screen.getByTestId('team')).toHaveTextContent('hidden');
  });

  test('if the server cannot be asked and nothing is saved, nothing protected is shown', async () => {
    axiosInstance.get.mockRejectedValue(new Error('offline'));
    show();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error|null|null'));
    expect(screen.getByTestId('profit')).toHaveTextContent('hidden');
  });

  test('the last answer is kept for each person, and used when the server cannot be asked', async () => {
    axiosInstance.get.mockResolvedValue(OWNER);
    const view = show('a@shop.test');
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready|owner|Owner'));
    expect(localStorage.getItem(accessCacheKey('a@shop.test'))).toContain('owner');
    view.unmount();
    axiosInstance.get.mockRejectedValue(new Error('offline'));
    show('a@shop.test');
    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('state')).toHaveTextContent('ready|owner|Owner');
  });

  test('one person’s saved answer is never used for another', async () => {
    localStorage.setItem(accessCacheKey('boss@shop.test'), JSON.stringify({ tier: 'owner', can: { profit: true } }));
    axiosInstance.get.mockRejectedValue(new Error('offline'));
    show('till@shop.test');
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error'));
    expect(screen.getByTestId('profit')).toHaveTextContent('hidden');
  });

  test('a fresh answer replaces the saved one (a person whose role was lowered stops seeing profit)', async () => {
    localStorage.setItem(accessCacheKey('a@shop.test'), JSON.stringify({ tier: 'owner', can: { profit: true } }));
    axiosInstance.get.mockResolvedValue(CASHIER);
    show();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready|cashier|Cashier'));
    expect(screen.getByTestId('profit')).toHaveTextContent('hidden');
  });

  test('a saved answer that is damaged is ignored', async () => {
    localStorage.setItem(accessCacheKey('a@shop.test'), 'not json');
    axiosInstance.get.mockReturnValue(new Promise(() => {}));
    show();
    expect(screen.getByTestId('state')).toHaveTextContent('loading');
  });

  test('nobody signed in: nothing is asked and nothing is shown', () => {
    show(null);
    expect(axiosInstance.get).not.toHaveBeenCalled();
    expect(screen.getByTestId('state')).toHaveTextContent('idle|null|null');
  });

  test('outside a provider nothing protected is shown', () => {
    render(<Probe />);
    expect(screen.getByTestId('profit')).toHaveTextContent('hidden');
  });
});

describe('The user menu', () => {
  test('says which kind of person is signed in', () => {
    render(
      <MemoryRouter>
        <TopBar user={{ name: 'Wanjiru Kamau', role: 'Manager' }} tillTo="/till" />
      </MemoryRouter>
    );
    userEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Signed in as Wanjiru Kamau, Manager' })).toBeInTheDocument();
  });

  test('says only the name when the role is not known yet', () => {
    render(
      <MemoryRouter>
        <TopBar user={{ name: 'Wanjiru Kamau' }} tillTo="/till" />
      </MemoryRouter>
    );
    userEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    expect(screen.getByRole('menuitem', { name: 'Signed in as Wanjiru Kamau' })).toBeInTheDocument();
  });
});

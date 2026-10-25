import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { ToastProvider } from '../components/Toast';
import OnlineOrderAlert from './OnlineOrderAlert';

// The alert reads who is signed in from the store and listens through the live connection; both are replaced here
const mockAuth = { current: null };
const mockListener = { current: null };
jest.mock('../../store/hooks', () => ({ useAppSelector: (select) => select({ auth: mockAuth.current }) }));
jest.mock('../../hooks/useRealtimeRefresh', () => ({
  __esModule: true,
  default: (options) => {
    mockListener.current = options;
    return true;
  },
}));

const show = () =>
  render(
    <ToastProvider>
      <OnlineOrderAlert />
    </ToastProvider>
  );

describe('the new order alert', () => {
  test('tells a signed-in person at once: the order and where it came from, nothing about the customer', () => {
    mockAuth.current = { isAuthenticated: true, user: { company: 'Duka Ltd' } };
    show();
    expect(mockListener.current).toMatchObject({ kind: 'online_order', company: 'Duka Ltd', enabled: true });

    // "The connection came back" is not an order
    act(() => mockListener.current.onRefresh(null));
    expect(screen.queryByText(/New online order/)).not.toBeInTheDocument();

    act(() => mockListener.current.onRefresh({ kind: 'online_order', name: 'SO-9', channel: 'WooCommerce', company: 'Duka Ltd' }));
    expect(screen.getByText('New online order SO-9, from Website (WooCommerce). Open Online orders to see it.')).toBeInTheDocument();
  });

  test('an order from the online store is named plainly', () => {
    mockAuth.current = { isAuthenticated: true, user: { company: 'Duka Ltd' } };
    show();
    act(() => mockListener.current.onRefresh({ kind: 'online_order', name: 'SO-10', channel: 'Website', company: 'Duka Ltd' }));
    expect(screen.getByText(/New online order SO-10, from Online store/)).toBeInTheDocument();
  });

  test('listens to nothing when nobody is signed in', () => {
    mockAuth.current = { isAuthenticated: false, user: null };
    show();
    expect(mockListener.current.enabled).toBe(false);
  });
});

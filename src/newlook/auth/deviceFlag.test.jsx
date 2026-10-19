/**
 * Ticket P5-5: the device-only New look flag. NewLookProvider writes it whenever it learns the shop's switch; the sign-in page reads it;
 * signing out leaves it alone.
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NewLookProvider, useNewLook } from '../NewLookProvider';
import { getNewLook, setNewLook } from '../../api/newLookApi';
import { DEVICE_KEY, readDeviceFlag, writeDeviceFlag } from './deviceFlag';
import { clearSession } from '../../utils/session';

jest.mock('../../api/newLookApi');
jest.mock('../../realtime/realtimeClient', () => ({ disconnectRealtime: jest.fn() }));

const Probe = () => {
  const { setEnabled, status } = useNewLook();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <button onClick={() => setEnabled(false).catch(() => {})}>turn off</button>
    </div>
  );
};

const mount = (auth) =>
  render(
    <Provider store={configureStore({ reducer: { auth: (state = auth) => state } })}>
      <NewLookProvider>
        <Probe />
      </NewLookProvider>
    </Provider>
  );

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

describe('reading and writing the flag', () => {
  test('nothing saved means on (never signed in on this device, and the New look is the default)', () => {
    expect(readDeviceFlag()).toBe(true);
  });

  test('1 is on, 0 is off, anything else is on', () => {
    writeDeviceFlag(true);
    expect(localStorage.getItem(DEVICE_KEY)).toBe('1');
    expect(readDeviceFlag()).toBe(true);
    writeDeviceFlag(false);
    expect(localStorage.getItem(DEVICE_KEY)).toBe('0');
    expect(readDeviceFlag()).toBe(false);
    localStorage.setItem(DEVICE_KEY, 'yes');
    expect(readDeviceFlag()).toBe(true);
  });

  test('blocked storage is on and does not throw', () => {
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readDeviceFlag()).toBe(true);
    expect(() => writeDeviceFlag(true)).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });

  test('a shop named "device" does not share the flag with its own saved answer', () => {
    expect(DEVICE_KEY.startsWith('murzak_new_look:')).toBe(false);
  });
});

describe('NewLookProvider keeps the flag', () => {
  test('the server says on: the flag becomes 1', async () => {
    getNewLook.mockResolvedValue(true);
    mount({ isAuthenticated: true, user: { company: 'Shop A' } });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(localStorage.getItem(DEVICE_KEY)).toBe('1');
  });

  test('the server says off: the flag becomes 0', async () => {
    localStorage.setItem(DEVICE_KEY, '1');
    getNewLook.mockResolvedValue(false);
    mount({ isAuthenticated: true, user: { company: 'Shop A' } });
    await waitFor(() => expect(localStorage.getItem(DEVICE_KEY)).toBe('0'));
  });

  test('the owner switches it off in Settings: the flag follows', async () => {
    getNewLook.mockResolvedValue(true);
    setNewLook.mockResolvedValue(false);
    mount({ isAuthenticated: true, user: { company: 'Shop A' } });
    await waitFor(() => expect(localStorage.getItem(DEVICE_KEY)).toBe('1'));
    await act(async () => {
      screen.getByRole('button', { name: 'turn off' }).click();
    });
    await waitFor(() => expect(localStorage.getItem(DEVICE_KEY)).toBe('0'));
  });

  test('the server cannot be reached: the flag is left as it was', async () => {
    localStorage.setItem(DEVICE_KEY, '1');
    getNewLook.mockRejectedValue(new Error('offline'));
    mount({ isAuthenticated: true, user: { company: 'Shop A' } });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    expect(localStorage.getItem(DEVICE_KEY)).toBe('1');
  });

  test('nobody signed in: the flag is not touched', () => {
    localStorage.setItem(DEVICE_KEY, '1');
    mount({ isAuthenticated: false, user: null });
    expect(localStorage.getItem(DEVICE_KEY)).toBe('1');
    expect(getNewLook).not.toHaveBeenCalled();
  });
});

test('signing out keeps the flag (a device setting, like the theme), so the next sign-in page looks the same', () => {
  writeDeviceFlag(true);
  localStorage.setItem('access_token', 'x');
  clearSession();
  expect(localStorage.getItem('access_token')).toBeNull();
  expect(readDeviceFlag()).toBe(true);
});

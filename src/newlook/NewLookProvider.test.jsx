import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NewLookProvider, useNewLook } from './NewLookProvider';
import { getNewLook, setNewLook } from '../api/newLookApi';

jest.mock('../api/newLookApi');

const storeFor = (auth) => configureStore({ reducer: { auth: (state = auth) => state } });

const Probe = () => {
  const { enabled, status, setEnabled } = useNewLook();
  return (
    <div>
      <span data-testid="state">{`${status}:${enabled ? 'on' : 'off'}`}</span>
      <button onClick={() => setEnabled(true).catch(() => {})}>turn on</button>
    </div>
  );
};

const mount = (auth = { isAuthenticated: true, user: { company: 'Shop A' } }) =>
  render(
    <Provider store={storeFor(auth)}>
      <NewLookProvider>
        <Probe />
      </NewLookProvider>
    </Provider>
  );

const state = () => screen.getByTestId('state').textContent;

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

test('nobody signed in: off, and the server is not asked', () => {
  mount({ isAuthenticated: false, user: null });
  expect(state()).toBe('idle:off');
  expect(getNewLook).not.toHaveBeenCalled();
});

test('a shop that never chose is off', async () => {
  getNewLook.mockResolvedValue(false);
  mount();
  await waitFor(() => expect(state()).toBe('ready:off'));
  expect(getNewLook).toHaveBeenCalledWith('Shop A');
});

test('the server turns it on, and the answer is kept for the next offline start', async () => {
  getNewLook.mockResolvedValue(true);
  mount();
  await waitFor(() => expect(state()).toBe('ready:on'));
  expect(localStorage.getItem('murzak_new_look:Shop A')).toBe('1');
});

test('while the server is being asked, the last saved answer is used', async () => {
  localStorage.setItem('murzak_new_look:Shop A', '1');
  let answer;
  getNewLook.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
  mount();
  expect(state()).toBe('ready:on');
  await act(async () => answer(false)); // the server wins
  expect(state()).toBe('ready:off');
  expect(localStorage.getItem('murzak_new_look:Shop A')).toBe('0');
});

test('with nothing saved, the first ask shows "loading", never a wrong look', async () => {
  let answer;
  getNewLook.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
  mount();
  expect(state()).toBe('loading:off');
  await act(async () => answer(true));
  expect(state()).toBe('ready:on');
});

test('a saved "off" is not trusted before the server answers (it may be from before the New look became the default)', async () => {
  localStorage.setItem('murzak_new_look:Shop A', '0');
  let answer;
  getNewLook.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
  mount();
  expect(state()).toBe('loading:off');
  await act(async () => answer(true));
  expect(state()).toBe('ready:on');
});

test('when the server cannot be reached the saved answer stays, and with none saved it is off', async () => {
  getNewLook.mockRejectedValue(new Error('offline'));
  localStorage.setItem('murzak_new_look:Shop A', '1');
  const view = mount();
  await waitFor(() => expect(state()).toBe('error:on'));
  view.unmount();

  localStorage.clear();
  mount();
  await waitFor(() => expect(state()).toBe('error:off'));
});

test('another shop on the same device does not inherit the saved answer', async () => {
  localStorage.setItem('murzak_new_look:Shop A', '1');
  getNewLook.mockResolvedValue(false);
  mount({ isAuthenticated: true, user: { company: 'Shop B' } });
  expect(state()).toBe('loading:off');
  await waitFor(() => expect(state()).toBe('ready:off'));
});

test('turning it on saves to the server first, then changes the look and the saved answer', async () => {
  getNewLook.mockResolvedValue(false);
  setNewLook.mockResolvedValue(true);
  mount();
  await waitFor(() => expect(state()).toBe('ready:off'));
  await act(async () => screen.getByText('turn on').click());
  expect(setNewLook).toHaveBeenCalledWith(true, 'Shop A');
  expect(state()).toBe('ready:on');
  expect(localStorage.getItem('murzak_new_look:Shop A')).toBe('1');
});

test('a refused change leaves the look as it was', async () => {
  getNewLook.mockResolvedValue(false);
  setNewLook.mockRejectedValue(new Error('no'));
  mount();
  await waitFor(() => expect(state()).toBe('ready:off'));
  await act(async () => screen.getByText('turn on').click());
  expect(state()).toBe('ready:off');
  expect(localStorage.getItem('murzak_new_look:Shop A')).toBe('0');
});

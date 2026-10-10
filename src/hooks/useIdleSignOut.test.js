import { act, renderHook } from '@testing-library/react';
import useIdleSignOut, { IDLE_TIMEOUT_MS, WARNING_MS, LAST_ACTIVITY_KEY } from './useIdleSignOut';

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

test('warns a minute before the limit, then signs out', () => {
  const onTimeout = jest.fn();
  const { result } = renderHook(() => useIdleSignOut({ enabled: true, onTimeout }));

  act(() => jest.advanceTimersByTime(IDLE_TIMEOUT_MS - WARNING_MS + 5000));
  expect(result.current.secondsLeft).toBeGreaterThan(0);
  expect(onTimeout).not.toHaveBeenCalled();

  act(() => jest.advanceTimersByTime(WARNING_MS));
  expect(onTimeout).toHaveBeenCalled();
});

test('"Stay signed in" starts the clock again', () => {
  const onTimeout = jest.fn();
  const { result } = renderHook(() => useIdleSignOut({ enabled: true, onTimeout }));

  act(() => jest.advanceTimersByTime(IDLE_TIMEOUT_MS - WARNING_MS + 5000));
  act(() => result.current.stayActive());
  expect(result.current.secondsLeft).toBeNull();

  act(() => jest.advanceTimersByTime(IDLE_TIMEOUT_MS - WARNING_MS - 10000));
  expect(onTimeout).not.toHaveBeenCalled();
});

test('activity in another tab keeps this one signed in', () => {
  const onTimeout = jest.fn();
  renderHook(() => useIdleSignOut({ enabled: true, onTimeout }));

  act(() => jest.advanceTimersByTime(IDLE_TIMEOUT_MS - 2 * WARNING_MS));
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  act(() => jest.advanceTimersByTime(2 * WARNING_MS));
  expect(onTimeout).not.toHaveBeenCalled();
});

test('does nothing when nobody is signed in', () => {
  const onTimeout = jest.fn();
  renderHook(() => useIdleSignOut({ enabled: false, onTimeout }));
  act(() => jest.advanceTimersByTime(IDLE_TIMEOUT_MS * 2));
  expect(onTimeout).not.toHaveBeenCalled();
});

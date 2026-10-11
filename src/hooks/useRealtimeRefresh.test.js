import { act, renderHook } from '@testing-library/react';
import useRealtimeRefresh, { pollEvery } from './useRealtimeRefresh';
import * as realtime from '../realtime/realtimeClient';

jest.mock('../realtime/realtimeClient');

beforeEach(() => realtime.resetRealtime());
afterEach(() => act(() => realtime.setConnected(false)));

const kitchen = (over = {}) => ({ kind: 'kitchen', name: 'it1vmp1l7e', status: 'Ready', station: 'Bar', company: 'Shop A', ...over });

describe('useRealtimeRefresh', () => {
  it('refreshes for a message of its kind about its business', () => {
    const onRefresh = jest.fn();
    renderHook(() => useRealtimeRefresh({ kind: 'kitchen', company: 'Shop A', onRefresh }));
    act(() => realtime.emit(kitchen()));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('ignores another kind of message and another business', () => {
    const onRefresh = jest.fn();
    renderHook(() => useRealtimeRefresh({ kind: 'kitchen', company: 'Shop A', onRefresh }));
    act(() => realtime.emit({ kind: 'payment', company: 'Shop A', status: 'Success' }));
    act(() => realtime.emit(kitchen({ company: 'Shop B' })));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('still refreshes for a message that does not name a business', () => {
    const onRefresh = jest.fn();
    renderHook(() => useRealtimeRefresh({ kind: 'kitchen', company: 'Shop A', onRefresh }));
    act(() => realtime.emit(kitchen({ company: undefined })));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('opens nothing while disabled', () => {
    const onRefresh = jest.fn();
    renderHook(() => useRealtimeRefresh({ kind: 'kitchen', enabled: false, onRefresh }));
    expect(realtime.timesOpened()).toBe(0);
    act(() => realtime.emit(kitchen()));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('stops listening when the screen goes away', () => {
    const { unmount } = renderHook(() => useRealtimeRefresh({ kind: 'kitchen', onRefresh: jest.fn() }));
    expect(realtime.listenerCount()).toBe(1);
    unmount();
    expect(realtime.listenerCount()).toBe(0);
  });

  it('reports the connection, and refreshes each time it comes back up (messages sent while down are lost)', () => {
    const onRefresh = jest.fn();
    const { result } = renderHook(() => useRealtimeRefresh({ kind: 'kitchen', onRefresh }));
    expect(result.current).toBe(false);
    expect(onRefresh).not.toHaveBeenCalled();
    act(() => realtime.setConnected(true));
    expect(result.current).toBe(true);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    act(() => realtime.setConnected(false));
    expect(result.current).toBe(false);
    act(() => realtime.setConnected(true));
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
});

describe('pollEvery', () => {
  it('keeps the normal pace while the live connection is down', () => {
    expect(pollEvery(5000, false)).toBe(5000);
    expect(pollEvery(3000, false)).toBe(3000);
  });

  it('slows to every 15 seconds while it is up, and never speeds a slower screen up', () => {
    expect(pollEvery(5000, true)).toBe(15000);
    expect(pollEvery(3000, true)).toBe(15000);
    expect(pollEvery(60000, true)).toBe(60000);
  });
});

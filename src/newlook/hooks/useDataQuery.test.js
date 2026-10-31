import { renderHook, act } from '@testing-library/react';
import { useDataQuery, queryCache, invalidateQuery, mutateQuery, _resetQueryCacheForTest } from './useDataQuery';

describe('useDataQuery', () => {
  beforeEach(() => {
    _resetQueryCacheForTest();
    jest.clearAllMocks();
  });

  it('fetches and returns data on mount', async () => {
    const fetcher = jest.fn().mockResolvedValue(['Item 1', 'Item 2']);

    const { result } = renderHook(() => useDataQuery('items', fetcher));

    expect(result.current.status).toBe('loading');

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.data).toEqual(['Item 1', 'Item 2']);
    expect(result.current.error).toBe('');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('returns cached data immediately on second mount without refetching if fresh', async () => {
    const fetcher = jest.fn().mockResolvedValue({ total: 100 });

    const { result: first } = renderHook(() => useDataQuery('stats', fetcher, true, { ttlMs: 10000 }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(first.current.data).toEqual({ total: 100 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Second hook mounted with same key
    const { result: second } = renderHook(() => useDataQuery('stats', fetcher, true, { ttlMs: 10000 }));
    expect(second.current.status).toBe('ready');
    expect(second.current.data).toEqual({ total: 100 });
    // Should NOT have triggered a second network call because it is fresh
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent in-flight requests for the same key', async () => {
    let resolver;
    const fetcher = jest.fn().mockImplementation(
      () => new Promise((resolve) => { resolver = resolve; })
    );

    const { result: hook1 } = renderHook(() => useDataQuery('concurrent', fetcher));
    const { result: hook2 } = renderHook(() => useDataQuery('concurrent', fetcher));

    expect(hook1.current.status).toBe('loading');
    expect(hook2.current.status).toBe('loading');
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolver(['result']);
      await Promise.resolve();
    });

    expect(hook1.current.data).toEqual(['result']);
    expect(hook2.current.data).toEqual(['result']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache via invalidateQuery and refetches on demand', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(['v1'])
      .mockResolvedValueOnce(['v2']);

    const { result } = renderHook(() => useDataQuery('products:list', fetcher));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.data).toEqual(['v1']);

    // Invalidate the cache
    act(() => {
      invalidateQuery('products');
    });

    // Reload
    await act(async () => {
      result.current.reload();
      await Promise.resolve();
    });

    expect(result.current.data).toEqual(['v2']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('supports direct mutation via mutateQuery', () => {
    queryCache.set('user:profile', { name: 'Alice' });

    mutateQuery('user:profile', (old) => ({ ...old, name: 'Bob' }));
    expect(queryCache.get('user:profile').data).toEqual({ name: 'Bob' });
  });

  it('handles idle state when enabled is false', () => {
    const fetcher = jest.fn();
    const { result } = renderHook(() => useDataQuery('disabled', fetcher, false));

    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Network failure'));
    const { result } = renderHook(() => useDataQuery('failing', fetcher));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Network failure');
    expect(result.current.data).toBeNull();
  });

  it('does not report a failed load as ready data when Try again is pressed', async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error('The server is busy.')).mockResolvedValueOnce({ rows: ['a'] });
    const { result } = renderHook(() => useDataQuery('retry', fetcher));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('error');

    const seen = [];
    act(() => {
      result.current.reload();
    });
    // The moment after pressing Try again: loading, never "ready" with nothing in it (a page reading data.rows would crash)
    seen.push({ status: result.current.status, data: result.current.data });
    await act(async () => {
      await Promise.resolve();
    });
    seen.push({ status: result.current.status, data: result.current.data });
    expect(seen[0]).toEqual({ status: 'loading', data: null });
    expect(seen[1]).toEqual({ status: 'ready', data: { rows: ['a'] } });
  });

  it('still shows the last good answer while a fresh one is on its way after a success', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce({ n: 1 }).mockResolvedValueOnce({ n: 2 });
    const { result } = renderHook(() => useDataQuery('good', fetcher));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      result.current.reload();
    });
    expect(result.current.data).toEqual({ n: 1 });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.data).toEqual({ n: 2 });
  });
});

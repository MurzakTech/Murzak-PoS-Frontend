import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Global In-Memory Cache for New Look Data Queries.
 * Provides instant response on tab switching, request deduplication,
 * stale-while-revalidate, and tag/prefix-based invalidation.
 */
let bridgeCallback = null;
export const registerInvalidationBridge = (fn) => {
  bridgeCallback = fn;
};

class QueryCache {
  constructor() {
    this.cache = new Map(); // key -> { data, timestamp, error, status }
    this.inFlight = new Map(); // key -> Promise
    this.listeners = new Set();
  }

  get(key) {
    return this.cache.get(key) || null;
  }

  set(key, data, error = '') {
    const entry = {
      data,
      error,
      status: error ? 'error' : 'ready',
      timestamp: Date.now(),
    };
    this.cache.set(key, entry);
    this.notify();
    return entry;
  }

  invalidate(keyOrPrefix) {
    if (!keyOrPrefix) {
      this.cache.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
          this.cache.delete(key);
        }
      }
    }
    if (bridgeCallback) {
      try {
        bridgeCallback(keyOrPrefix);
      } catch {
        // ignore bridge errors
      }
    }
    this.notify(keyOrPrefix);
  }

  mutate(key, updaterOrData) {
    const existing = this.get(key);
    const newData = typeof updaterOrData === 'function' ? updaterOrData(existing?.data) : updaterOrData;
    return this.set(key, newData);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(invalidatedKeyOrPrefix) {
    this.listeners.forEach((listener) => {
      try {
        listener(invalidatedKeyOrPrefix);
      } catch {
        // ignore subscriber errors
      }
    });
  }

  clear() {
    this.cache.clear();
    this.inFlight.clear();
    this.notify();
  }
}

export const queryCache = new QueryCache();

export const invalidateQuery = (keyOrPrefix) => queryCache.invalidate(keyOrPrefix);
export const mutateQuery = (key, updaterOrData) => queryCache.mutate(key, updaterOrData);

const DEFAULT_TTL_MS = 5 * 1000; // 1 minute fresh TTL before revalidation

/**
 * Unified data querying hook with caching, deduplication, and stale-while-revalidate.
 * Compatible drop-in replacement for the duplicate `useFetched` hooks.
 *
 * @param {string} key - Unique cache key identifying the query
 * @param {Function} load - Async function returning data
 * @param {boolean} [enabled=true] - Whether to execute the query
 * @param {Object} [options] - Configuration options (ttlMs, keepPrevious)
 * @returns {{ status: string, data: any, error: string, reload: Function, isFetching: boolean }}
 */
export const useDataQuery = (key, load, enabled = true, options = {}) => {
  const { ttlMs = DEFAULT_TTL_MS } = options;
  const ticket = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  // Read current cached entry
  const cached = key && enabled ? queryCache.get(key) : null;
  const isFresh = cached && (Date.now() - cached.timestamp < ttlMs);

  const [state, setState] = useState(() => {
    if (!enabled) return { status: 'idle', data: null, error: '', isFetching: false };
    if (cached) return { status: cached.status, data: cached.data, error: cached.error, isFetching: !isFresh };
    return { status: 'loading', data: null, error: '', isFetching: true };
  });

  const run = useCallback((keepPrevious = true) => {
    ticket.current += 1;
    const mine = ticket.current;

    const currentCached = queryCache.get(key);
    setState((prev) => ({
      status: currentCached?.data !== undefined ? 'ready' : (keepPrevious && prev.data ? 'ready' : 'loading'),
      data: currentCached?.data !== undefined ? currentCached.data : (keepPrevious ? prev.data : null),
      error: '',
      isFetching: true,
    }));

    // Deduplicate in-flight requests for the same key
    let promise = queryCache.inFlight.get(key);
    if (!promise) {
      promise = loader.current();
      queryCache.inFlight.set(key, promise);
    }

    promise
      .then((data) => {
        queryCache.inFlight.delete(key);
        queryCache.set(key, data);
        if (ticket.current === mine) {
          setState({ status: 'ready', data, error: '', isFetching: false });
        }
      })
      .catch((err) => {
        queryCache.inFlight.delete(key);
        const errorMsg = err?.message || 'Failed to fetch data';
        queryCache.set(key, null, errorMsg);
        if (ticket.current === mine) {
          setState({ status: 'error', data: null, error: errorMsg, isFetching: false });
        }
      });
  }, [key]);

  useEffect(() => {
    if (!enabled || !key) return undefined;
    const unsubscribe = queryCache.subscribe((invalidatedKeyOrPrefix) => {
      if (!invalidatedKeyOrPrefix || key === invalidatedKeyOrPrefix || key.startsWith(invalidatedKeyOrPrefix)) {
        run(true);
      }
    });
    return unsubscribe;
  }, [key, enabled, run]);

  useEffect(() => {
    if (!enabled || !key) {
      ticket.current += 1;
      setState({ status: 'idle', data: null, error: '', isFetching: false });
      return undefined;
    }

    const entry = queryCache.get(key);
    const stillFresh = entry && (Date.now() - entry.timestamp < ttlMs);

    if (entry && stillFresh) {
      // Data is already fresh in cache, no network call needed
      setState({ status: entry.status, data: entry.data, error: entry.error, isFetching: false });
    } else {
      // If stale or absent, fetch in background (keeping cached data if available)
      run(true);
    }

    return () => {
      ticket.current += 1;
    };
  }, [key, enabled, ttlMs, run]);

  const reload = useCallback(() => run(false), [run]);

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    reload,
    isFetching: state.isFetching,
  };
};

// Backwards-compatible alias
export const useFetched = useDataQuery;

export const _resetQueryCacheForTest = () => {
  queryCache.clear();
  bridgeCallback = null;
};

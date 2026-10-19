import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { getNewLook, setNewLook } from '../api/newLookApi';
import { getUserCompany } from '../utils/getUserCompany';
import { writeDeviceFlag } from './auth/deviceFlag';

/**
 * Whether this shop is using the redesigned screens (the "New look").
 *
 * The truth is on the server, one switch per business, ON by default (an owner can switch it off). The last
 * answer is also kept on this device, so a till that opens without a connection shows the same look it showed
 * last time. An answer from the server always replaces the saved one. With no answer at all (the server could
 * not be asked and nothing is saved, for example a shop whose back end has not been updated yet), the look is
 * OFF, which is the app exactly as it was before the redesign, so nothing breaks on a shop that is not ready.
 *
 * status: 'idle' (nobody signed in), 'loading' (asking the server and nothing saved yet),
 *         'ready' (known), 'error' (the server could not be asked; the saved answer, or off, is used)
 */

const CACHE_PREFIX = 'murzak_new_look:';

const cacheKey = (company) => `${CACHE_PREFIX}${company || 'default'}`;

const readCache = (company) => {
  try {
    const saved = localStorage.getItem(cacheKey(company));
    return saved === null ? null : saved === '1';
  } catch (e) {
    return null; // storage can be unavailable (private mode); carry on without it
  }
};

const writeCache = (company, enabled) => {
  // Also keep the answer for the sign-in page, which opens before anyone is signed in (see auth/deviceFlag.js)
  writeDeviceFlag(enabled);
  try {
    localStorage.setItem(cacheKey(company), enabled ? '1' : '0');
  } catch (e) {
    // Not critical; the answer just is not kept for the next offline start
  }
};

export const NewLookContext = createContext({
  enabled: false,
  status: 'idle',
  company: null,
  setEnabled: async () => false,
});

export const useNewLook = () => useContext(NewLookContext);

export const NewLookProvider = ({ children }) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const company = isAuthenticated ? getUserCompany(user) : null;
  const [state, setState] = useState({ enabled: false, status: 'idle' });
  // A late answer for a person who has since signed out or changed shop must not be applied
  const current = useRef(null);

  useEffect(() => {
    current.current = isAuthenticated ? company || 'default' : null;
    if (!isAuthenticated) {
      setState({ enabled: false, status: 'idle' });
      return undefined;
    }
    const asked = current.current;
    const saved = readCache(company);
    setState(saved === null ? { enabled: false, status: 'loading' } : { enabled: saved, status: 'ready' });
    let cancelled = false;
    getNewLook(company)
      .then((enabled) => {
        if (cancelled || current.current !== asked) return;
        writeCache(company, enabled);
        setState({ enabled, status: 'ready' });
      })
      .catch(() => {
        if (cancelled || current.current !== asked) return;
        // Keep what this device last knew (or off); the page can say it could not check
        setState((prev) => ({ enabled: prev.enabled, status: 'error' }));
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, company]);

  const setEnabled = useCallback(
    async (value) => {
      const enabled = await setNewLook(value, company);
      writeCache(company, enabled);
      setState({ enabled, status: 'ready' });
      return enabled;
    },
    [company]
  );

  const value = useMemo(() => ({ ...state, company, setEnabled }), [state, company, setEnabled]);

  return <NewLookContext.Provider value={value}>{children}</NewLookContext.Provider>;
};

export default NewLookProvider;

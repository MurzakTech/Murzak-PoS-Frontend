import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { getNewLook, setNewLook } from '../api/newLookApi';
import { getUserCompany } from '../utils/getUserCompany';
import { writeDeviceFlag } from './auth/deviceFlag';

/**
 * Whether this shop is using the redesigned screens (the "New look").
 *
 * The New look is ON by default everywhere across the application to bring uniformity.
 * An owner can toggle it from settings. The setting is stored both in server per company
 * and cached in localStorage.
 *
 * status: 'idle' (nobody signed in), 'loading' (asking the server and nothing saved yet),
 *         'ready' (known), 'error' (the server could not be asked; on is used by default)
 */

const CACHE_PREFIX = 'murzak_new_look:';

const cacheKey = (company) => `${CACHE_PREFIX}${company || 'default'}`;

const readCache = (company) => {
  try {
    return localStorage.getItem(cacheKey(company)) === '0' ? false : true;
  } catch (e) {
    return true; // storage can be unavailable (private mode); default to on
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
  enabled: true,
  status: 'ready',
  company: null,
  setEnabled: async () => true,
});

export const useNewLook = () => useContext(NewLookContext);

export const NewLookProvider = ({ children }) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const company = isAuthenticated ? getUserCompany(user) : null;
  const [state, setState] = useState({ enabled: true, status: 'ready' });
  // A late answer for a person who has since signed out or changed shop must not be applied
  const current = useRef(null);

  useEffect(() => {
    current.current = isAuthenticated ? company || 'default' : null;
    if (!isAuthenticated) {
      setState({ enabled: true, status: 'ready' });
      return undefined;
    }
    const asked = current.current;
    const saved = readCache(company);
    setState({ enabled: saved !== false, status: 'ready' });
    let cancelled = false;
    getNewLook(company)
      .then((enabled) => {
        if (cancelled || current.current !== asked) return;
        writeCache(company, enabled);
        setState({ enabled, status: 'ready' });
      })
      .catch(() => {
        if (cancelled || current.current !== asked) return;
        // Keep what this device last knew (or true by default)
        setState((prev) => ({ enabled: prev.enabled ?? true, status: 'error' }));
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

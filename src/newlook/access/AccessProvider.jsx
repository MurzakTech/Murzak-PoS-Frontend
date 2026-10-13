import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMyAccess } from '../../api/accessApi';

/**
 * Owner, manager or cashier for the signed-in person (ticket P1-8). Screens ask `useAccess().can('profit')` to
 * decide whether to draw Net profit, cost of goods or Money owed. This only chooses what to draw: the server
 * refuses a cashier's request for those figures itself.
 *
 * Until the server has answered, and if it cannot be asked, nothing protected is shown (`can` is false), because
 * showing too little is safer than showing too much. The last answer is kept on this device for each person, so a
 * till that starts without a connection draws what it drew last time; a fresh answer always replaces it.
 */
export const TIER_LABELS = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };
export const accessCacheKey = (userKey) => `murzak_new_look:access:${userKey}`;

const AccessContext = createContext({ tier: null, status: 'idle', can: () => false });

const readCache = (userKey) => {
  try {
    const saved = JSON.parse(localStorage.getItem(accessCacheKey(userKey)) || 'null');
    return saved && ['owner', 'manager', 'cashier'].includes(saved.tier) ? saved : null;
  } catch (e) {
    return null;
  }
};
const writeCache = (userKey, access) => {
  try {
    localStorage.setItem(accessCacheKey(userKey), JSON.stringify(access));
  } catch (e) {
    // Not critical
  }
};

export const AccessProvider = ({ userKey, children }) => {
  const [state, setState] = useState({ tier: null, can: {}, status: 'idle' });

  useEffect(() => {
    if (!userKey) {
      setState({ tier: null, can: {}, status: 'idle' });
      return undefined;
    }
    const saved = readCache(userKey);
    setState(saved ? { ...saved, status: 'ready' } : { tier: null, can: {}, status: 'loading' });
    let live = true;
    getMyAccess()
      .then((access) => {
        if (!live) return;
        writeCache(userKey, access);
        setState({ ...access, status: 'ready' });
      })
      .catch(() => {
        if (live) setState((prev) => ({ ...prev, status: prev.tier ? 'ready' : 'error' }));
      });
    return () => {
      live = false;
    };
  }, [userKey]);

  const can = useCallback((capability) => state.can[capability] === true, [state.can]);
  const value = useMemo(() => ({ tier: state.tier, label: state.tier ? TIER_LABELS[state.tier] : null, status: state.status, can }), [state, can]);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

export const useAccess = () => useContext(AccessContext);

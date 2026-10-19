import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { getBrand } from '../../api/brandApi';
import { getCompany } from '../../api/businessApi';
import { getUserCompany } from '../../utils/getUserCompany';
import { useNewLook } from '../NewLookProvider';
import { DEFAULT_BRAND } from './brandModel';
import { applyAccent, readCache, writeCache, writeDeviceBrand } from './deviceBrand';

/**
 * The shop's brand and details for the redesigned screens (ticket P7-3): the logo, accent colour, tagline, receipt footer and style,
 * and the business name, address, phone and tax number for the receipt header.
 *
 * It asks the server once when someone is signed in and the New look is on, and keeps the last answer on this device so a till that
 * opens offline still prints the shop's own receipt. The old screens (New look off) never read it and no accent is set for them. Both
 * answers are optional: when either cannot be loaded the receipt simply has a plainer header; selling is never held up by this.
 *
 * useBrand() gives { brand, business, status, applySaved }. Outside the provider (a test, a screen that is not in the New look) it
 * gives the plain default brand and no business details.
 */
export const BrandContext = createContext({ brand: DEFAULT_BRAND, business: {}, status: 'idle', applySaved: () => {} });

export const useBrand = () => useContext(BrandContext);

export const BrandProvider = ({ children }) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { enabled } = useNewLook();
  const company = isAuthenticated ? getUserCompany(user) : null;
  const [state, setState] = useState({ brand: DEFAULT_BRAND, business: {}, status: 'idle' });
  const asked = useRef(null);

  useEffect(() => {
    asked.current = isAuthenticated && enabled ? company || 'default' : null;
    if (!asked.current) {
      setState({ brand: DEFAULT_BRAND, business: {}, status: 'idle' });
      return undefined;
    }
    const saved = readCache(company);
    setState(saved ? { ...saved, status: 'ready' } : { brand: DEFAULT_BRAND, business: {}, status: 'loading' });
    let cancelled = false;
    const current = () => !cancelled && asked.current === (company || 'default');
    let latest = { brand: saved ? saved.brand : DEFAULT_BRAND, business: saved ? saved.business : {} };
    const remember = (part) => {
      latest = { ...latest, ...part };
      writeCache(company, latest);
      writeDeviceBrand({ logo: latest.brand.logo, accent: latest.brand.accent, backdrop: latest.brand.backdrop, name: latest.business.companyName || latest.business.name });
      setState({ ...latest, status: 'ready' });
    };
    getBrand(company)
      .then((brand) => current() && remember({ brand }))
      .catch(() => current() && setState((prev) => ({ ...prev, status: 'error' })));
    if (company) {
      getCompany(company)
        .then((business) => current() && remember({ business }))
        .catch(() => {}); // the receipt header is plainer without these; nothing else depends on them
    }
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, enabled, company]);

  // The accent reaches the shell only through the design tokens: one attribute on the page, removed when the New look is off
  const accent = state.brand.accent;
  // Signed out, the Sign-in page sets the accent it last knew on this device (it runs before this effect, so this must not clear it)
  useEffect(() => {
    if (isAuthenticated) applyAccent(enabled ? accent : null);
  }, [isAuthenticated, enabled, accent]);
  useEffect(() => () => applyAccent(null), []);

  // What Settings, Brand just saved: shown at once, and kept for the next offline start
  const business = useRef(state.business);
  business.current = state.business;
  const applySaved = useCallback(
    (brand) => {
      writeCache(company, { brand, business: business.current });
      writeDeviceBrand({ logo: brand.logo, accent: brand.accent, name: business.current.companyName || business.current.name });
      setState((prev) => ({ ...prev, brand, status: 'ready' }));
    },
    [company]
  );

  const value = useMemo(() => ({ brand: state.brand, business: state.business, status: state.status, applySaved }), [state, applySaved]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
};

export default BrandProvider;

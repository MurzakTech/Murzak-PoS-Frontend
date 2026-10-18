import { useEffect, useState } from 'react';
import { getBusinessFeatures, NO_FEATURES } from '../../api/setupApi';
import { useNewLook } from '../NewLookProvider';

/**
 * What the shop turned on by answering "What do you sell?": expiry tracking, barcodes and units first, services first. A screen asks
 * `useBusinessFeatures()` and ADDS these as reasons to show something; it never uses them to hide what it shows today.
 *
 * Only while the New look is on does it ask the server (so the current screens are not touched). The last answer is kept on this
 * device for each shop, so a screen draws the right thing at once and offline; a fresh answer replaces it.
 *
 *   status   'off' (New look off, nothing is asked), 'loading' (nothing known yet), 'stale' (the saved answer, the server not heard
 *            yet), 'ready' (the server's answer), 'error' (the server could not be asked; the saved answer, or nothing, is used)
 */
const cacheKey = (company) => `murzak_new_look:business-features:${company || 'default'}`;

const NOTHING = { kind: null, features: NO_FEATURES, openingCash: 0 };

const readSaved = (company) => {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey(company)) || 'null');
    if (!saved || typeof saved !== 'object') return null;
    return { kind: saved.kind || null, features: { ...NO_FEATURES, ...(saved.features || {}) }, openingCash: Number(saved.openingCash) || 0 };
  } catch (e) {
    return null;
  }
};

/** Keep an answer for the next start of this device (the wizard calls this after saving "What do you sell?") */
export const rememberBusinessFeatures = (company, data) => {
  try {
    localStorage.setItem(cacheKey(company), JSON.stringify({ kind: data.kind || null, features: data.features || NO_FEATURES, openingCash: Number(data.openingCash) || 0 }));
  } catch (e) {
    // Not critical: the next screen just asks the server
  }
};

const useBusinessFeatures = () => {
  const { enabled, company } = useNewLook();
  const [state, setState] = useState(() => {
    if (!enabled) return { status: 'off', ...NOTHING };
    const saved = readSaved(company);
    return saved ? { status: 'stale', ...saved } : { status: 'loading', ...NOTHING };
  });

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'off', ...NOTHING });
      return undefined;
    }
    const saved = readSaved(company);
    setState(saved ? { status: 'stale', ...saved } : { status: 'loading', ...NOTHING });
    let cancelled = false;
    getBusinessFeatures(company)
      .then((data) => {
        if (cancelled) return;
        rememberBusinessFeatures(company, data);
        setState({ status: 'ready', kind: data.kind, features: data.features, openingCash: data.openingCash });
      })
      .catch(() => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, status: 'error' }));
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, company]);

  return state;
};

export default useBusinessFeatures;

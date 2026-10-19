import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ensureIndustryUnits, getIndustryUnits } from '../../api/unitsApi';
import { useNewLook } from '../NewLookProvider';
import { setShopUnitWords, subscribeUnitWords, unitWordsVersion } from './unitWords';

/** The plain words of the shop's units: the industry list and the shop's own units (the lower case of the name is its one word) */
export const wordsFrom = (data) => [
  ...data.units.map((u) => ({ name: u.name, singular: u.singular, plural: u.plural })),
  ...data.custom.map((c) => ({ name: c.name, singular: c.name.toLowerCase(), plural: c.plural.toLowerCase() })),
];

/** Make a screen that shows units draw again when the shop's words arrive or change */
export const useUnitWordsVersion = () => useSyncExternalStore(subscribeUnitWords, unitWordsVersion, unitWordsVersion);

/**
 * The units of the shop's industry, then the shop's own, for a product form. Asks once; when an owner or manager opens the form and
 * some usual units are not on the site yet, they are added (safe to repeat) so they can be chosen at once. A cashier only reads.
 *
 *   status  'idle' (the New look is off), 'loading', 'ready', 'error' (the ordinary list of units is used instead)
 *   data    the answer of getIndustryUnits, or null
 *   apply   keep a newer answer (after the dialog added a unit or changed the kind of shop)
 */
const useShopUnits = () => {
  const { enabled, company } = useNewLook();
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null });
  const alive = useRef(true);

  const apply = useCallback(
    (data) => {
      setShopUnitWords(wordsFrom(data), company || '');
      setState({ status: 'ready', data });
    },
    [company]
  );

  const load = useCallback(async () => {
    try {
      let data = await getIndustryUnits({ company: company || undefined });
      if (data.canManage && data.missing > 0) {
        try {
          data = await ensureIndustryUnits({ company: company || undefined });
        } catch (e) {
          // The list is still useful without the missing ones
        }
      }
      if (alive.current) apply(data);
    } catch (e) {
      if (alive.current) setState((prev) => ({ status: 'error', data: prev.data }));
    }
  }, [company, apply]);

  useEffect(() => {
    alive.current = true;
    if (enabled) load();
    return () => {
      alive.current = false;
    };
  }, [enabled, load]);

  return { ...state, apply, reload: load };
};

export default useShopUnits;

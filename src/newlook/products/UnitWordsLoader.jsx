import { useEffect } from 'react';
import { getIndustryUnits } from '../../api/unitsApi';
import { useNewLook } from '../NewLookProvider';
import { clearShopUnitWords, savedUnitWordsCompany, setShopUnitWords } from './unitWords';
import { wordsFrom } from './useShopUnits';

/**
 * Draws nothing. While the New look is on and someone is signed in, it asks the server for the shop's units once and tells unitWords
 * their plain words, so the till, Sales, Stock levels and Products all say "jerrycans" and "tablets". Words saved on this device
 * are used until the answer comes; another shop's saved words are dropped. With the New look off nothing is asked.
 */
const UnitWordsLoader = () => {
  const { enabled, company } = useNewLook();

  useEffect(() => {
    if (!enabled) return undefined;
    if (savedUnitWordsCompany() && savedUnitWordsCompany() !== (company || '')) clearShopUnitWords();
    let cancelled = false;
    (async () => {
      try {
        const data = await getIndustryUnits({ company: company || undefined });
        if (!cancelled && data) setShopUnitWords(wordsFrom(data), company || '');
      } catch (e) {
        // Offline or not updated yet: the built-in words and the saved ones stay
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, company]);

  return null;
};

export default UnitWordsLoader;

import { useEffect, useState } from 'react';
import { getBusinessFeatures } from '../../api/setupApi';

/**
 * The usual opening cash for the Open till dialog (ticket P5-4, step 3 of first-time set-up). It is a suggestion: it fills in the first
 * amount only while that amount is still empty, and whoever opens the till can change it. With the New look off nothing is asked and
 * nothing is filled in, so the current dialog behaves exactly as before. If the server cannot be asked the dialog just opens empty.
 *
 *   enabled      the shop's New look switch
 *   company      the shop
 *   sessionOpen  a till is already open (the dialog is not shown, so nothing is filled in)
 *   rows         how many opening rows the form has (a fresh form has none until it is reset; the amount is filled in after)
 *   getValue, setValue   read and write the first row's amount, as the form library's getValues and setValue
 *   load         injectable for tests
 *
 * Returns the suggested amount (0 when there is none).
 */
const FIRST_AMOUNT = 'balance_details.0.opening_amount';

const useUsualOpening = ({ enabled, company, sessionOpen, rows, getValue, setValue, load = getBusinessFeatures }) => {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (!enabled || !company) return undefined;
    let cancelled = false;
    load(company)
      .then((found) => {
        if (!cancelled) setAmount(found.openingCash > 0 ? found.openingCash : 0);
      })
      .catch(() => {
        // Offline or not reachable: the till opens with an empty amount, as it always did
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, company, load]);

  useEffect(() => {
    if (!enabled || sessionOpen || !(amount > 0) || !rows) return;
    if (!Number(getValue(FIRST_AMOUNT))) setValue(FIRST_AMOUNT, amount);
  }, [enabled, sessionOpen, amount, rows, getValue, setValue]);

  return enabled ? amount : 0;
};

export default useUsualOpening;

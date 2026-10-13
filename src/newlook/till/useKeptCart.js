import { useEffect, useRef } from 'react';
import { clearKept, keptCartKey, loadKept, saveKept } from './cartStore';

/**
 * Keeps the sale in progress on this device (see cartStore.js). While `enabled` is false (the New look is off) it does
 * nothing at all, so the old till behaves exactly as before.
 *
 *   sale        { cart, customer, customerId, selectedCustomerObj, customerPriceList, manualDiscountType,
 *                 manualDiscountValue, activeHeldLabel, kitchen } as they are now
 *   onRestore   called once, with the kept sale, when the till opens with an empty cart and a sale was kept
 *   Returns { clear } to drop the kept sale at once (after a sale, a clear or a hold).
 */
const useKeptCart = ({ enabled, company, user, sale, onRestore }) => {
  const key = keptCartKey(company, user);
  const started = useRef(false);
  const skipSave = useRef(false);

  // Read once, when the till first opens with the New look on
  useEffect(() => {
    if (!enabled || started.current || !user) return;
    started.current = true;
    const kept = loadKept(key);
    if (kept && sale.cart.length === 0) {
      skipSave.current = true; // do not write the still-empty cart over the kept one before it is restored
      onRestore(kept);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user, key]);

  // Write after every change (an empty cart removes the kept one)
  useEffect(() => {
    if (!enabled || !started.current || !user) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    saveKept(key, sale);
  }, [enabled, user, key, sale]);

  return { clear: () => clearKept(key) };
};

export default useKeptCart;

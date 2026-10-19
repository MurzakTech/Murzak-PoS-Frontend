import React, { useEffect, useState } from 'react';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import T from './strings.till';

/**
 * Says "Sale complete, KES 100" to a screen reader when a sale is finished (Accessibility rules, Messages). It is a polite
 * live region that is not drawn on screen. The words are added a moment after the region is on the page, because a screen
 * reader only speaks a live region whose words change after it exists. Show it only while the New look is on.
 *
 *   total   the amount of the completed sale
 */
export const ANNOUNCE_DELAY_MS = 150;

const SaleAnnouncement = ({ total }) => {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setMessage(fill(T.saleComplete, { amount: formatMoney(total) })), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [total]);
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="nl-visually-hidden">
      {message}
    </div>
  );
};

export default SaleAnnouncement;

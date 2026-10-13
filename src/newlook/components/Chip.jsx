import React from 'react';
import Icon from './Icon';

/**
 * Small labels of the redesign (Part 1, Components): Chip, Badge, Status label and Payment chip.
 * Colour is never the only signal: a status is an icon plus a word, and a payment method always shows its name.
 */

/** A general pill: a soft fill with a short label. tone "brand" colours the text with brand-text. */
export const Chip = ({ tone = 'neutral', icon, children, className = '' }) => (
  <span className={['nl-chip', tone === 'brand' && 'nl-chip--brand', className].filter(Boolean).join(' ')}>
    {icon ? <Icon name={icon} /> : null}
    {children}
  </span>
);

/** A count, such as the number of unpaid sales on a tab. 100 or more shows as 99+. */
export const Badge = ({ count, max = 99, label }) => {
  const shown = count > max ? `${max}+` : String(count);
  return (
    <span className="nl-badge" aria-label={label ? `${count} ${label}` : undefined}>
      {shown}
    </span>
  );
};

// Icon plus word, and the token colour of each status (Part 1: Paid check good, Unpaid clock warn,
// Overdue alert bad, Part returned arrow ink-2)
const STATUSES = {
  paid: { icon: 'check', tone: 'good', words: 'Paid' },
  unpaid: { icon: 'clock', tone: 'warn', words: 'Unpaid' },
  overdue: { icon: 'alert', tone: 'bad', words: 'Overdue' },
  'part-returned': { icon: 'undo', tone: 'neutral', words: 'Part returned' },
};
export const STATUS_NAMES = Object.keys(STATUSES);

export const StatusLabel = ({ status, children }) => {
  const s = STATUSES[status] || { icon: 'info', tone: 'neutral', words: String(status || '') };
  return (
    <span className={`nl-status nl-status--${s.tone}`} data-status={status}>
      <Icon name={s.icon} />
      <span>{children || s.words}</span>
    </span>
  );
};

// The payment methods that have a series colour (Part 1: M-Pesa series-1, Cash series-2, Card series-3,
// On credit series-4); any other method is grouped as "other" in the compare grey.
const METHODS = [
  { key: 'mpesa', test: /m-?pesa/i },
  { key: 'cash', test: /^cash$/i },
  { key: 'card', test: /^(credit )?card$/i },
  { key: 'credit', test: /^(on )?credit$/i },
];
export const paymentKey = (method) => (METHODS.find((m) => m.test.test(String(method || '').trim())) || { key: 'other' }).key;

/** A small pill with a dot in the method's series colour and the method's name (always shown). */
export const PaymentChip = ({ method }) => (
  <span className="nl-pay" data-method={paymentKey(method)}>
    <span className="nl-pay__dot" aria-hidden="true" />
    <span>{method}</span>
  </span>
);

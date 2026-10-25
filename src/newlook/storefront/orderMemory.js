/**
 * What the shopper's phone remembers about an order it placed: how they chose to pay and the WhatsApp link that opens a
 * chat with the shop. The order page is opened later from a link, and the server tells it only where the order is, so
 * this is how the page knows to offer "send the M-Pesa prompt again" for an M-Pesa order and not for a cash one.
 *
 * Nothing secret is kept (the order code is already in the page's address), and nothing depends on it: without it the
 * page still shows the order's status.
 */
const KEY_PREFIX = 'murzak_order:';
const MAX_KEPT = 20;
const INDEX_KEY = 'murzak_orders';

export const rememberOrder = (token, details) => {
  if (!token) return;
  try {
    const entry = {
      payment: details.payment === 'mpesa' ? 'mpesa' : 'cash',
      whatsappLink: /^https:\/\/wa\.me\//.test(details.whatsappLink || '') ? details.whatsappLink : '',
    };
    localStorage.setItem(KEY_PREFIX + token, JSON.stringify(entry));
    // Keep the phone tidy: only the latest few orders are remembered
    const index = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]').filter((t) => t !== token);
    index.push(token);
    while (index.length > MAX_KEPT) localStorage.removeItem(KEY_PREFIX + index.shift());
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    // Storage blocked or full: the order page still works
  }
};

export const recallOrder = (token) => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_PREFIX + token) || 'null');
    if (!raw || typeof raw !== 'object') return null;
    return {
      payment: raw.payment === 'mpesa' ? 'mpesa' : 'cash',
      // Only a WhatsApp link is ever opened from here, whatever the storage holds
      whatsappLink: /^https:\/\/wa\.me\//.test(raw.whatsappLink || '') ? raw.whatsappLink : '',
    };
  } catch (e) {
    return null;
  }
};

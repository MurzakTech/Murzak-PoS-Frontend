/**
 * Held sales: bills put on hold at the till (a restaurant table, a bar tab, a
 * customer who stepped away) and brought back later.
 *
 * They are kept in the browser on this device. That is a limit worth knowing:
 * another till or phone cannot see them, and clearing the browser's data
 * removes them. What this module guarantees is that they are kept apart for
 * each business, that a failed save is reported instead of ignored, and that
 * what is stored cannot crash the till if it is damaged.
 */

export const LEGACY_KEY = 'pos_held_sales_v1'; // one shared list for everyone on the device
export const STALE_AFTER_HOURS = 12;
export const MAX_LABEL = 40;

export const heldKey = (company) => `pos_held_sales_v2:${company || 'no-company'}`;

const isHeld = (h) => h && typeof h === 'object' && h.id !== undefined && Array.isArray(h.cart);

const parseList = (raw) => {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter(isHeld) : [];
  } catch (e) {
    return [];
  }
};

/**
 * The held sales for this business. The first time this runs after the update,
 * sales held under the old shared key are adopted by the business that opens
 * the till first, then the old key is removed so nobody else sees them.
 */
export const readHeld = (storage, company) => {
  try {
    const key = heldKey(company);
    const own = storage.getItem(key);
    if (own !== null) return parseList(own);

    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy === null) return [];
    const adopted = parseList(legacy);
    try {
      storage.setItem(key, JSON.stringify(adopted));
      storage.removeItem(LEGACY_KEY);
    } catch (e) {
      // could not move them; still show them this time
    }
    return adopted;
  } catch (e) {
    return [];
  }
};

/** Saves the list. Returns false when the browser refused (storage full or blocked), so the caller can say so. */
export const writeHeld = (storage, company, list) => {
  try {
    storage.setItem(heldKey(company), JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
};

export const cleanLabel = (label) => String(label ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL);

/** A held sale from what is on the till right now */
export const makeHeldSale = (snapshot, label, now = new Date()) => ({
  id: now.getTime(),
  heldAt: now.toISOString(),
  label: cleanLabel(label),
  ...snapshot,
});

const pad = (n) => String(n).padStart(2, '0');

/** What to call a held sale: its name, else the customer, else the time it was held */
export const heldTitle = (h) => {
  if (h.label) return h.label;
  if (h.customer && h.customer !== 'Walk-in Customer') return h.customer;
  const d = new Date(h.heldAt);
  return Number.isNaN(d.getTime()) ? 'Held sale' : `Sale at ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const heldTotal = (h) => h.cart.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);

/** How long ago it was held, in words, and whether it has been open long enough to deserve a second look */
export const heldAge = (h, now = new Date()) => {
  const held = new Date(h.heldAt).getTime();
  if (Number.isNaN(held)) return { text: '', stale: false };
  const minutes = Math.max(0, Math.floor((now.getTime() - held) / 60000));
  const stale = minutes >= STALE_AFTER_HOURS * 60;
  if (minutes < 1) return { text: 'just now', stale };
  if (minutes < 60) return { text: `${minutes} min ago`, stale };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return { text: rest ? `${hours} h ${rest} min ago` : `${hours} h ago`, stale };
  }
  return { text: `${Math.floor(hours / 24)} days ago`, stale };
};

/** Is another held sale already using this name? (ignoring capitals; the one being renamed does not count) */
export const labelInUse = (list, label, exceptId) => {
  const wanted = cleanLabel(label).toLowerCase();
  return wanted !== '' && list.some((h) => h.id !== exceptId && (h.label || '').toLowerCase() === wanted);
};

export const renameHeld = (list, id, label) => list.map((h) => (h.id === id ? { ...h, label: cleanLabel(label) } : h));

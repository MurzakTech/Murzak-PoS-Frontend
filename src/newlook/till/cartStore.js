/**
 * The cart that is kept across a refresh (Spec: Till, "Cart survives a refresh"; AC-21). The sale in progress is written to
 * this device as the cashier works, and read back when the till opens again, so an accidental refresh, a closed tab or a
 * crash loses nothing. It lives on this device only, belongs to one person in one business, and is dropped when the sale
 * is finished, cleared or held, and after a day, so an old cart never turns up the next morning.
 *
 * Nothing here talks to the server: adding an item and holding a sale must never wait for the network.
 */
export const KEPT_CART_VERSION = 1;
export const KEPT_CART_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const keptCartKey = (company, user) => `murzak_new_look:till-cart:${company || 'shop'}:${user || 'user'}`;

/** The parts of the sale that are kept: the same ones a held sale keeps, so the two always agree */
export const pickKept = (sale) => ({
  cart: Array.isArray(sale.cart) ? sale.cart : [],
  customer: sale.customer || 'Walk-in Customer',
  customerId: sale.customerId || null,
  selectedCustomerObj: sale.selectedCustomerObj || null,
  customerPriceList: sale.customerPriceList || 'Standard Selling',
  manualDiscountType: sale.manualDiscountType || 'percentage',
  manualDiscountValue: Number(sale.manualDiscountValue) || 0,
  activeHeldLabel: sale.activeHeldLabel || '',
  kitchen: sale.kitchen || null,
});

export const hasKeptItems = (sale) => Boolean(sale && Array.isArray(sale.cart) && sale.cart.length > 0);

export const saveKept = (key, sale, now = Date.now()) => {
  try {
    if (!hasKeptItems(sale)) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify({ version: KEPT_CART_VERSION, savedAt: now, sale: pickKept(sale) }));
  } catch (e) {
    // The device is full or storage is blocked: the till still works, it just cannot keep the cart
  }
};

/** The kept sale, or null when there is none, it is too old, or it cannot be read */
export const loadKept = (key, now = Date.now()) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== KEPT_CART_VERSION || !saved.sale) return null;
    if (!(now - Number(saved.savedAt) < KEPT_CART_MAX_AGE_MS)) {
      localStorage.removeItem(key);
      return null;
    }
    return hasKeptItems(saved.sale) ? pickKept(saved.sale) : null;
  } catch (e) {
    return null;
  }
};

export const clearKept = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    // Nothing to do
  }
};

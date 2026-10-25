/**
 * The shopper's basket on a business's online store.
 *
 * The basket is only a convenience for the shopper: it remembers what they picked on this phone. The price shown here is
 * the one the shop had when the product was added; the server prices the order again at checkout, and its total is the
 * one that counts. So nothing here is trusted for money, and a basket that was edited in the browser's storage can at
 * worst show a wrong number before checkout, never change what is charged.
 *
 * Kept per shop (a phone may visit several), in the browser's own storage, and never required: when storage is
 * blocked (private browsing) the basket simply lasts until the page closes.
 */

export const MAX_LINE_QTY = 99;
const KEY_PREFIX = 'murzak_cart:';

export const emptyCart = () => ({ lines: [] });

const whole = (value, max) => {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), max);
};

/** The most of this product that can be ordered: 99, or fewer when the shop says only a few are left. */
export const maxFor = (product) => {
  const left = Number(product?.low_stock);
  return Number.isFinite(left) && left > 0 ? Math.min(Math.floor(left), MAX_LINE_QTY) : MAX_LINE_QTY;
};

const lineFrom = (product, qty) => ({
  item_code: product.item_code,
  item_name: product.item_name,
  price: Number(product.price) || 0,
  unit: product.unit || '',
  image: product.image || '',
  category: product.category || '',
  max: maxFor(product),
  qty,
});

/**
 * actions:
 *   { type: 'add', product, qty = 1 }   put a product in the basket, or add to what is there
 *   { type: 'set', item_code, qty }     change a quantity; zero removes the line
 *   { type: 'remove', item_code }
 *   { type: 'clear' }
 *   { type: 'load', lines }             replace everything with a saved basket (already cleaned)
 */
export const cartReducer = (state, action) => {
  switch (action.type) {
    case 'add': {
      const product = action.product;
      if (!product?.item_code || product.in_stock === false) return state;
      const add = Math.max(1, whole(action.qty ?? 1, MAX_LINE_QTY));
      const found = state.lines.find((l) => l.item_code === product.item_code);
      if (found) {
        const qty = Math.min(found.qty + add, found.max);
        return qty === found.qty ? state : { lines: state.lines.map((l) => (l === found ? { ...l, qty } : l)) };
      }
      return { lines: [...state.lines, lineFrom(product, Math.min(add, maxFor(product)))] };
    }
    case 'set': {
      const found = state.lines.find((l) => l.item_code === action.item_code);
      if (!found) return state;
      const qty = whole(action.qty, found.max);
      if (qty === 0) return { lines: state.lines.filter((l) => l !== found) };
      return qty === found.qty ? state : { lines: state.lines.map((l) => (l === found ? { ...l, qty } : l)) };
    }
    case 'remove':
      return { lines: state.lines.filter((l) => l.item_code !== action.item_code) };
    case 'clear':
      return state.lines.length ? emptyCart() : state;
    case 'load':
      return { lines: action.lines };
    default:
      return state;
  }
};

export const cartCount = (cart) => cart.lines.reduce((sum, l) => sum + l.qty, 0);
export const cartSubtotal = (cart) => cart.lines.reduce((sum, l) => sum + l.qty * l.price, 0);

/** What is sent to the server: only the product and the quantity. The price is never sent. */
export const orderLines = (cart) => cart.lines.map((l) => ({ item_code: l.item_code, qty: l.qty }));

/** Anything read back from storage is checked line by line, so a damaged or edited entry cannot break the page. */
export const cleanSavedLines = (saved) => {
  if (!Array.isArray(saved)) return [];
  const seen = new Set();
  const lines = [];
  saved.slice(0, 50).forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const code = typeof raw.item_code === 'string' ? raw.item_code.trim() : '';
    if (!code || seen.has(code)) return;
    const max = whole(raw.max, MAX_LINE_QTY) || MAX_LINE_QTY;
    const qty = whole(raw.qty, max);
    if (!qty) return;
    seen.add(code);
    lines.push({
      item_code: code,
      item_name: typeof raw.item_name === 'string' ? raw.item_name.slice(0, 140) : code,
      price: Number.isFinite(Number(raw.price)) && Number(raw.price) >= 0 ? Number(raw.price) : 0,
      unit: typeof raw.unit === 'string' ? raw.unit.slice(0, 20) : '',
      image: typeof raw.image === 'string' ? raw.image.slice(0, 500) : '',
      category: typeof raw.category === 'string' ? raw.category.slice(0, 140) : '',
      max,
      qty,
    });
  });
  return lines;
};

export const storageKey = (slug) => `${KEY_PREFIX}${String(slug || '').toLowerCase()}`;

export const loadCart = (slug) => {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    return { lines: raw ? cleanSavedLines(JSON.parse(raw)) : [] };
  } catch (e) {
    return emptyCart();
  }
};

export const saveCart = (slug, cart) => {
  try {
    if (cart.lines.length) localStorage.setItem(storageKey(slug), JSON.stringify(cart.lines));
    else localStorage.removeItem(storageKey(slug));
  } catch (e) {
    // Storage blocked or full: the basket just is not remembered
  }
};

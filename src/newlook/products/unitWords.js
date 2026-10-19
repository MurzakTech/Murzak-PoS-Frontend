import T from './strings.products';
import U from './strings.units';

/**
 * Units in plain words (ticket P4-2). The shop stores a unit under its ERPNext name ("Nos", "Kg", "Ltr", "Box"); a person
 * reads "pieces", "kilograms", "litres", "boxes". A unit with no plain word is shown exactly as it is stored, so nothing
 * is ever hidden or guessed. The words are in strings.products.js (units); the rename map says "Nos" reads "piece".
 */
// The shop's own words (its industry units and its own units), by lower case stored name. They are filled from the server
// (setShopUnitWords) and kept on this device so an offline till still says "jerrycans". They come before the built-in words.
const SAVED_KEY = 'murzak_new_look:unit-words';
let shopWords = {};
let version = 0;
const listeners = new Set();

const keyOf = (uom) => String(uom === null || uom === undefined ? '' : uom).trim().toLowerCase();

const readSaved = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || 'null');
    return saved && typeof saved === 'object' && saved.words && typeof saved.words === 'object' ? saved : null;
  } catch (e) {
    return null;
  }
};

const cleanWords = (words) => {
  const out = {};
  Object.keys(words || {}).forEach((key) => {
    const pair = words[key];
    if (Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string' && pair[0] && pair[1]) out[key] = [pair[0], pair[1]];
  });
  return out;
};

const initial = readSaved();
if (initial) shopWords = cleanWords(initial.words);

/**
 * Tell unitWords the shop's units: [{ name, singular, plural }] (the industry units and the shop's own, with the plain
 * words). A custom unit has the lower case of its name as its one word. Replaces what was set before; `company` is kept
 * with them so another shop's words are never used.
 */
export const setShopUnitWords = (units = [], company = '') => {
  const next = {};
  units.forEach((u) => {
    const name = keyOf(u && u.name);
    if (!name) return;
    const one = String(u.singular || name).trim().toLowerCase();
    const many = String(u.plural || u.singular || name).trim().toLowerCase();
    next[name] = [one, many];
  });
  shopWords = next;
  version += 1;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify({ company, words: next }));
  } catch (e) {
    // Not critical: the next start asks the server again
  }
  listeners.forEach((fn) => fn());
};

/** The company the saved words belong to, so a different shop starts clean */
export const savedUnitWordsCompany = () => (readSaved() || {}).company || '';

/** Forget the shop's words (signing out, or another shop) */
export const clearShopUnitWords = () => {
  shopWords = {};
  version += 1;
  try {
    localStorage.removeItem(SAVED_KEY);
  } catch (e) {
    // Not critical
  }
  listeners.forEach((fn) => fn());
};

/** For useSyncExternalStore: a screen that shows units draws again when the shop's words change */
export const subscribeUnitWords = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const unitWordsVersion = () => version;

const find = (uom) => {
  const key = keyOf(uom);
  if (!key) return null;
  if (Object.prototype.hasOwnProperty.call(shopWords, key)) return shopWords[key];
  if (Object.prototype.hasOwnProperty.call(T.units, key)) return T.units[key];
  return Object.prototype.hasOwnProperty.call(U.words, key) ? U.words[key] : null;
};

const as = (uom) => String(uom === null || uom === undefined ? '' : uom).trim();

/** The plain word for many: unitWords('Nos') gives 'pieces', unitWords('Kg') 'kilograms'. Unknown units come back as stored; nothing gives ''. */
export const unitWords = (uom) => {
  const found = find(uom);
  return found ? found[1] : as(uom);
};

/** The plain word for one: unitWord('Nos') gives 'piece' */
export const unitWord = (uom) => {
  const found = find(uom);
  return found ? found[0] : as(uom);
};

/** Capitalised for a list of choices: unitLabel('Box') gives 'Boxes' */
export const unitLabel = (uom) => {
  const text = unitWords(uom);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

/** A quantity with its unit in words: quantityText(1, 'Nos') gives '1 piece'; quantityText(12, 'Nos') '12 pieces'; quantityText(2.5, 'Kg') '2.5 kilograms' */
export const quantityText = (qty, uom) => {
  if (qty === null || qty === undefined || qty === '' || Number.isNaN(Number(qty))) return '';
  const n = Number(qty);
  const shown = n.toLocaleString('en-US', { maximumFractionDigits: 3 });
  const words = Math.abs(n) === 1 ? unitWord(uom) : unitWords(uom);
  return words ? `${shown} ${words}` : shown;
};

/** Is there a plain word for this unit? */
export const hasUnitWords = (uom) => find(uom) !== null;

const squash = (text) => String(text === null || text === undefined ? '' : text).trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Which stored unit does this text mean? The stored name ("Nos"), the singular ("piece") and the plural ("pieces") of any
 * unit in `shopUnits` all give its stored name; capital letters and extra spaces do not matter. A short form like "pcs" or
 * "kgs" gives the unit with the same plain word. `shopUnits` is a list of stored names or of { name, singular?, plural? }.
 *
 *   resolveUnit('Pieces', ['Nos', 'Kg'])  gives { unit: 'Nos', known: true }
 *   resolveUnit('', ['Nos'])              gives { unit: '', known: true }   (nothing given, the caller uses its default)
 *   resolveUnit('furlong', ['Nos'])       gives { unit: '', known: false }  (the caller must report it, never drop it silently)
 *
 * When two stored names have the same plain word (Ltr and Litre), the first in `shopUnits` wins.
 */
export const resolveUnit = (text, shopUnits = []) => {
  const wanted = squash(text);
  if (!wanted) return { unit: '', known: true };
  const list = (shopUnits || [])
    .map((u) => (typeof u === 'string' ? { name: u } : u))
    .filter((u) => u && String(u.name || '').trim())
    .map((u) => ({ name: String(u.name).trim(), singular: squash(u.singular), plural: squash(u.plural) }));
  const hit = (test) => list.find(test);
  const exact = hit((u) => squash(u.name) === wanted);
  if (exact) return { unit: exact.name, known: true };
  const words = (u) => {
    const found = find(u.name);
    return [u.singular, u.plural, found ? found[0] : '', found ? found[1] : ''].filter(Boolean);
  };
  const byWord = hit((u) => words(u).includes(wanted));
  if (byWord) return { unit: byWord.name, known: true };
  // A short form ("pcs", "kgs", "ltr") means the unit with the same plain word
  const short = find(wanted);
  if (short) {
    const same = hit((u) => words(u).includes(short[0]));
    if (same) return { unit: same.name, known: true };
  }
  return { unit: '', known: false };
};

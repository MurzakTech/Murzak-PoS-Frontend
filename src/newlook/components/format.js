import S from '../strings';
import fill from '../labels/fill';

const T = S.components.format;

/**
 * Number formats of the redesign (Part 1, Language and formats).
 *   Money: KES 2,350, a prefix, a space, a comma for thousands, no decimals unless there are cents.
 *   Counts: with their noun, "1 item", "7 items".
 *   "Showing x of y": how many rows are on screen out of how many there are.
 */

/** 2350 gives "KES 2,350"; 2350.5 gives "KES 2,350.50". Never a dollar sign. Missing values give an empty string. */
export const formatMoney = (amount) => {
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(Number(amount))) return '';
  const n = Number(amount);
  const hasCents = Math.round(n * 100) % 100 !== 0;
  const body = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 });
  return fill(T.money, { sign: n < 0 ? '-' : '', currency: T.currency, amount: body });
};

/** formatCount(1, 'item') gives "1 item"; formatCount(7, 'item') gives "7 items"; pass a plural for irregular nouns. */
export const formatCount = (n, singular, plural) => fill(T.count, { count: Number(n).toLocaleString('en-US'), noun: Number(n) === 1 ? singular : plural || `${singular}${T.pluralEnding}` });

/** formatShowing(20, 135) gives "Showing 20 of 135". */
export const formatShowing = (shown, total) => fill(T.showing, { shown: Number(shown).toLocaleString('en-US'), total: Number(total).toLocaleString('en-US') });

/**
 * A percentage with one decimal at most and no trailing zero: 21.5 gives "21.5%", 25 gives "25%", 13.2345 gives "13.2%".
 * Missing or non-numeric values give "0%". The sign is kept (-3.46 gives "-3.5%").
 */
export const formatPercent = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '0%';
  const rounded = Math.round(n * 10) / 10;
  return `${Object.is(rounded, -0) ? 0 : rounded}%`;
};

/** The number alone, rounded the same way: formatPercentNumber(13.2345) gives 13.2. For templates that already carry the % sign. */
export const percentNumber = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  const rounded = Math.round(n * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
};

/** "Saved 1 row" / "Saved 20 rows" style: a count of rows with its noun, using the same plural rule as formatCount */
export const rowsWords = (n) => formatCount(n, T.rowNoun);

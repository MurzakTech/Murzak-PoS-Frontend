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
  return `${n < 0 ? '-' : ''}KES ${body}`;
};

/** formatCount(1, 'item') gives "1 item"; formatCount(7, 'item') gives "7 items"; pass a plural for irregular nouns. */
export const formatCount = (n, singular, plural) => `${Number(n).toLocaleString('en-US')} ${Number(n) === 1 ? singular : plural || `${singular}s`}`;

/** formatShowing(20, 135) gives "Showing 20 of 135". */
export const formatShowing = (shown, total) => `Showing ${Number(shown).toLocaleString('en-US')} of ${Number(total).toLocaleString('en-US')}`;

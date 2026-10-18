/**
 * Day-first dates for date fields (Language and formats: "12/10/2026 where a number is needed, and date
 * fields that ask for dd/mm/yyyy"). The field shows dd/mm/yyyy and hands the screen an ISO date (yyyy-mm-dd),
 * or an empty string while the typed date is not a real one.
 */

/** Keep digits only and put the slashes in: "12102026" becomes "12/10/2026". */
export const maskDate = (text) => {
  const digits = String(text || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/** "12/10/2026" gives "2026-10-12"; anything that is not a real calendar date gives "" (so 31/02/2026 is refused). */
export const parseDate = (display) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display || '');
  if (!m) return '';
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  const real = d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
  return real && year >= 1000 ? `${m[3]}-${m[2]}-${m[1]}` : '';
};

/** "2026-10-12" gives "12/10/2026"; empty or invalid input gives "". */
export const formatDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

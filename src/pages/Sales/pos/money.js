// Money display and cash-handling helpers for the till.

// 1250 -> "1,250"; 1250.5 -> "1,250.50". Whole amounts drop the decimals so big numbers stay readable.
export const fmt = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString('en-KE', {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

export const money = (n, currency = 'KES') => `${currency} ${fmt(n)}`;

// Round an amount to the cent so floating point noise never shows on screen or in totals
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Quick "customer gave me..." buttons: the exact amount plus the next common
 * note combinations above it, so most cash sales need one tap.
 * total 1284 -> [1284, 1300, 1500, 2000]
 */
export const cashSuggestions = (total) => {
  const t = round2(total);
  if (t <= 0) return [];
  const up = (step) => Math.ceil(t / step) * step;
  const set = new Set([t, up(50), up(100), up(500), up(1000)]);
  return [...set].filter((v) => v >= t).sort((a, b) => a - b).slice(0, 5);
};

/**
 * What the amount display shows after a number pad key press. Keeps at most two
 * decimals and nine digits, and never shows leading zeros.
 * ('', '5') -> '5'; ('5', '00') -> '500'; ('1.5', '00') -> '1.50'; ('', '.') -> '0.'
 */
export const nextBuffer = (buffer, key) => {
  if (key === 'clear') return '';
  if (key === 'back') return buffer.slice(0, -1);
  if (key === '.') return buffer.includes('.') ? buffer : buffer === '' ? '0.' : `${buffer}.`;
  let next = buffer;
  for (const digit of key) {
    if (/\.\d{2}$/.test(next) || next.replace('.', '').length >= 9) break;
    next = next === '0' ? digit : next + digit;
  }
  return next;
};

// '1250.5' -> '1,250.5' while typing (keeps a trailing '.' or '.0' visible)
export const formatBuffer = (buffer) => {
  if (buffer === '') return '';
  if (!buffer.includes('.')) return fmt(parseFloat(buffer));
  const [whole, cents] = buffer.split('.');
  return `${Number(whole || 0).toLocaleString('en-KE')}.${cents}`;
};

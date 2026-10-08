/**
 * Kenyan mobile numbers, the way people actually type them.
 *
 * The server expects 254XXXXXXXXX (12 digits). People type 0712 345 678,
 * +254 712 345 678 or 254712345678. We accept all of those and convert to the
 * server format, so nobody is told to "use the correct format" for something
 * the computer can work out.
 */

// Returns the number in 254XXXXXXXXX form, or the cleaned input if it does not look Kenyan
export const normalizeKenyanPhone = (input) => {
  const digits = String(input || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`; // 0712345678
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`; // 712345678
  return digits; // 254712345678 (already right) or something invalid
};

export const isValidKenyanMobile = (input) => /^254[17]\d{8}$/.test(normalizeKenyanPhone(input));

export const PHONE_ERROR = 'Enter a Kenyan mobile number, for example 0712 345 678';

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/**
 * One sign-in box for both: decide whether what was typed is an email or a phone number.
 * 'jane@shop.co.ke' -> { type: 'email', value: 'jane@shop.co.ke' }
 * '0712 345 678'    -> { type: 'phone', value: '254712345678' }
 * anything else     -> { type: null }
 */
export const classifyLoginId = (input) => {
  const raw = String(input || '').trim();
  if (raw.includes('@')) return EMAIL_PATTERN.test(raw) ? { type: 'email', value: raw } : { type: null };
  if (isValidKenyanMobile(raw)) return { type: 'phone', value: normalizeKenyanPhone(raw) };
  return { type: null };
};

// True once the box holds digits rather than letters, so the screen can show a phone hint
export const looksLikePhone = (input) => /^[+\d][\d\s-]*$/.test(String(input || '').trim());

export const LOGIN_ID_ERROR = 'Enter your email address, or a Kenyan mobile number like 0712 345 678';

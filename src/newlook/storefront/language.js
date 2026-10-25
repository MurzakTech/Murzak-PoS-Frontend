import fill from '../labels/fill';
import STRINGS from './strings.storefront';

/**
 * The language of the online store. A shopper is not signed in, so the choice is kept on their own phone, and the
 * first time it follows the phone's language (Swahili phones see Swahili).
 */
export const LANGUAGES = ['en', 'sw'];
const KEY = 'murzak_shop_language';

export const detectLanguage = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGUAGES.includes(saved)) return saved;
  } catch (e) {
    // Storage blocked: fall through to the phone's language
  }
  const phone = typeof navigator !== 'undefined' ? String(navigator.language || '').toLowerCase() : '';
  return phone.startsWith('sw') ? 'sw' : 'en';
};

export const saveLanguage = (language) => {
  try {
    localStorage.setItem(KEY, language);
  } catch (e) {
    // The choice just is not remembered
  }
};

/** translator('sw') gives t(key, values): the shopper's words for a key, with {placeholders} filled in. */
export const translator = (language) => {
  const words = STRINGS[language] || STRINGS.en;
  return (key, values) => {
    const text = words[key] ?? STRINGS.en[key] ?? key;
    return values ? fill(text, values) : text;
  };
};

export const otherLanguage = (language) => (language === 'sw' ? 'en' : 'sw');

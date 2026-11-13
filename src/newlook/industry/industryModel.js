import T from './strings.industry';

/**
 * The industry "personality" of a store, as the browser keeps it (server: industry_profile.py).
 *
 * A profile is { key, label, features, words, look, homeCards, source }. Anything the server leaves out falls back to the
 * general shop, which is the till exactly as it was before profiles existed: every feature off and today's words. So a
 * server that has not been updated, or a profile that cannot be read, changes nothing on screen.
 */

export const FEATURE_NAMES = [
  'prescription_only',
  'expiry',
  'dispensing_register',
  'antibiotics_prescription_only',
  'controlled_register',
  'tables',
  'kitchen_tickets',
  'void_approval',
  'waiter_on_sale',
  'waiter_cashup',
  'tourism_levy',
];

export const GENERAL_WORDS = T.generalWords;

const NO_FEATURES = Object.fromEntries(FEATURE_NAMES.map((name) => [name, false]));

export const GENERAL_PROFILE = Object.freeze({
  key: 'general',
  label: T.generalLabel,
  features: Object.freeze({ ...NO_FEATURES }),
  words: Object.freeze({ ...GENERAL_WORDS }),
  look: Object.freeze({ accent: 'indigo', theme: 'light' }),
  homeCards: Object.freeze([]),
  source: 'default',
  outlet: null,
  canChange: false,
});

const KEYS = ['general', 'pharmacy', 'restaurant'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** The server's answer as a profile the screens can trust: only known keys, true booleans, a word for every key. */
export const readProfile = (data) => {
  if (!data || typeof data !== 'object') return GENERAL_PROFILE;
  const key = KEYS.includes(data.key) ? data.key : 'general';
  const features = { ...NO_FEATURES };
  FEATURE_NAMES.forEach((name) => {
    features[name] = data.features?.[name] === true;
  });
  const words = { ...GENERAL_WORDS };
  Object.keys(GENERAL_WORDS).forEach((name) => {
    const word = text(data.words?.[name]);
    if (word) words[name] = word;
  });
  return {
    key,
    label: text(data.label) || GENERAL_PROFILE.label,
    features,
    words,
    look: { accent: text(data.look?.accent) || 'indigo', theme: data.look?.theme === 'dark' ? 'dark' : 'light' },
    homeCards: Array.isArray(data.home_cards) ? data.home_cards.filter((c) => typeof c === 'string') : [],
    source: text(data.source) || 'default',
    outlet: text(data.outlet) || null,
    canChange: data.can_change === true,
  };
};

/** One of the profile's words, or the general word, or the key itself as a last resort */
export const word = (profile, key) => profile?.words?.[key] || GENERAL_WORDS[key] || key;

/** Whether the profile switches a feature on */
export const has = (profile, feature) => profile?.features?.[feature] === true;

// --- keeping the last answer on this device ------------------------------------------------------------

export const cacheKey = (company, warehouse) => `murzak_industry:${company || 'default'}:${warehouse || 'business'}`;

export const readSavedProfile = (company, warehouse) => {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey(company, warehouse)) || 'null');
    return saved ? readProfile(saved) : null;
  } catch (e) {
    return null;
  }
};

export const saveProfile = (company, warehouse, data) => {
  try {
    localStorage.setItem(cacheKey(company, warehouse), JSON.stringify(data));
  } catch (e) {
    // Not critical: the next screen just asks the server
  }
};

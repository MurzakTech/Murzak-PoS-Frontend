import T from './strings.products';
import U from './strings.units';

/**
 * Checking a unit the shop adds itself (ticket P7-2). The same rules as the server, so a mistake shows beside the box before anything
 * is sent: 2 to 30 characters, letters, numbers, spaces, hyphens and full stops only, at least one letter, and no repeat of any
 * unit or plain word already there (capital letters and spaces at the ends do not make a new one). The server checks again.
 */
export const MIN_LENGTH = 2;
export const MAX_LENGTH = 30;

export const tidy = (text) => String(text === null || text === undefined ? '' : text).trim().replace(/\s+/g, ' ');

const ALLOWED = /^[\p{L}\p{N} .-]+$/u;

/** The code for what is wrong with a name or plural word ('empty', 'short', 'long', 'characters'), or '' when it is fine */
export const wordProblem = (text) => {
  const value = tidy(text);
  if (!value) return 'empty';
  if (value.length < MIN_LENGTH) return 'short';
  if (value.length > MAX_LENGTH) return 'long';
  if (!ALLOWED.test(value) || !/\p{L}/u.test(value)) return 'characters';
  return '';
};

/** Every name and word that a new unit may not repeat, lower case: stored names, plain words, built-in words, the shop's own */
export const takenWords = ({ uoms = [], shop = null } = {}) => {
  const words = new Set([...Object.keys(T.units), ...Object.keys(U.words)]);
  uoms.forEach((u) => words.add(tidy(u.name).toLowerCase()));
  if (shop) {
    shop.units.forEach((u) => [u.name, u.singular, u.plural].forEach((w) => words.add(tidy(w).toLowerCase())));
    shop.custom.forEach((c) => [c.name, c.plural].forEach((w) => words.add(tidy(w).toLowerCase())));
  }
  return words;
};

/** { name, plural } with a message for each box that is wrong; an empty object means all is well */
export const checkCustomUnit = ({ name, plural }, taken) => {
  const D = U.dialog;
  const out = {};
  const fail = { empty: D.needName, short: D.tooShort, long: D.tooLong, characters: D.badCharacters };
  const nameProblem = wordProblem(name);
  if (nameProblem) out.name = fail[nameProblem];
  else if (taken.has(tidy(name).toLowerCase())) out.name = D.repeat.replace('{name}', tidy(name));
  const pluralProblem = wordProblem(plural);
  if (pluralProblem) out.plural = pluralProblem === 'empty' ? D.needPlural : fail[pluralProblem];
  else if (!out.name && tidy(plural).toLowerCase() !== tidy(name).toLowerCase() && taken.has(tidy(plural).toLowerCase())) out.plural = D.repeat.replace('{name}', tidy(plural));
  return out;
};

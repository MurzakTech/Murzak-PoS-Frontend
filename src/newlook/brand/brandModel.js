/**
 * The shop's brand (ticket P7-3): which accent colours and receipt styles exist, how long each piece of text may be, what is wrong with
 * a set of values, and what changed. Pure functions, so they are tested without a screen. The server (murzak_pos/api/brand_api.py) checks
 * the same rules again; these exist so a person is told at once, in words, and so a value that the server would refuse is never sent.
 *
 * The accent colours are NAMES. Their colours live in the design tokens (tokens.css, the [data-accent] and [data-swatch] rules), so a
 * screen can only ever use a colour that was checked for contrast, and there is no place to type a colour.
 */

/** The accent choices, in the order they are shown. The first is the colour every shop has until it chooses. */
export const ACCENTS = ['indigo', 'blue', 'teal', 'green', 'amber', 'red', 'pink', 'purple', 'slate'];
export const DEFAULT_ACCENT = ACCENTS[0];

/** The receipt styles: the 80mm till roll, the narrow 58mm roll and a full A4 page */
export const STYLES = ['thermal80', 'thermal58', 'a4'];
export const DEFAULT_STYLE = STYLES[0];

/** The backgrounds of the sign-in page and the Home banner. The till always keeps a plain background, whatever is chosen. */
export const BACKDROPS = ['plain', 'waves', 'weave', 'market', 'sunrise'];
export const DEFAULT_BACKDROP = 'waves';

export const LIMITS = { tagline: 80, footer: 160, social: 30, website: 100 };

/** The logo: JPG, PNG or WebP, at most 1 MB */
export const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** The `accept` of the logo file box */
export const LOGO_ACCEPT = LOGO_TYPES.join(',');
export const LOGO_MAX_BYTES = 1024 * 1024;

/** The brand of a shop that never chose anything */
export const DEFAULT_BRAND = { logo: '', accent: DEFAULT_ACCENT, tagline: '', footer: '', style: DEFAULT_STYLE, social: '', website: '', backdrop: DEFAULT_BACKDROP };

/** The fields each Settings card holds */
export const GROUPS = {
  look: ['logo', 'accent', 'backdrop'],
  words: ['tagline', 'footer', 'social', 'website'],
  style: ['style'],
};

const HANDLE = /^@?[A-Za-z0-9._]{1,30}$/;
const WEBSITE = /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}(\/[A-Za-z0-9._~%/?=&#+:-]*)?$/;
const LOGO = /^\/files\/[A-Za-z0-9._() %-]+\.(jpg|jpeg|png|webp)$/i;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g;

const tidy = (value) => String(value === null || value === undefined ? '' : value).replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();

/** @myshop for myshop; empty stays empty. The same form the server keeps. */
export const handleText = (value) => {
  const text = tidy(value);
  if (!text) return '';
  return text.startsWith('@') ? text : `@${text}`;
};

/** www.myshop.co.ke for https://www.myshop.co.ke/ ; empty stays empty. The same form the server keeps. */
export const websiteText = (value) => tidy(value).replace(/^https?:\/\//i, '').replace(/\/+$/, '');

/** The brand from whatever the server answered; a missing or unknown value falls back to the default for that field. */
export const readBrand = (data) => {
  const source = data && typeof data === 'object' ? data : {};
  const text = (key) => tidy(source[key]);
  const accent = text('accent').toLowerCase();
  const style = text('style').toLowerCase();
  const backdrop = text('backdrop').toLowerCase();
  const logo = text('logo');
  return {
    logo: LOGO.test(logo) ? logo : '',
    accent: ACCENTS.includes(accent) ? accent : DEFAULT_ACCENT,
    tagline: text('tagline').slice(0, LIMITS.tagline),
    footer: text('footer').slice(0, LIMITS.footer),
    style: STYLES.includes(style) ? style : DEFAULT_STYLE,
    backdrop: BACKDROPS.includes(backdrop) ? backdrop : DEFAULT_BACKDROP,
    social: HANDLE.test(text('social')) ? handleText(source.social) : '',
    website: WEBSITE.test(websiteText(source.website)) ? websiteText(source.website) : '',
  };
};

/** What is wrong with the values: { field: 'key into the words' }. Empty when all is well. */
export const brandProblems = (values) => {
  const found = {};
  const v = values || {};
  if (!ACCENTS.includes(v.accent)) found.accent = 'accentWrong';
  if (!STYLES.includes(v.style)) found.style = 'styleWrong';
  if (v.backdrop !== undefined && !BACKDROPS.includes(v.backdrop)) found.backdrop = 'backdropWrong';
  if (tidy(v.tagline).length > LIMITS.tagline) found.tagline = 'tooLong';
  if (tidy(v.footer).length > LIMITS.footer) found.footer = 'tooLong';
  if (/[<>]/.test(`${v.tagline || ''}${v.footer || ''}`)) {
    if (/[<>]/.test(v.tagline || '')) found.tagline = 'noMarkup';
    if (/[<>]/.test(v.footer || '')) found.footer = 'noMarkup';
  }
  const social = tidy(v.social);
  if (social && !HANDLE.test(social)) found.social = 'handleWrong';
  const website = websiteText(v.website);
  if (website && (website.length > LIMITS.website || !WEBSITE.test(website))) found.website = 'websiteWrong';
  return found;
};

/** What is wrong with a chosen logo file, before it is sent: '' when it is fine, else 'type' or 'size' */
export const logoProblem = (file) => {
  if (!file) return 'type';
  if (!LOGO_TYPES.includes(file.type)) return 'type';
  if (file.size > LOGO_MAX_BYTES) return 'size';
  return '';
};

/** The values of the named fields, tidied the way the server keeps them */
export const tidied = (values, fields) => {
  const out = {};
  fields.forEach((key) => {
    if (key === 'social') out[key] = handleText(values[key]);
    else if (key === 'website') out[key] = websiteText(values[key]);
    else if (key === 'logo' || key === 'accent' || key === 'style') out[key] = String(values[key] || '').trim();
    else out[key] = tidy(values[key]);
  });
  return out;
};

/** Whether any field of the group differs from what was saved */
export const groupChanged = (group, values, saved) => {
  const now = tidied(values, GROUPS[group]);
  const was = tidied(saved, GROUPS[group]);
  return GROUPS[group].some((key) => now[key] !== was[key]);
};

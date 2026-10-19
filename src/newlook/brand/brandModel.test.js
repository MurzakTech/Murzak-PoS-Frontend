/** The brand rules (ticket P7-3): the same checks the server makes, so a person is told in words before anything is sent. */
import { ACCENTS, DEFAULT_BRAND, GROUPS, LIMITS, STYLES, brandProblems, groupChanged, handleText, logoProblem, readBrand, tidied, websiteText } from './brandModel';

describe('reading what the server sent', () => {
  test('an empty answer is the plain default', () => {
    expect(readBrand(undefined)).toEqual(DEFAULT_BRAND);
    expect(readBrand(null)).toEqual(DEFAULT_BRAND);
    expect(readBrand({})).toEqual(DEFAULT_BRAND);
  });

  test('a value that is not allowed falls back field by field', () => {
    const brand = readBrand({ accent: '#ff0000', style: 'huge', logo: 'https://evil.test/a.png', social: 'my shop', website: 'not a site', tagline: 'Fresh' });
    expect(brand.accent).toBe('indigo');
    expect(brand.style).toBe('thermal80');
    expect(brand.logo).toBe('');
    expect(brand.social).toBe('');
    expect(brand.website).toBe('');
    expect(brand.tagline).toBe('Fresh');
  });

  test('good values are kept, the handle gets its @ and the website loses its http://', () => {
    const brand = readBrand({ logo: '/files/logo.png', accent: 'teal', style: 'a4', social: 'myshop', website: 'https://www.myshop.co.ke/' });
    expect(brand).toMatchObject({ logo: '/files/logo.png', accent: 'teal', style: 'a4', social: '@myshop', website: 'www.myshop.co.ke' });
  });
});

describe('the lists', () => {
  test('there are nine accent names and three styles, and the first of each is the default', () => {
    expect(ACCENTS).toHaveLength(9);
    expect(STYLES).toEqual(['thermal80', 'thermal58', 'a4']);
    expect(DEFAULT_BRAND.accent).toBe(ACCENTS[0]);
    expect(DEFAULT_BRAND.style).toBe(STYLES[0]);
  });
  test('a colour is only ever a name, never a hex value', () => {
    ACCENTS.forEach((name) => expect(name).toMatch(/^[a-z]+$/));
  });
});

describe('what is wrong with the values', () => {
  const ok = { ...DEFAULT_BRAND };
  test('the default is fine', () => expect(brandProblems(ok)).toEqual({}));
  test('a colour or style off the list is wrong', () => {
    expect(brandProblems({ ...ok, accent: '#abc123' })).toEqual({ accent: 'accentWrong' });
    expect(brandProblems({ ...ok, style: 'x' })).toEqual({ style: 'styleWrong' });
  });
  test('text over its length or with markup is wrong; at the limit it is fine', () => {
    expect(brandProblems({ ...ok, tagline: 'a'.repeat(LIMITS.tagline) })).toEqual({});
    expect(brandProblems({ ...ok, tagline: 'a'.repeat(LIMITS.tagline + 1) })).toEqual({ tagline: 'tooLong' });
    expect(brandProblems({ ...ok, footer: 'b'.repeat(LIMITS.footer + 1) })).toEqual({ footer: 'tooLong' });
    expect(brandProblems({ ...ok, tagline: '<b>x</b>' })).toEqual({ tagline: 'noMarkup' });
    expect(brandProblems({ ...ok, footer: 'a > b' })).toEqual({ footer: 'noMarkup' });
  });
  test('a handle and a website are checked when they are given, and may be left empty', () => {
    expect(brandProblems({ ...ok, social: '@my_shop.ke', website: 'www.myshop.co.ke/menu' })).toEqual({});
    expect(brandProblems({ ...ok, social: 'my shop' })).toEqual({ social: 'handleWrong' });
    expect(brandProblems({ ...ok, website: ['java', 'script:alert(1)'].join('') })).toEqual({ website: 'websiteWrong' });
    expect(brandProblems({ ...ok, website: 'myshop' })).toEqual({ website: 'websiteWrong' });
  });
});

describe('the logo file', () => {
  const file = (type, size) => ({ type, size });
  test('JPG, PNG and WebP up to 1 MB pass', () => {
    ['image/jpeg', 'image/png', 'image/webp'].forEach((type) => expect(logoProblem(file(type, 1024 * 1024))).toBe(''));
  });
  test('another type or a bigger file does not', () => {
    expect(logoProblem(file('image/svg+xml', 100))).toBe('type');
    expect(logoProblem(file('application/pdf', 100))).toBe('type');
    expect(logoProblem(file('image/png', 1024 * 1024 + 1))).toBe('size');
    expect(logoProblem(null)).toBe('type');
  });
});

describe('what changed', () => {
  test('a group is changed only when one of its own fields differs (spaces at the ends do not count)', () => {
    expect(groupChanged('words', { ...DEFAULT_BRAND, tagline: ' Fresh ' }, { ...DEFAULT_BRAND, tagline: 'Fresh' })).toBe(false);
    expect(groupChanged('words', { ...DEFAULT_BRAND, tagline: 'Fresh' }, DEFAULT_BRAND)).toBe(true);
    expect(groupChanged('look', { ...DEFAULT_BRAND, tagline: 'Fresh' }, DEFAULT_BRAND)).toBe(false);
    expect(groupChanged('look', { ...DEFAULT_BRAND, accent: 'red' }, DEFAULT_BRAND)).toBe(true);
    expect(groupChanged('style', { ...DEFAULT_BRAND, style: 'a4' }, DEFAULT_BRAND)).toBe(true);
  });
  test('typing myshop and @myshop is the same change', () => {
    expect(groupChanged('words', { ...DEFAULT_BRAND, social: 'myshop' }, { ...DEFAULT_BRAND, social: '@myshop' })).toBe(false);
  });
  test('only the fields of a group are sent, tidied', () => {
    expect(tidied({ ...DEFAULT_BRAND, tagline: '  Fresh   daily ', social: 'x', website: 'https://a.co.ke/' }, GROUPS.words)).toEqual({ tagline: 'Fresh daily', footer: '', social: '@x', website: 'a.co.ke' });
  });
  test('helpers', () => {
    expect(handleText('')).toBe('');
    expect(handleText('@a')).toBe('@a');
    expect(websiteText('HTTP://a.co.ke//')).toBe('a.co.ke');
  });
});

describe('the background choice', () => {
  const { BACKDROPS, DEFAULT_BACKDROP, readBrand, brandProblems } = require('./brandModel');

  test('five backgrounds exist and the soft waves are the default', () => {
    expect(BACKDROPS).toEqual(['plain', 'waves', 'weave', 'market', 'sunrise']);
    expect(DEFAULT_BACKDROP).toBe('waves');
  });

  test('a missing or unknown background falls back to the default, and a listed one is kept in any case', () => {
    expect(readBrand({}).backdrop).toBe('waves');
    expect(readBrand({ backdrop: 'fireworks' }).backdrop).toBe('waves');
    expect(readBrand({ backdrop: 'Market' }).backdrop).toBe('market');
  });

  test('a background off the list is a problem', () => {
    expect(brandProblems({ accent: 'indigo', style: 'a4', backdrop: 'fireworks' }).backdrop).toBe('backdropWrong');
    expect(brandProblems({ accent: 'indigo', style: 'a4', backdrop: 'plain' }).backdrop).toBeUndefined();
  });
});

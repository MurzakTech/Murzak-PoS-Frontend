import STRINGS from './strings.storefront';
import { translator, detectLanguage, saveLanguage, otherLanguage } from './language';

const PLACEHOLDER = /\{[A-Za-z0-9_]+\}/g;
const placeholders = (text) => (text.match(PLACEHOLDER) || []).sort();

describe('the online store words', () => {
  test('English and Swahili have exactly the same keys', () => {
    expect(Object.keys(STRINGS.sw).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });

  test('every word has text, and Swahili keeps the placeholders of the English', () => {
    Object.keys(STRINGS.en).forEach((key) => {
      expect(STRINGS.en[key].trim()).not.toBe('');
      expect(STRINGS.sw[key].trim()).not.toBe('');
      expect(placeholders(STRINGS.sw[key])).toEqual(placeholders(STRINGS.en[key]));
    });
  });

  test('every order status the server can send has words', () => {
    ['New', 'Confirmed', 'Ready', 'Delivered', 'Cancelled'].forEach((status) => {
      expect(STRINGS.en[`status_${status}`]).toBeTruthy();
      expect(STRINGS.sw[`status_${status}`]).toBeTruthy();
    });
  });
});

describe('translator', () => {
  test('fills placeholders and answers in the chosen language', () => {
    expect(translator('en')('onlyLeft', { count: 3 })).toBe('Only 3 left');
    expect(translator('sw')('onlyLeft', { count: 3 })).toBe('Zimebaki 3 tu');
  });

  test('an unknown language or key never shows a blank', () => {
    expect(translator('fr')('add')).toBe('Add');
    expect(translator('en')('no such key')).toBe('no such key');
  });
});

describe('language choice', () => {
  const phoneSays = (language) => Object.defineProperty(window.navigator, 'language', { value: language, configurable: true });

  beforeEach(() => localStorage.clear());

  test('follows the phone the first time', () => {
    phoneSays('sw-KE');
    expect(detectLanguage()).toBe('sw');
    phoneSays('en-GB');
    expect(detectLanguage()).toBe('en');
  });

  test('remembers the shopper\'s own choice over the phone', () => {
    phoneSays('en-GB');
    saveLanguage('sw');
    expect(detectLanguage()).toBe('sw');
    expect(otherLanguage('sw')).toBe('en');
  });

  test('works when storage is blocked', () => {
    phoneSays('sw');
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(detectLanguage()).toBe('sw');
    spy.mockRestore();
  });
});

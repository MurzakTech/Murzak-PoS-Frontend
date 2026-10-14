import { hasUnitWords, quantityText, unitLabel, unitWord, unitWords } from './unitWords';
import T from './strings.products';
import { OLD_TERMS } from '../labels/renameMap';

// The units a shop is likely to have: the ones ERPNext starts with and the ones the current screens suggest
const UNITS_IN_USE = ['Nos', 'Unit', 'Kg', 'Gram', 'Litre', 'Ltr', 'L', 'Box', 'Pack', 'Packet', 'Bottle', 'Dozen', 'Pair', 'Meter', 'Bag', 'Carton', 'Set', 'Roll', 'Hour', 'Day'];

describe('unitWords', () => {
  test('writes the units a shop uses in plain words', () => {
    expect(unitWords('Nos')).toBe('pieces');
    expect(unitWords('Kg')).toBe('kilograms');
    expect(unitWords('Ltr')).toBe('litres');
    expect(unitWords('Litre')).toBe('litres');
    expect(unitWords('Box')).toBe('boxes');
    expect(unitWords('Gram')).toBe('grams');
    expect(unitWords('Meter')).toBe('metres');
  });

  test('ignores capital letters and outer spaces', () => {
    expect(unitWords('  KG ')).toBe('kilograms');
    expect(unitWords('nos')).toBe('pieces');
    expect(unitWords('NOS')).toBe('pieces');
  });

  test('a unit with no plain word is shown exactly as it is stored', () => {
    expect(unitWords('Bale')).toBe('Bale');
    expect(unitWords('  Drum ')).toBe('Drum');
    expect(hasUnitWords('Bale')).toBe(false);
  });

  test('nothing in gives nothing out', () => {
    expect(unitWords('')).toBe('');
    expect(unitWords(null)).toBe('');
    expect(unitWords(undefined)).toBe('');
    expect(unitLabel('')).toBe('');
  });

  test('a name that is also a property of every object is not mistaken for a unit', () => {
    expect(unitWords('constructor')).toBe('constructor');
    expect(unitWords('toString')).toBe('toString');
  });

  test('every unit the shop is likely to use has a plain word, or is shown as it is', () => {
    UNITS_IN_USE.forEach((uom) => {
      const words = unitWords(uom);
      expect(words).not.toBe('');
      // either a plain word that is not the stored code, or exactly the stored name
      expect(hasUnitWords(uom) ? words !== uom : words === uom).toBe(true);
    });
    // and the common ones are all covered by words, not left as codes
    ['Nos', 'Kg', 'Ltr', 'Box', 'Gram', 'Litre', 'Pack', 'Dozen'].forEach((uom) => expect(hasUnitWords(uom)).toBe(true));
  });

  test('no plain word is the old code it replaces', () => {
    Object.values(T.units).forEach(([one, many]) => {
      expect(one).not.toBe('');
      expect(many).not.toBe('');
    });
    ['nos', 'kg', 'ltr', 'pcs'].forEach((key) => {
      expect(T.units[key]).toEqual(expect.not.arrayContaining([key]));
    });
  });

  test('no plain word is a term the rename map retires', () => {
    Object.values(T.units).forEach(([one, many]) => {
      expect(OLD_TERMS).not.toContain(one.toLowerCase());
      expect(OLD_TERMS).not.toContain(many.toLowerCase());
    });
  });

  test('the rename map and this helper agree that Nos reads as a piece', () => {
    expect(unitWord('Nos')).toBe('piece');
  });

  test('every common unit offered first in the list has a plain word', () => {
    T.commonUnits.forEach((uom) => expect(hasUnitWords(uom)).toBe(true));
  });
});

describe('unitWord and unitLabel', () => {
  test('one and a capitalised many', () => {
    expect(unitWord('Box')).toBe('box');
    expect(unitWord('Bale')).toBe('Bale');
    expect(unitLabel('Box')).toBe('Boxes');
    expect(unitLabel('Nos')).toBe('Pieces');
    expect(unitLabel('Bale')).toBe('Bale');
  });
});

describe('quantityText', () => {
  test('one is singular and anything else is plural', () => {
    expect(quantityText(1, 'Nos')).toBe('1 piece');
    expect(quantityText(12, 'Nos')).toBe('12 pieces');
    expect(quantityText(0, 'Nos')).toBe('0 pieces');
  });

  test('parts keep their decimals', () => {
    expect(quantityText(2.5, 'Kg')).toBe('2.5 kilograms');
    expect(quantityText(0.25, 'Kg')).toBe('0.25 kilograms');
  });

  test('thousands get a comma', () => {
    expect(quantityText(1200, 'Box')).toBe('1,200 boxes');
  });

  test('an unknown unit is written as stored', () => {
    expect(quantityText(3, 'Bale')).toBe('3 Bale');
  });

  test('no unit leaves the number alone and no number leaves nothing', () => {
    expect(quantityText(5, '')).toBe('5');
    expect(quantityText(null, 'Nos')).toBe('');
    expect(quantityText('', 'Nos')).toBe('');
    expect(quantityText('abc', 'Nos')).toBe('');
  });
});

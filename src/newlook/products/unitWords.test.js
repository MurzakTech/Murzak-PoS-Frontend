import { clearShopUnitWords, hasUnitWords, quantityText, resolveUnit, savedUnitWordsCompany, setShopUnitWords, unitLabel, unitWord, unitWords } from './unitWords';
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
    expect(unitWords('Drum')).toBe('Drum');
    expect(unitWords('  Drum ')).toBe('Drum');
    expect(hasUnitWords('Drum')).toBe(false);
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
    expect(unitWord('Drum')).toBe('Drum');
    expect(unitLabel('Box')).toBe('Boxes');
    expect(unitLabel('Nos')).toBe('Pieces');
    expect(unitLabel('Drum')).toBe('Drum');
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
    expect(quantityText(3, 'Drum')).toBe('3 Drum');
  });

  test('no unit leaves the number alone and no number leaves nothing', () => {
    expect(quantityText(5, '')).toBe('5');
    expect(quantityText(null, 'Nos')).toBe('');
    expect(quantityText('', 'Nos')).toBe('');
    expect(quantityText('abc', 'Nos')).toBe('');
  });
});

describe('the units of the industries have plain words', () => {
  test.each([
    ['Tablet', 'tablet', 'tablets'],
    ['Capsule', 'capsule', 'capsules'],
    ['Strip', 'strip', 'strips'],
    ['Vial', 'vial', 'vials'],
    ['Tonne', 'tonne', 'tonnes'],
    ['Carcass', 'carcass', 'carcasses'],
    ['Person', 'person', 'people'],
  ])('%s reads %s and %s', (stored, one, many) => {
    expect(unitWord(stored)).toBe(one);
    expect(unitWords(stored)).toBe(many);
  });
});

describe("the shop's own words", () => {
  afterEach(() => clearShopUnitWords());

  test('a shop unit reads in singular and plural, everywhere units are shown', () => {
    setShopUnitWords([{ name: 'Jerrycan', singular: 'jerrycan', plural: 'jerrycans' }], 'Shop A');
    expect(unitWord('Jerrycan')).toBe('jerrycan');
    expect(unitWords('jerrycan')).toBe('jerrycans');
    expect(unitLabel('Jerrycan')).toBe('Jerrycans');
    expect(quantityText(1, 'Jerrycan')).toBe('1 jerrycan');
    expect(quantityText(3, 'Jerrycan')).toBe('3 jerrycans');
    expect(hasUnitWords('Jerrycan')).toBe(true);
  });

  test('an irregular plural is kept', () => {
    setShopUnitWords([{ name: 'Sheep', singular: 'sheep', plural: 'sheep' }]);
    expect(quantityText(4, 'Sheep')).toBe('4 sheep');
  });

  test('the shop words win over the built-in ones, and clearing brings the built-in ones back', () => {
    setShopUnitWords([{ name: 'Nos', singular: 'item', plural: 'items' }]);
    expect(unitWords('Nos')).toBe('items');
    clearShopUnitWords();
    expect(unitWords('Nos')).toBe('pieces');
  });

  test('the words are kept on this device with their shop', () => {
    setShopUnitWords([{ name: 'Jerrycan', singular: 'jerrycan', plural: 'jerrycans' }], 'Shop A');
    expect(savedUnitWordsCompany()).toBe('Shop A');
    expect(JSON.parse(localStorage.getItem('murzak_new_look:unit-words')).words.jerrycan).toEqual(['jerrycan', 'jerrycans']);
    clearShopUnitWords();
    expect(localStorage.getItem('murzak_new_look:unit-words')).toBeNull();
  });
});

describe('resolveUnit', () => {
  const shop = ['Nos', 'Kg', 'Ltr', 'Tablet', 'Meter'];

  test('the stored name, the singular and the plural all give the stored name', () => {
    expect(resolveUnit('Nos', shop)).toEqual({ unit: 'Nos', known: true });
    expect(resolveUnit('piece', shop)).toEqual({ unit: 'Nos', known: true });
    expect(resolveUnit('Pieces', shop)).toEqual({ unit: 'Nos', known: true });
    expect(resolveUnit('kilogram', shop).unit).toBe('Kg');
    expect(resolveUnit('Kilograms', shop).unit).toBe('Kg');
    expect(resolveUnit('litres', shop).unit).toBe('Ltr');
    expect(resolveUnit('metre', shop).unit).toBe('Meter');
    expect(resolveUnit('tablets', shop).unit).toBe('Tablet');
  });

  test('capital letters and extra spaces do not matter', () => {
    expect(resolveUnit('  KILO   gram ', ['Kilo gram']).unit).toBe('Kilo gram');
    expect(resolveUnit(' TABLETS ', shop).unit).toBe('Tablet');
  });

  test('a short form means the unit with the same plain word', () => {
    expect(resolveUnit('pcs', shop).unit).toBe('Nos');
    expect(resolveUnit('kgs', shop).unit).toBe('Kg');
    expect(resolveUnit('l', shop).unit).toBe('Ltr');
  });

  test('a unit the shop does not have is reported, never dropped', () => {
    expect(resolveUnit('furlong', shop)).toEqual({ unit: '', known: false });
    expect(resolveUnit('carcass', shop)).toEqual({ unit: '', known: false });
  });

  test('nothing given is not an error', () => {
    expect(resolveUnit('', shop)).toEqual({ unit: '', known: true });
    expect(resolveUnit(null, shop)).toEqual({ unit: '', known: true });
    expect(resolveUnit('   ', shop)).toEqual({ unit: '', known: true });
  });

  test('the shop units may carry their own words', () => {
    const own = [{ name: 'Jerrycan', singular: 'jerrycan', plural: 'jerrycans' }, 'Nos'];
    expect(resolveUnit('jerrycans', own).unit).toBe('Jerrycan');
    expect(resolveUnit('Jerrycan', own).unit).toBe('Jerrycan');
  });

  test('with two stored names for one word the first listed wins', () => {
    expect(resolveUnit('litre', ['Ltr', 'Litre']).unit).toBe('Litre');
    expect(resolveUnit('litres', ['Litre', 'Ltr']).unit).toBe('Litre');
  });

  test('an empty list of units knows nothing', () => {
    expect(resolveUnit('piece', [])).toEqual({ unit: '', known: false });
    expect(resolveUnit('piece')).toEqual({ unit: '', known: false });
  });
});

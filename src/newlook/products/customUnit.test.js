import { checkCustomUnit, takenWords, tidy, wordProblem } from './customUnit';

const shop = { units: [{ name: 'Tablet', singular: 'tablet', plural: 'tablets' }], custom: [{ name: 'Jerrycan', plural: 'jerrycans' }] };
const taken = takenWords({ uoms: [{ name: 'Kg' }, { name: 'Bale' }], shop });

describe('wordProblem', () => {
  test('good words', () => {
    ['Jerrycan', 'half-dozen', 'Mt. Kenya bag', '20L can', 'Chupa ya ml'].forEach((w) => expect(wordProblem(w)).toBe(''));
  });
  test('bad words', () => {
    expect(wordProblem('')).toBe('empty');
    expect(wordProblem('   ')).toBe('empty');
    expect(wordProblem('a')).toBe('short');
    expect(wordProblem('x'.repeat(31))).toBe('long');
    expect(wordProblem('x'.repeat(30))).toBe('');
    expect(wordProblem('box<b>')).toBe('characters');
    expect(wordProblem('12 34')).toBe('characters');
    expect(wordProblem('a\u2014b')).toBe('characters');
  });
});

describe('checkCustomUnit', () => {
  test('a good unit has no problem', () => {
    expect(checkCustomUnit({ name: 'Drum', plural: 'drums' }, taken)).toEqual({});
    expect(checkCustomUnit({ name: 'Sheep', plural: 'sheep' }, taken)).toEqual({});
  });
  test('a repeat is refused whatever its case or spaces', () => {
    ['jerrycan', ' JERRYCAN ', 'kg', 'Tablets', 'bale', 'Pieces', 'nos'].forEach((name) => {
      expect(checkCustomUnit({ name, plural: 'xx' }, taken).name).toMatch(/already a unit called/);
    });
  });
  test('the plural may not be another unit either', () => {
    expect(checkCustomUnit({ name: 'Drum', plural: 'Kg' }, taken).plural).toMatch(/already a unit called/);
  });
  test('each box gets its own message', () => {
    expect(checkCustomUnit({ name: '', plural: '' }, taken)).toEqual({ name: 'Please type the unit name.', plural: 'Please type the word for many.' });
    expect(checkCustomUnit({ name: 'a', plural: 'x'.repeat(31) }, taken)).toEqual({ name: 'A unit needs at least two letters.', plural: 'A unit can be at most 30 characters.' });
    expect(checkCustomUnit({ name: 'a<b', plural: 'ok!' }, taken).name).toMatch(/letters, numbers/);
  });
});

test('tidy', () => {
  expect(tidy('  jerry   can ')).toBe('jerry can');
  expect(tidy(null)).toBe('');
});

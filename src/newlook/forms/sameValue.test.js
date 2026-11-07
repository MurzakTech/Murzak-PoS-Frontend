import { formChanged, sameValue } from './sameValue';

describe('sameValue', () => {
  it('treats the different ways of writing nothing as the same', () => {
    expect(sameValue(undefined, '')).toBe(true);
    expect(sameValue(null, '')).toBe(true);
    expect(sameValue('  ', '')).toBe(true);
  });
  it('treats a number and its text as the same, and ignores stray spaces', () => {
    expect(sameValue(5, '5')).toBe(true);
    expect(sameValue(' Amina ', 'Amina')).toBe(true);
  });
  it('sees a real difference, in text and in a tick box', () => {
    expect(sameValue('Amina', 'Amna')).toBe(false);
    expect(sameValue(true, false)).toBe(false);
    expect(sameValue(undefined, false)).toBe(true);
  });
});

describe('formChanged', () => {
  it('is false for a form nobody touched, whatever way the empty fields are written', () => {
    expect(formChanged({ name: 'A', mobile: undefined, enabled: true }, { name: 'A', mobile: '', enabled: true })).toBe(false);
  });
  it('is true once a field really differs', () => {
    expect(formChanged({ name: 'B', mobile: '' }, { name: 'A', mobile: '' })).toBe(true);
  });
});

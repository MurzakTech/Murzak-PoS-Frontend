import { AUTOPRINT_KEY, readAutoPrint, writeAutoPrint } from './autoPrint';

beforeEach(() => localStorage.clear());

test('is on unless it was switched off, as the till treats it', () => {
  expect(AUTOPRINT_KEY).toBe('pos_auto_print');
  expect(readAutoPrint()).toBe(true);
  localStorage.setItem(AUTOPRINT_KEY, 'false');
  expect(readAutoPrint()).toBe(false);
  localStorage.setItem(AUTOPRINT_KEY, 'true');
  expect(readAutoPrint()).toBe(true);
});

test('writes the same key the till reads', () => {
  expect(writeAutoPrint(false)).toBe(false);
  expect(localStorage.getItem('pos_auto_print')).toBe('false');
  expect(writeAutoPrint(true)).toBe(true);
  expect(localStorage.getItem('pos_auto_print')).toBe('true');
});

test('says so when the device will not keep the choice', () => {
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(() => writeAutoPrint(false)).toThrow();
  spy.mockRestore();
});

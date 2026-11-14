import { expiryFromYymmdd, isExpired, parseGs1, sameGtin } from './gs1';

const GS = '\u001d';

describe('reading a medicine pack', () => {
  test('the usual order: product, expiry, batch', () => {
    expect(parseGs1('01061234567890121727033110AB1234')).toEqual({ gtin: '06123456789012', expiry: '2027-03-31', batch: 'AB1234', serial: '' });
  });

  test('a batch ended by the separator, then the expiry and a serial', () => {
    expect(parseGs1(`010612345678901210LOT-77${GS}17260930${''}21SN99`)).toEqual({ gtin: '06123456789012', expiry: '2026-09-30', batch: 'LOT-77', serial: 'SN99' });
  });

  test('a scanner that dropped the separator after the batch still gives the expiry', () => {
    expect(parseGs1('010612345678901210LOT77172609 30'.replace(' ', ''))).toMatchObject({ batch: 'LOT77', expiry: '2026-09-30' });
  });

  test('the bracketed form and the scanner prefix are read', () => {
    expect(parseGs1('(01)06123456789012(17)270331(10)AB1234(21)X1')).toEqual({ gtin: '06123456789012', expiry: '2027-03-31', batch: 'AB1234', serial: 'X1' });
    expect(parseGs1(']d2010612345678901217270331')).toMatchObject({ gtin: '06123456789012', expiry: '2027-03-31' });
  });

  test('an ordinary barcode or nonsense is not a pack code', () => {
    ['6161101600016', '', null, 'Paracetamol', '01ABC', '0106123456789012', '0106123456789012991234'].forEach((raw) => expect(parseGs1(raw)).toBeNull());
  });

  test('an expiry day of 00 means the end of the month, and a false date is dropped', () => {
    expect(expiryFromYymmdd('270200')).toBe('2027-02-28');
    expect(expiryFromYymmdd('271301')).toBeNull();
    expect(expiryFromYymmdd('270231')).toBeNull();
  });
});

describe('matching and expiry', () => {
  test('an EAN-13 kept on the product matches the pack GTIN-14', () => {
    expect(sameGtin('6123456789012', '06123456789012')).toBe(true);
    expect(sameGtin('06123456789012', '06123456789012')).toBe(true);
    expect(sameGtin('6123456789013', '06123456789012')).toBe(false);
    expect(sameGtin('', '06123456789012')).toBe(false);
  });

  test('a pack expires the day after its expiry date', () => {
    expect(isExpired('2026-11-12', '2026-11-13')).toBe(true);
    expect(isExpired('2026-11-13', '2026-11-13')).toBe(false);
    expect(isExpired(null, '2026-11-13')).toBe(false);
  });
});

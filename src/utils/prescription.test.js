import { cleanDispensing, isDispensingComplete, isPrescriptionOnly, prescriptionItems } from './prescription';

describe('isPrescriptionOnly', () => {
  it('reads the flag as the server sends it (1 or true) on a product or a cart line', () => {
    expect(isPrescriptionOnly({ custom_prescription_only: 1 })).toBe(true);
    expect(isPrescriptionOnly({ custom_prescription_only: true })).toBe(true);
    expect(isPrescriptionOnly({ prescription_only: true })).toBe(true);
  });

  it('is false for everything else, including products from a server without the flag', () => {
    expect(isPrescriptionOnly({ custom_prescription_only: 0 })).toBe(false);
    expect(isPrescriptionOnly({})).toBe(false);
    expect(isPrescriptionOnly(null)).toBe(false);
    expect(isPrescriptionOnly({ custom_prescription_only: '0' })).toBe(false);
  });
});

describe('prescriptionItems', () => {
  it('lists the flagged items of a cart by name, each once', () => {
    const cart = [
      { item_code: 'A', item_name: 'Amoxicillin', prescription_only: true },
      { item_code: 'T', item_name: 'Tea', prescription_only: false },
      { item_code: 'A', item_name: 'Amoxicillin', prescription_only: true },
      { item_code: 'D', prescription_only: true },
    ];
    expect(prescriptionItems(cart)).toEqual(['Amoxicillin', 'D']);
    expect(prescriptionItems([])).toEqual([]);
    expect(prescriptionItems(undefined)).toEqual([]);
  });
});

describe('dispensing record', () => {
  it('is tidied and cut to length', () => {
    expect(cleanDispensing({ patient: '  Jane   Wanjiru ', prescriber: 'Dr  O', reference: 'x'.repeat(90) })).toEqual({
      patient: 'Jane Wanjiru',
      prescriber: 'Dr O',
      reference: 'x'.repeat(60),
    });
    expect(cleanDispensing(null)).toEqual({ patient: '', prescriber: '', reference: '' });
  });

  it('is complete with a patient and a prescriber, and the reference is optional', () => {
    expect(isDispensingComplete({ patient: 'Jane', prescriber: 'Dr O' })).toBe(true);
    expect(isDispensingComplete({ patient: 'Jane', prescriber: ' ' })).toBe(false);
    expect(isDispensingComplete({ patient: '', prescriber: 'Dr O', reference: '12' })).toBe(false);
    expect(isDispensingComplete(null)).toBe(false);
  });
});

import { GENERAL_PROFILE, has, readProfile, readSavedProfile, saveProfile, word } from './industryModel';
import { defaultPeriod, isoDay, modesLine, registerCsv, registerFileName, registerRowKey } from './industryPagesModel';

describe('readProfile', () => {
  test('a pharmacy profile from the server is read as it is', () => {
    const p = readProfile({
      key: 'pharmacy',
      label: 'Pharmacy',
      features: { prescription_only: true, dispensing_register: true, tables: false },
      words: { customer: 'Patient', charge: 'Dispense and pay' },
      look: { accent: 'green', theme: 'light' },
      home_cards: ['expiring_soon', 5],
      source: 'outlet',
      outlet: 'Main - DL',
      can_change: true,
    });
    expect(p.key).toBe('pharmacy');
    expect(has(p, 'prescription_only')).toBe(true);
    expect(has(p, 'tables')).toBe(false);
    expect(word(p, 'customer')).toBe('Patient');
    expect(word(p, 'sale')).toBe('Sale'); // not sent: the general word
    expect(p.homeCards).toEqual(['expiring_soon']);
    expect(p.canChange).toBe(true);
  });

  test('nothing, or nonsense, is the general shop: the till exactly as before', () => {
    [null, undefined, 'x', 5].forEach((raw) => expect(readProfile(raw)).toBe(GENERAL_PROFILE));
    const odd = readProfile({ key: 'casino', features: { tables: 'yes', void_approval: 1 }, words: { charge: '  ' }, look: { theme: 'purple' } });
    expect(odd.key).toBe('general');
    expect(has(odd, 'tables')).toBe(false); // only a real true switches a feature on
    expect(has(odd, 'void_approval')).toBe(false);
    expect(word(odd, 'charge')).toBe('Charge');
    expect(odd.look.theme).toBe('light');
  });

  test('an unknown word key falls back to the key itself rather than a blank', () => {
    expect(word(GENERAL_PROFILE, 'something_new')).toBe('something_new');
    expect(word(undefined, 'charge')).toBe('Charge');
  });
});

describe('the profile kept on this device', () => {
  beforeEach(() => localStorage.clear());

  test('is kept per business and per store', () => {
    saveProfile('Duka', 'Main', { key: 'restaurant', features: { tables: true } });
    expect(readSavedProfile('Duka', 'Main').key).toBe('restaurant');
    expect(readSavedProfile('Duka', 'Branch')).toBeNull();
    expect(readSavedProfile('Other', 'Main')).toBeNull();
  });

  test('a broken saved answer is ignored', () => {
    localStorage.setItem('murzak_industry:Duka:Main', '{not json');
    expect(readSavedProfile('Duka', 'Main')).toBeNull();
  });
});

describe('the dispensing register and cash-up helpers', () => {
  const rows = [
    { date: '2026-11-13', time: '09:15:00', invoice: 'POS-1', item_name: 'Amoxicillin, 500mg', item_code: 'AMOX', qty: 21, uom: 'Capsule', batch_no: 'B7', patient: 'Jane "JW" Wanjiru', prescriber: 'Dr O', reference: 'RX-1', dispensed_by: 'Amina', status: 'Complete' },
    { date: '2026-11-12', time: '', invoice: 'POS-2', item_name: 'Diazepam', item_code: 'DIAZ', qty: 10, uom: '', batch_no: '', patient: '=HYPERLINK("x")', prescriber: '+254', reference: '', dispensed_by: '@me', status: 'Missing' },
  ];

  test('the CSV has a header and one line per medicine, with commas and quotes kept safe', () => {
    const lines = registerCsv(rows).trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Date,Time,Sale,Medicine,Code,Quantity,Unit,Batch,Patient,Prescriber,Prescription ref,Dispensed by,Record');
    expect(lines[1]).toContain('"Amoxicillin, 500mg"');
    expect(lines[1]).toContain('"Jane ""JW"" Wanjiru"');
  });

  test('a cell a spreadsheet would run as a formula is made plain text', () => {
    const line = registerCsv(rows).split('\r\n')[2];
    expect(line).toContain(`"'=HYPERLINK(""x"")"`);
    expect(line).toContain("'+254");
    expect(line).toContain("'@me");
  });

  test('an empty register is just the header', () => {
    expect(registerCsv([]).trim().split('\r\n')).toHaveLength(1);
  });

  test('the period is the last 30 days in the shop\'s own day', () => {
    expect(defaultPeriod(new Date(2026, 10, 13, 22, 30))).toEqual({ from: '2026-10-15', to: '2026-11-13' });
    expect(isoDay(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('names, keys and the payment line', () => {
    expect(registerFileName('2026-11-01', '2026-11-13')).toBe('dispensing-register-2026-11-01-to-2026-11-13.csv');
    expect(registerRowKey(rows[0])).toBe('POS-1:AMOX:B7');
    expect(modesLine({ Cash: 1200, 'M-Pesa': 500, Card: 0 }, (n) => `KES ${n}`)).toBe('Cash KES 1200 · M-Pesa KES 500');
    expect(modesLine(undefined, String)).toBe('');
  });
});

describe('the levy month picker', () => {
  test('lists the last twelve months, newest first', () => {
    const { recentMonths } = require('./industryPagesModel');
    const months = recentMonths(new Date(2026, 0, 20));
    expect(months).toHaveLength(12);
    expect(months[0].value).toBe('2026-01');
    expect(months[1].value).toBe('2025-12');
    expect(months[11].value).toBe('2025-02');
  });
});

describe('the controlled medicines register download', () => {
  test('one line per movement under each medicine, with a header', () => {
    const { controlledCsv } = require('./industryPagesModel');
    const lines = controlledCsv([
      { item_name: 'Diazepam 5mg', lines: [{ date: '2026-11-02', time: '09:30', kind: 'Dispensed', reference: 'POS-2', qty_in: 0, qty_out: 20, balance: 70, patient: 'Jane', prescriber: 'Dr O', dispensed_by: 'Amina' }] },
      { item_name: 'Pethidine', lines: [] },
    ])
      .trim()
      .split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Medicine,Date,Time,Movement,Document,In,Out,Balance,Patient,Prescriber,Dispensed by');
    expect(lines[1]).toBe('Diazepam 5mg,2026-11-02,09:30,Dispensed,POS-2,,20,70,Jane,Dr O,Amina');
  });
});

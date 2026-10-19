import { cardChanged, companyWith, problems, valuesFromCompany } from './businessModel';

const company = {
  name: 'Shop A',
  companyName: 'Shop A',
  abbr: 'SA',
  taxId: 'P000000000A',
  country: 'Kenya',
  currency: 'KES',
  address: { line1: '1 Test Road', line2: '', city: 'Nairobi', state: '', pincode: '00100' },
  phone: '0711000000',
  email: 'desk@shop-a.test',
  contact: { firstName: 'Amina', lastName: 'Otieno', email: 'amina@shop-a.test', mobile: '0722000000', phone: '' },
};

test('the card values come from the company', () => {
  expect(valuesFromCompany(company)).toMatchObject({ taxId: 'P000000000A', line1: '1 Test Road', city: 'Nairobi', phone: '0711 000 000', email: 'desk@shop-a.test', firstName: 'Amina', contactEmail: 'amina@shop-a.test' });
});

test('saving one card writes only that card over what was last saved', () => {
  const values = { ...valuesFromCompany(company), city: ' Mombasa ', firstName: 'Changed but on another card' };
  const next = companyWith(company, 'address', values);
  expect(next.address.city).toBe('Mombasa');
  expect(next.contact.firstName).toBe('Amina');
  expect(next.taxId).toBe('P000000000A');
  expect(next.companyName).toBe('Shop A');
  expect(company.address.city).toBe('Nairobi');
});

test('the address needs a first line and a town, and an email must look like one', () => {
  const values = valuesFromCompany(company);
  expect(problems('address', values)).toEqual({});
  expect(problems('address', { ...values, line1: ' ', city: '', email: 'nope' })).toEqual({ line1: 'line1Missing', city: 'cityMissing', email: 'emailWrong' });
  expect(problems('address', { ...values, email: '' })).toEqual({});
});

test('the contact email, if given, must look like one; the tax card has nothing to refuse', () => {
  const values = valuesFromCompany(company);
  expect(problems('contact', { ...values, contactEmail: 'a@b' })).toEqual({ contactEmail: 'emailWrong' });
  expect(problems('contact', { ...values, contactEmail: '' })).toEqual({});
  expect(problems('details', { ...values, taxId: '' })).toEqual({});
});

test('a card has changed only when one of its own fields differs, ignoring spaces at the ends', () => {
  const values = valuesFromCompany(company);
  expect(cardChanged('address', values, values)).toBe(false);
  expect(cardChanged('address', { ...values, city: 'Nairobi ' }, values)).toBe(false);
  expect(cardChanged('address', { ...values, city: 'Mombasa' }, values)).toBe(true);
  expect(cardChanged('address', { ...values, firstName: 'Other' }, values)).toBe(false);
  expect(cardChanged('details', { ...values, taxId: 'P111111111B' }, values)).toBe(true);
});

describe('phone numbers (P6-4): shown as 0712 345 678, stored as the shop had them unless changed', () => {
  test('the card shows a Kenyan number in groups, and leaves other text as it is', () => {
    const shown = valuesFromCompany({ ...company, phone: '+254712345678', contact: { ...company.contact, mobile: '0722000000', phone: 'ext 12' } });
    expect(shown.phone).toBe('0712 345 678');
    expect(shown.mobile).toBe('0722 000 000');
    expect(shown.contactPhone).toBe('ext 12');
  });

  test('a number the person did not touch is saved exactly as it was stored', () => {
    const stored = { ...company, phone: '+254712345678' };
    const values = { ...valuesFromCompany(stored), city: 'Mombasa' };
    expect(companyWith(stored, 'address', values).phone).toBe('+254712345678');
    expect(cardChanged('address', valuesFromCompany(stored), valuesFromCompany(stored))).toBe(false);
  });

  test('a number the person typed is saved as typed', () => {
    const values = { ...valuesFromCompany(company), phone: '0733 111 222' };
    expect(companyWith(company, 'address', values).phone).toBe('0733 111 222');
  });

  test('an empty number stays empty', () => {
    const values = valuesFromCompany({ ...company, phone: '' });
    expect(values.phone).toBe('');
    expect(companyWith({ ...company, phone: '' }, 'address', values).phone).toBe('');
  });
});

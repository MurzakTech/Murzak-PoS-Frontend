/**
 * The three Business cards (ticket P5-3): which fields each card holds, what is wrong with them, and what has changed.
 * Pure functions, so they are tested without a screen. The business name, short name, country and currency are shown but
 * not changed here: the server uses the name to find the business and ignores the other three when it saves.
 */
import { formatPhone } from '../labels/renameMap';

const EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/** The names of the three cards, as they are used in code (not words to read) */
export const CARD = { details: 'details', address: 'address', contact: 'contact' };

export const CARDS = {
  details: ['taxId'],
  address: ['line1', 'line2', 'city', 'state', 'pincode', 'phone', 'email'],
  contact: ['firstName', 'lastName', 'contactEmail', 'mobile', 'contactPhone'],
};

/** The values the cards edit, flattened from the company the server gave. */
export const valuesFromCompany = (company) => ({
  taxId: company.taxId,
  line1: company.address.line1,
  line2: company.address.line2,
  city: company.address.city,
  state: company.address.state,
  pincode: company.address.pincode,
  phone: formatPhone(company.phone) || '',
  email: company.email,
  firstName: company.contact.firstName,
  lastName: company.contact.lastName,
  contactEmail: company.contact.email,
  mobile: formatPhone(company.contact.mobile) || '',
  contactPhone: formatPhone(company.contact.phone) || '',
});

/** A phone number the person did not touch keeps its stored form (they saw 0712 345 678; the shop may have stored 0712345678). */
const phoneToSave = (typed, stored) => {
  const text = String(typed).trim();
  return text === String(formatPhone(stored) || '').trim() ? stored : text;
};

/** The company with one card's values written in, every other part as last saved. */
export const companyWith = (company, card, values) => {
  const next = { ...company, address: { ...company.address }, contact: { ...company.contact } };
  if (card === 'details') next.taxId = values.taxId.trim();
  if (card === 'address') {
    next.address = { line1: values.line1.trim(), line2: values.line2.trim(), city: values.city.trim(), state: values.state.trim(), pincode: values.pincode.trim() };
    next.phone = phoneToSave(values.phone, company.phone);
    next.email = values.email.trim();
  }
  if (card === 'contact') {
    next.contact = { firstName: values.firstName.trim(), lastName: values.lastName.trim(), email: values.contactEmail.trim(), mobile: phoneToSave(values.mobile, company.contact.mobile), phone: phoneToSave(values.contactPhone, company.contact.phone) };
  }
  return next;
};

/** What is wrong with a card's values: { fieldName: 'key into the words' }. Empty when all is well. */
export const problems = (card, values) => {
  const found = {};
  if (card === 'address') {
    if (!values.line1.trim()) found.line1 = 'line1Missing';
    if (!values.city.trim()) found.city = 'cityMissing';
    if (values.email.trim() && !EMAIL.test(values.email.trim())) found.email = 'emailWrong';
  }
  if (card === 'contact' && values.contactEmail.trim() && !EMAIL.test(values.contactEmail.trim())) found.contactEmail = 'emailWrong';
  return found;
};

/** Whether any field of the card differs from the saved values (spaces at the ends do not count). */
export const cardChanged = (card, values, saved) => CARDS[card].some((key) => String(values[key]).trim() !== String(saved[key]).trim());

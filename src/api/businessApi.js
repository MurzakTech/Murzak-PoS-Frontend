import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The business details of Settings, Business (ticket P5-3). These are the SAME server calls the current Business
 * settings screen uses (onboarding_api.get_company and update_company), asked in the same way; nothing about them is
 * changed. The reply is read in the same tolerant way as that screen reads it.
 */
const ONBOARDING = 'murzak_pos.api.onboarding_api';

const bodyOf = (response) => response.data?.message ?? response.data;
const failure = (reply, fallback) => new Error(humanizeMessage(reply?.message, fallback));
const text = (value) => (value === null || value === undefined ? '' : String(value));

/**
 * The company as the page uses it, from whichever shape the server answered with: { company }, { data } or the company
 * itself. The address and contact may sit under company_address, address or company_contact.
 */
export const readCompany = (reply) => {
  const c = (reply && (reply.company || reply.data)) || reply || {};
  const address = c.address || c.company_address || {};
  const contact = c.company_contact || {};
  return {
    name: text(c.name || c.company_name),
    companyName: text(c.company_name || c.name),
    abbr: text(c.abbr),
    taxId: text(c.tax_id),
    country: text(c.country),
    currency: text(c.default_currency),
    address: {
      line1: text(address.address_line1),
      line2: text(address.address_line2),
      city: text(address.city),
      state: text(address.state),
      pincode: text(address.pincode),
    },
    phone: text(address.phone || c.phone_no),
    email: text(address.email_id || address.email || c.email),
    contact: {
      firstName: text(contact.first_name),
      lastName: text(contact.last_name),
      email: text(contact.email),
      mobile: text(contact.mobile),
      phone: text(contact.phone),
    },
  };
};

const orNothing = (value) => (value ? value : undefined);

/** What the update call is sent: the same fields, in the same shape, as the current Business settings screen sends. */
export const toCompanyPayload = (company) => ({
  name: company.name,
  company_name: company.companyName,
  abbr: company.abbr,
  country: company.country,
  default_currency: company.currency,
  tax_id: orNothing(company.taxId),
  company_address: {
    address_line1: company.address.line1,
    address_line2: orNothing(company.address.line2),
    city: company.address.city,
    state: orNothing(company.address.state),
    country: company.country,
    pincode: orNothing(company.address.pincode),
    phone: orNothing(company.phone),
    // The current screen sends email_id; the server reads email. Both are sent so the address email is saved
    email_id: orNothing(company.email),
    email: orNothing(company.email),
  },
  company_contact: {
    first_name: orNothing(company.contact.firstName),
    last_name: orNothing(company.contact.lastName),
    email: orNothing(company.contact.email),
    mobile: orNothing(company.contact.mobile),
    phone: orNothing(company.contact.phone),
  },
});

/** The business details. `company` is the name of the signed-in person's business. */
export const getCompany = async (company) => {
  let response;
  const params = company ? { company, company_name: company } : undefined;
  try {
    response = await axiosInstance.get(`${ONBOARDING}.get_company`, params ? { params } : undefined);
  } catch (error) {
    if (company) {
      try {
        response = await axiosInstance.get(`${ONBOARDING}.get_company`);
      } catch (fallbackError) {
        throw new Error(friendlyErrorMessage(fallbackError));
      }
    } else {
      throw new Error(friendlyErrorMessage(error));
    }
  }
  const reply = bodyOf(response);
  if (!reply || reply.success === false) {
    if (company) {
      try {
        const fallbackRes = await axiosInstance.get(`${ONBOARDING}.get_company`);
        const fallbackReply = bodyOf(fallbackRes);
        if (fallbackReply && fallbackReply.success !== false) {
          return readCompany(fallbackReply);
        }
      } catch (e) {
        // ignore fallback error and throw original
      }
    }
    throw failure(reply, 'The business details could not be loaded.');
  }
  return readCompany(reply);
};

/** Save the business details (the whole company, as the current screen does). Resolves to the details that were sent. */
export const updateCompany = async (company) => {
  let response;
  try {
    // A refusal (for example a wrong value) is shown on the card, not as a pop-up
    response = await axiosInstance.post(`${ONBOARDING}.update_company`, toCompanyPayload(company), { allowRefusal: true });
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = bodyOf(response);
  if (!reply || reply.success === false) throw failure(reply, 'The business details could not be saved.');
  return company;
};

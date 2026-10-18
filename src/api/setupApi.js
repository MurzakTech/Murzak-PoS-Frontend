import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * First-time set-up (ticket P5-4): what the shop sells, how far the set-up wizard has got, and the usual opening cash.
 * The exact shape is in the back end's docs/redesign/P5-4-contract.md. Anyone signed in may read; only the owner writes
 * (the server checks). The shop name and tax ID go through the company calls the current screens already use.
 */
const SETUP = 'murzak_pos.api.setup_api';
const ONBOARDING = 'murzak_pos.api.onboarding_api';

const FALLBACK = 'That did not work. Please try again.';
const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, FALLBACK));

const unwrap = (response) => {
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

// Only the network call is wrapped, so a refusal from the server keeps its own plain sentence
const send = async (call) => {
  try {
    return await call();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
};

const companyParams = (company) => (company ? { params: { company } } : undefined);
const withCompany = (payload, company) => (company ? { ...payload, company } : payload);
const list = (value) => (Array.isArray(value) ? value : []);
const money = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** The features by the names the screens use. Anything the server leaves out is off. */
export const featuresFrom = (raw) => {
  const f = (raw && raw.features) || {};
  return {
    expiry: f.expiry === true,
    prescriptionOnly: f.prescription_only === true,
    barcodesFirst: f.barcodes_first === true,
    unitsFirst: f.units_first === true,
    servicesFirst: f.services_first === true,
  };
};

export const NO_FEATURES = featuresFrom(null);

const featuresShape = (data) => ({
  company: data.company || '',
  kind: ['pharmacy', 'retail', 'services', 'other'].includes(data.kind) ? data.kind : null,
  features: featuresFrom(data),
  openingCash: money(data.opening_cash),
});

const progressShape = (data) => ({
  doneSteps: list(data.done_steps),
  skippedSteps: list(data.skipped_steps),
  finished: data.finished === true,
  nextStep: data.next_step || null,
});

/** { company, kind, features: { expiry, prescriptionOnly, barcodesFirst, unitsFirst, servicesFirst }, openingCash } */
export const getBusinessFeatures = async (company) => featuresShape(unwrap(await send(() => axiosInstance.get(`${SETUP}.get_business_features`, companyParams(company)))));

/**
 * Everything of getBusinessFeatures plus { needsSetup, inProgress, offer, suggestedKind, industryCode, canEdit, doneSteps,
 * skippedSteps, finished, nextStep }. `offer` is the one answer for "show Set up now on Home".
 */
export const getSetupState = async (company) => {
  const data = unwrap(await send(() => axiosInstance.get(`${SETUP}.get_setup_state`, companyParams(company))));
  return {
    ...featuresShape(data),
    ...progressShape(data),
    needsSetup: data.needs_setup === true,
    inProgress: data.in_progress === true,
    offer: data.offer === true,
    suggestedKind: data.suggested_kind || null,
    industryCode: data.industry_code || null,
    canEdit: data.can_edit === true,
  };
};

// A refusal (for example "only an owner can do this") is shown on the page, not as a pop-up
const post = async (method, payload) => unwrap(await send(() => axiosInstance.post(`${SETUP}.${method}`, payload, { allowRefusal: true })));

/** Keep the answer to "What do you sell?" and turn on the matching features. Resolves to the features and the progress. */
export const saveBusinessKind = async (kind, company) => {
  const data = await post('save_business_kind', withCompany({ kind }, company));
  return { ...featuresShape(data), ...progressShape(data) };
};

/** Remember that a step was passed (completed, or skipped). The step 'finish' ends the wizard ("Finish" and "Skip for now"). */
export const saveSetupProgress = async (step, { skipped = false, company } = {}) =>
  progressShape(await post('save_setup_progress', withCompany({ step, ...(skipped ? { skipped: 1 } : {}) }, company)));

/** Keep the usual opening cash (the Open till dialog suggests it). An empty amount clears it. */
export const saveOpeningCash = async (amount, company) => {
  const data = await post('save_opening_cash', withCompany({ amount: amount === null || amount === undefined ? '' : amount }, company));
  return { openingCash: money(data.opening_cash), ...progressShape(data) };
};

// ---------- The shop's name and tax ID: the company calls the current Business settings already use ----------

const companyReply = (response) => {
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

/** { name, title, taxId }: `name` is the company's own name (what the company calls use), `title` is how it is written. */
export const getShopDetails = async (company) => {
  const data = companyReply(await send(() => axiosInstance.get(`${ONBOARDING}.get_company`, company ? { params: { company_name: company } } : undefined)));
  return { name: data.name || data.company_name || company || '', title: data.company_name || data.name || company || '', taxId: data.tax_id || '' };
};

/** Save the tax ID (KRA PIN). The existing company call changes only what is sent; it cannot rename a company. */
export const saveTaxId = async ({ company, taxId }) => {
  companyReply(await send(() => axiosInstance.post(`${ONBOARDING}.update_company`, { company_name: company, tax_id: taxId }, { allowRefusal: true })));
  return taxId;
};

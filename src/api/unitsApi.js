import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * Units by industry (ticket P7-2). The server knows which kind of shop this is and keeps a short list of the units that
 * kind of shop counts in; the shop can also add its own. These calls are new and change no unit that exists today.
 * Reading is open to anyone signed in; adding units and changing the kind of shop is for owners and managers (the server checks).
 */
const UNITS = 'murzak_pos.api.units_api';

const body = (response) => response.data?.message ?? response.data;

const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));

const text = (value) => (typeof value === 'string' ? value : '');

const unitShape = (row) => ({
  name: text(row?.name),
  singular: text(row?.singular) || text(row?.name),
  plural: text(row?.plural) || text(row?.name),
  whole: row?.whole !== false,
  note: text(row?.note),
  exists: row?.exists === true,
});

/** { company, industry, industries, units: [{ name, singular, plural, whole, note, exists }], missing, custom: [{ name, plural }], created, added, canManage } */
export const unitsShape = (data) => ({
  company: text(data?.company),
  industry: text(data?.industry),
  industries: Array.isArray(data?.industries) ? data.industries.filter((k) => typeof k === 'string') : [],
  units: Array.isArray(data?.units) ? data.units.map(unitShape).filter((u) => u.name) : [],
  missing: Number(data?.missing) || 0,
  custom: Array.isArray(data?.custom) ? data.custom.map((c) => ({ name: text(c?.name), plural: text(c?.plural) || text(c?.name) })).filter((c) => c.name) : [],
  created: Array.isArray(data?.created) ? data.created : [],
  added: text(data?.added),
  canManage: data?.can_manage === true,
});

const send = async (call) => {
  let response;
  try {
    response = await call();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return unitsShape(reply.data);
};

const withCompany = (payload, company) => (company ? { ...payload, company } : payload);

/** The units of the shop's industry (or of `industry` when given), and the shop's own units */
export const getIndustryUnits = ({ industry, company } = {}) =>
  send(() => axiosInstance.get(`${UNITS}.get_industry_units`, { params: { ...(industry ? { industry } : {}), ...(company ? { company } : {}) } }));

/** Add the usual units of the industry that the shop does not have yet. Safe to repeat. */
export const ensureIndustryUnits = ({ industry, company } = {}) =>
  send(() => axiosInstance.post(`${UNITS}.ensure_industry_units`, withCompany(industry ? { industry } : {}, company), { allowRefusal: true }));

/** Say which kind of shop this is for units. It only changes which units come first. */
export const setUnitsIndustry = (industry, company) =>
  send(() => axiosInstance.post(`${UNITS}.set_units_industry`, withCompany({ industry }, company), { allowRefusal: true }));

/** Add the shop's own unit: its name and the plain word for many. `allowParts` lets it be sold in parts (2.5 of it). */
export const addCustomUnit = ({ name, plural, allowParts = false, company }) =>
  send(() => axiosInstance.post(`${UNITS}.add_custom_unit`, withCompany({ name, plural, allow_parts: allowParts ? 1 : 0 }, company), { allowRefusal: true }));

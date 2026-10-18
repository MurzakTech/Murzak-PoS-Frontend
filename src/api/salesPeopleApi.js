import { callServer } from './serverCall';

/**
 * Sales people and their commission. Each business keeps its own; a sale can be credited to one, named at the
 * till or taken from the cashier's own login when it is linked to a sales person.
 */

const PEOPLE = 'murzak_pos.api.sales_person_api';

export const listSalesPeople = async (company, includeDisabled = false) => {
  const body = await callServer(`${PEOPLE}.list_sales_persons`, { company, include_disabled: includeDisabled ? 1 : 0 }, {
    get: true,
    fallback: 'The sales people could not be loaded.',
  });
  return body.data?.data || [];
};

export const createSalesPerson = async (company, { name, commissionRate, user }) => {
  const body = await callServer(`${PEOPLE}.create_sales_person`, {
    company,
    sales_person_name: name,
    commission_rate: Number(commissionRate) || 0,
    user: user || undefined,
  }, { fallback: 'The sales person could not be added.' });
  return body.data;
};

export const updateSalesPerson = async (company, name, { commissionRate, user, enabled }) => {
  const changes = {};
  if (commissionRate !== undefined) changes.commission_rate = Number(commissionRate) || 0;
  if (user !== undefined) changes.user = user || '';
  if (enabled !== undefined) changes.enabled = enabled ? 1 : 0;
  const body = await callServer(`${PEOPLE}.update_sales_person`, { company, name, ...changes }, {
    fallback: 'The sales person could not be changed.',
  });
  return body.data;
};

export const getCommissionReport = async (company, { fromDate, toDate, salesPerson } = {}) => {
  const body = await callServer(`${PEOPLE}.get_commission_report`, {
    company, from_date: fromDate, to_date: toDate, sales_person: salesPerson,
  }, { get: true, fallback: 'The commission report could not be loaded.' });
  return { rows: body.data?.data || [], totals: body.data?.totals || {} };
};

/** Why a commission rate cannot be used, or '' when it can. Empty means no commission. */
export const rateProblem = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return 'Enter a number';
  if (n < 0 || n > 100) return 'The rate must be between 0 and 100 percent';
  return '';
};

/** The first and last day of the month a date falls in, as YYYY-MM-DD. */
export const monthRange = (now = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const first = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { fromDate: first, toDate: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}` };
};

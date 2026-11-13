import { callServer } from './serverCall';

/**
 * The industry "personality" of a store and the pharmacy and restaurant calls that go with it (server: industry_profile_api,
 * pharmacy, restaurant_api). Every call resolves to the server's `data`, or throws an Error with a plain sentence.
 */
const PROFILE = 'murzak_pos.api.industry_profile_api';
const PHARMACY = 'murzak_pos.api.pharmacy';
const RESTAURANT = 'murzak_pos.api.restaurant_api';

const withCompany = (params, company) => (company ? { ...params, company } : params);

/** How the till behaves and speaks at this store: { key, label, features, words, look, home_cards, source, outlet, can_change } */
export const getIndustryProfile = async ({ warehouse, company } = {}) =>
  (await callServer(`${PROFILE}.get_industry_profile`, withCompany({ warehouse }, company), { get: true, fallback: 'The kind of shop could not be read.' })).data;

/** Every store with its own kind of shop: { business_profile, outlets: [{ warehouse, name, industry, profile, label }], options, can_change } */
export const listOutletIndustries = async (company) =>
  (await callServer(`${PROFILE}.list_outlet_industries`, withCompany({}, company), { get: true, fallback: 'The stores could not be loaded.' })).data;

/** Sets a store's kind of shop (a POS Industry such as PHARMACY or REST); an empty value follows the business. */
export const setOutletIndustry = async ({ warehouse, industry, company }) =>
  (await callServer(`${PROFILE}.set_outlet_industry`, withCompany({ warehouse, industry: industry || '' }, company), { fallback: 'The kind of shop could not be saved.' })).data;

/** Every prescription-only medicine sold in the period: { from_date, to_date, rows, summary, truncated } */
export const getDispensingRegister = async ({ company, fromDate, toDate, warehouse } = {}) =>
  (
    await callServer(
      `${PHARMACY}.get_dispensing_register`,
      withCompany({ from_date: fromDate, to_date: toDate, warehouse }, company),
      { get: true, fallback: 'The dispensing register could not be loaded.' }
    )
  ).data;

/** Who may approve a void here, whether this person needs one, and the quick reasons */
export const listVoidApprovers = async (company) =>
  (await callServer(`${RESTAURANT}.list_void_approvers`, withCompany({}, company), { get: true, fallback: 'The managers could not be loaded.' })).data;

/** Approves taking an item the kitchen already has off a bill. Resolves to { void, approved_by, approved_by_name }. */
export const approveVoid = async ({ itemCode, itemName, qty, rate, reason, billLabel, warehouse, approver, password, company }) =>
  (
    await callServer(
      `${RESTAURANT}.approve_void`,
      withCompany(
        { item_code: itemCode, item_name: itemName, qty, rate, reason, bill_label: billLabel || '', warehouse: warehouse || '', approver: approver || '', password: password || '' },
        company
      ),
      { fallback: 'The void could not be approved.' }
    )
  ).data;

/** The day's takings by waiter: { date, waiters: [...], totals } */
export const getWaiterCashup = async ({ company, date, warehouse } = {}) =>
  (await callServer(`${RESTAURANT}.get_waiter_cashup`, withCompany({ date, warehouse }, company), { get: true, fallback: 'The waiter cash-up could not be loaded.' })).data;

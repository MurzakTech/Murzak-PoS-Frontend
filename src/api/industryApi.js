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

const OPTIONS = 'murzak_pos.api.menu_options_api';

/** Every dish of the business that has menu options: { [item_code]: [groups] } */
export const listMenuOptions = async (company) =>
  (await callServer(`${OPTIONS}.list_menu_options`, withCompany({}, company), { get: true, fallback: 'The menu options could not be loaded.' })).data.options || {};

/** Keeps a dish's option groups (an empty list removes them). Resolves to { item_code, groups }. */
export const setMenuOptions = async ({ itemCode, groups, company }) =>
  (await callServer(`${OPTIONS}.set_menu_options`, withCompany({ item_code: itemCode, groups: JSON.stringify(groups || []) }, company), { fallback: 'The menu options could not be saved.' })).data;

/** The tourism levy for a month ("yyyy-mm"): { month, rate_percent, stores, not_levied, totals } */
export const getTourismLevy = async ({ company, month } = {}) =>
  (await callServer('murzak_pos.api.levy_api.get_tourism_levy', withCompany({ month }, company), { get: true, fallback: 'The tourism levy could not be worked out.' })).data;

/** The controlled medicines register for the period: { from_date, to_date, medicines: [{ item_name, opening, lines, closing, ... }] } */
export const getControlledRegister = async ({ company, fromDate, toDate, warehouse } = {}) =>
  (
    await callServer(
      `${PHARMACY}.get_controlled_register`,
      withCompany({ from_date: fromDate, to_date: toDate, warehouse }, company),
      { get: true, fallback: 'The controlled medicines register could not be loaded.' }
    )
  ).data;

const SETTINGS = 'murzak_pos.api.restaurant_settings_api';

/** A restaurant's happy hours, service charge, delivery platforms and tables (and the Service charge item) */
export const getRestaurantSettings = async (company) =>
  (await callServer(`${SETTINGS}.get_restaurant_settings`, withCompany({}, company), { get: true, fallback: 'The restaurant settings could not be loaded.' })).data;

/** Keeps the restaurant settings (owner and managers). Resolves to the settings as kept. */
export const saveRestaurantSettings = async ({ settings, company }) =>
  (await callServer(`${SETTINGS}.save_restaurant_settings`, withCompany({ settings: JSON.stringify(settings) }, company), { fallback: 'The restaurant settings could not be saved.' })).data;

/** Keeps a tip apart from the sale: { amount, mode, salesPerson?, invoice?, warehouse? } */
export const recordTip = async ({ amount, mode, salesPerson, invoice, warehouse, company }) =>
  (
    await callServer(
      `${RESTAURANT}.record_tip`,
      withCompany({ amount, mode_of_payment: mode, sales_person: salesPerson || '', invoice: invoice || '', warehouse: warehouse || '' }, company),
      { fallback: 'The tip could not be recorded.' }
    )
  ).data;

/** A month's sales through each delivery platform: { platforms: [{ channel, orders, sales, commission, expected_payout }], totals } */
export const getPlatformSales = async ({ company, month } = {}) =>
  (await callServer(`${RESTAURANT}.get_platform_sales`, withCompany({ month }, company), { get: true, fallback: 'The delivery platform sales could not be loaded.' })).data;

const INSURANCE = 'murzak_pos.api.insurance_api';
const PAYOUT = 'murzak_pos.api.payout_api';

/** A pharmacy's medical insurers: { insurers: [{ name, copay_percent, copay_amount, customer }], can_change } */
export const getInsurers = async (company) =>
  (await callServer(`${INSURANCE}.get_insurers`, withCompany({}, company), { get: true, fallback: 'The insurers could not be loaded.' })).data;

/** Keeps the insurers (owner and managers); each gets its customer record. Resolves to { insurers, can_change }. */
export const saveInsurers = async ({ insurers, company }) =>
  (await callServer(`${INSURANCE}.save_insurers`, withCompany({ insurers: JSON.stringify(insurers) }, company), { fallback: 'The insurers could not be saved.' })).data;

/** Insurance claims, newest first: { claims, by_status, insurers } */
export const getClaims = async ({ company, insurer, status } = {}) =>
  (await callServer(`${INSURANCE}.get_claims`, withCompany({ insurer: insurer || '', status: status || '' }, company), { get: true, fallback: 'The claims could not be loaded.' })).data;

/** Marks claims as sent to the insurer, with the claim or batch reference */
export const markClaimed = async ({ invoices, claimRef, company }) =>
  (await callServer(`${INSURANCE}.mark_claimed`, withCompany({ invoices: JSON.stringify(invoices), claim_ref: claimRef || '' }, company), { fallback: 'The claims could not be marked as sent.' })).data;

/** Marks a claim the insurer turned down, with the reason */
export const setClaimRejected = async ({ invoice, reason, company }) =>
  (await callServer(`${INSURANCE}.set_claim_rejected`, withCompany({ invoice, reason: reason || '' }, company), { fallback: 'The claim could not be marked as rejected.' })).data;

/** An insurer's payment shared over the claims chosen, in order: { payments: [{ invoice, payment, amount, status }] } */
export const recordInsurerPayment = async ({ invoices, amount, mode, reference, company }) =>
  (
    await callServer(
      `${INSURANCE}.record_insurer_payment`,
      withCompany({ invoices: JSON.stringify(invoices), amount, mode_of_payment: mode, reference: reference || '' }, company),
      { fallback: 'The insurer payment could not be recorded.' }
    )
  ).data;

/** A platform's orders no payout has settled yet: { platform, orders, total, without_number, commission_percent } */
export const listUnsettledOrders = async ({ platform, company }) =>
  (await callServer(`${PAYOUT}.list_unsettled_orders`, withCompany({ platform }, company), { get: true, fallback: 'The orders could not be loaded.' })).data;

/** What recording a payout would do, without saving: { matched, already_settled, not_found, summary } */
export const checkPayout = async ({ platform, orderRefs, amount, company }) =>
  (await callServer(`${PAYOUT}.check_payout`, withCompany({ platform, order_refs: orderRefs, amount }, company), { fallback: 'The payout could not be checked.' })).data;

/** Keeps the payout and marks its orders settled: { payout, matched, already_settled, not_found, summary } */
export const recordPayout = async ({ platform, orderRefs, amount, payoutDate, statementRef, company }) =>
  (
    await callServer(
      `${PAYOUT}.record_payout`,
      withCompany({ platform, order_refs: orderRefs, amount, payout_date: payoutDate || '', statement_ref: statementRef || '' }, company),
      { fallback: 'The payout could not be recorded.' }
    )
  ).data;

/** The payouts recorded, newest first: { payouts: [{ name, platform, date, received, orders, sales, expected_commission, actual_commission, difference, not_found }] } */
export const listPayouts = async ({ company, platform } = {}) =>
  (await callServer(`${PAYOUT}.list_payouts`, withCompany({ platform: platform || '' }, company), { get: true, fallback: 'The payouts could not be loaded.' })).data;

/** The modes of payment money can be received by from a business (an insurer's EFT or cheque): bank modes first */
export const listReceiveModes = async (company) => {
  const rows = (await callServer('murzak_pos.api.sales_api.list_payment_methods', withCompany({}, company), { get: true, fallback: 'The payment methods could not be loaded.' })).data || [];
  const usable = rows.filter((m) => m && m.name && m.name !== 'Credit');
  const banks = usable.filter((m) => m.type === 'Bank');
  return (banks.length ? banks : usable).map((m) => m.name);
};

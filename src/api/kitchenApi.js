/**
 * The server side of kitchen and bar tickets (station screens), described in KITCHEN_TICKETS_SERVER_API.md:
 *
 *   get_kitchen_settings / save_kitchen_settings   the stations and options all tills of a business share
 *   send_tickets                                   hand tickets to the stations (the server numbers them)
 *   list_tickets                                   the tickets a station, or a till, wants to see
 *   set_ticket_status                              New, Preparing, Ready, Served
 *
 * Every failure becomes a KitchenApiError with a kind the till can act on:
 *   'unavailable'  this server does not have these calls (yet): station screens cannot be used
 *   'failed'       the server did not answer, or refused: the message says why
 */
import axiosInstance from './axiosInstance';
import { friendlyErrorMessage } from '../utils/friendlyError';

const BASE = 'techsavanna_pos.api.kitchen_api';
export const ENDPOINTS = {
  getSettings: `${BASE}.get_kitchen_settings`,
  saveSettings: `${BASE}.save_kitchen_settings`,
  send: `${BASE}.send_tickets`,
  list: `${BASE}.list_tickets`,
  setStatus: `${BASE}.set_ticket_status`,
};

export const STATUSES = ['New', 'Preparing', 'Ready', 'Served'];

export class KitchenApiError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'KitchenApiError';
    this.kind = kind;
  }
}

// Signs that the server simply has no such call (Frappe answers 404, or names the missing method)
const MISSING = /failed to get method|not a valid whitelisted|has no attribute|no module named|not found/i;

const toError = (error) => {
  if (error instanceof KitchenApiError) return error;
  const status = error?.response?.status;
  const text = `${JSON.stringify(error?.response?.data ?? '')} ${error?.message ?? ''}`;
  if (status === 404 || status === 501 || (status && status >= 400 && MISSING.test(text) && /kitchen_api/i.test(text))) {
    return new KitchenApiError('unavailable', 'This server cannot show tickets on station screens yet.');
  }
  return new KitchenApiError('failed', friendlyErrorMessage(error));
};

// Replies look like { message: { success, data } } (Frappe) or { success, data }
const unwrap = (response) => {
  const body = response?.data?.message ?? response?.data ?? {};
  if (body && body.success === false) {
    throw new KitchenApiError('failed', friendlyErrorMessage(String(body.message || 'The server refused the request.')));
  }
  return body?.data ?? body;
};

const call = async (url, payload) => {
  try {
    return unwrap(await axiosInstance.post(url, payload));
  } catch (error) {
    throw toError(error);
  }
};

// ------------------------------------------------------- shapes

const safeParse = (text) => {
  try {
    return JSON.parse(text) || {};
  } catch (e) {
    return {};
  }
};

/** A ticket as sent to the server. The number is left out: the server numbers tickets. */
export const toServer = (t) => ({
  client_id: t.clientId,
  station: t.station,
  label: t.label || '',
  order_type: t.orderType,
  round: t.round,
  created_at: t.createdAt,
  lines: { adds: t.adds || [], changes: t.changes || [], voids: t.voids || [] },
});

/** A ticket from the server, in the shape the till and the station screen use */
export const fromServer = (row) => {
  const lines = typeof row.lines === 'string' ? safeParse(row.lines) : row.lines || {};
  return {
    id: String(row.id),
    clientId: row.client_id || '',
    station: row.station || '',
    number: row.number,
    round: row.round || 1,
    label: row.label || '',
    orderType: row.order_type || '',
    waiter: row.sent_by_name || row.sent_by || '',
    createdAt: row.created_at || '',
    status: STATUSES.includes(row.status) ? row.status : 'New',
    statusBy: row.status_by_name || row.status_by || '',
    statusAt: row.status_at || '',
    adds: Array.isArray(lines.adds) ? lines.adds : [],
    changes: Array.isArray(lines.changes) ? lines.changes : [],
    voids: Array.isArray(lines.voids) ? lines.voids : [],
  };
};

const usable = (row) => row && row.id !== undefined && row.station;

// ------------------------------------------------------- calls

/** The shared settings of the business, or null when none were saved yet */
export const getKitchenSettings = async ({ company }) => {
  const data = await call(ENDPOINTS.getSettings, { company });
  const settings = data && typeof data === 'object' ? data.settings : null;
  if (typeof settings === 'string') return safeParse(settings);
  return settings && typeof settings === 'object' ? settings : null;
};

export const saveKitchenSettings = async ({ company, settings }) => {
  await call(ENDPOINTS.saveSettings, { company, settings });
  return true;
};

/** Hands the tickets to their stations. Resolves the saved tickets, which carry the number the server gave. */
export const sendTickets = async ({ company, warehouse, tickets }) => {
  const data = await call(ENDPOINTS.send, { company, ...(warehouse ? { warehouse } : {}), tickets: tickets.map(toServer) });
  const rows = Array.isArray(data) ? data : data?.tickets;
  if (!Array.isArray(rows)) throw new KitchenApiError('failed', 'The server sent back an answer we could not read.');
  const saved = rows.filter(usable).map(fromServer);
  // Every ticket sent must come back, or we cannot say the kitchen has it
  const missing = tickets.filter((t) => !saved.some((s) => s.clientId === t.clientId));
  if (missing.length) throw new KitchenApiError('failed', `The server did not confirm the ticket for ${missing.map((t) => t.station).join(', ')}.`);
  return saved;
};

/** Tickets for a station (or all stations): { station, statuses, since } are all optional */
export const listTickets = async ({ company, warehouse, station, statuses, since }) => {
  const data = await call(ENDPOINTS.list, {
    company,
    ...(warehouse ? { warehouse } : {}),
    ...(station ? { station } : {}),
    ...(statuses && statuses.length ? { statuses } : {}),
    ...(since ? { since } : {}),
  });
  const rows = Array.isArray(data) ? data : data?.tickets;
  if (!Array.isArray(rows)) throw new KitchenApiError('failed', 'The server sent back a list we could not read.');
  return rows.filter(usable).map(fromServer);
};

export const setTicketStatus = async ({ company, id, status }) => {
  const data = await call(ENDPOINTS.setStatus, { company, id: String(id), status });
  return data && data.id !== undefined ? fromServer(data) : null;
};

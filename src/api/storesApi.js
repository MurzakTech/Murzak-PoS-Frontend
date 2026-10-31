import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * Editing a store and choosing who works at it (the Locations tab of the Stock levels page).
 *
 * The server decides who may: the owner and stock managers may edit a store, only the owner may choose who works at one.
 * A person with no store chosen can use every store; choosing stores for them limits them to those stores. The answers
 * are { success, message, data }; a refusal comes back as an Error with the server's plain sentence.
 */
const STORES = 'murzak_pos.api.store_admin_api';

const body = (response) => response.data?.message ?? response.data;
const failure = (reply) => new Error(humanizeMessage(reply?.message, 'That did not work. Please try again.'));
// A blank town or address is a real answer (it clears the old one), so only what was not given is left out
const given = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null));
const list = (value) => (Array.isArray(value) ? value : []);

const send = async (request) => {
  let response;
  try {
    response = await request();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
  const reply = body(response);
  if (!reply || reply.success === false || !reply.data) throw failure(reply);
  return reply.data;
};

/** Changes a store's name, town or address. Whatever is left out stays as it is. Resolves to { name, warehouse_name, city, address }. */
export const editStore = ({ store, name, city, address }) =>
  send(() => axiosInstance.post(`${STORES}.edit_store`, given({ warehouse: store, store_name: name, city, address }), { allowRefusal: true }));

/** The people of the business for the chooser: [{ user, name, assigned, stores }]. stores is how many stores the person is limited to (0 is every store). */
export const getStorePeople = async (store) => {
  const data = await send(() => axiosInstance.get(`${STORES}.get_store_people`, { params: { warehouse: store } }));
  return list(data.members).map((m) => ({ user: m.user, name: m.name || m.user, assigned: Boolean(m.assigned), stores: Number(m.stores) || 0 }));
};

/** Makes exactly these people (user names) the ones who work at the store. Resolves to { added, removed, everywhere }. */
export const setStorePeople = async ({ store, people }) => {
  const data = await send(() => axiosInstance.post(`${STORES}.set_store_people`, { warehouse: store, people: JSON.stringify(list(people)) }, { allowRefusal: true }));
  return { added: list(data.added), removed: list(data.removed), everywhere: list(data.everywhere) };
};

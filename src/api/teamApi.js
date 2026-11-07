import axiosInstance from './axiosInstance';
import { friendlyErrorMessage, humanizeMessage } from '../utils/friendlyError';

/**
 * The Team page of Settings (ticket P5-3). Reading the team is the one new call, team_api.list_team (it adds each
 * person's kind: Owner, Manager or Cashier). Adding, changing, giving roles to and deactivating people use the staff
 * calls the current Staff screen already uses, asked in the same way; nothing about them is changed. The server lets only
 * an owner use those.
 */
const TEAM = 'murzak_pos.api.team_api';
const STAFF = 'murzak_pos.api.staff_api';
const SIGNIN = 'murzak_pos.api.staff_signin_api';

const bodyOf = (response) => response.data?.message ?? response.data;

// Only the network call is wrapped, so a refusal from the server keeps its own plain sentence
const send = async (call) => {
  try {
    return await call();
  } catch (error) {
    throw new Error(friendlyErrorMessage(error));
  }
};

const refused = (reply) => reply && (reply.success === false || reply.error);
const failure = (reply, fallback) => new Error(humanizeMessage(reply && (reply.message || reply.error), fallback));

/** { company, me, members: [...], counts, tiers: { grant, owner_roles, manager_roles } } */
export const listTeam = async ({ company, enabledOnly = false } = {}) => {
  const params = {};
  if (company) params.company = company;
  if (enabledOnly) params.enabled_only = 1;
  const reply = bodyOf(await send(() => axiosInstance.get(`${TEAM}.list_team`, Object.keys(params).length ? { params } : undefined)));
  if (!reply || reply.success === false || !reply.data) throw failure(reply, 'The team could not be loaded.');
  return reply.data;
};

const done = (response, fallback) => {
  const reply = bodyOf(response);
  if (refused(reply)) throw failure(reply, fallback);
  return reply;
};

/** Add a person. `roles` are the roles of their kind (from list_team's tiers.grant). */
export const createPerson = async ({ firstName, lastName, email, password, phone, roles, company }) =>
  done(
    await send(() =>
      axiosInstance.post(`${STAFF}.create_staff_user`, {
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        phone: phone || undefined,
        roles,
        company: company || '',
        enabled: true,
        send_welcome_email: true,
      })
    ),
    'The person could not be added.'
  );

/**
 * Whether a person can sign in, and if not why: { checks: [{ id, title, status: 'green' | 'amber' | 'red', detail, fix }], ok, summary }.
 * Plain checks of the account only; it never returns a password.
 */
export const checkSignIn = async (email) => {
  const reply = bodyOf(await send(() => axiosInstance.get(`${SIGNIN}.check_staff_sign_in`, { params: { user_email: email } })));
  if (!reply || reply.success === false || !reply.data) throw failure(reply, 'The sign-in check could not be made.');
  return reply.data;
};

/** Give a person a new password. The server applies the sign-up rules, ends their other sign-ins and never sends the password back. */
export const setPersonPassword = async ({ email, password }) =>
  done(await send(() => axiosInstance.post(`${SIGNIN}.set_staff_password`, { user_email: email, password })), 'The password could not be changed.');

/** Send the welcome email again. Resolves to { sent, reason }. */
export const resendWelcome = async (email) => {
  const reply = done(await send(() => axiosInstance.post(`${SIGNIN}.resend_welcome_email`, { user_email: email })), 'The email could not be sent.');
  return reply.welcome_email || { sent: false, reason: '' };
};

/** Change a person's name or mobile number. */
export const updatePerson = async ({ email, firstName, lastName, phone }) =>
  done(
    await send(() => axiosInstance.put(`${STAFF}.update_staff_user`, { user_email: email, first_name: firstName, last_name: lastName, phone })),
    'The person could not be saved.'
  );

/** Give a person more roles (never replaces the ones they have). */
export const addRoles = async ({ email, roles }) =>
  done(await send(() => axiosInstance.post(`${STAFF}.assign_roles_to_staff`, { user_email: email, roles, replace_existing: false })), 'The role could not be given.');

/** Take roles away from a person. */
export const removeRoles = async ({ email, roles }) =>
  done(await send(() => axiosInstance.post(`${STAFF}.remove_roles_from_staff`, { user_email: email, roles })), 'The role could not be taken away.');

/** Deactivate a person: they can no longer sign in. Nothing they did is removed. */
export const deactivatePerson = async (email) => done(await send(() => axiosInstance.post(`${STAFF}.disable_staff_user`, { user_email: email })), 'The person could not be deactivated.');

/** Let a deactivated person sign in again. */
export const reactivatePerson = async (email) => done(await send(() => axiosInstance.post(`${STAFF}.enable_staff_user`, { user_email: email })), 'The person could not be reactivated.');

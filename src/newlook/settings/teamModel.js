import { canAccessRoute } from '../../config/roleAccessConfig';
import { formatDate } from '../components/dates';

/**
 * The Team page (ticket P5-3): who a person is (Owner, Manager or Cashier), whether they can use the till, how to move
 * them between kinds with the roles the server already has, and the audit trail file. Pure functions, tested alone.
 */
export const TIERS = ['owner', 'manager', 'cashier'];
export const TILL_ADDRESS = '/sales/pos';

/** Whether a person's roles let them open the till, by the same table the current app uses to show or hide the till. */
export const canUseTill = (roles) => canAccessRoute(TILL_ADDRESS, roles || []);

/**
 * The roles to give and to take away to move a person to `target`, using what the server sent in `tiers` (list_team).
 * Roles are only added or removed, never replaced, so anything else a person has is kept. Giving comes first in
 * moveRoles below, so a person never ends up with fewer roles than they need if the first step fails.
 *   to owner:    give the owner role
 *   to manager:  give the manager roles they lack, take the owner role away
 *   to cashier:  give the cashier role, take every owner and manager role away
 */
export const planTierChange = (member, target, tiers) => {
  const held = new Set(member.roles || []);
  const add = (tiers.grant[target] || []).filter((role) => !held.has(role));
  const away = new Set();
  if (target !== 'owner') (tiers.owner_roles || []).forEach((role) => held.has(role) && away.add(role));
  if (target === 'cashier') (tiers.manager_roles || []).forEach((role) => held.has(role) && away.add(role));
  return { add, remove: [...away] };
};

/** The roles to give a brand new person of this kind. */
export const rolesForNewPerson = (target, tiers) => [...(tiers.grant[target] || [])];

/** The only active owner cannot be moved down or deactivated: the shop would have no one who can change the team. */
export const isLastOwner = (member, members) => member.tier === 'owner' && member.enabled && members.filter((m) => m.tier === 'owner' && m.enabled).length <= 1;

const EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/** What is wrong with the add or change form: { field: 'key into the words' }. */
export const personProblems = (values, adding) => {
  const found = {};
  if (!values.firstName.trim()) found.firstName = 'firstNameMissing';
  if (!values.lastName.trim()) found.lastName = 'lastNameMissing';
  if (adding) {
    if (!values.email.trim()) found.email = 'emailMissing';
    else if (!EMAIL.test(values.email.trim())) found.email = 'emailWrong';
    if (values.password.length < 8) found.password = 'passwordShort';
  }
  const phone = values.phone.replace(/[\s\-().+]/g, '');
  if (phone && (!/^\d+$/.test(phone) || phone.length < 10)) found.phone = 'phoneWrong';
  return found;
};

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

const randomBelow = (n) => {
  const crypto = typeof window !== 'undefined' ? window.crypto : null;
  if (crypto && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0] % n;
  return Math.floor(Math.random() * n);
};

/**
 * A first password the owner can read out or send: 12 letters and digits, with at least one capital, one small letter and
 * one digit, and none of the look-alikes (0 O 1 l I). `random(n)` gives a whole number below n; the browser's secure
 * source is used unless a test gives its own.
 */
export const makePassword = (random = randomBelow, length = 12) => {
  const pick = (set) => set[random(set.length)];
  const all = LOWER + UPPER + DIGITS;
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

/** Which field a server sentence is about, so it can be shown beside that field: 'email', 'password', 'phone' or ''. */
export const fieldForError = (message) => {
  const text = String(message || '').toLowerCase();
  if (/e-?mail/.test(text)) return 'email';
  if (/password/.test(text)) return 'password';
  if (/phone|mobile/.test(text)) return 'phone';
  return '';
};

/** The audit trail as a CSV file: every cell quoted, so commas, quotes and line breaks in the details survive. */
export const auditCsv = (events, header) => {
  const cell = (value) => `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
  const rows = events.map((e) => [e.timestamp, e.user_name || e.user, e.user, e.action, e.module, e.doctype, e.docname, e.summary]);
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
};

/** '2026-10-16 08:12:44' as '16/10/2026 08:12' (day first); anything else is shown as it came. */
export const whenLabel = (timestamp) => {
  const text = String(timestamp || '');
  const m = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  return m ? `${formatDate(m[1])} ${m[2]}` : text;
};

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The last seven days, today included, as the audit trail's first view (the current screen does the same). */
export const defaultRange = (now = new Date()) => {
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  return { from: iso(start), to: iso(now) };
};

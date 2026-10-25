import { formatMoney } from '../components/format';
import T from './strings.cash';
import fill from '../labels/fill';

/**
 * Small decisions of the cash in and out dialog, kept apart from the screen so they can be tested alone. The server
 * decides what is allowed (who, the reasons, an amount the drawer holds); this only prepares what is sent and words
 * what comes back.
 */
const D = T.dialog;

export const KINDS = ['Paid Out', 'Paid In', 'Safe Drop'];
export const DEFAULT_KIND = 'Paid Out';

// What the server offers when it has not been asked yet (the same lists as the back end's cash_movement_rules)
const FALLBACK_REASONS = {
  'Paid In': ['Float top-up', 'Change', 'Other'],
  'Paid Out': ['Staff advance', 'Change', 'Other'],
  'Safe Drop': ['Bank deposit', 'Other'],
};

/** The reasons for a kind: the server's list when it sent one, else the usual ones */
export const reasonsFor = (kind, offered) => {
  const fromServer = offered && Array.isArray(offered[kind]) && offered[kind].length ? offered[kind] : null;
  return fromServer || FALLBACK_REASONS[kind] || [];
};

/** The reason a kind starts with */
export const firstReason = (kind, offered) => reasonsFor(kind, offered)[0] || '';

/** The words for a reason; a reason this version does not know is shown as the server wrote it */
export const reasonWord = (reason) => D.reasons[reason] || reason;

/** Select options for the reasons of a kind */
export const reasonOptions = (kind, offered) => reasonsFor(kind, offered).map((value) => ({ value, label: reasonWord(value) }));

/** True when something was typed that is a whole number above zero */
export const hasAmount = (digits) => /^\d+$/.test(String(digits ?? '')) && Number(digits) > 0;

/** The words of a mistake in what was typed, or '' when it can be saved */
export const problemWith = ({ digits, reason, note }) => {
  if (!hasAmount(digits)) return D.amountNeeded;
  if (reason === 'Other' && String(note || '').trim().length < 3) return D.noteNeeded;
  return '';
};

let counter = 0;
/**
 * This till's own id for one movement. The dialog keeps the same id until the movement is saved, so pressing Save again
 * after a dropped connection records it once.
 */
export const newClientId = () => {
  counter += 1;
  const random = Math.floor(Math.random() * 0xffffff).toString(36);
  return `cash-${Date.now().toString(36)}-${counter.toString(36)}-${random}`;
};

/** What goes to the server for a save */
export const entryFor = ({ session, kind, digits, reason, note, clientId }) => ({
  session,
  kind,
  amount: Number(digits),
  reason,
  note: String(note || '').trim(),
  clientId,
});

/** "12:30 Took out 300 for Petty cash (tea)" for one recorded movement */
export const movementLine = (m) => {
  const base = fill(D.recentLine, { time: m.recorded_at || '', kind: (D.kinds[m.kind] || m.kind).toLowerCase(), amount: formatMoney(m.amount), reason: reasonWord(m.reason) }).trim();
  return m.note ? `${base} (${m.note})` : base;
};

/** The saved message, with what the drawer should hold now when the server said */
export const savedMessage = (reply) => (reply.duplicate ? D.savedAgain : reply.cash_in_till === null ? '' : fill(D.saved, { amount: formatMoney(reply.cash_in_till) }));

/** The three totals as lines in a fixed order, leaving out the ones that are zero */
export const totalLines = (totals) =>
  ['Paid In', 'Paid Out', 'Safe Drop']
    .filter((kind) => totals && Number(totals[kind]) > 0)
    .map((kind) => fill(D.totalLine, { kind: D.kinds[kind], amount: formatMoney(totals[kind]) }));

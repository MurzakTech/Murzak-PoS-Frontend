/**
 * Turns anything that went wrong into a sentence a shop owner can act on.
 *
 * The server (Frappe/ERPNext) reports problems in several shapes: a plain
 * message, a JSON list in "_server_messages", an "exception" string such as
 * "frappe.exceptions.ValidationError: ...", or, in the worst case, a Python
 * traceback. Network failures arrive as "Network Error" or "timeout of 30000ms
 * exceeded". None of that should reach the screen as is.
 *
 * Rules:
 * 1. Keep the server's own wording when it is already a clear sentence
 *    ("Item SKU-001 is out of stock" is useful).
 * 2. Remove technical wrapping: HTML tags, exception class names, codes.
 * 3. Replace anything technical (tracebacks, SQL, programming errors) with a
 *    plain explanation and a next step.
 */

export const GENERIC = 'Something went wrong. Please try again.';
const SERVER_TROUBLE = 'Something went wrong on our side. Please try again, and contact support if it keeps happening.';

export const MESSAGES = {
  offline: 'You are offline. Check your internet connection and try again.',
  network: 'We could not reach the Murzak server. Check your internet connection and try again.',
  timeout: 'The server is taking too long to answer. Please try again.',
  session: 'Your session has ended. Please sign in again.',
  permission: 'You do not have permission to do this. Ask the business owner or an admin for access.',
  notFound: 'We could not find that. It may have been deleted or renamed.',
  tooLarge: 'That file is too large. Please choose a smaller one.',
  tooMany: 'Too many attempts in a short time. Wait a minute and try again.',
  unavailable: 'The server is busy or being updated. Please try again in a minute.',
  modified: 'Someone else changed this record while you had it open. Refresh the page and try again.',
  tooLong: 'One of the values is too long. Shorten it and try again.',
  login: 'That email, phone number or password is not right. Check them and try again.',
  duplicate: 'This already exists. Use a different name or code.',
  server: SERVER_TROUBLE,
};

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" };

const stripHtml = (text) =>
  text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ');

// Signs that a message is for developers, not people
const TECHNICAL = [
  /Traceback \(most recent call last\)/i,
  /File "[^"]+", line \d+/,
  /\b(pymysql|MySQLdb|mariadb|OperationalError|ProgrammingError|InternalError|IntegrityError|SQL syntax)\b/i,
  /^\(\d{4},\s*["']|Unknown column|Table '[^']+' doesn't exist/i, // raw database errors such as (1054, "Unknown column ...")
  /\b(TypeError|KeyError|AttributeError|NameError|IndexError|ValueError|ZeroDivisionError|ImportError|ModuleNotFoundError|RecursionError)\b/,
  /missing \d+ required (positional )?argument/i,
  /unexpected keyword argument/i,
  /object has no attribute/i,
  /'NoneType'/,
  /Failed to get method/i,
  /\[object Object\]/,
  /^(undefined|null|none|false|error)$/i,
  /^\{.*\}$|^\[.*\]$/s,
];

// Known raw messages and what to say instead
const REWRITES = [
  [/^Network Error$|Failed to fetch|ERR_NETWORK|ERR_INTERNET_DISCONNECTED|NetworkError when attempting/i, () => MESSAGES.network],
  [/timeout of \d+ms exceeded|ECONNABORTED|ETIMEDOUT/i, () => MESSAGES.timeout],
  [/Request failed with status code (\d{3})/i, (m) => statusMessage(Number(m[1])) || GENERIC],
  [/Document has been modified after you have opened it|TimestampMismatchError/i, () => MESSAGES.modified],
  [/CharacterLengthExceededError|Value too big|Data too long/i, () => MESSAGES.tooLong],
  [/Invalid login credentials|Incorrect password|Invalid email or password|User disabled or missing|AuthenticationError/i, () => MESSAGES.login],
  [/Session Expired|Not authenticated|CSRFTokenError|Invalid Request/i, () => MESSAGES.session],
  [/^(Not permitted|Insufficient Permission.*|PermissionError|Forbidden)\.?$/i, () => MESSAGES.permission],
  [/DuplicateEntryError|Duplicate entry/i, () => MESSAGES.duplicate],
  [/^Something went wrong while processing your request/i, () => SERVER_TROUBLE],
];

export const statusMessage = (status) => {
  if (status === 401) return MESSAGES.session;
  if (status === 403) return MESSAGES.permission;
  if (status === 404) return MESSAGES.notFound;
  if (status === 408) return MESSAGES.timeout;
  if (status === 409) return null; // a conflict usually carries a useful explanation
  if (status === 413) return MESSAGES.tooLarge;
  if (status === 429) return MESSAGES.tooMany;
  if (status === 502 || status === 503 || status === 504) return MESSAGES.unavailable;
  if (status >= 500) return SERVER_TROUBLE;
  return null;
};

// Database field names in plain words. The KRA eTIMS ones come from the eTIMS app on the server.
const FIELD_LABELS = {
  custom_item_classification: 'KRA item classification (eTIMS)',
  custom_taxation_type: 'KRA tax type (eTIMS)',
  custom_product_type: 'KRA product type (eTIMS)',
  custom_packaging_unit: 'KRA packaging unit (eTIMS)',
  custom_unit_of_quantity: 'KRA unit of quantity (eTIMS)',
  custom_etims_country_of_origin: 'country of origin (eTIMS)',
  custom_company: 'business',
  stock_uom: 'unit of measure',
  item_group: 'category',
  item_code: 'item code',
  item_name: 'product name',
};

const fieldLabels = (list) =>
  list
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => FIELD_LABELS[f] || f.replace(/^custom_/, '').replace(/_/g, ' '))
    .join(', ');

const sentence = (text) => {
  let t = text.charAt(0).toUpperCase() + text.slice(1);
  if (t.length > 260) {
    const cut = t.slice(0, 260);
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
    t = stop > 80 ? cut.slice(0, stop + 1) : `${cut.replace(/\s+\S*$/, '')}...`;
  }
  return /[.!?]$/.test(t) ? t : `${t}.`;
};

/**
 * Clean up a message from anywhere (server, browser, our own code).
 * Returns the fallback when the message is technical or empty.
 */
export const humanizeMessage = (input, fallback = GENERIC) => {
  if (input === null || input === undefined) return fallback;
  if (typeof input === 'object') {
    if (input instanceof Error) return humanizeMessage(input.message, fallback);
    return humanizeMessage(input.message ?? input.error ?? input.detail, fallback);
  }
  let text = stripHtml(String(input)).replace(/\s+/g, ' ').trim();
  if (!text) return fallback;

  for (const [pattern, replace] of REWRITES) {
    const m = text.match(pattern);
    if (m) return replace(m);
  }

  // "frappe.exceptions.ValidationError: Stock is short" -> "Stock is short"
  text = text.replace(/^([\w]+\.)*[\w]*(Error|Exception)\s*:\s*/, '').trim();
  // Server wrappers such as "Validation error: ..." or "Error creating POS Opening Entry: ..."
  text = text.replace(/^(validation error|error (creating|updating|closing|cancelling|submitting|fetching|getting) [^:]{1,60})\s*:\s*/i, '').trim();
  // "MandatoryError: [Item, ITEM-001]: item_group" style
  const mandatory = text.match(/^\[[^\]]*\]:\s*(.+)$/);
  if (mandatory) return sentence(`Some required information is missing: ${fieldLabels(mandatory[1])}`);

  if (!text || TECHNICAL.some((p) => p.test(text))) return fallback;
  return sentence(text);
};

// Frappe sends "_server_messages" as a JSON list of JSON strings
const fromServerMessages = (raw) => {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(list)) return null;
    const items = list
      .map((m) => {
        try {
          return typeof m === 'string' ? JSON.parse(m) : m;
        } catch (e) {
          return { message: m };
        }
      })
      .filter((m) => m && m.message && m.title !== 'Value too big');
    // The message that stopped the request is queued last; earlier red ones can be
    // leftovers from problems the server already recovered from
    const red = items.filter((m) => m.indicator === 'red');
    return (red[red.length - 1] || items[items.length - 1])?.message || null;
  } catch (e) {
    return null;
  }
};

// The most useful human-written part of a server reply, if any
const serverText = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return /<html|<!doctype/i.test(data) ? null : data;
  const msg = data.message;
  if (msg && typeof msg === 'object') {
    if (typeof msg.message === 'string' && msg.message) return msg.message;
    if (typeof msg.error === 'string' && msg.error) return msg.error;
  }
  // The exception is the error that actually stopped the request
  if (typeof data.exception === 'string' && data.exception) return data.exception;
  const fromList = data._server_messages ? fromServerMessages(data._server_messages) : null;
  if (fromList) return fromList;
  if (typeof msg === 'string' && msg) return msg;
  if (typeof data.error === 'string' && data.error) return data.error;
  return null; // data.exc is a traceback: never shown
};

const EXC_TYPES = {
  PermissionError: MESSAGES.permission,
  DoesNotExistError: MESSAGES.notFound,
  DuplicateEntryError: MESSAGES.duplicate,
  TimestampMismatchError: MESSAGES.modified,
  AuthenticationError: MESSAGES.login,
  CSRFTokenError: MESSAGES.session,
  CharacterLengthExceededError: MESSAGES.tooLong,
};

/**
 * The message to show for a failed request (an axios error) or any thrown error.
 * Pass a fallback that names the task when you have one, for example
 * "We could not save the product. Please try again."
 */
export const friendlyErrorMessage = (error, fallback = GENERIC) => {
  if (!error) return fallback;
  if (typeof error === 'string') return humanizeMessage(error, fallback);

  const response = error.response;
  if (!response) {
    // A request that never got an answer
    if (error.request || error.isAxiosError || /Network Error|timeout|ECONN/i.test(error.message || '')) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return MESSAGES.offline;
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || /timeout/i.test(error.message || '')) return MESSAGES.timeout;
      return MESSAGES.network;
    }
    return humanizeMessage(error.message ?? error, fallback);
  }

  const { status, data } = response;
  if (status === 401) {
    // A wrong password also comes back as 401; that is not an ended session
    const said = serverText(data) || data?.exc_type || '';
    return /password|credential|login|disabled or missing|AuthenticationError/i.test(said) ? MESSAGES.login : MESSAGES.session;
  }

  const byStatus = statusMessage(status);
  const text = serverText(data);
  const cleaned = text ? humanizeMessage(text, '') : '';

  // Server errors (5xx) only keep their own wording if it is a clean, human sentence
  if (cleaned && !(status >= 500 && cleaned.length > 200)) return cleaned;
  if (data?.exc_type && EXC_TYPES[data.exc_type]) return EXC_TYPES[data.exc_type];
  return byStatus || fallback;
};

/**
 * Pop-up titles in plain words. "Failed to fetch sales invoices" becomes
 * "Could not load sales invoices"; bare labels such as "Error" or "Success"
 * are dropped because the colour and icon already say it.
 */
export const humanizeTitle = (title) => {
  if (!title || typeof title !== 'string') return null;
  const t = title.trim();
  if (/^(error|success|warning|info|failed|failure|ok)$/i.test(t)) return null;
  const m = t.match(/^(?:Failed|Unable) to (fetch|list|get|load) (.+)$/i);
  if (m) return `Could not load ${m[2].toLowerCase()}`;
  const m2 = t.match(/^(?:Failed|Unable) to (.+)$/i);
  if (m2) return `Could not ${m2[1].charAt(0).toLowerCase()}${m2[1].slice(1)}`;
  return t;
};

/**
 * How serious a problem is, which decides its colour:
 * - "warning" (amber): something the person can fix and try again, such as a missing
 *   field, a business rule ("only 3 left"), a duplicate or a record changed by someone else.
 * - "error" (red): something failed that they cannot fix from this screen, such as no
 *   connection, a server crash, an ended session or missing permission.
 * Success (green) and information (blue) are chosen by the code that reports them.
 */
export const errorSeverity = (error) => {
  if (!error) return 'error';
  if (error.isRefusal) return 'warning'; // the server said no for a business reason
  const status = error.response?.status;
  if (!error.response) return 'error'; // no connection, timeout, or a fault in the app
  if (status === 401 || status === 403 || status >= 500) return 'error';
  if ([400, 404, 409, 412, 417, 422].includes(status)) return 'warning';
  return 'error';
};

// Shown above the message when the code that raised it gave no title, so the level is
// clear in words as well as colour (for colour-blind users and glare on till screens)
export const SEVERITY_TITLES = {
  success: 'Done',
  info: 'Good to know',
  warning: 'Needs your attention',
  error: 'Something went wrong',
};

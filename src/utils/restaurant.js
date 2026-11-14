/**
 * Restaurants and bars at the till: happy hours, the service charge, splitting a bill and the table map. Plain logic,
 * tested on its own. The settings come from the server (murzak_pos/api/restaurant_settings_rules.py), whose happy-hour
 * rule this mirrors.
 */

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const minutes = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return h * 60 + m;
};

/**
 * The happy hour that applies to a product at this moment, or null. A window past midnight (22:00 to 02:00) belongs to
 * the day it started; when several apply, the largest discount wins.
 */
export const happyHourFor = (rules, product, now = new Date()) => {
  if (!product) return null;
  const weekday = (now.getDay() + 6) % 7; // Monday is 0
  const at = now.getHours() * 60 + now.getMinutes();
  const today = DAYS[weekday];
  const yesterday = DAYS[(weekday + 6) % 7];
  let best = null;
  (rules || []).forEach((rule) => {
    const matches = (rule.items || []).includes(product.item_code) || (rule.groups || []).includes(product.item_group);
    if (!matches) return;
    const start = minutes(rule.start);
    const end = minutes(rule.end);
    const on = start < end ? rule.days.includes(today) && at >= start && at < end : (rule.days.includes(today) && at >= start) || (rule.days.includes(yesterday) && at < end);
    if (on && (!best || rule.percent > best.percent)) best = rule;
  });
  return best;
};

/** A happy hour as the till's discount rule (the same shape as an inventory discount rule) */
export const happyHourDiscount = (rule) => (rule ? { discount_type: 'Percentage', discount_value: Number(rule.percent), name: rule.name, happy_hour: true } : null);

/** The service charge on a bill: a percentage of what the guests owe after discounts */
export const serviceChargeOn = (base, percent) => (Number(percent) > 0 && Number(base) > 0 ? round2((Number(base) * Number(percent)) / 100) : 0);

/**
 * Splitting a bill by item. `picks` is { item_code: quantity } for this guest. Returns { part, rest }: the guest's lines
 * (paid now, as their own sale) and what stays on the bill. What the kitchen already had is shared out with the lines,
 * so nothing is sent twice. Quantities are clamped to what is on the bill.
 */
export const splitByItem = (cart, picks) => {
  const part = [];
  const rest = [];
  (cart || []).forEach((line) => {
    const take = Math.min(Math.max(Number((picks || {})[line.item_code]) || 0, 0), Number(line.qty) || 0);
    const keep = (Number(line.qty) || 0) - take;
    const sent = Number(line.sentQty) || 0;
    const scale = (qty) => (line.qty ? round2(((line.subtotal ?? line.rate * line.qty) * qty) / line.qty) : 0);
    const scaleDiscount = (qty) => (line.qty ? round2(((line.discount_amount || 0) * qty) / line.qty) : 0);
    if (take > 0) part.push({ ...line, qty: take, subtotal: scale(take), discount_amount: scaleDiscount(take), sentQty: Math.min(sent, take) });
    if (keep > 0) rest.push({ ...line, qty: keep, subtotal: scale(keep), discount_amount: scaleDiscount(keep), sentQty: Math.max(0, sent - take) });
  });
  return { part, rest };
};

/** A bill shared equally by `people`: each share in cents, the first ones taking the odd cents, so they add up exactly */
export const equalShares = (total, people) => {
  const n = Math.max(1, Math.floor(Number(people) || 1));
  const cents = Math.round((Number(total) || 0) * 100);
  const base = Math.floor(cents / n);
  const extra = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < extra ? 1 : 0)) / 100);
};

/**
 * The table map: each table of the store with its open bill, if any. `held` are the open bills (label, total, held_at);
 * a bill whose name is not a table is listed apart, so nothing is hidden. `current` is the bill open on this till.
 * Returns { tables: [{ name, status: 'free' | 'open' | 'here', held }], others: [held] }.
 */
export const tableMap = (tables, held, current) => {
  const key = (s) => String(s || '').trim().toLowerCase();
  const byLabel = new Map((held || []).filter((h) => key(h.label)).map((h) => [key(h.label), h]));
  const names = new Set((tables || []).map(key));
  return {
    tables: (tables || []).map((name) => {
      if (key(current) && key(current) === key(name)) return { name, status: 'here', held: null };
      const bill = byLabel.get(key(name));
      return { name, status: bill ? 'open' : 'free', held: bill || null };
    }),
    others: (held || []).filter((h) => !names.has(key(h.label))),
  };
};

/** How long a bill has been open, in minutes, from when it was held (an ISO time or a Date) */
export const minutesOpen = (heldAt, now = new Date()) => {
  const t = heldAt ? new Date(heldAt).getTime() : NaN;
  return Number.isFinite(t) ? Math.max(0, Math.floor((now.getTime() - t) / 60000)) : null;
};

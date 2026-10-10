/**
 * Kitchen and bar tickets: what to tell the people making the food and drinks.
 *
 * A bill is built up in rounds (a table orders, then orders again). Each cart
 * line remembers how many were already sent (`sentQty`) and the note that was
 * sent with them (`sentNote`), so "send" only ever includes what is new. When
 * something that was sent is reduced or removed, it is remembered as a void
 * and appears on the next ticket as a cancellation. Each item goes to the
 * station its category is set to (Food to the Kitchen, Beer to the Bar...).
 *
 * Everything here is plain logic with no screen or browser in it, so it can be
 * tested directly.
 */

export const MAX_NOTE = 80;
export const DEFAULT_QUICK_NOTES = ['No onions', 'Well done', 'Extra', 'Takeaway'];

/** What the till remembers about the bill's kitchen history: rounds sent, and sent items since cancelled */
export const EMPTY_KITCHEN = { round: 0, voids: [] };

export const kitchenKey = (company) => `pos_kitchen_v1:${company || 'no-company'}`;

export const defaultSettings = () => ({
  enabled: false,
  stations: [
    { id: 'kitchen', name: 'Kitchen', groups: [] },
    { id: 'bar', name: 'Bar', groups: [] },
  ],
  defaultStation: '', // station for items whose category has none; empty means "do not send them"
  quickNotes: [...DEFAULT_QUICK_NOTES],
  printNow: true,
  ticketDate: '',
  nextTicket: 1,
});

const text = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
export const cleanNote = (v) => text(v).slice(0, MAX_NOTE);
const same = (a, b) => text(a).toLowerCase() === text(b).toLowerCase();

// ---------------------------------------------------------------- settings

/** Settings from storage, always complete and well-formed, whatever was saved */
export const readSettings = (storage, company) => {
  const base = defaultSettings();
  try {
    const raw = JSON.parse(storage.getItem(kitchenKey(company)) || 'null');
    if (!raw || typeof raw !== 'object') return base;
    const stations = Array.isArray(raw.stations)
      ? raw.stations
          .filter((s) => s && text(s.name))
          .map((s, i) => ({ id: String(s.id || `station-${i + 1}`), name: text(s.name), groups: Array.isArray(s.groups) ? s.groups.map(text).filter(Boolean) : [] }))
      : base.stations;
    return {
      enabled: raw.enabled === true,
      stations: stations.length ? stations : base.stations,
      defaultStation: stations.some((s) => s.id === raw.defaultStation) ? raw.defaultStation : '',
      quickNotes: Array.isArray(raw.quickNotes) ? raw.quickNotes.map(cleanNote).filter(Boolean).slice(0, 12) : base.quickNotes,
      printNow: raw.printNow !== false,
      ticketDate: typeof raw.ticketDate === 'string' ? raw.ticketDate : '',
      nextTicket: Number.isInteger(raw.nextTicket) && raw.nextTicket > 0 ? raw.nextTicket : 1,
    };
  } catch (e) {
    return base;
  }
};

/** Saves the settings; false when the browser refused */
export const writeSettings = (storage, company, settings) => {
  try {
    storage.setItem(kitchenKey(company), JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
};

/** The station an item goes to: the one its category is set to, else the default station, else none */
export const stationFor = (settings, group) => {
  const direct = settings.stations.find((s) => s.groups.some((g) => same(g, group)));
  if (direct) return direct;
  return settings.stations.find((s) => s.id === settings.defaultStation) || null;
};

const FOOD = /food|meal|dish|snack|bakery|kitchen|breakfast|lunch|dinner|grill|pizza|burger|dessert|starter|main|side|salad|soup|chicken|meat|fish|nyama/i;
const DRINK = /drink|beverage|beer|lager|wine|spirit|whisk|vodka|gin|rum|cocktail|soda|juice|water|tea|coffee|liquor|bar\b|cider|tonic/i;

/** A starting point for non-technical users: categories that sound like food go to the Kitchen, drinks to the Bar */
export const suggestStations = (groupNames, stations = defaultSettings().stations) => {
  const names = [...new Set((groupNames || []).map(text).filter(Boolean))];
  const kitchen = stations[0];
  const bar = stations[1] || stations[0];
  return stations.map((s) => ({
    ...s,
    groups:
      s.id === kitchen.id ? names.filter((n) => FOOD.test(n) && !DRINK.test(n)) : s.id === bar.id ? names.filter((n) => DRINK.test(n)) : s.groups,
  }));
};

// ---------------------------------------------------------------- what to send

const lineNote = (l) => cleanNote(l.note);
const sentNote = (l) => cleanNote(l.sentNote);

/**
 * Works out what a send would contain, grouped by station.
 *
 *   adds     items (or extra quantity) not sent yet
 *   changes  a different note on something already sent
 *   voids    sent items that were reduced or removed since
 *
 * Items whose category has no station (and no default station) are listed in
 * `unrouted` and are never marked as sent, so they are not silently forgotten.
 * Returns { stations: [{ station, adds, changes, voids }], unrouted, count }.
 */
export const planSend = (cart, kitchen, settings) => {
  const groups = new Map(settings.stations.map((s) => [s.id, { station: s, adds: [], changes: [], voids: [] }]));
  const unrouted = [];

  (cart || []).forEach((line) => {
    const station = stationFor(settings, line.item_group);
    const sent = Number(line.sentQty) || 0;
    const delta = line.qty - sent;
    const noteNow = lineNote(line);
    const isChange = sent > 0 && delta <= 0 && noteNow !== sentNote(line);
    if (delta <= 0 && !isChange) return;
    if (!station) {
      unrouted.push({ item_code: line.item_code, item_name: line.item_name || line.item_code, item_group: line.item_group || '', qty: Math.max(delta, 0) });
      return;
    }
    const bucket = groups.get(station.id);
    if (delta > 0) bucket.adds.push({ item_code: line.item_code, item_name: line.item_name || line.item_code, qty: delta, note: noteNow });
    else bucket.changes.push({ item_code: line.item_code, item_name: line.item_name || line.item_code, note: noteNow, previousNote: sentNote(line) });
  });

  // Cancellations of things already sent; the same item cancelled twice is shown once
  const merged = new Map();
  ((kitchen && kitchen.voids) || []).forEach((v) => {
    const station = stationFor(settings, v.item_group);
    if (!station) return;
    const key = `${station.id}|${v.item_code}|${cleanNote(v.note)}`;
    const found = merged.get(key);
    if (found) found.qty += v.qty;
    else merged.set(key, { station, item_code: v.item_code, item_name: v.item_name || v.item_code, qty: v.qty, note: cleanNote(v.note) });
  });
  merged.forEach((v) => groups.get(v.station.id).voids.push({ item_code: v.item_code, item_name: v.item_name, qty: v.qty, note: v.note }));

  const stations = [...groups.values()].filter((g) => g.adds.length || g.changes.length || g.voids.length);
  const count = stations.reduce((n, g) => n + g.adds.length + g.changes.length + g.voids.length, 0);
  return { stations, unrouted, count };
};

/** The cart with everything in the plan marked as sent (quantity and note), so the next send holds only what is new */
export const markSent = (cart, plan) => {
  const sentCodes = new Set(plan.stations.flatMap((g) => [...g.adds, ...g.changes].map((x) => x.item_code)));
  return cart.map((line) => (sentCodes.has(line.item_code) ? { ...line, sentQty: line.qty, sentNote: cleanNote(line.note) } : line));
};

/** The bill's kitchen history after a send: one more round, and the cancellations that were just sent are cleared */
export const afterSend = (kitchen, plan, settings) => {
  const sentVoidCodes = new Set(plan.stations.flatMap((g) => g.voids.map((v) => v.item_code)));
  return {
    round: (kitchen.round || 0) + 1,
    voids: (kitchen.voids || []).filter((v) => !(sentVoidCodes.has(v.item_code) && stationFor(settings, v.item_group))),
  };
};

/**
 * What to record when a line's quantity goes down (or the line is removed).
 * Returns the void to remember, or null when nothing that was sent is affected.
 */
export const voidFor = (line, newQty) => {
  const sent = Number(line && line.sentQty) || 0;
  const target = Math.max(0, newQty);
  if (!line || sent <= 0 || target >= sent) return null;
  return { item_code: line.item_code, item_name: line.item_name || line.item_code, item_group: line.item_group || '', qty: sent - target, note: sentNote(line) };
};

/** A cart line after its quantity changed: it can no longer have more sent than it has */
export const clampSent = (line, newQty) => (line.sentQty > newQty ? { ...line, sentQty: Math.max(0, newQty) } : line);

/** Cancelling a whole bill that was already sent: every sent quantity becomes a cancellation */
export const planCancelAll = (cart, kitchen, settings) => {
  const voids = [...((kitchen && kitchen.voids) || [])];
  (cart || []).forEach((line) => {
    const v = voidFor(line, 0);
    if (v) voids.push(v);
  });
  return planSend([], { voids }, settings);
};

export const hasSentItems = (cart, kitchen) => (cart || []).some((l) => Number(l.sentQty) > 0) || ((kitchen && kitchen.voids) || []).length > 0;

// ---------------------------------------------------------------- tickets

const pad = (n) => String(n).padStart(2, '0');
const dayOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The next ticket number: it starts again at 1 each day */
export const takeTicketNumber = (settings, now = new Date()) => {
  const today = dayOf(now);
  const number = settings.ticketDate === today ? settings.nextTicket : 1;
  return { number, settings: { ...settings, ticketDate: today, nextTicket: number + 1 } };
};

/** One ticket per station that has something to say */
export const buildTickets = (plan, { label, waiter, number, round, now = new Date() }) =>
  plan.stations.map((g) => ({
    station: g.station.name,
    number,
    round,
    label: text(label) || 'Counter order',
    waiter: text(waiter),
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    adds: g.adds,
    changes: g.changes,
    voids: g.voids,
  }));

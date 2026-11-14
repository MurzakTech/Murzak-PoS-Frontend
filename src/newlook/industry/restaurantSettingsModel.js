/**
 * The Restaurant and bar settings card: the server's settings as the form holds them, and back. Plain logic, tested on
 * its own. The server checks everything again (murzak_pos/api/restaurant_settings_rules.py).
 */

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const list = (text) =>
  String(text || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * Table names typed as a list, where a range like "T1-T12" or "1-8" is spelled out: "T1-T3, Bar 1" gives T1, T2, T3,
 * Bar 1. A range of more than 200 is not spelled out (it is kept as typed, and the server refuses it plainly).
 */
export const expandTables = (text) => {
  const out = [];
  list(text).forEach((part) => {
    const m = /^([A-Za-z ]*?)(\d+)\s*-\s*\1?(\d+)$/.exec(part);
    if (m) {
      const [from, to] = [Number(m[2]), Number(m[3])];
      if (to >= from && to - from < 200) {
        for (let n = from; n <= to; n += 1) out.push(`${m[1]}${n}`);
        return;
      }
    }
    out.push(part);
  });
  return [...new Set(out)];
};

export const blankHappyHour = () => ({ name: '', days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '17:00', end: '19:00', percent: '', groups: '', items: '' });

/** The server's settings as the form holds them */
export const toForm = (settings, stores = []) => ({
  serviceCharge: settings && Number(settings.service_charge_percent) ? String(settings.service_charge_percent) : '',
  platforms: ((settings && settings.platforms) || []).map((p) => ({ name: p.name, commission: Number(p.commission_percent) ? String(p.commission_percent) : '' })),
  happyHours: ((settings && settings.happy_hours) || []).map((h) => ({
    name: h.name,
    days: [...h.days],
    start: h.start,
    end: h.end,
    percent: String(h.percent),
    groups: (h.groups || []).join(', '),
    items: (h.items || []).join(', '),
  })),
  tables: Object.fromEntries(stores.map((s) => [s.warehouse, (((settings && settings.tables) || {})[s.warehouse] || []).join(', ')])),
});

/** The form as the server takes it */
export const fromForm = (form) => ({
  service_charge_percent: Number(form.serviceCharge) || 0,
  platforms: form.platforms.filter((p) => String(p.name).trim()).map((p) => ({ name: String(p.name).trim(), commission_percent: Number(p.commission) || 0 })),
  happy_hours: form.happyHours.map((h) => ({
    name: String(h.name).trim(),
    days: h.days,
    start: String(h.start).trim(),
    end: String(h.end).trim(),
    percent: Number(h.percent) || 0,
    groups: list(h.groups),
    items: list(h.items),
  })),
  tables: Object.fromEntries(Object.entries(form.tables).map(([store, text]) => [store, expandTables(text)]).filter(([, names]) => names.length)),
});

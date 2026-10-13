import S from '../strings';
import fill from '../labels/fill';
import { formatMoney } from '../components/format';

/**
 * The small decisions Home makes about the numbers it is given, kept free of drawing so each can be tested alone.
 */
export const PERIOD_KEYS = ['today', '7d', '30d', 'month', 'custom'];
export const DEFAULT_PERIOD = '30d';

export const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Reads the period out of the address. Anything unusable falls back to 30 days, and Custom needs both dates. */
export const periodFromSearch = (search) => {
  const period = PERIOD_KEYS.includes(search.get('period')) ? search.get('period') : DEFAULT_PERIOD;
  const from = search.get('from');
  const to = search.get('to');
  if (period === 'custom' && !(isIsoDate(from) && isIsoDate(to) && from <= to)) return { period: DEFAULT_PERIOD, from: '', to: '' };
  return { period, from: period === 'custom' ? from : '', to: period === 'custom' ? to : '' };
};

/** The words of the greeting for an hour of the day (0 to 23) */
export const greetingWord = (hour) => (hour < 12 ? S.home.greeting.morning : hour < 17 ? S.home.greeting.afternoon : S.home.greeting.evening);

const nairobiParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { hour: get('hour') % 24, year: get('year'), month: get('month'), day: get('day') };
};

export const greeting = (firstName, date = new Date()) => {
  const word = greetingWord(nairobiParts(date).hour);
  return firstName ? fill(S.home.greeting.withName, { greeting: word, name: firstName }) : word;
};

/** Today's date in Nairobi as yyyy-mm-dd, to tell a till opened earlier from one opened today */
export const todayIso = (date = new Date()) => {
  const { year, month, day } = nairobiParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/** 'Tuesday 13 October 2026' for the current day in Nairobi */
export const dateLine = (date = new Date()) => {
  const { year, month, day } = nairobiParts(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return fill(S.home.dateLine, { weekday: S.home.weekdaysLong[weekday], day, month: S.home.monthsLong[month - 1], year });
};

/** The weekday of today in Nairobi, in words, for "last Tuesday" */
export const weekdayName = (date = new Date()) => {
  const { year, month, day } = nairobiParts(date);
  return S.home.weekdaysLong[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
};

const roundPct = (pct) => Math.round(Math.abs(Number(pct)) * 10) / 10;

/**
 * A change figure as words and a direction, never as colour alone: { direction: 'up' | 'down' | 'flat' | 'none', text }.
 * `templates` is S.home.hero.change or S.home.tiles.change.
 */
export const changeInfo = (pct, templates, values = {}) => {
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) return { direction: 'none', text: fill(templates.none, values) };
  const value = Number(pct);
  if (roundPct(value) === 0) return { direction: 'flat', text: fill(templates.same, values) };
  const direction = value > 0 ? 'up' : 'down';
  return { direction, text: fill(templates[direction], { ...values, pct: roundPct(value) }) };
};

/** The first part of 'HH:MM' times and 'YYYY-MM-DD' dates, in the day-first words used everywhere */
export const shortDay = (iso) => {
  const [, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d} ${S.charts.months[m - 1]}`;
};

/** Day of the month and days in that month for the last day of the period, for "Day 12 of 31" */
export const monthProgress = (periodTo) => {
  const [y, m, d] = String(periodTo).slice(0, 10).split('-').map(Number);
  if (!y) return null;
  return { day: d, days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
};

/** Money in full, as the Spec asks for tiles and totals: KES 71,000 */
export const money = (value) => formatMoney(value);

/** Kenyan mobile numbers to the international form WhatsApp wants: 0712345678 gives 254712345678; nothing usable gives '' */
export const whatsappNumber = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && /^[17]/.test(digits)) return `254${digits}`;
  return '';
};

/** The ready message the owner sends from WhatsApp; the app sends nothing itself */
export const reminderLink = ({ mobile, name, amount, shop }) => {
  const text = fill(S.home.attention.reminder, { name, amount: money(amount), shop: shop || S.home.attention.reminderShopFallback });
  const number = whatsappNumber(mobile);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
};

/** True when the shop has no sales at all in this answer, so the first-time panel replaces the tiles and charts */
export const hasNoSalesYet = (data) => {
  if (!data) return false;
  const days = data.period && Number(data.period.days_of_data);
  const revenue = data.tiles && data.tiles.revenue ? Number(data.tiles.revenue.value) : null;
  const today = data.hero ? Number(data.hero.today_total) : null;
  const points = data.charts && data.charts.sales;
  const anySale = Array.isArray(points) && points.some((p) => Number(p.count) > 0 || Number(p.revenue) > 0);
  return days === 0 && !revenue && !today && !anySale;
};

/** CSV text of the numbers on screen (Export "downloads the visible numbers as CSV") */
export const overviewCsv = (data, { canProfit = false } = {}) => {
  const C = S.home.csv;
  const q = (cell) => `"${String(cell === null || cell === undefined ? '' : cell).replace(/"/g, '""')}"`;
  const rows = [C.headings, [C.period, C.from, data.period.from], [C.period, C.to, data.period.to]];
  const tiles = data.tiles || {};
  if (tiles.revenue) rows.push([C.tile, S.home.tiles.revenue, tiles.revenue.value]);
  if (canProfit && tiles.net_profit) rows.push([C.tile, S.home.tiles.netProfit, tiles.net_profit.value]);
  if (canProfit && tiles.money_owed) rows.push([C.tile, S.home.tiles.moneyOwed, tiles.money_owed.amount]);
  if (tiles.low_stock) rows.push([C.tile, S.home.tiles.lowStock, tiles.low_stock.count]);
  ((data.charts && data.charts.sales) || []).forEach((p) => {
    rows.push([C.sales, fill(C.revenueOn, { date: p.date }), p.revenue]);
    if (canProfit && p.profit !== undefined) rows.push([C.sales, fill(C.profitOn, { date: p.date }), p.profit]);
    rows.push([C.sales, fill(C.countOn, { date: p.date }), p.count]);
  });
  ((data.charts && data.charts.payments) || []).forEach((p) => rows.push([C.paid, p.method, p.amount]));
  ((data.charts && data.charts.top_products) || []).forEach((p) => rows.push([C.top, p.name, p.revenue]));
  ((data.charts && data.charts.busiest_hours) || []).forEach((p) => rows.push([C.hours, fill(C.hourAt, { hour: p.hour }), p.average_sales]));
  return `${rows.map((r) => r.map(q).join(',')).join('\n')}\n`;
};

/** The period in words for chart summaries: "last 30 days", "today", "12 Oct to 18 Oct" */
export const rangeWords = (period, from, to) => {
  if (period === 'custom') return fill(S.home.range.custom, { from: shortDay(from), to: shortDay(to) });
  return S.home.range[period] || S.home.range['30d'];
};

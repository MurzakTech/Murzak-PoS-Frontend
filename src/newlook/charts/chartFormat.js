import S from '../strings';
import fill from '../labels/fill';
import { formatMoney } from '../components/format';

/**
 * Number and date formats for charts (Spec: Charts, "Axes and units"): axis numbers are shortened to 71K, while
 * tooltips and totals are in full as KES 71,000. Dates are day first, in English short forms.
 */
export const shortNumber = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const trim = (x) => String(Math.round(x * 10) / 10);
  if (abs >= 1e9) return `${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `${trim(n / 1e6)}M`;
  if (abs >= 1e3) return `${trim(n / 1e3)}K`;
  return String(Math.round(n * 100) / 100);
};

export const fullMoney = (value) => formatMoney(value);

const parts = (isoDate) => {
  const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};

/** '2026-10-08' gives 'Thu 8 Oct' */
export const shortDate = (isoDate) => {
  const { m, d, weekday } = parts(isoDate);
  return `${S.charts.weekdays[weekday]} ${d} ${S.charts.months[m - 1]}`;
};

/** '2026-10-08' gives '8 Oct' */
export const dayMonth = (isoDate) => {
  const { m, d } = parts(isoDate);
  return `${d} ${S.charts.months[m - 1]}`;
};

/** The bottom axis shows the month at the start and where it changes ("12 Oct", then days, then "1 Nov") */
export const axisDayLabel = (isoDate, index, previousIsoDate) => {
  const { m, d } = parts(isoDate);
  if (index === 0 || !previousIsoDate || parts(previousIsoDate).m !== m) return `${d} ${S.charts.months[m - 1]}`;
  return String(d);
};

/** Cuts a long name at `max` characters (24 by default); the full name belongs in the tooltip */
export const ellipsize = (text, max = 24) => (String(text).length > max ? `${String(text).slice(0, max - 1).trimEnd()}…` : String(text));

/** 8 gives '8am', 12 gives '12pm', 16 gives '4pm' */
export const hourLabel = (hour) => {
  const h = Number(hour);
  if (h === 0) return fill(S.charts.hours.am, { hour: 12 });
  if (h < 12) return fill(S.charts.hours.am, { hour: h });
  if (h === 12) return fill(S.charts.hours.pm, { hour: 12 });
  return fill(S.charts.hours.pm, { hour: h - 12 });
};

export const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

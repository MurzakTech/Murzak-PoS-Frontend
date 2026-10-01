// Small display helpers used across the dashboard

export const formatMoney = (value, currency = 'KES') => {
  const n = Number(value) || 0;
  return `${currency} ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
};

// 45200 -> "45K", 1.2M -> "1.2M" (for chart axes where space is tight)
export const formatCompact = (value) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);

export const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const PERIOD_LABELS = {
  '7days': 'Last 7 days',
  '30days': 'Last 30 days',
  month: 'This month',
  quarter: 'This quarter',
  year: 'This year',
  custom: 'Custom range',
};

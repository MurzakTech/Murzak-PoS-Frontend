import React from 'react';
import { Box, useTheme } from '@mui/material';
import { PointOfSale } from '@mui/icons-material';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionCard from '../../components/Common/SectionCard';
import EmptyState from '../../components/Common/EmptyState';
import { formatCompact, formatMoney } from './formatters';

const ChartTooltip = ({ active, payload, label, labelFormatter, currency, names }) => {
  const theme = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: theme.shadows[4],
        px: 1.5,
        py: 1,
        fontSize: '0.8125rem',
      }}
    >
      <Box sx={{ fontWeight: 600, mb: 0.5 }}>{labelFormatter ? labelFormatter(label) : label}</Box>
      {payload.map((p) => (
        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color || p.fill }} />
          {names?.[p.dataKey] || p.dataKey}: <b style={{ color: theme.palette.text.primary }}>{formatMoney(p.value, currency)}</b>
        </Box>
      ))}
    </Box>
  );
};

const noSales = (onOpenPOS) => (
  <EmptyState
    compact
    title="No sales in this period yet"
    description="Once you make a sale at the till, your trend shows up here."
    actions={[{ label: 'Open POS', icon: <PointOfSale />, onClick: onOpenPOS }]}
  />
);

export const SalesTrendChart = ({ data = [], currency, subtitle, onOpenPOS }) => {
  const theme = useTheme();
  const hasData = data.some((d) => Number(d.sales) > 0);
  return (
    <SectionCard title="Sales trend" subtitle={subtitle}>
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.28} />
                <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={theme.palette.divider} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => new Date(v).getDate()}
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              minTickGap={14}
            />
            <YAxis
              tickFormatter={formatCompact}
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: theme.palette.divider }}
              content={
                <ChartTooltip
                  currency={currency}
                  names={{ sales: 'Sales' }}
                  labelFormatter={(l) =>
                    new Date(l).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke={theme.palette.primary.main}
              strokeWidth={2.5}
              fill="url(#salesFill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: theme.palette.background.paper }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        noSales(onOpenPOS)
      )}
    </SectionCard>
  );
};

export const MonthlySalesChart = ({ data = [], currency, onOpenPOS }) => {
  const theme = useTheme();
  const hasData = data.some((d) => Number(d.sales) > 0);
  return (
    <SectionCard title="Monthly sales" subtitle="This year">
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={theme.palette.divider} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatCompact}
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              width={48}
            />
            <Tooltip
              cursor={{ fill: theme.palette.action.hover }}
              content={<ChartTooltip currency={currency} names={{ sales: 'Sales' }} />}
            />
            <Bar dataKey="sales" fill={theme.palette.secondary.main} radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        noSales(onOpenPOS)
      )}
    </SectionCard>
  );
};

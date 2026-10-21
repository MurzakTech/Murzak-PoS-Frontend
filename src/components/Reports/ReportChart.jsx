import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * ReportChart Component
 * Wrapper component for different chart types
 * 
 * @param {Object} props
 * @param {Array} props.data - Chart data array
 * @param {string} props.type - Chart type: 'line', 'bar', 'pie'
 * @param {string} props.title - Chart title
 * @param {string} props.dataKey - Key for X-axis data
 * @param {Array} props.series - Array of series configs [{ dataKey, name, color }]
 * @param {number} props.height - Chart height (default: 400)
 */
const ReportChart = ({
  data = [],
  type = 'line',
  title,
  dataKey = 'date',
  series = [],
  height = 400,
}) => {
  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {title || 'Chart'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      </Paper>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis
                dataKey={dataKey}
                stroke="var(--muted)"
                tickFormatter={(value) => {
                  if (typeof value === 'string' && value.includes('-')) {
                    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }
                  return value;
                }}
              />
              <YAxis stroke="var(--muted)" />
              <Tooltip
                formatter={(value, name) => {
                  const seriesConfig = series.find((s) => s.dataKey === name);
                  if (seriesConfig?.format === 'currency') {
                    return [`KES ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, seriesConfig.name || name];
                  }
                  return [value?.toLocaleString(), seriesConfig?.name || name];
                }}
                labelFormatter={(label) => {
                  if (typeof label === 'string' && label.includes('-')) {
                    return `Date: ${new Date(label).toLocaleDateString()}`;
                  }
                  return label;
                }}
              />
              <Legend />
              {series.map((s, index) => (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  stroke={s.color || 'var(--brand-primary)'}
                  strokeWidth={s.strokeWidth || 3}
                  dot={{ fill: s.color || 'var(--brand-primary)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: s.color || 'var(--brand-primary)' }}
                  name={s.name || s.dataKey}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey={dataKey} stroke="var(--muted)" />
              <YAxis stroke="var(--muted)" />
              <Tooltip
                formatter={(value, name) => {
                  const seriesConfig = series.find((s) => s.dataKey === name);
                  if (seriesConfig?.format === 'currency') {
                    return [`KES ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, seriesConfig.name || name];
                  }
                  return [value?.toLocaleString(), seriesConfig?.name || name];
                }}
              />
              <Legend />
              {series.map((s, index) => (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  fill={s.color || 'var(--brand-primary)'}
                  radius={[4, 4, 0, 0]}
                  name={s.name || s.dataKey}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--brand)', 'var(--compare)'];
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="var(--brand)"
                dataKey={series[0]?.dataKey || 'value'}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const seriesConfig = series[0];
                  if (seriesConfig?.format === 'currency') {
                    return [`KES ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                  }
                  return [value?.toLocaleString(), name];
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: (theme) => theme.shadows[2] }}>
      {title && (
        <Typography variant="h6" gutterBottom fontWeight="bold">
          {title}
        </Typography>
      )}
      {renderChart()}
    </Paper>
  );
};

export default ReportChart;


import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import fill from '../labels/fill';
import S from '../strings';
import ChartCard from '../charts/ChartCard';
import ChartFrame from '../charts/ChartFrame';
import ChartTooltip from '../charts/ChartTooltip';
import { COLOUR, MARKS } from '../charts/chartTheme';
import { fullMoney, shortNumber } from '../charts/chartFormat';
import T from './strings.reports';

/**
 * One amount over time as columns: net profit by day or month, running costs by day. Marks follow the chart kit:
 * columns at most 24px wide with a 4px rounded tip, pale horizontal gridlines, the biggest one named once, and today
 * (still going) drawn lighter and called "so far". A loss is a column below the line, and the table says it in words
 * and numbers, so it is never only a colour.
 *
 *   rows       [{ key, label, full, value, soFar }] oldest first; label is the short words under a column, full is for the tooltip
 *   valueName  the words for the amount ("Net profit")
 */
const axisTick = { fill: 'var(--muted)', fontSize: 12 };

const ColumnsChart = ({ title, summary, rows, valueName, tableHeader, emptyTitle, emptyText, state = 'ready', onRetry, width, height = 240 }) => {
  const data = rows || [];
  const empty = data.length === 0 || data.every((r) => r.value === 0);
  const peak = data.reduce((best, r) => (r.value > (best ? best.value : 0) ? r : best), null);
  const total = data.reduce((sum, r) => sum + r.value, 0);

  const describe = (row) => ({
    heading: row.soFar ? fill(S.charts.sales.soFarTooltip, { date: row.full }) : row.full,
    rows: [{ value: fullMoney(row.value), name: valueName, swatch: COLOUR.series[0] }],
  });

  const table = {
    caption: title,
    columns: [
      { key: 'when', header: tableHeader },
      { key: 'value', header: T.charts.amount, align: 'right' },
    ],
    rows: data.map((r) => ({ key: r.key, when: r.soFar ? fill(S.charts.sales.soFarTooltip, { date: r.full }) : r.full, value: fullMoney(r.value) })),
    footer: { when: T.charts.total, value: fullMoney(total) },
  };

  const peakLabel = ({ x, y, width: w, index }) =>
    peak && data[index] && data[index].key === peak.key ? (
      <text key="peak-label" x={x + w / 2} y={y - 6} textAnchor="middle" fill={COLOUR.body} fontSize={12} fontWeight={600} className="nl-chart__label">
        {shortNumber(peak.value)}
      </text>
    ) : null;

  return (
    <ChartCard title={title} summary={summary} table={table} state={state === 'ready' && empty ? 'empty' : state} onRetry={onRetry} height={height} emptyTitle={emptyTitle} emptyText={emptyText}>
      <ChartFrame width={width} height={height}>
        {({ animate, ...size }) => (
          <BarChart {...size} data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={COLOUR.grid} strokeWidth={MARKS.gridWidth} />
            <XAxis dataKey="label" interval={Math.max(0, Math.ceil(data.length / 7) - 1)} tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={shortNumber} tick={axisTick} axisLine={false} tickLine={false} width={46} allowDecimals={false} />
            <Tooltip content={<ChartTooltip describe={describe} />} cursor={{ fill: COLOUR.soft, opacity: 0.5 }} isAnimationActive={false} />
            <Bar dataKey="value" maxBarSize={MARKS.barMaxWidth} radius={[MARKS.barRadius, MARKS.barRadius, 0, 0]} minPointSize={2} isAnimationActive={animate} animationDuration={MARKS.drawInMs} label={peakLabel}>
              {data.map((r) => (
                <Cell key={r.key} fill={COLOUR.series[0]} fillOpacity={r.soFar ? 0.35 : 1} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ChartFrame>
    </ChartCard>
  );
};

export default ColumnsChart;

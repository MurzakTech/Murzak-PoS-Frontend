import React from 'react';
import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../charts/ChartCard';
import ChartFrame from '../charts/ChartFrame';
import ChartTooltip from '../charts/ChartTooltip';
import { COLOUR, MARKS } from '../charts/chartTheme';
import { ellipsize, fullMoney, percent, shortNumber } from '../charts/chartFormat';
import T from './strings.reports';

/**
 * Horizontal bars for a short list of named amounts: running costs by category, stock by store or by category. It is
 * built like the Top products chart of the chart kit: one colour (series-1), the name on the left cut at 24 characters
 * with the whole name in the tooltip and the table, and the value at the tip of the biggest bar. The rest folded
 * into "Other" is drawn in the grey of the other reference marks.
 *
 *   rows        [{ key, name, value, other? }], biggest first
 *   valueName   the words for the amount ("Spent (KES)"), used in the tooltip and the table
 *   nameHeader  the heading of the first table column ("Category")
 */
const axisTick = { fill: 'var(--ink-2)', fontSize: 12 };
const ROW_HEIGHT = 36;

const BarsChart = ({ title, summary, rows, valueName, nameHeader, emptyTitle, emptyText, state = 'ready', onRetry, width }) => {
  const data = (rows || []).map((r) => ({ ...r, short: ellipsize(r.name, 24) }));
  const total = data.reduce((sum, r) => sum + r.value, 0);
  const height = Math.max(120, data.length * ROW_HEIGHT + 40);
  const empty = data.length === 0 || data.every((r) => r.value === 0);

  const describe = (row) => ({ heading: row.name, rows: [{ value: fullMoney(row.value), name: valueName, swatch: row.other ? COLOUR.other : COLOUR.series[0] }] });

  const table = {
    caption: title,
    columns: [
      { key: 'name', header: nameHeader },
      { key: 'value', header: valueName, align: 'right' },
      { key: 'share', header: T.charts.share, align: 'right' },
    ],
    rows: data.map((r) => ({ key: r.key, name: r.name, value: fullMoney(r.value), share: `${percent(r.value, total)}%` })),
    footer: { name: T.charts.total, value: fullMoney(total), share: '' },
  };

  const topLabel = ({ x, y, width: w, height: h, index }) =>
    index === 0 ? (
      <text key="top-label" x={x + w + 6} y={y + h / 2} dominantBaseline="middle" fill={COLOUR.body} fontSize={12} fontWeight={600} className="nl-chart__label">
        {shortNumber(data[0].value)}
      </text>
    ) : null;

  return (
    <ChartCard title={title} summary={summary} table={table} state={state === 'ready' && empty ? 'empty' : state} onRetry={onRetry} height={height} emptyTitle={emptyTitle} emptyText={emptyText}>
      <ChartFrame width={width} height={height}>
        {({ animate, ...size }) => (
          <BarChart {...size} data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 0 }} barCategoryGap="30%">
            <XAxis type="number" tickFormatter={shortNumber} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="short" width={176} tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip describe={describe} />} cursor={{ fill: COLOUR.soft }} isAnimationActive={false} />
            <Bar dataKey="value" maxBarSize={MARKS.barMaxWidth} radius={[0, MARKS.barRadius, MARKS.barRadius, 0]} isAnimationActive={animate} animationDuration={MARKS.drawInMs}>
              {data.map((r) => (
                <Cell key={r.key} fill={r.other ? COLOUR.other : COLOUR.series[0]} />
              ))}
              <LabelList content={topLabel} />
            </Bar>
          </BarChart>
        )}
      </ChartFrame>
    </ChartCard>
  );
};

export default BarsChart;

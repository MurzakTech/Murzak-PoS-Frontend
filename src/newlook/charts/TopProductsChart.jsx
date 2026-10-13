import React from 'react';
import { Bar, BarChart, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import S from '../strings';
import fill from '../labels/fill';
import Button from '../components/Button';
import ChartCard from './ChartCard';
import ChartFrame from './ChartFrame';
import ChartTooltip from './ChartTooltip';
import { COLOUR, MARKS } from './chartTheme';
import { ellipsize, fullMoney, shortNumber } from './chartFormat';
import { topProductRows } from './chartData';

/**
 * Top products by revenue (Spec: Charts). Horizontal bars, five at most, highest first. A product name longer than 24
 * characters is cut with an ellipsis on the axis; the whole name is in the tooltip and the table. The top bar carries its
 * value; the axis and the tooltip carry the rest.
 *
 *   rows       the contract's charts.top_products: [{ name, revenue, quantity? }]
 *   onSeeAll   opens the full product list
 *   onSelect   a bar was clicked: called with that product's row (so a screen can open the product)
 */
const axisTick = { fill: 'var(--ink-2)', fontSize: 12 };

const TopProductsChart = ({ rows, rangeLabel, onSeeAll, onSelect, state = 'ready', onRetry, width, height = 240 }) => {
  const top = topProductRows(rows).map((r) => ({ ...r, short: ellipsize(r.name, 24) }));
  const first = top[0];
  const summary = first ? fill(S.charts.topProducts.summary, { range: rangeLabel, first: first.name, value: fullMoney(first.revenue) }) : fill(S.charts.topProducts.emptySummary, { range: rangeLabel });

  const describe = (row) => ({ heading: row.name, rows: [{ value: fullMoney(row.revenue), name: S.charts.topProducts.tableRevenue, swatch: COLOUR.series[0] }] });

  const table = {
    caption: S.charts.topProducts.title,
    columns: [
      { key: 'name', header: S.charts.topProducts.tableProduct },
      { key: 'revenue', header: S.charts.topProducts.tableRevenue, align: 'right' },
    ],
    rows: top.map((r, i) => ({ key: `${r.name}-${i}`, name: r.name, revenue: fullMoney(r.revenue) })),
  };

  const topLabel = ({ x, y, width: w, height: h, index }) =>
    index === 0 ? (
      <text key="top-label" x={x + w + 6} y={y + h / 2} dominantBaseline="middle" fill={COLOUR.body} fontSize={12} fontWeight={600} className="nl-chart__label">
        {shortNumber(top[0].revenue)}
      </text>
    ) : null;

  return (
    <ChartCard
      title={S.charts.topProducts.title}
      summary={summary}
      table={table}
      state={state === 'ready' && top.length === 0 ? 'empty' : state}
      onRetry={onRetry}
      height={height}
      actions={onSeeAll ? <Button variant="ghost" size="small" onClick={onSeeAll}>{S.charts.topProducts.seeAll}</Button> : null}
    >
      <ChartFrame width={width} height={height}>
        {({ animate, ...size }) => (
          <BarChart {...size} data={top} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 0 }} barCategoryGap="30%">
            <XAxis type="number" tickFormatter={shortNumber} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="short" width={176} tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip describe={describe} />} cursor={{ fill: COLOUR.soft }} isAnimationActive={false} />
            <Bar dataKey="revenue" fill={COLOUR.series[0]} maxBarSize={MARKS.barMaxWidth} radius={[0, MARKS.barRadius, MARKS.barRadius, 0]} isAnimationActive={animate} animationDuration={MARKS.drawInMs} onClick={onSelect ? (row) => onSelect(row) : undefined} cursor={onSelect ? 'pointer' : undefined}>
              <LabelList content={topLabel} />
            </Bar>
          </BarChart>
        )}
      </ChartFrame>
    </ChartCard>
  );
};

export default TopProductsChart;

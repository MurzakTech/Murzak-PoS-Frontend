import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../charts/ChartCard';
import ChartFrame from '../charts/ChartFrame';
import ChartTooltip from '../charts/ChartTooltip';
import { COLOUR, MARKS } from '../charts/chartTheme';
import { fullMoney, shortNumber } from '../charts/chartFormat';
import T from './strings.reports';

/**
 * From sales to profit (Spec: the profit waterfall). Four columns: the sales counted, the cost of goods and the
 * running costs that come off it, and what is left. The two costs float down from the top of the sales column; the
 * last column stands on the line. Sales and what is left use series-1, costs use series-2 (the token for costs). Every
 * column is named under it and carries its amount at its tip, because with only four marks they are the answer; a
 * loss is a last column below the line with its amount in words and numbers.
 *
 *   steps  [{ key: sales | cost_of_goods | running_costs | net_profit, label, amount }]
 */
const axisTick = { fill: 'var(--ink-2)', fontSize: 12 };
const KIND = { sales: 'start', cost_of_goods: 'take', running_costs: 'take', net_profit: 'end' };

/** The floating ranges: sales from 0 up, each cost down from where the last one stopped, the result from the line */
export const waterfallRows = (steps) => {
  let level = 0;
  return (steps || []).map((step) => {
    const kind = KIND[step.key] || 'take';
    let range;
    if (kind === 'start') {
      level = step.amount;
      range = [Math.min(0, level), Math.max(0, level)];
    } else if (kind === 'take') {
      range = [level - step.amount, level];
      level -= step.amount;
    } else {
      range = [Math.min(0, step.amount), Math.max(0, step.amount)];
    }
    return { ...step, kind, range, colour: kind === 'take' ? COLOUR.series[1] : COLOUR.series[0] };
  });
};

const WaterfallChart = ({ title, summary, steps, tableHeaders, emptyTitle, emptyText, state = 'ready', onRetry, width, height = 260 }) => {
  const data = waterfallRows(steps);
  const empty = data.length === 0 || data.every((r) => r.amount === 0);

  const describe = (row) => ({
    heading: row.label,
    rows: [{ value: row.kind === 'take' ? `-${fullMoney(row.amount)}` : fullMoney(row.amount), name: row.kind === 'take' ? T.charts.takenOff : T.charts.amount, swatch: row.colour }],
  });

  const table = {
    caption: title,
    columns: [
      { key: 'step', header: tableHeaders.step },
      { key: 'amount', header: tableHeaders.amount, align: 'right' },
    ],
    rows: data.map((r) => ({ key: r.key, step: r.label, amount: r.kind === 'take' ? `-${fullMoney(r.amount)}` : fullMoney(r.amount) })),
  };

  const valueLabel = ({ x, y, width: w, height: h, index }) => {
    const row = data[index];
    if (!row) return null;
    const below = row.range[1] <= 0;
    return (
      <text key={`label-${row.key}`} x={x + w / 2} y={below ? y + Math.abs(h) + 16 : y - 6} textAnchor="middle" fill={COLOUR.body} fontSize={12} fontWeight={600} className="nl-chart__label">
        {row.kind === 'take' ? `-${shortNumber(row.amount)}` : shortNumber(row.amount)}
      </text>
    );
  };

  return (
    <ChartCard title={title} summary={summary} table={table} state={state === 'ready' && empty ? 'empty' : state} onRetry={onRetry} height={height} emptyTitle={emptyTitle} emptyText={emptyText}>
      <ChartFrame width={width} height={height}>
        {({ animate, ...size }) => (
          <BarChart {...size} data={data} margin={{ top: 28, right: 8, bottom: 8, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={COLOUR.grid} strokeWidth={MARKS.gridWidth} />
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
            <YAxis tickFormatter={shortNumber} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={46} allowDecimals={false} />
            <ReferenceLine y={0} stroke={COLOUR.grid} strokeWidth={MARKS.gridWidth} />
            <Tooltip content={<ChartTooltip describe={describe} />} cursor={{ fill: COLOUR.soft, opacity: 0.5 }} isAnimationActive={false} />
            <Bar dataKey="range" maxBarSize={MARKS.barMaxWidth * 2} radius={[MARKS.barRadius, MARKS.barRadius, MARKS.barRadius, MARKS.barRadius]} minPointSize={2} isAnimationActive={animate} animationDuration={MARKS.drawInMs}>
              {data.map((r) => (
                <Cell key={r.key} fill={r.colour} />
              ))}
              <LabelList content={valueLabel} />
            </Bar>
          </BarChart>
        )}
      </ChartFrame>
    </ChartCard>
  );
};

export default WaterfallChart;

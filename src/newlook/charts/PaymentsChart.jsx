import React from 'react';
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts';
import S from '../strings';
import fill from '../labels/fill';
import ChartCard from './ChartCard';
import ChartFrame from './ChartFrame';
import ChartTooltip from './ChartTooltip';
import { COLOUR, MARKS, paymentColour } from './chartTheme';
import { fullMoney } from './chartFormat';
import { groupPayments } from './chartData';

/**
 * How customers paid (Spec: Charts). One stacked bar with a 2px gap between parts. M-Pesa, Cash, Card and On credit keep
 * series-1 to series-4 on every screen; anything else is Other in the compare grey. A part under 2% is named in the legend
 * but not drawn, because it would be a sliver. The legend shows the amount and the share, so it carries the numbers.
 *
 *   rows        the contract's charts.payments: [{ method, amount }]
 *   methodNames { mpesa, cash, card, credit, other } the words for each method (from the shop's own names)
 */
const DEFAULT_NAMES = { mpesa: 'M-Pesa', cash: 'Cash', card: 'Card', credit: 'On credit', other: S.charts.payments.other };

const PaymentsChart = ({ rows, rangeLabel, methodNames = DEFAULT_NAMES, state = 'ready', onRetry, width, height = 120 }) => {
  const { total, parts } = groupPayments(rows, methodNames);
  const datum = { name: 'total' };
  parts.forEach((p) => {
    datum[p.key] = p.drawn ? p.amount : 0;
  });
  const drawn = parts.filter((p) => p.drawn);

  const summary = total
    ? fill(S.charts.payments.summary, { range: rangeLabel, parts: parts.map((p) => fill(S.charts.payments.part, { name: p.name, amount: fullMoney(p.amount), percent: p.percent })).join(', ') })
    : fill(S.charts.payments.emptySummary, { range: rangeLabel });

  const describe = () => ({
    heading: `${S.charts.payments.totalLabel} ${fullMoney(total)}`,
    rows: parts.map((p) => ({ value: fullMoney(p.amount), name: `${p.name} (${p.percent}%)`, swatch: paymentColour(p.key) })),
  });

  const table = {
    caption: S.charts.payments.title,
    columns: [
      { key: 'method', header: S.charts.payments.tableMethod },
      { key: 'amount', header: S.charts.payments.tableAmount, align: 'right' },
      { key: 'share', header: S.charts.payments.tableShare, align: 'right' },
    ],
    rows: parts.map((p) => ({ key: p.key, method: p.name, amount: fullMoney(p.amount), share: `${p.percent}%` })),
    footer: { method: S.charts.payments.totalLabel, amount: fullMoney(total), share: '' },
  };

  const legend = parts.map((p) => ({ name: p.name, colour: paymentColour(p.key), value: fullMoney(p.amount), percent: `${p.percent}%` }));

  return (
    <ChartCard title={S.charts.payments.title} summary={summary} table={table} legend={legend} state={state === 'ready' && !total ? 'empty' : state} onRetry={onRetry} height={height} emptyText={S.charts.state.emptyText}>
      <ChartFrame width={width} height={height}>
        {({ animate, ...size }) => (
          <BarChart {...size} data={[datum]} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip content={<ChartTooltip describe={describe} />} cursor={false} isAnimationActive={false} />
            {drawn.map((p, i) => (
              <Bar
                key={p.key}
                dataKey={p.key}
                stackId="paid"
                fill={paymentColour(p.key)}
                stroke={COLOUR.card}
                strokeWidth={MARKS.barGap}
                maxBarSize={MARKS.barMaxWidth}
                radius={[i === 0 ? MARKS.barRadius : 0, i === drawn.length - 1 ? MARKS.barRadius : 0, i === drawn.length - 1 ? MARKS.barRadius : 0, i === 0 ? MARKS.barRadius : 0]}
                isAnimationActive={animate}
                animationDuration={MARKS.drawInMs}
              />
            ))}
          </BarChart>
        )}
      </ChartFrame>
    </ChartCard>
  );
};

export default PaymentsChart;

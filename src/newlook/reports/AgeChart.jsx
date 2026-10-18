import React from 'react';
import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../charts/ChartCard';
import ChartFrame from '../charts/ChartFrame';
import ChartTooltip from '../charts/ChartTooltip';
import { COLOUR, MARKS } from '../charts/chartTheme';
import { fullMoney, percent } from '../charts/chartFormat';
import { MIN_DRAWN_PERCENT } from '../charts/chartData';
import T from './strings.reports';

/**
 * How old an amount is: one stacked bar of four parts, an ordered scale from pale to deep indigo where the deeper
 * part is the older one (Spec: Charts, "debt-age bar"). The scale is made from series-1 and the card colour, so it
 * follows both themes and needs no colour of its own (see --age-1 to --age-4 in reports.css). The legend is always
 * shown and carries each part's name, amount and count, so the age is never read from colour alone. A part under 2% is
 * in the legend and not drawn, like the payments bar.
 *
 *   parts      [{ key, label, amount, count }] youngest first
 *   countWords turns a count into words ("3 customers")
 */
export const AGE_COLOURS = ['var(--age-1)', 'var(--age-2)', 'var(--age-3)', 'var(--age-4)'];

const AgeChart = ({ title, summary, parts, countWords, tableHeaders, emptyTitle, emptyText, state = 'ready', onRetry, width, height = 120 }) => {
  const list = (parts || []).map((p, i) => ({ ...p, colour: AGE_COLOURS[i % AGE_COLOURS.length] }));
  const total = list.reduce((sum, p) => sum + p.amount, 0);
  const shown = list.map((p) => ({ ...p, share: percent(p.amount, total), drawn: total > 0 && (p.amount / total) * 100 >= MIN_DRAWN_PERCENT }));
  const drawn = shown.filter((p) => p.drawn);
  const datum = { name: 'total' };
  shown.forEach((p) => {
    datum[p.key] = p.drawn ? p.amount : 0;
  });

  const describe = () => ({
    heading: `${T.charts.total} ${fullMoney(total)}`,
    rows: shown.filter((p) => p.amount > 0).map((p) => ({ value: fullMoney(p.amount), name: `${p.label} (${countWords(p.count)})`, swatch: p.colour })),
  });

  const table = {
    caption: title,
    columns: [
      { key: 'band', header: tableHeaders.band },
      { key: 'amount', header: tableHeaders.amount, align: 'right' },
      { key: 'count', header: tableHeaders.count, align: 'right' },
    ],
    rows: shown.map((p) => ({ key: p.key, band: p.label, amount: fullMoney(p.amount), count: String(p.count) })),
    footer: { band: T.charts.total, amount: fullMoney(total), count: String(shown.reduce((sum, p) => sum + p.count, 0)) },
  };

  const legend = shown.map((p) => ({ name: p.label, colour: p.colour, value: fullMoney(p.amount), percent: countWords(p.count) }));

  return (
    <ChartCard title={title} summary={summary} table={table} legend={legend} state={state === 'ready' && total <= 0 ? 'empty' : state} onRetry={onRetry} height={height} emptyTitle={emptyTitle} emptyText={emptyText}>
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
                stackId="age"
                fill={p.colour}
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

export default AgeChart;

import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import S from '../strings';
import fill from '../labels/fill';
import ChartCard from './ChartCard';
import ChartFrame from './ChartFrame';
import ChartTooltip from './ChartTooltip';
import { COLOUR, MARKS } from './chartTheme';
import { hourLabel, shortNumber } from './chartFormat';
import { hoursRows, hoursTip } from './chartData';

/**
 * Busiest hours (Spec: Charts). Columns from 8am to 7pm. The peak hour is series-1 and every other hour is the soft
 * colour; the axis names every second hour. When the peak is at least twice the average, a one-line tip suggests more
 * cover for those two hours.
 *
 *   rows  the contract's charts.busiest_hours: [{ hour, average_sales }]
 */
const HoursChart = ({ rows, rangeLabel, state = 'ready', onRetry, width, height = 220 }) => {
  const model = hoursRows(rows);
  const { data, peak, max } = model;
  const tip = hoursTip(model);

  const summary = peak ? fill(S.charts.hours.summary, { range: rangeLabel, hour: hourLabel(peak.hour), value: String(Math.round(peak.value * 10) / 10) }) : fill(S.charts.hours.emptySummary, { range: rangeLabel });

  const describe = (row) => ({ heading: hourLabel(row.hour), rows: [{ value: String(Math.round(row.value * 10) / 10), name: S.charts.hours.tableAverage, swatch: row.peak ? COLOUR.series[0] : COLOUR.soft }] });

  const table = {
    caption: S.charts.hours.title,
    columns: [
      { key: 'hour', header: S.charts.hours.tableHour },
      { key: 'value', header: S.charts.hours.tableAverage, align: 'right' },
    ],
    rows: data.map((d) => ({ key: d.hour, hour: hourLabel(d.hour), value: String(Math.round(d.value * 10) / 10) })),
  };

  const peakLabel = ({ x, y, width: w, index }) =>
    data[index] && data[index].peak ? (
      <text key="peak-label" x={x + w / 2} y={y - 6} textAnchor="middle" fill={COLOUR.body} fontSize={12} fontWeight={600} className="nl-chart__label">
        {String(Math.round(data[index].value * 10) / 10)}
      </text>
    ) : null;

  return (
    <ChartCard title={S.charts.hours.title} summary={summary} table={table} state={state === 'ready' && max === 0 ? 'empty' : state} onRetry={onRetry} height={height}>
      <ChartFrame width={width} height={height}>
        {({ animate, ...size }) => (
          <BarChart {...size} data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={COLOUR.grid} strokeWidth={MARKS.gridWidth} />
            <XAxis dataKey="hour" tickFormatter={hourLabel} interval={1} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={shortNumber} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
            <Tooltip content={<ChartTooltip describe={describe} />} cursor={{ fill: COLOUR.soft, opacity: 0.5 }} isAnimationActive={false} />
            <Bar dataKey="value" maxBarSize={MARKS.barMaxWidth} radius={[MARKS.barRadius, MARKS.barRadius, 0, 0]} minPointSize={2} isAnimationActive={animate} animationDuration={MARKS.drawInMs}>
              {data.map((d) => (
                <Cell key={d.hour} fill={d.peak ? COLOUR.series[0] : COLOUR.soft} />
              ))}
              <LabelList content={peakLabel} />
            </Bar>
          </BarChart>
        )}
      </ChartFrame>
      {tip ? <p className="nl-chart__tip">{fill(S.charts.hours.tip, { from: hourLabel(tip.from), to: hourLabel(tip.to) })}</p> : null}
    </ChartCard>
  );
};

export default HoursChart;

import React, { useState } from 'react';
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceDot, Tooltip, XAxis, YAxis } from 'recharts';
import Segmented from '../components/Segmented';
import S from '../strings';
import fill from '../labels/fill';
import ChartCard from './ChartCard';
import ChartFrame from './ChartFrame';
import ChartTooltip from './ChartTooltip';
import { COLOUR, MARKS } from './chartTheme';
import { axisDayLabel, dayMonth, fullMoney, shortDate, shortNumber } from './chartFormat';
import { drawsColumns, latestRow, METRICS, peakRow, salesRows } from './chartData';

/**
 * Sales over time (Spec: Charts). Columns when there are fewer than 7 days of history, a line with an area fill from
 * 7 days up; the previous period is a grey line. Switch between Revenue, Profit and Sales count. Days with no sales
 * show as a small tick, not a gap. Today is a lighter column labelled "so far" and is left out of the line. The peak is
 * named once, and so is the latest value.
 *
 *   points      the contract's charts.sales: [{ date, revenue, profit?, count, previous?, so_far? }]
 *   daysOfData  how many days of history there are (decides columns or line)
 *   rangeLabel  words for the period, such as "last 30 days", used in the summary
 *   metrics     which of revenue, profit and count may be chosen (a cashier has no profit)
 */
const axisTick = { fill: 'var(--muted)', fontSize: 12 };

const SalesChart = ({ points, daysOfData, rangeLabel, metrics = METRICS, metric: metricProp, onMetric, state = 'ready', onRetry, width, height = 260 }) => {
  const [metricState, setMetricState] = useState(metrics[0]);
  const metric = metricProp || metricState;
  const choose = onMetric || setMetricState;
  const money = metric !== 'count';

  const rows = salesRows(points, metric);
  const columns = drawsColumns(daysOfData);
  const peak = peakRow(rows);
  const latest = latestRow(rows);
  const format = (v) => (money ? fullMoney(v) : String(v));
  const short = (v) => (money ? shortNumber(v) : String(v));
  const title = { revenue: S.charts.sales.titleRevenue, profit: S.charts.sales.titleProfit, count: S.charts.sales.titleCount }[metric];
  const metricName = S.charts.metrics[metric];

  let summary;
  if (!peak) summary = fill(S.charts.sales.emptySummary, { title, range: rangeLabel });
  else if (rows.length === 1) summary = fill(S.charts.sales.summaryOneDay, { title, date: shortDate(rows[0].date), value: format(rows[0].value) });
  else summary = fill(S.charts.sales.summary, { title, range: rangeLabel, peakDate: shortDate(peak.date), peakValue: format(peak.value) });

  const describe = (row) => {
    const out = [{ value: format(row.value), name: metricName, swatch: COLOUR.series[0] }];
    if (money && row.count > 0) out.push({ value: fill(row.count === 1 ? S.charts.sales.tooltipOneSale : S.charts.sales.tooltipCount, { count: row.count }), name: '' });
    if (row.previous !== null && row.previous !== undefined) out.push({ value: format(row.previous), name: S.charts.previousPeriod, swatch: COLOUR.previous });
    return { heading: row.soFar ? fill(S.charts.sales.soFarTooltip, { date: shortDate(row.date) }) : shortDate(row.date), rows: out };
  };

  const table = {
    caption: title,
    columns: [
      { key: 'date', header: S.charts.sales.tableDate },
      { key: 'value', header: metricName, align: 'right' },
      { key: 'count', header: S.charts.sales.tableSalesCount, align: 'right' },
      { key: 'previous', header: S.charts.sales.tablePrevious, align: 'right' },
    ],
    rows: rows.map((r) => ({ key: r.date, date: r.soFar ? fill(S.charts.sales.soFarTooltip, { date: shortDate(r.date) }) : shortDate(r.date), value: format(r.value), count: String(r.count), previous: r.previous === null ? '' : format(r.previous) })),
  };

  const legend = [{ name: metricName, colour: COLOUR.series[0] }, ...(!columns && rows.some((r) => r.previous !== null) ? [{ name: S.charts.previousPeriod, colour: COLOUR.previous, line: true }] : [])];

  const margin = { top: 28, right: 24, bottom: 0, left: 0 };
  const tooltip = <Tooltip content={<ChartTooltip describe={describe} />} cursor={{ stroke: COLOUR.grid, strokeWidth: MARKS.gridWidth }} isAnimationActive={false} />;
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={COLOUR.grid} strokeWidth={MARKS.gridWidth} />
      <XAxis dataKey="date" tickFormatter={columns ? (d, i) => axisDayLabel(d, i, rows[i - 1] && rows[i - 1].date) : dayMonth} tick={axisTick} axisLine={false} tickLine={false} interval={columns ? 0 : Math.max(0, Math.ceil(rows.length / 7) - 1)} />
      <YAxis tickFormatter={short} tick={axisTick} axisLine={false} tickLine={false} width={46} allowDecimals={false} />
    </>
  );
  const hasSoFar = rows.some((r) => r.soFar);
  // When today's "so far" column is drawn, its own label is the latest value
  const labelled = [peak, hasSoFar ? null : latest].filter((r, i, all) => r && all.findIndex((o) => o && o.date === r.date) === i);
  const labelText = (row) => short(row.value);
  const dotLabel = (row) => ({ value: labelText(row), position: 'top', fill: COLOUR.body, fontSize: 12, fontWeight: 600 });
  // On columns, the same peak and latest labels sit above their column; today's column says "so far"
  const columnLabel = (soFarBar) => ({ x, y, width: w, index }) => {
    const row = rows[index];
    if (!row || row.soFar !== soFarBar || (!soFarBar && !labelled.some((r) => r.date === row.date))) return null;
    const text = soFarBar ? `${labelText(row)} ${S.charts.soFar}` : labelText(row);
    return (
      <text key={`label-${row.date}`} x={x + w / 2} y={y - 6} textAnchor={soFarBar ? 'end' : 'middle'} dx={soFarBar ? w / 2 : 0} fill={COLOUR.body} fontSize={12} fontWeight={600} className="nl-chart__label">
        {text}
      </text>
    );
  };

  const draw = ({ animate, ...size }) =>
    columns ? (
      <BarChart {...size} data={rows} margin={margin} barCategoryGap="30%">
        {axes}
        {tooltip}
        <Bar dataKey="value" fill={COLOUR.series[0]} maxBarSize={MARKS.barMaxWidth} radius={[MARKS.barRadius, MARKS.barRadius, 0, 0]} minPointSize={2} isAnimationActive={animate} animationDuration={MARKS.drawInMs}>
          {rows.map((r) => (
            <Cell key={r.date} fill={COLOUR.series[0]} fillOpacity={r.soFar ? 0.35 : 1} />
          ))}
          <LabelList content={columnLabel(false)} />
          <LabelList content={columnLabel(true)} />
        </Bar>
      </BarChart>
    ) : (
      <ComposedChart {...size} data={rows} margin={margin}>
        {axes}
        {tooltip}
        <Area type="monotone" dataKey="line" stroke="none" fill={COLOUR.series[0]} fillOpacity={MARKS.areaOpacity} isAnimationActive={animate} animationDuration={MARKS.drawInMs} connectNulls />
        <Line type="monotone" dataKey="previous" stroke={COLOUR.previous} strokeWidth={MARKS.lineWidth} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={false} isAnimationActive={animate} animationDuration={MARKS.drawInMs} connectNulls />
        <Line
          type="monotone"
          dataKey="line"
          stroke={COLOUR.series[0]}
          strokeWidth={MARKS.lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={(p) => (p.payload.empty ? <rect key={`tick-${p.index}`} x={p.cx - 1} y={p.cy - 3} width={2} height={6} rx={1} fill={COLOUR.other} className="nl-chart__tick" /> : <g key={`none-${p.index}`} />)}
          activeDot={{ r: MARKS.dotDiameter / 2, fill: COLOUR.series[0], stroke: COLOUR.card, strokeWidth: MARKS.dotRing }}
          isAnimationActive={animate}
          animationDuration={MARKS.drawInMs}
          connectNulls
        />
        <Bar dataKey="soFarValue" fill={COLOUR.series[0]} fillOpacity={0.35} maxBarSize={MARKS.barMaxWidth} radius={[MARKS.barRadius, MARKS.barRadius, 0, 0]} isAnimationActive={false}>
          <LabelList content={columnLabel(true)} />
        </Bar>
        {labelled.map((row) => (
          <ReferenceDot key={row.date} x={row.date} y={row.value} r={MARKS.dotDiameter / 2} fill={COLOUR.series[0]} stroke={COLOUR.card} strokeWidth={MARKS.dotRing} ifOverflow="visible" label={dotLabel(row)} />
        ))}
      </ComposedChart>
    );

  return (
    <ChartCard
      title={title}
      summary={summary}
      table={table}
      legend={legend}
      state={state}
      onRetry={onRetry}
      height={height}
      controls={
        metrics.length > 1 ? (
          <Segmented size="small" label={S.charts.metricSwitch} value={metric} onChange={choose} options={metrics.map((m) => ({ value: m, label: S.charts.metrics[m] }))} />
        ) : null
      }
    >
      <ChartFrame width={width} height={height}>
        {(size) => draw(size)}
      </ChartFrame>
      {peak ? <span className="nl-visually-hidden">{fill(S.charts.sales.peakLabel, { date: shortDate(peak.date), value: format(peak.value) })}</span> : null}
    </ChartCard>
  );
};

export default SalesChart;

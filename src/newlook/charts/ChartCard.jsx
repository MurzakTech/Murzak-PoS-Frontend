import React, { useId, useState } from 'react';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Segmented from '../components/Segmented';
import { LoadingGate, Skeleton } from '../components/Skeleton';
import S from '../strings';
import ChartTable from './ChartTable';
import Legend from './Legend';

/**
 * The card every chart sits in (Spec: Charts, "Always included"): a title that names the unit, a Chart and Table
 * toggle, the chart, a legend when there are two or more series, and one plain-language note that states the main
 * finding. The same finding is the chart's accessible name. Loading, empty and error states are the card's own, so one
 * failing chart never takes the page down.
 *
 *   summary   one sentence stating the main finding ("Daily sales, last 30 days, peak Thu 8 Oct at KES 71,000")
 *   table     { caption, columns, rows, footer? } the same numbers as text
 *   legend    [{ name, colour, value?, percent? }]; shown for two or more series
 *   state     'ready' (default), 'loading', 'empty' or 'error'; onRetry for the error state
 *   controls  extra controls above the chart, such as the Revenue, Profit and Sales count switch
 *   height    the chart's height, reserved while loading so the page does not jump
 *   emptyTitle, emptyText   the words of the empty state, for a chart that is not about sales (the defaults are the sales words)
 */
const ChartCard = ({ title, subtitle, summary, table, legend = [], state = 'ready', onRetry, controls, actions, height = 260, emptyTitle, emptyText, children, className = '' }) => {
  const [view, setView] = useState('chart');
  const base = useId();

  const toggle = state === 'ready' && table ? (
    <Segmented
      size="small"
      label={S.charts.toggle.label}
      value={view}
      onChange={setView}
      options={[
        { value: 'chart', label: S.charts.toggle.chart },
        { value: 'table', label: S.charts.toggle.table },
      ]}
    />
  ) : null;

  let body;
  if (state === 'error') {
    body = <EmptyState icon="alert" tone="error" title={S.charts.state.errorTitle} description={S.charts.state.errorText} action={onRetry ? { label: S.charts.state.retry, onClick: onRetry } : undefined} level={3} />;
  } else if (state === 'empty') {
    body = <EmptyState title={emptyTitle || S.charts.state.emptyTitle} description={emptyText || S.charts.state.emptyText} level={3} />;
  } else {
    body = (
      <LoadingGate loading={state === 'loading'} minHeight={height} label={S.charts.state.loading} skeleton={<Skeleton width="100%" height={`${height}px`} radius="var(--radius-button)" />}>
        {view === 'table' && table ? (
          <ChartTable {...table} />
        ) : (
          <figure className="nl-chart" aria-label={summary} aria-describedby={`${base}-note`}>
            {children}
            {legend.length >= 2 ? <Legend items={legend} label={title} /> : null}
          </figure>
        )}
        {summary ? (
          <p id={`${base}-note`} className="nl-chart__note">
            {summary}
          </p>
        ) : null}
      </LoadingGate>
    );
  }

  return (
    <Card title={title} subtitle={subtitle} actions={<>{actions}{toggle}</>} small className={`nl-chart-card ${className}`.trim()}>
      {controls && state === 'ready' ? <div className="nl-chart-card__controls">{controls}</div> : null}
      {body}
    </Card>
  );
};

export default ChartCard;

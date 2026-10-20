import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '../shell';
import { Button } from '../components';
import { HoursChart, MonthProgress, PaymentsChart, SalesChart, Sparkline, TopProductsChart } from './index';
import { sampleHours, samplePayments, sampleProducts, sampleSales } from './sampleData';

/**
 * The chart sample page (Phase 2, P2-2). Every chart in each state, with made-up numbers, so the rules can be checked
 * before the Home page uses them: marks, colours, tooltip, Chart and Table toggle, keyboard and reduced motion.
 */
const page = { maxWidth: 'var(--content-max)', margin: '0 auto', display: 'grid', gap: 'var(--card-gap)' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--card-gap)' };
const heading = { margin: 0, color: 'var(--ink-2)', fontSize: 'var(--body-size)', fontWeight: 'var(--font-weight-semibold)' };

const ChartsPage = () => {
  const [state, setState] = useState('ready');
  return (
    <div style={page}>
      <div>
        <PageHeader title="Charts" subtitle="Every chart with made-up numbers. Hover or press the arrow keys to read a value." />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
          <Button variant="secondary" size="small" onClick={() => setState('ready')}>Show data</Button>
          <Button variant="secondary" size="small" onClick={() => setState('loading')}>Show loading</Button>
          <Button variant="secondary" size="small" onClick={() => setState('empty')}>Show empty</Button>
          <Button variant="secondary" size="small" onClick={() => setState('error')}>Show error</Button>
          <RouterLink to="/components" className="nl-page-link" style={{ color: 'var(--brand-text)', fontWeight: 'var(--font-weight-semibold)' }}>Components</RouterLink>
        </div>
      </div>

      <h2 style={heading}>Sales over time, 30 days (a line, with today as a lighter column)</h2>
      <SalesChart points={sampleSales(30, { gaps: [4] })} daysOfData={30} rangeLabel="last 30 days" state={state} onRetry={() => setState('ready')} />

      <h2 style={heading}>Sales over time, 4 days of history (columns)</h2>
      <SalesChart points={sampleSales(4)} daysOfData={4} rangeLabel="last 4 days" state={state} onRetry={() => setState('ready')} />

      <div style={grid}>
        <PaymentsChart rows={samplePayments} rangeLabel="last 30 days" state={state} onRetry={() => setState('ready')} />
        <TopProductsChart rows={sampleProducts} rangeLabel="last 30 days" state={state} onRetry={() => setState('ready')} onSeeAll={() => {}} />
      </div>
      <HoursChart rows={sampleHours} rangeLabel="last 30 days" state={state} onRetry={() => setState('ready')} />

      <h2 style={heading}>Sparkline and month progress</h2>
      <div style={{ display: 'flex', gap: 'var(--space-7)', alignItems: 'center', flexWrap: 'wrap' }}>
        <Sparkline values={[4, 6, 5, 8, 7, 9, 12]} />
        <div style={{ width: 200 }}>
          <MonthProgress day={12} days={31} />
        </div>
      </div>
    </div>
  );
};

export default ChartsPage;

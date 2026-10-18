import React from 'react';
import fill from '../labels/fill';
import { PaymentsChart, SalesChart, TopProductsChart } from '../charts';
import { fullMoney } from '../charts/chartFormat';
import AgeChart from './AgeChart';
import BarsChart from './BarsChart';
import ColumnsChart from './ColumnsChart';
import WaterfallChart from './WaterfallChart';
import { ageParts, barRows, columnRows, customersWords, periodLabel, productsWords, waterfallSteps } from './reportsModel';
import T from './strings.reports';

/**
 * The charts of each report. The sales charts come straight from the chart kit (the same ones as Home, so the numbers
 * match); the others are built from the same parts (see BarsChart, ColumnsChart, WaterfallChart and AgeChart). While
 * the report loads every chart shows its own grey shape, and a part the server could not load shows its own error with
 * a retry, so one failing chart never stops the rest.
 *
 *   name   which report; data is its answer (null while loading); range is the period in words
 */
const bestOf = (rows) => rows.reduce((best, r) => (r.value > (best ? best.value : 0) ? r : best), null);

const ReportCharts = ({ name, data, loading, range, onRetry }) => {
  const series = (data && data.series) || {};
  const errors = (data && data.errors) || {};
  const state = (part) => (loading ? 'loading' : part && errors[part] ? 'error' : 'ready');

  switch (name) {
    case 'sales': {
      const days = data && data.period ? data.period.days_of_data : 0;
      return (
        <div className="nl-reports__charts">
          <SalesChart points={loading ? [] : series.sales || []} daysOfData={days} rangeLabel={range} metrics={['revenue', 'count']} state={loading ? 'loading' : 'ready'} onRetry={onRetry} />
          <div className="nl-reports__pair">
            <PaymentsChart rows={series.payments || []} rangeLabel={range} state={state('payments')} onRetry={onRetry} />
            <TopProductsChart rows={series.top_products || []} rangeLabel={range} state={state('top_products')} onRetry={onRetry} />
          </div>
        </div>
      );
    }
    case 'profit': {
      const steps = waterfallSteps(series.waterfall);
      const amount = (key) => fullMoney((steps.find((s) => s.key === key) || {}).amount);
      const month = data && data.group_by === 'month';
      const title = month ? T.profit.overTimeMonth : T.profit.overTimeDay;
      const rows = columnRows(series.over_time, 'net_profit');
      const best = bestOf(rows);
      return (
        <div className="nl-reports__charts">
          <WaterfallChart
            title={T.profit.waterfallTitle}
            summary={fill(T.profit.waterfallSummary, { range, sales: amount('sales'), cost: amount('cost_of_goods'), running: amount('running_costs'), net: amount('net_profit') })}
            steps={steps}
            tableHeaders={{ step: T.profit.stepsTable.step, amount: T.profit.stepsTable.amount }}
            emptyTitle={T.profit.emptyTitle}
            emptyText={T.profit.emptyText}
            state={loading ? 'loading' : 'ready'}
            onRetry={onRetry}
          />
          <ColumnsChart
            title={title}
            summary={best ? fill(T.profit.overTimeSummary, { title, range, bestLabel: best.full, bestValue: fullMoney(best.value) }) : fill(T.profit.overTimeEmpty, { title, range })}
            rows={rows}
            valueName={T.profit.series}
            tableHeader={month ? T.profit.columns.periodMonth : T.profit.columns.period}
            emptyTitle={T.profit.emptyTitle}
            emptyText={T.profit.emptyText}
            state={loading ? 'loading' : 'ready'}
            onRetry={onRetry}
          />
        </div>
      );
    }
    case 'owed': {
      const parts = ageParts(series.age_bands, T.owed.bands, 'amount', 'customers');
      const named = parts.filter((p) => p.amount > 0).map((p) => fill(T.owed.agePart, { label: p.label, amount: fullMoney(p.amount) }));
      const date = periodLabel(data && data.as_of);
      return (
        <div className="nl-reports__charts">
          <AgeChart
            title={T.owed.ageTitle}
            summary={named.length ? fill(T.owed.ageSummary, { date, parts: named.join(', ') }) : fill(T.owed.ageEmpty, { date })}
            parts={parts}
            countWords={customersWords}
            tableHeaders={T.owed.ageTable}
            emptyTitle={T.owed.emptyTitle}
            emptyText={T.owed.emptyText}
            state={loading ? 'loading' : 'ready'}
            onRetry={onRetry}
          />
        </div>
      );
    }
    case 'running-costs': {
      const bars = barRows(series.categories, 'category', T.costs.otherCount);
      const days = columnRows(series.by_day, 'amount', 'date');
      const best = bestOf(days);
      return (
        <div className="nl-reports__charts">
          <BarsChart
            title={T.costs.categoryTitle}
            summary={bars.length ? fill(T.costs.categorySummary, { range, first: bars[0].name, value: fullMoney(bars[0].value) }) : fill(T.costs.categoryEmpty, { range })}
            rows={bars}
            valueName={T.costs.columns.amount}
            nameHeader={T.costs.columns.category}
            emptyTitle={T.costs.emptyTitle}
            emptyText={T.costs.emptyText}
            state={loading ? 'loading' : 'ready'}
            onRetry={onRetry}
          />
          <ColumnsChart
            title={T.costs.dayTitle}
            summary={best ? fill(T.costs.daySummary, { range, bestLabel: best.full, bestValue: fullMoney(best.value) }) : fill(T.costs.dayEmpty, { range })}
            rows={days}
            valueName={T.costs.series}
            tableHeader={T.profit.columns.period}
            emptyTitle={T.costs.emptyTitle}
            emptyText={T.costs.emptyText}
            state={loading ? 'loading' : 'ready'}
            onRetry={onRetry}
          />
        </div>
      );
    }
    case 'stock-summary': {
      const bars = barRows((series.by_store || []).map((s) => ({ store: s.store, amount: s.amount })), 'store', T.stock.otherCount);
      // One store has nothing to compare, so the chart appears only when there are two or more
      if (!loading && bars.length < 2) return null;
      return (
        <div className="nl-reports__charts">
          <BarsChart
            title={T.stock.storeTitle}
            summary={bars.length ? fill(T.stock.storeSummary, { first: bars[0].name, value: fullMoney(bars[0].value) }) : T.stock.storeEmpty}
            rows={bars}
            valueName={T.stock.columnsStore.value}
            nameHeader={T.stock.columnsStore.store}
            emptyTitle={T.stock.emptyTitle}
            emptyText={T.stock.emptyText}
            state={loading ? 'loading' : 'ready'}
            onRetry={onRetry}
          />
        </div>
      );
    }
    case 'stock-value': {
      const bars = barRows(series.by_category, 'category', T.stock.otherCount);
      return (
        <div className="nl-reports__charts">
          <BarsChart
            title={T.stock.categoryTitle}
            summary={bars.length ? fill(T.stock.categorySummary, { first: bars[0].name, value: fullMoney(bars[0].value) }) : T.stock.categoryEmpty}
            rows={bars}
            valueName={T.stock.columnsCategory.value}
            nameHeader={T.stock.columnsCategory.category}
            emptyTitle={T.stock.emptyTitle}
            emptyText={T.stock.emptyText}
            state={loading ? 'loading' : 'ready'}
            onRetry={onRetry}
          />
        </div>
      );
    }
    case 'aging-stock': {
      const parts = ageParts(series.age_bands, T.aging.bands, 'value', 'products');
      const named = parts.filter((p) => p.amount > 0).map((p) => fill(T.aging.agePart, { label: p.label, amount: fullMoney(p.amount) }));
      return (
        <div className="nl-reports__charts">
          <AgeChart
            title={T.aging.ageTitle}
            summary={named.length ? fill(T.aging.ageSummary, { parts: named.join(', ') }) : T.aging.ageEmpty}
            parts={parts}
            countWords={productsWords}
            tableHeaders={T.aging.ageTable}
            emptyTitle={T.aging.emptyTitle}
            emptyText={T.aging.emptyText}
            state={loading ? 'loading' : 'ready'}
            onRetry={onRetry}
          />
        </div>
      );
    }
    default:
      return null;
  }
};

export default ReportCharts;

import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import FilterRow from '../components/FilterRow';
import Icon from '../components/Icon';
import Pagination from '../components/Pagination';
import { formatMoney } from '../components/format';
import Segmented from '../components/Segmented';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import useListParams from '../components/useListParams';
import { PageHeader } from '../shell';
import { isPageLive, usePreviewRedirects } from '../redirects/live';
import { oldScreen, toNewAddress } from '../redirects/engine';
import { sellingLocations } from '../till/sellingLocations';
import { isIsoDate, periodFromSearch, reminderLink, shortDay, todayIso } from '../home/homeModel';
import { MissingCostDialog } from '../home/MissingCostList';
import '../home/home.css';
import fill from '../labels/fill';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listWarehouses } from '../../store/warehouseSlice';
import { saveTextFile } from '../../utils/saveTextFile';
import './reports.css';
import Figures from './Figures';
import ReportCharts from './ReportCharts';
import { columnsFor, csvName, DETAIL_SCREEN, figuresFor, isEmptyReport, isReportName, profitNotes, rangeWords, REPORT_META, reportAddress, reportCsv, STOCK_TABS, tableColumns, uncostedWords, withKeys } from './reportsModel';
import { useReport } from './useReportData';
import T from './strings.reports';

const CAPTION = {
  sales: () => T.sales.caption,
  profit: (data) => (data && data.group_by === 'month' ? T.profit.captionMonth : T.profit.caption),
  owed: () => T.owed.caption,
  'running-costs': () => T.costs.caption,
  'stock-summary': () => T.stock.captionStore,
  'stock-value': () => T.stock.captionCategory,
  'aging-stock': () => T.aging.caption,
};

const FIGURE_COUNT = { profit: 5 };

/**
 * One report (ticket P5-2, AC-31). It opens ready: the report is asked for as soon as the page opens, for the last 30
 * days unless the address says otherwise, so nobody presses Refresh. Above are the period row (Today, 7 days, 30 days,
 * Custom), a store box when the shop has two or more, then the figures, the charts (each with a Chart and Table toggle),
 * and the table of the same numbers with Export CSV in the header. Loading, empty and error states are each their own.
 * The choices live in the address, so a refresh or a shared link opens the same view. The server decides who may open
 * the report; a person who may not sees a plain notice rather than a failure.
 */
const ReportView = ({ name }) => {
  const meta = REPORT_META[name];
  const question = T.questions[meta.question];
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const previewOn = usePreviewRedirects();
  const [search] = useSearchParams();
  const params = useListParams({ defaultPeriod: '30d', filterKeys: ['store', 'group'] });
  const { page, size } = params;
  const [costsOpen, setCostsOpen] = useState(false);

  const user = useAppSelector((s) => s.auth.user);
  const { warehouses } = useAppSelector((s) => s.warehouse);
  const company = user && user.company;
  useEffect(() => {
    if (company) dispatch(listWarehouses({ company, limit: 1000 }));
  }, [dispatch, company]);

  // The period: what the address says, the last 30 days when it says nothing or something unusable
  const asked = params.period;
  const { period, from, to } = periodFromSearch(search);
  const waitingForDates = !meta.asOf && asked === 'custom' && !(isIsoDate(params.from) && isIsoDate(params.to) && params.from <= params.to);
  const shownPeriod = waitingForDates ? 'custom' : period;
  const store = params.filters.store;
  const group = name === 'profit' && ['day', 'month'].includes(params.filters.group) ? params.filters.group : '';

  const query = useMemo(() => ({ name, period: meta.asOf ? undefined : period, from, to, store, groupBy: group || undefined }), [name, meta.asOf, period, from, to, store, group]);
  const { status, data, error, forbidden, reload } = useReport(query, !waitingForDates);
  const loading = status === 'loading';
  const ready = status === 'ready' && Boolean(data);
  const empty = ready && isEmptyReport(name, data);

  const go = (path, old) => (isPageLive(path, previewOn) ? toNewAddress(path) : old);
  const stores = sellingLocations(warehouses).map((w) => ({ value: w.name, label: w.warehouse_name || w.name }));
  const dropdowns = stores.length >= 2 ? [{ key: 'store', label: T.page.store, options: [{ value: '', label: T.page.allStores }, ...stores], value: store, onChange: (v) => params.set({ store: v }) }] : [];

  const columns = useMemo(() => columnsFor(name, data), [name, data]);
  const rows = useMemo(() => (ready ? withKeys(name, data.rows) : []), [ready, name, data]);
  const pageRows = rows.slice((page - 1) * size, page * size);
  const range = rangeWords(period, from, to);

  // A link to a page past the last one (the list got shorter) goes to the last page
  useEffect(() => {
    if (ready && pageRows.length === 0 && rows.length > 0 && page > 1) params.set({ page: Math.max(1, Math.ceil(rows.length / size)) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pageRows.length, rows.length, page, size]);

  const exportCsv = () => {
    saveTextFile(reportCsv(columns, rows), csvName(name, todayIso()));
    toast.success(fill(T.page.exportDone, { count: rows.length }));
  };

  // ---------- Table ----------
  const tableCols = tableColumns(columns);
  if (name === 'owed') {
    tableCols.push({
      key: 'remind',
      header: T.owed.columns.remind,
      render: (row) =>
        row.mobile ? (
          <Button as="a" size="small" variant="secondary" className="nl-reports__remind" href={reminderLink({ mobile: row.mobile, name: row.name, amount: row.amount, shop: company })} target="_blank" rel="noopener noreferrer" aria-label={fill(T.owed.remindFor, { name: row.name })}>
            {T.owed.remind}
          </Button>
        ) : null,
    });
  }

  const emptyActions = {
    sales: { label: T.sales.emptyAction, icon: 'till', to: go('/till', '/sales/pos') },
    profit: { label: T.profit.emptyAction, icon: 'till', to: go('/till', '/sales/pos') },
    owed: { label: T.owed.emptyAction, to: go('/sales', '/sales/history') },
    'running-costs': { label: T.costs.emptyAction, icon: 'plus', to: toNewAddress('/expenses') },
    'stock-summary': { label: T.stock.emptyAction, to: go('/stock', '/inventory/stock-summary') },
    'stock-value': { label: T.stock.emptyAction, to: go('/stock', '/inventory/stock-summary') },
    'aging-stock': { label: T.aging.emptyAction, to: go('/stock', '/inventory/stock-summary') },
  };
  const emptyWords = {
    sales: [T.sales.emptyTitle, T.sales.emptyText],
    profit: [T.profit.emptyTitle, T.profit.emptyText],
    owed: [T.owed.emptyTitle, T.owed.emptyText],
    'running-costs': [T.costs.emptyTitle, T.costs.emptyText],
    'stock-summary': [T.stock.emptyTitle, T.stock.emptyText],
    'stock-value': [T.stock.emptyTitle, T.stock.emptyText],
    'aging-stock': ready && data.summary && Number(data.summary.products_in_stock) === 0 ? [T.stock.emptyTitle, T.stock.emptyText] : [T.aging.emptyTitle, T.aging.emptyText],
  }[name];
  const action = emptyActions[name];

  const notes = name === 'profit' && ready ? profitNotes(data) : null;
  const partFailed = ready && Object.keys(data.errors || {}).length > 0;

  const tabs =
    meta.tab !== undefined
      ? {
          label: T.stock.tabsLabel,
          value: name,
          tabs: STOCK_TABS.map((tab) => ({ key: tab, label: T.stock.tabs[REPORT_META[tab].tab], to: `${toNewAddress(reportAddress(tab))}${location.search}` })),
        }
      : undefined;

  const filters = (
    <div className="nl-reports__filters">
      {!meta.asOf || dropdowns.length > 0 ? (
        <FilterRow
          period={shownPeriod}
          onPeriod={meta.asOf ? undefined : (value) => params.set({ period: value })}
          from={params.from}
          to={params.to}
          onRange={(next) => params.set(next)}
          dropdowns={dropdowns}
          hasFilters={Boolean(store) || (!meta.asOf && asked !== '30d')}
          onClear={params.clear}
        />
      ) : null}
      {name === 'profit' ? (
        <div className="nl-reports__filter-extra">
          <Segmented
            label={T.profit.group.label}
            value={(data && data.group_by) || group || 'day'}
            onChange={(value) => params.set({ group: value })}
            options={[
              { value: 'day', label: T.profit.group.day },
              { value: 'month', label: T.profit.group.month },
            ]}
          />
        </div>
      ) : null}
      {ready ? (
        <p className="nl-reports__asat">
          {meta.asOf ? fill(T.page.asAt, { date: shortDay(data.as_of) }) : data.period ? fill(T.page.compare, { from: shortDay(data.period.previous_from), to: shortDay(data.period.previous_to) }) : ''}
          {data.updated_at ? ` · ${fill(T.page.updated, { time: data.updated_at })}` : ''}
        </p>
      ) : null}
    </div>
  );

  let body;
  if (status === 'error') {
    body = forbidden ? (
      <EmptyState icon="info" title={T.page.notAllowedTitle} description={T.page.notAllowedText} action={{ label: T.back, onClick: () => navigate(toNewAddress('/reports')) }} />
    ) : (
      <EmptyState icon="alert" tone="error" title={T.page.errorTitle} description={error || T.page.errorText} action={{ label: T.page.retry, onClick: reload }} />
    );
  } else if (waitingForDates) {
    body = <p className="nl-reports__plain-note">{T.page.pickDates}</p>;
  } else {
    body = (
      <>
        <Figures items={ready ? figuresFor(name, data) : []} loading={loading} count={FIGURE_COUNT[name] || 3} label={question.title} />
        {notes && notes.uncosted > 0 ? (
          <div className="nl-reports__note" role="status">
            <Icon name="info" />
            <p>{fill(T.profit.notCounted, { count: uncostedWords(notes.uncosted), amount: formatMoney(notes.amount) })}</p>
            <Button variant="secondary" size="small" onClick={() => setCostsOpen(true)}>
              {T.profit.addCosts}
            </Button>
          </div>
        ) : null}
        {notes && notes.estimated ? <p className="nl-reports__plain-note">{T.profit.estimated}</p> : null}
        {partFailed ? (
          <p className="nl-reports__plain-note" role="alert">
            {T.page.partFailed}
          </p>
        ) : null}
        {empty ? (
          <Card>
            <EmptyState title={emptyWords[0]} description={emptyWords[1]} action={action ? { label: action.label, icon: action.icon, onClick: () => navigate(action.to) } : undefined} />
          </Card>
        ) : (
          <>
            <ReportCharts name={name} data={ready ? data : null} loading={loading} range={range} onRetry={reload} />
            <div className="nl-reports__table">
              <Card title={T.page.tableTitle} small>
                <Table
                  caption={(CAPTION[name] || (() => ''))(data)}
                  columns={tableCols}
                  rows={pageRows}
                  loading={loading}
                  empty={{ title: emptyWords[0], description: emptyWords[1] }}
                />
                {ready && rows.length > 0 ? <Pagination page={page} size={size} total={rows.length} shown={pageRows.length} onPage={(next) => params.set({ page: next })} onSize={(next) => params.set({ size: next })} /> : null}
                {ready && data.rows_total > rows.length ? <p className="nl-reports__plain-note">{fill(T.page.cutOff, { shown: rows.length, total: data.rows_total })}</p> : null}
                {name === 'aging-stock' ? <p className="nl-reports__plain-note">{T.aging.note}</p> : null}
              </Card>
            </div>
          </>
        )}
        {DETAIL_SCREEN[name] ? (
          <div className="nl-reports__links">
            <p className="nl-reports__plain-note">{T.page.detailText}</p>
            <Button as={RouterLink} to={oldScreen(DETAIL_SCREEN[name])} variant="ghost" size="small">
              {T.page.detailAction}
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="nl-reports">
      <Button as={RouterLink} to={toNewAddress('/reports')} variant="ghost" size="small" icon="chevronLeft" className="nl-reports__back">
        {T.back}
      </Button>
      <PageHeader
        title={question.title}
        subtitle={question.text}
        actions={
          <Button variant="secondary" icon="arrowDown" disabled={!ready || rows.length === 0} onClick={exportCsv}>
            {T.page.export}
          </Button>
        }
        tabs={tabs}
      />
      {filters}
      {body}
      {name === 'profit' ? (
        <MissingCostDialog
          open={costsOpen}
          onClose={() => setCostsOpen(false)}
          range={data && data.period ? { from: data.period.from, to: data.period.to } : undefined}
          productsTo={(p) => `${go('/products', '/products')}?search=${encodeURIComponent(p.item_name || p.item_code)}`}
        />
      ) : null}
    </div>
  );
};

/** The page at /reports/<name>: an unknown name gets a plain notice and a way back, never a blank page */
const ReportPage = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  if (!isReportName(name)) {
    return (
      <div className="nl-reports">
        <PageHeader title={T.title} subtitle={T.subtitle} />
        <EmptyState icon="info" title={T.page.unknownTitle} description={T.page.unknownText} action={{ label: T.page.unknownAction, onClick: () => navigate(toNewAddress('/reports')) }} />
      </div>
    );
  }
  return <ReportView key={name} name={name} />;
};

export default ReportPage;

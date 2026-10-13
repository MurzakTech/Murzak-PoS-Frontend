import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { PaymentChip, StatusLabel } from '../components/Chip';
import FilterRow from '../components/FilterRow';
import Pagination from '../components/Pagination';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { ListWithDetail } from '../components/DetailPanel';
import useListParams from '../components/useListParams';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import { PageHeader, useViewportBand } from '../shell';
import { useAccess } from '../access/AccessProvider';
import { usePreviewRedirects, isPageLive } from '../redirects/live';
import { toNewAddress } from '../redirects/engine';
import fill from '../labels/fill';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listWarehouses } from '../../store/warehouseSlice';
import { getStaffUsers } from '../../store/staffSlice';
import { saveTextFile } from '../../utils/saveTextFile';
import './sales.css';
import CardList from './CardList';
import DifferenceLabel from './DifferenceLabel';
import ReceiptPanel from './ReceiptPanel';
import { useSalesList } from './useSalesData';
import { csvFor, csvName, customerName, doctypeOf, isoDay, isSessionsTab, methodsOf, salesTabs, sessionClosed, sessionOpened, statusView, tabAddress, tabFromParam, whenLabel } from './salesModel';
import T from './strings.sales';

const FILTER_KEYS = ['cashier', 'store'];
const STATE_KEYS = ['open', 'tab'];
const EMPTY_KEY = { all: 'all', unpaid: 'unpaid', returns: 'returns', sessions: 'sessions' };

const Methods = ({ row }) => {
  const methods = methodsOf(row);
  if (!methods.length) return <span>{T.noValue}</span>;
  return (
    <span className="nl-sales-methods">
      {methods.map((m) => (
        <PaymentChip key={m} method={m} />
      ))}
    </span>
  );
};

const Status = ({ status }) => {
  const view = statusView(status);
  return <StatusLabel status={view.status}>{view.words}</StatusLabel>;
};

/**
 * The Sales page (ticket P3-8, acceptance checks AC-24 and AC-25): one list of POS invoices and sales invoices with the
 * tabs All sales, Unpaid, Returns and Till sessions, a summary row, filters that live in the address, 20 rows to a page, a
 * receipt panel beside the list (a full page below 1100px) and rows that become cards below 768px.
 */
const SalesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const access = useAccess();
  const previewOn = usePreviewRedirects();
  const band = useViewportBand();
  const narrow = band === 'narrow';
  const params = useListParams({ defaultPeriod: '30d', filterKeys: FILTER_KEYS, stateKeys: STATE_KEYS });
  const { page, size, q, period, from, to, filters, state } = params;
  const tab = tabFromParam(state.tab);
  const sessions = isSessionsTab(tab);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listRef = useRef(null);
  const refocus = useRef('');

  const user = useAppSelector((s) => s.auth.user);
  const { warehouses } = useAppSelector((s) => s.warehouse);
  const { staffUsers } = useAppSelector((s) => s.staff);
  const company = user && user.company;
  const isCashier = access.tier === 'cashier';
  const canPickCashier = access.tier === 'owner' || access.tier === 'manager';

  useEffect(() => {
    if (!company) return;
    dispatch(listWarehouses({ company, limit: 1000 }));
  }, [dispatch, company]);
  useEffect(() => {
    if (company && canPickCashier) dispatch(getStaffUsers({ company, enabledOnly: false }));
  }, [dispatch, company, canPickCashier]);

  // Where things go: the redesigned page once it is live, otherwise the current screen
  const go = (path, old) => (isPageLive(path, previewOn) ? toNewAddress(path) : old);

  const query = useMemo(
    () => ({ tab, period, from, to, search: q, cashier: isCashier ? '' : filters.cashier, store: filters.store, page, pageSize: size }),
    [tab, period, from, to, q, isCashier, filters.cashier, filters.store, page, size]
  );
  const { status, data, error, reload } = useSalesList(query);
  const loading = status === 'loading';
  const ready = status === 'ready' && data;
  const rows = useMemo(() => (ready ? data.rows : []), [ready, data]);
  const total = ready ? data.total : 0;

  // A link to a page past the last one (the list got shorter) goes to the last page
  useEffect(() => {
    if (ready && rows.length === 0 && total > 0 && page > 1) params.set({ page: Math.max(1, Math.ceil(total / size)) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, rows.length, total, page, size]);

  const openId = sessions ? '' : state.open;
  const openIndex = rows.findIndex((r) => r.id === openId);
  const open = (id) => params.set({ open: id, page });
  const close = () => {
    refocus.current = openId;
    params.set({ open: '', page });
  };

  // Closing the panel puts the keyboard back on the row that was open (the panel also does so for the row it started from)
  useEffect(() => {
    if (openId || !refocus.current || !listRef.current) return;
    const target = Array.from(listRef.current.querySelectorAll('[data-key]')).find((el) => el.dataset.key === refocus.current);
    refocus.current = '';
    if (target && target.focus) target.focus();
  }, [openId, rows]);

  const search = new URLSearchParams(location.search).toString();
  const tabs = salesTabs().map((t) => ({ ...t, to: tabAddress(location.pathname, t.key, search) }));

  const staffList = canPickCashier ? (staffUsers || []).map((s) => ({ value: s.name || s.email, label: s.full_name || s.name || s.email })) : [];
  const stores = (warehouses || []).map((w) => ({ value: w.name, label: w.warehouse_name || w.name }));
  const dropdowns = [];
  if (staffList.length > 0) dropdowns.push({ key: 'cashier', label: T.filters.cashier, options: [{ value: '', label: T.filters.allCashiers }, ...staffList], value: filters.cashier, onChange: (v) => params.set({ cashier: v }) });
  if (stores.length >= 2) dropdowns.push({ key: 'store', label: T.filters.store, options: [{ value: '', label: T.filters.allStores }, ...stores], value: filters.store, onChange: (v) => params.set({ store: v }) });

  const filterCount = [q, period !== '30d', filters.cashier, filters.store].filter(Boolean).length;

  const exportCsv = () => {
    saveTextFile(csvFor(tab, rows), csvName(tab, isoDay(new Date())));
    toast.success(fill(T.exportDone, { count: rows.length }));
  };

  // ---------- Table columns ----------
  const salesColumns = [
    { key: 'receipt', header: T.columns.receipt, nowrap: true, render: (r) => <strong>{r.receipt}</strong> },
    { key: 'when', header: T.columns.when, nowrap: true, render: (r) => whenLabel(r.date, r.time) },
    { key: 'customer', header: T.columns.customer, render: (r) => customerName(r) },
    { key: 'payment', header: T.columns.payment, render: (r) => <Methods row={r} /> },
    { key: 'total', header: T.columns.amount, money: true, nowrap: true },
    { key: 'status', header: T.columns.status, render: (r) => <Status status={r.status} /> },
  ];
  const sessionColumns = [
    { key: 'cashier', header: T.columns.cashier, render: (r) => r.cashier_name || r.cashier },
    { key: 'opened', header: T.columns.opened, nowrap: true, render: (r) => sessionOpened(r) },
    { key: 'closed', header: T.columns.closed, nowrap: true, render: (r) => sessionClosed(r) },
    { key: 'sales_count', header: T.columns.salesCount, align: 'right' },
    { key: 'expected', header: T.columns.expected, money: true, nowrap: true },
    { key: 'counted', header: T.columns.counted, money: true, nowrap: true, render: (r) => (r.counted === null || r.counted === undefined ? T.noValue : formatMoney(r.counted)) },
    { key: 'difference', header: T.columns.difference, nowrap: true, render: (r) => <DifferenceLabel difference={r.difference} /> },
  ];

  const emptyKey = params.hasFilters ? 'noMatch' : EMPTY_KEY[tab];
  const toAll = tabAddress(location.pathname, 'all', search);
  const emptyStates = {
    noMatch: { icon: 'search', title: T.empty.noMatchTitle, description: T.empty.noMatchText, action: { label: T.empty.clear, onClick: params.clear } },
    all: { title: T.empty.allTitle, description: T.empty.allText, action: { label: T.empty.goToTill, icon: 'till', onClick: () => navigate(go('/till', '/sales/pos')) } },
    unpaid: { icon: 'check', title: T.empty.unpaidTitle, description: T.empty.unpaidText, action: { label: T.empty.showAll, onClick: () => navigate(toAll) } },
    returns: { title: T.empty.returnsTitle, description: T.empty.returnsText, action: { label: T.empty.showAll, onClick: () => navigate(toAll) } },
    sessions: { title: T.empty.sessionsTitle, description: T.empty.sessionsText, action: { label: T.empty.goToTill, icon: 'till', onClick: () => navigate(go('/till', '/sales/pos')) } },
  };
  const captions = { all: T.list.caption, unpaid: T.list.captionUnpaid, returns: T.list.captionReturns, sessions: T.list.captionSessions };

  // ---------- Cards (phones) ----------
  const saleCards = rows.map((r) => ({
    key: r.id,
    head: r.receipt,
    aside: formatMoney(r.total),
    lines: [customerName(r), whenLabel(r.date, r.time), <Methods key="m" row={r} />],
    foot: <Status status={r.status} />,
  }));
  const sessionCards = rows.map((r) => ({
    key: r.id,
    head: r.cashier_name || r.cashier,
    aside: fill(T.sessions.sessionCount, { count: r.sales_count }),
    lines: [`${sessionOpened(r)} / ${sessionClosed(r)}`, `${T.columns.expected}: ${formatMoney(r.expected)}`, `${T.columns.counted}: ${r.counted === null || r.counted === undefined ? T.noValue : formatMoney(r.counted)}`],
    foot: <DifferenceLabel difference={r.difference} />,
  }));
  const useCards = narrow && ready && rows.length > 0;

  const list = (
    <div className="nl-sales__list" ref={listRef}>
      {sessions ? null : (
        <SummaryRow
          loading={loading}
          label={T.summary.label}
          items={[
            { label: T.summary.sold, value: ready ? formatMoney(data.summary.sold) : '' },
            { label: T.summary.unpaid, value: ready ? formatMoney(data.summary.unpaid) : '' },
            { label: T.summary.returned, value: ready ? formatMoney(data.summary.returned) : '' },
          ]}
        />
      )}

      {narrow ? (
        <Button variant="secondary" icon="search" className="nl-sales__filters-toggle" aria-expanded={filtersOpen} aria-controls="nl-sales-filters" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? T.filters.close : filterCount ? fill(T.filters.openCount, { count: filterCount }) : T.filters.open}
        </Button>
      ) : null}
      {!narrow || filtersOpen ? (
        <div id="nl-sales-filters">
          <FilterRow
            period={period}
            onPeriod={(value) => params.set({ period: value })}
            from={from}
            to={to}
            onRange={(range) => params.set(range)}
            search={q}
            onSearch={(value) => params.set({ q: value })}
            searchLabel={sessions ? T.filters.searchSessions : T.filters.search}
            searchPlaceholder={sessions ? T.filters.searchSessionsPlaceholder : T.filters.searchPlaceholder}
            dropdowns={dropdowns}
            hasFilters={params.hasFilters}
            onClear={params.clear}
          />
        </div>
      ) : null}

      {useCards ? (
        <CardList items={sessions ? sessionCards : saleCards} label={sessions ? T.list.sessionCardsLabel : T.list.cardsLabel} onOpen={sessions ? undefined : open} selectedKey={openId} />
      ) : (
        <Table
          caption={captions[tab]}
          columns={sessions ? sessionColumns : salesColumns}
          rows={rows}
          loading={loading}
          error={status === 'error'}
          onRetry={reload}
          empty={emptyStates[emptyKey]}
          selectedKey={openId || undefined}
          onRowOpen={sessions ? undefined : (row) => open(row.id)}
        />
      )}
      {status === 'error' && error ? <p className="nl-visually-hidden">{error}</p> : null}

      {ready && total > 0 ? <Pagination page={data.page} size={size} total={total} shown={rows.length} onPage={(next) => params.set({ page: next })} onSize={(next) => params.set({ size: next })} /> : null}
    </div>
  );

  const detail =
    openId && !sessions ? (
      <ReceiptPanel
        key={openId}
        id={openId}
        doctype={doctypeOf(openId, rows)}
        summary={rows[openIndex]}
        position={openIndex >= 0 ? fill(T.panel.position, { current: openIndex + 1, total: rows.length }) : undefined}
        onClose={close}
        onPrevious={openIndex > 0 ? () => open(rows[openIndex - 1].id) : undefined}
        onNext={openIndex >= 0 && openIndex < rows.length - 1 ? () => open(rows[openIndex + 1].id) : undefined}
        returnAddress={(sale) => go(`/sales/returns?invoice=${encodeURIComponent(sale.id)}`, `/sales/returns?invoice=${encodeURIComponent(sale.id)}`)}
        onChanged={reload}
      />
    ) : null;

  return (
    <div className="nl-sales">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={
          <Button variant="secondary" icon="arrowDown" disabled={!ready || rows.length === 0} onClick={exportCsv}>
            {T.export}
          </Button>
        }
        tabs={{ label: T.tabsLabel, tabs, value: tab }}
      />
      <ListWithDetail list={list} detail={detail} />
    </div>
  );
};

export default SalesPage;

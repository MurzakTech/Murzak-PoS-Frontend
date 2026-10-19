import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import FilterRow from '../components/FilterRow';
import Pagination from '../components/Pagination';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { ListWithDetail } from '../components/DetailPanel';
import useListParams from '../components/useListParams';
import { formatMoney, rowsWords } from '../components/format';
import { useToast } from '../components/Toast';
import { HeaderActions, PageHeader, useViewportBand } from '../shell';
import fill from '../labels/fill';
import { saveTextFile } from '../../utils/saveTextFile';
import './purchases.css';
import PurchaseCards from './PurchaseCards';
import PurchasePanel from './PurchasePanel';
import PurchaseStatus from './PurchaseStatus';
import { usePurchasesList, useSuppliers } from './usePurchasesData';
import {
  csvName,
  DEFAULT_TAB,
  dateCell,
  dueInfo,
  isoDay,
  KIND_BILLS,
  KIND_RECEIPTS,
  kindChoices,
  kindFromParam,
  NEW_PATH,
  purchasesCsv,
  purchasesTabs,
  RECEIVE_PATH,
  tabAddress,
  tabFromParam,
} from './purchasesModel';
import T from './strings.purchases';
import { oldScreen } from '../redirects/engine';

const FILTER_KEYS = ['supplier', 'kind'];
const STATE_KEYS = ['open', 'tab', 'action'];
const EMPTY_KEY = { all: 'all', orders: 'orders', returns: 'returns', receipts: 'received', bills: 'bills' };

const NumberCell = ({ row }) => (
  <>
    <strong>{row.number}</strong>
    {row.bill_no ? <span className="nl-purchases-sub">{fill(T.billNo, { number: row.bill_no })}</span> : null}
  </>
);

const StatusCell = ({ row }) => {
  const due = dueInfo(row);
  return (
    <>
      <PurchaseStatus status={row.status} />
      {row.part_received ? <span className="nl-purchases-sub">{T.partReceived}</span> : null}
      {due ? <span className="nl-purchases-sub">{due.text}</span> : null}
    </>
  );
};

/**
 * The Purchases page (ticket P4-5, acceptance checks AC-25 and AC-29): one list of orders, bills and returns with the tabs
 * All purchases, Orders and Returns, a summary row, filters that live in the address, 20 rows to a page, a purchase panel
 * beside the list (a full page below 1100px) and rows that become cards below 768px. The header holds New purchase and
 * Receive goods. Goods received notes (stock-only receipts too) and every supplier bill are views of their own, reached from
 * the Show filter or the More purchase screens menu, so no current purchase list is lost.
 */
const PurchasesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const band = useViewportBand();
  const narrow = band === 'narrow';
  const params = useListParams({ defaultPeriod: '30d', filterKeys: FILTER_KEYS, stateKeys: STATE_KEYS });
  const { page, size, q, period, from, to, filters, state } = params;
  const kind = kindFromParam(filters.kind);
  const tab = kind ? DEFAULT_TAB : tabFromParam(state.tab);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listRef = useRef(null);
  const refocus = useRef('');
  const suppliers = useSuppliers();

  // The old Create GRN address redirects here with ?action=receive: go straight to the Receive goods steps
  useEffect(() => {
    if (state.action === 'receive') navigate(RECEIVE_PATH, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.action]);

  const query = useMemo(() => ({ tab, kind, period, from, to, search: q, supplier: filters.supplier, page, pageSize: size }), [tab, kind, period, from, to, q, filters.supplier, page, size]);
  const { status, data, error, reload } = usePurchasesList(query, state.action !== 'receive');
  const loading = status === 'loading';
  const ready = status === 'ready' && data;
  const rows = useMemo(() => (ready ? data.rows : []), [ready, data]);
  const total = ready ? data.total : 0;

  // A link to a page past the last one (the list got shorter) goes to the last page
  useEffect(() => {
    if (ready && rows.length === 0 && total > 0 && page > 1) params.set({ page: Math.max(1, Math.ceil(total / size)) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, rows.length, total, page, size]);

  const openId = state.open;
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
  const tabs = purchasesTabs().map((t) => ({ ...t, to: tabAddress(location.pathname, t.key, search) }));

  const supplierChoices = suppliers.status === 'ready' ? suppliers.data.map((s) => ({ value: s.id, label: s.name })) : [];
  const dropdowns = [];
  if (supplierChoices.length > 0)
    dropdowns.push({
      key: 'supplier',
      label: T.filters.supplier,
      options: [{ value: '', label: T.filters.allSuppliers }, ...supplierChoices],
      value: filters.supplier,
      onChange: (v) => params.set({ supplier: v }),
    });

  // Goods received notes and every supplier bill are views of their own (the All list folds a bill into its order and leaves out stock-only receipts)
  if (dropdowns.length < 2) {
    dropdowns.push({ key: 'kind', label: T.filters.show, options: kindChoices(), value: kind, onChange: (v) => params.set({ kind: v }) });
  }

  const filterCount = [q, period !== '30d', filters.supplier, kind].filter(Boolean).length;

  const exportCsv = () => {
    saveTextFile(purchasesCsv(rows), csvName(tab, isoDay(new Date())));
    toast.success(fill(T.exportDone, { rows: rowsWords(rows.length) }));
  };

  const columns = [
    { key: 'number', header: T.columns.purchase, nowrap: true, render: (r) => <NumberCell row={r} /> },
    { key: 'supplier', header: T.columns.supplier },
    { key: 'date', header: T.columns.date, nowrap: true, render: (r) => dateCell(r.date) },
    { key: 'total', header: T.columns.total, money: true, nowrap: true },
    { key: 'status', header: T.columns.status, render: (r) => <StatusCell row={r} /> },
  ];

  const emptyKey = params.hasFilters ? 'noMatch' : EMPTY_KEY[kind || tab];
  const toAll = tabAddress(location.pathname, 'all', search);
  const emptyStates = {
    noMatch: { icon: 'search', title: T.empty.noMatchTitle, description: T.empty.noMatchText, action: { label: T.empty.clear, onClick: params.clear } },
    all: { title: T.empty.allTitle, description: T.empty.allText, action: { label: T.newPurchase, icon: 'plus', onClick: () => navigate(NEW_PATH) } },
    orders: { title: T.empty.ordersTitle, description: T.empty.ordersText, action: { label: T.newPurchase, icon: 'plus', onClick: () => navigate(NEW_PATH) } },
    received: { title: T.empty.receivedTitle, description: T.empty.receivedText, action: { label: T.empty.showAll, onClick: () => navigate(toAll) } },
    bills: { title: T.empty.billsTitle, description: T.empty.billsText, action: { label: T.empty.showAll, onClick: () => navigate(toAll) } },
    returns: { title: T.empty.returnsTitle, description: T.empty.returnsText, action: { label: T.empty.showAll, onClick: () => navigate(toAll) } },
  };
  const captions = { all: T.list.caption, orders: T.list.captionOrders, returns: T.list.captionReturns, receipts: T.list.captionReceived, bills: T.list.captionBills };
  const useCards = narrow && ready && rows.length > 0;

  const list = (
    <div className="nl-purchases__list" ref={listRef}>
      <SummaryRow
        loading={loading}
        label={T.summary.label}
        items={[
          { label: T.summary.ordersOpen, value: ready ? String(data.summary.orders_open) : '' },
          { label: T.summary.billsUnpaid, value: ready ? formatMoney(data.summary.bills_unpaid) : '' },
          { label: T.summary.returned, value: ready ? formatMoney(data.summary.returned) : '' },
        ]}
      />

      {narrow ? (
        <Button variant="secondary" icon="search" className="nl-purchases__filters-toggle" aria-expanded={filtersOpen} aria-controls="nl-purchases-filters" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? T.filters.close : filterCount ? fill(T.filters.openCount, { count: filterCount }) : T.filters.open}
        </Button>
      ) : null}
      {!narrow || filtersOpen ? (
        <div id="nl-purchases-filters">
          <FilterRow
            period={period}
            onPeriod={(value) => params.set({ period: value })}
            from={from}
            to={to}
            onRange={(range) => params.set(range)}
            search={q}
            onSearch={(value) => params.set({ q: value })}
            searchLabel={T.filters.search}
            searchPlaceholder={T.filters.searchPlaceholder}
            dropdowns={dropdowns}
            hasFilters={params.hasFilters}
            onClear={params.clear}
          />
        </div>
      ) : null}

      {useCards ? (
        <PurchaseCards rows={rows} label={T.list.cardsLabel} onOpen={open} selectedKey={openId} />
      ) : (
        <Table
          caption={captions[kind || tab]}
          columns={columns}
          rows={rows}
          loading={loading}
          error={status === 'error'}
          onRetry={reload}
          empty={emptyStates[emptyKey]}
          selectedKey={openId || undefined}
          onRowOpen={(row) => open(row.id)}
        />
      )}
      {status === 'error' && error ? <p className="nl-visually-hidden">{error}</p> : null}

      {ready && total > 0 ? (
        <Pagination page={data.page} size={size} total={total} shown={rows.length} onPage={(next) => params.set({ page: next })} onSize={(next) => params.set({ size: next })} />
      ) : null}
    </div>
  );

  const detail = openId ? (
    <PurchasePanel
      key={openId}
      id={openId}
      doctype={openIndex >= 0 ? rows[openIndex].doctype : undefined}
      summary={rows[openIndex]}
      position={openIndex >= 0 ? fill(T.panel.position, { current: openIndex + 1, total: rows.length }) : undefined}
      onClose={close}
      onPrevious={openIndex > 0 ? () => open(rows[openIndex - 1].id) : undefined}
      onNext={openIndex >= 0 && openIndex < rows.length - 1 ? () => open(rows[openIndex + 1].id) : undefined}
      onChanged={reload}
    />
  ) : null;

  const moreItems = [
    { label: T.more.received, onClick: () => params.set({ kind: KIND_RECEIPTS, page: 1, open: '' }) },
    { label: T.more.bills, onClick: () => params.set({ kind: KIND_BILLS, page: 1, open: '' }) },
    { label: T.more.noOrder, onClick: () => navigate(oldScreen(T.links.noOrder)) },
  ];

  return (
    <div className="nl-purchases">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={
          // New purchase is the main button; Receive goods, Export and the other purchase screens are in More, so the header holds two controls
          <HeaderActions
            primary={
              <Button icon="plus" onClick={() => navigate(NEW_PATH)}>
                {T.newPurchase}
              </Button>
            }
            items={[
              { label: T.receiveGoods, icon: 'truck', onClick: () => navigate(RECEIVE_PATH) },
              { label: T.export, icon: 'arrowDown', disabled: !ready || rows.length === 0, onClick: exportCsv },
              ...moreItems,
            ]}
          />
        }
        tabs={{ label: T.tabsLabel, tabs, value: tab }}
      />
      <ListWithDetail list={list} detail={detail} />
    </div>
  );
};

export default PurchasesPage;

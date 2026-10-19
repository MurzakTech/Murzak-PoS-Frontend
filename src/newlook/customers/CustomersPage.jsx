import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { Chip } from '../components/Chip';
import FilterRow from '../components/FilterRow';
import Pagination from '../components/Pagination';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { ListWithDetail } from '../components/DetailPanel';
import useListParams from '../components/useListParams';
import { formatMoney, rowsWords } from '../components/format';
import { useToast } from '../components/Toast';
import { PageHeader, useViewportBand } from '../shell';
import { useAccess } from '../access/AccessProvider';
import fill from '../labels/fill';
import { useAppSelector } from '../../store/hooks';
import { saveTextFile } from '../../utils/saveTextFile';
import './customers.css';
import CustomerCards from './CustomerCards';
import CustomerPanel from './CustomerPanel';
import { useCustomersList } from './useCustomersData';
import { csvName, customerTabs, customersCsv, editAddress, hasBalance, isoDay, lastPurchaseWords, shownPhone, tabAddress, tabFromParam, typeFromParam, statusFromParam, TYPES } from './customersModel';
import T from './strings.customers';

const FILTER_KEYS = ['type', 'status'];
const STATE_KEYS = ['open', 'tab'];

const StatusChip = ({ disabled }) => (disabled ? <Chip icon="x">{T.status.disabled}</Chip> : <Chip icon="check">{T.status.active}</Chip>);

/**
 * The Customers page (ticket P4-7, acceptance checks AC-25 and AC-28): the tabs All customers and Owing, a summary row, a filter
 * row whose values live in the address, 20 rows to a page, the customer panel beside the list (a full page below 1100px) and rows
 * that become cards below 768px. Balances, the Owing tab and the statement are for owners and managers; the server leaves them out
 * of a cashier's answer and the page draws none of them.
 */
const CustomersPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const access = useAccess();
  const band = useViewportBand();
  const narrow = band === 'narrow';
  const params = useListParams({ defaultPeriod: '30d', filterKeys: FILTER_KEYS, stateKeys: STATE_KEYS });
  const { page, size, q, filters, state } = params;
  const canSeeMoney = access.can('money_owed');
  const tab = tabFromParam(state.tab, canSeeMoney);
  const owing = tab === 'owing';
  const type = typeFromParam(filters.type);
  const status = statusFromParam(filters.status);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listRef = useRef(null);
  const refocus = useRef('');

  const user = useAppSelector((s) => s.auth.user);
  const company = user && user.company;
  const shop = user && user.company;

  // Until the server has said who this is, nothing is asked: a manager's first question would otherwise be a cashier's
  const accessKnown = access.status === 'ready' || access.status === 'error';
  const query = useMemo(() => ({ tab, search: q, type, status: owing || status === 'active' ? undefined : status, page, pageSize: size, company }), [tab, q, type, status, owing, page, size, company]);
  const { status: loadStatus, data, error, reload } = useCustomersList(query, accessKnown);
  const loading = loadStatus === 'loading' || loadStatus === 'idle';
  const ready = loadStatus === 'ready' && data;
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

  // Closing the panel puts the keyboard back on the row that was open
  useEffect(() => {
    if (openId || !refocus.current || !listRef.current) return;
    const target = Array.from(listRef.current.querySelectorAll('[data-key]')).find((el) => el.dataset.key === refocus.current);
    refocus.current = '';
    if (target && target.focus) target.focus();
  }, [openId, rows]);

  const search = new URLSearchParams(location.search).toString();
  const tabs = customerTabs(canSeeMoney).map((t) => ({ ...t, to: tabAddress(location.pathname, t.key, search) }));
  const addAddress = `${location.pathname}/new`;

  const dropdowns = [
    {
      key: 'type',
      label: T.filters.type,
      options: [{ value: '', label: T.filters.allTypes }, ...TYPES.map((value) => ({ value, label: T.types[value] }))],
      value: type,
      onChange: (v) => params.set({ type: v }),
    },
  ];
  if (!owing) {
    dropdowns.push({
      key: 'status',
      label: T.filters.status,
      options: [
        { value: '', label: T.filters.activeOnly },
        { value: 'disabled', label: T.filters.disabledOnly },
        { value: 'all', label: T.filters.allStatuses },
      ],
      value: status === 'active' ? '' : status,
      onChange: (v) => params.set({ status: v }),
    });
  }
  const filterCount = [q, type, !owing && status !== 'active' && status].filter(Boolean).length;

  const exportCsv = () => {
    saveTextFile(customersCsv(rows, canSeeMoney), csvName(tab, isoDay(new Date())));
    toast.success(fill(T.exportDone, { rows: rowsWords(rows.length) }));
  };

  // ---------- Table columns ----------
  const columns = [
    {
      key: 'name',
      header: T.columns.customer,
      render: (r) => <strong>{r.name}</strong>,
    },
    { key: 'mobile', header: T.columns.mobile, nowrap: true, render: (r) => shownPhone(r.mobile) },
    ...(canSeeMoney ? [{ key: 'balance', header: T.columns.balance, money: true, nowrap: true, render: (r) => (hasBalance(r) ? formatMoney(r.balance) : T.noValue) }] : []),
    { key: 'lastPurchase', header: T.columns.lastPurchase, nowrap: true, render: (r) => lastPurchaseWords(r) },
    { key: 'status', header: T.columns.status, render: (r) => <StatusChip disabled={r.disabled} /> },
  ];

  const emptyKey = params.hasFilters ? 'noMatch' : owing ? 'owing' : 'all';
  const emptyStates = {
    noMatch: { icon: 'search', title: T.empty.noMatchTitle, description: T.empty.noMatchText, action: { label: T.empty.clear, onClick: params.clear } },
    all: { art: 'customers', icon: 'users', title: T.empty.allTitle, description: T.empty.allText, action: { label: T.addCustomer, icon: 'plus', onClick: () => navigate(addAddress) } },
    owing: { icon: 'check', title: T.empty.owingTitle, description: T.empty.owingText, action: { label: T.empty.showAll, onClick: () => navigate(tabAddress(location.pathname, 'all', search)) } },
  };

  const cards = rows.map((r) => ({
    key: r.id,
    head: r.name,
    aside: canSeeMoney && hasBalance(r) ? formatMoney(r.balance) : '',
    lines: [shownPhone(r.mobile), `${T.columns.lastPurchase}: ${lastPurchaseWords(r)}`],
    foot: <StatusChip disabled={r.disabled} />,
  }));
  const useCards = narrow && ready && rows.length > 0;

  const summaryItems = [{ label: T.summary.customers, value: ready ? String(data.summary.customers ?? '') : '' }];
  if (canSeeMoney) {
    summaryItems.push({ label: T.summary.owing, value: ready ? formatMoney(data.summary.owing_total) : '' });
    summaryItems.push({ label: T.summary.owingCustomers, value: ready ? String(data.summary.owing_customers ?? '') : '' });
  }

  const list = (
    <div className="nl-customers__list" ref={listRef}>
      <SummaryRow loading={loading} label={T.summary.label} items={summaryItems} />

      {narrow ? (
        <Button variant="secondary" icon="search" className="nl-customers__filters-toggle" aria-expanded={filtersOpen} aria-controls="nl-customers-filters" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? T.filters.close : filterCount ? fill(T.filters.openCount, { count: filterCount }) : T.filters.open}
        </Button>
      ) : null}
      {!narrow || filtersOpen ? (
        <div id="nl-customers-filters">
          <FilterRow
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
        <CustomerCards items={cards} label={owing ? T.list.cardsLabelOwing : T.list.cardsLabel} onOpen={open} selectedKey={openId} />
      ) : (
        <Table
          caption={owing ? T.list.captionOwing : T.list.caption}
          columns={columns}
          rows={rows}
          loading={loading}
          error={loadStatus === 'error'}
          onRetry={reload}
          empty={emptyStates[emptyKey]}
          selectedKey={openId || undefined}
          onRowOpen={(row) => open(row.id)}
        />
      )}
      {loadStatus === 'error' && error ? <p className="nl-visually-hidden">{error}</p> : null}

      {ready && total > 0 ? <Pagination page={data.page} size={size} total={total} shown={rows.length} onPage={(next) => params.set({ page: next })} onSize={(next) => params.set({ size: next })} /> : null}
    </div>
  );

  const detail = openId ? (
    <CustomerPanel
      key={openId}
      id={openId}
      company={company}
      shop={shop}
      summary={rows[openIndex]}
      canSeeMoney={canSeeMoney}
      position={openIndex >= 0 ? fill(T.panel.position, { current: openIndex + 1, total: rows.length }) : undefined}
      onClose={close}
      onPrevious={openIndex > 0 ? () => open(rows[openIndex - 1].id) : undefined}
      onNext={openIndex >= 0 && openIndex < rows.length - 1 ? () => open(rows[openIndex + 1].id) : undefined}
      editTo={editAddress(location.pathname, openId)}
      onEdit={() => navigate(editAddress(location.pathname, openId))}
      onChanged={reload}
    />
  ) : null;

  return (
    <div className="nl-customers">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={
          <>
            <Button variant="secondary" icon="arrowDown" disabled={!ready || rows.length === 0} onClick={exportCsv}>
              {T.export}
            </Button>
            <Button icon="plus" onClick={() => navigate(addAddress)}>
              {T.addCustomer}
            </Button>
          </>
        }
        tabs={{ label: T.tabsLabel, tabs, value: tab }}
      />
      <ListWithDetail list={list} detail={detail} />
    </div>
  );
};

export default CustomersPage;

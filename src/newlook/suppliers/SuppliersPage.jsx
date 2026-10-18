import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { Chip } from '../components/Chip';
import FilterRow from '../components/FilterRow';
import Pagination from '../components/Pagination';
import Segmented from '../components/Segmented';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { ListWithDetail } from '../components/DetailPanel';
import useListParams from '../components/useListParams';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import { PageHeader, useViewportBand } from '../shell';
import { useAccess } from '../access/AccessProvider';
import fill from '../labels/fill';
import { useAppSelector } from '../../store/hooks';
import { saveTextFile } from '../../utils/saveTextFile';
import './suppliers.css';
import DueStatus from './DueStatus';
import SupplierCards from './SupplierCards';
import SupplierGroupsLink from './SupplierGroupsLink';
import SupplierPanel from './SupplierPanel';
import { useSupplierGroups, useSuppliersList } from './useSuppliersData';
import { csvName, dueDateWords, editAddress, hasOwed, isoDay, owedFromParam, owedOptions, owedText, statusFromParam, suppliersCsv } from './suppliersModel';
import T from './strings.suppliers';

const FILTER_KEYS = ['owed', 'group', 'status'];
const STATE_KEYS = ['open'];

const StatusChip = ({ disabled }) => (disabled ? <Chip icon="x">{T.status.disabled}</Chip> : <Chip icon="check">{T.status.active}</Chip>);

const NextDue = ({ due }) =>
  due ? (
    <span className="nl-suppliers__due">
      <span>{dueDateWords(due)}</span>
      <DueStatus due={due} />
    </span>
  ) : (
    T.noValue
  );

/**
 * The Suppliers page (ticket P4-6, acceptance checks AC-25 and AC-28): ONE list with an Owed filter (All or Owed), a summary row,
 * a search and filters that live in the address, 20 rows to a page, the supplier panel beside the list (a full page below 1100px)
 * and rows that become cards below 768px. What the shop owes, the next bill due and the Owed filter are for owners and managers;
 * the server leaves them out of a cashier's answer and the page draws none of them.
 *
 * The Owed filter lists exactly the suppliers whose owed amounts add up to the "Owed to suppliers" figure above the list.
 */
const SuppliersPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const access = useAccess();
  const band = useViewportBand();
  const narrow = band === 'narrow';
  const params = useListParams({ defaultPeriod: '30d', filterKeys: FILTER_KEYS, stateKeys: STATE_KEYS });
  const { page, size, q, filters, state } = params;
  const canSeeMoney = access.can('money_owed');
  const owed = owedFromParam(filters.owed, canSeeMoney);
  const group = filters.group;
  const status = statusFromParam(filters.status);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listRef = useRef(null);
  const refocus = useRef('');

  const user = useAppSelector((s) => s.auth.user);
  const company = user && user.company;

  const groups = useSupplierGroups();
  const groupChoices = groups.status === 'ready' ? groups.data : [];

  // Until the server has said who this is, nothing is asked: a manager's first question would otherwise be a cashier's
  const accessKnown = access.status === 'ready' || access.status === 'error';
  const query = useMemo(() => ({ owed, search: q, group, status: owed || status === 'active' ? undefined : status, page, pageSize: size, company }), [owed, q, group, status, page, size, company]);
  const { status: loadStatus, data, error, reload } = useSuppliersList(query, accessKnown);
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

  const addAddress = `${location.pathname}/new`;

  const dropdowns = [];
  if (groupChoices.length > 1 || group) {
    dropdowns.push({
      key: 'group',
      label: T.filters.group,
      options: [{ value: '', label: T.filters.allGroups }, ...groupChoices],
      value: group,
      onChange: (v) => params.set({ group: v }),
    });
  }
  if (!owed) {
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
  const filterCount = [q, group, !owed && status !== 'active' && status].filter(Boolean).length;
  // "Clear filters" shows for the search and the dropdowns, not for the Owed choice, which has its own control
  const hasOtherFilters = Boolean(q || group || (!owed && status !== 'active'));
  const clearFilters = () => params.set({ q: '', group: '', status: '' });

  const exportCsv = () => {
    saveTextFile(suppliersCsv(rows, canSeeMoney), csvName(owed ? 'owed' : 'all', isoDay(new Date())));
    toast.success(fill(T.exportDone, { count: rows.length }));
  };

  // ---------- Table columns ----------
  const columns = [
    { key: 'name', header: T.columns.supplier, render: (r) => <strong>{r.name}</strong> },
    ...(canSeeMoney
      ? [
          { key: 'owed', header: T.columns.owed, money: true, nowrap: true, render: (r) => owedText(r) },
          { key: 'next_due', header: T.columns.nextDue, nowrap: true, render: (r) => <NextDue due={r.next_due} /> },
        ]
      : []),
    { key: 'status', header: T.columns.status, render: (r) => <StatusChip disabled={r.disabled} /> },
  ];

  const emptyKey = owed && !hasOtherFilters ? 'owed' : hasOtherFilters || owed ? 'noMatch' : 'all';
  const emptyStates = {
    noMatch: { icon: 'search', title: T.empty.noMatchTitle, description: T.empty.noMatchText, action: { label: T.empty.clear, onClick: () => params.set({ q: '', group: '', status: '', owed: '' }) } },
    all: { icon: 'truck', title: T.empty.allTitle, description: T.empty.allText, action: { label: T.addSupplier, icon: 'plus', onClick: () => navigate(addAddress) } },
    owed: { icon: 'check', title: T.empty.owedTitle, description: T.empty.owedText, action: { label: T.empty.showAll, onClick: () => params.set({ owed: '' }) } },
  };

  const cards = rows.map((r) => ({
    key: r.id,
    head: r.name,
    aside: canSeeMoney && hasOwed(r) && Number(r.owed) > 0 ? formatMoney(r.owed) : '',
    lines: canSeeMoney && r.next_due ? [fill(T.due.cardLine, { date: dueDateWords(r.next_due) })] : [],
    foot: (
      <span className="nl-suppliers__card-foot">
        <StatusChip disabled={r.disabled} />
        {canSeeMoney ? <DueStatus due={r.next_due} /> : null}
      </span>
    ),
  }));
  const useCards = narrow && ready && rows.length > 0;

  const summaryItems = [{ label: T.summary.suppliers, value: ready ? String(data.summary.suppliers ?? '') : '' }];
  if (canSeeMoney) {
    summaryItems.push({ label: T.summary.owed, value: ready ? formatMoney(data.summary.owed_total) : '' });
    summaryItems.push({ label: T.summary.dueSoon, value: ready ? String(data.summary.bills_due_soon ?? '') : '' });
  }

  const list = (
    <div className="nl-suppliers__list" ref={listRef}>
      <SummaryRow loading={loading} label={T.summary.label} items={summaryItems} />

      {canSeeMoney ? (
        <div className="nl-suppliers__owed">
          <Segmented label={T.owedFilter.label} options={owedOptions()} value={owed ? 'owed' : 'all'} onChange={(value) => params.set({ owed: value === 'owed' ? '1' : '' })} />
        </div>
      ) : null}

      {narrow ? (
        <Button variant="secondary" icon="search" className="nl-suppliers__filters-toggle" aria-expanded={filtersOpen} aria-controls="nl-suppliers-filters" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? T.filters.close : filterCount ? fill(T.filters.openCount, { count: filterCount }) : T.filters.open}
        </Button>
      ) : null}
      {!narrow || filtersOpen ? (
        <div id="nl-suppliers-filters">
          <FilterRow
            search={q}
            onSearch={(value) => params.set({ q: value })}
            searchLabel={T.filters.search}
            searchPlaceholder={T.filters.searchPlaceholder}
            dropdowns={dropdowns}
            hasFilters={hasOtherFilters}
            onClear={clearFilters}
          />
        </div>
      ) : null}

      {useCards ? (
        <SupplierCards items={cards} label={owed ? T.list.cardsLabelOwed : T.list.cardsLabel} onOpen={open} selectedKey={openId} />
      ) : (
        <Table
          caption={owed ? T.list.captionOwed : T.list.caption}
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
    <SupplierPanel
      key={openId}
      id={openId}
      company={company}
      summary={rows[openIndex]}
      canSeeMoney={canSeeMoney}
      position={openIndex >= 0 ? fill(T.panel.position, { current: openIndex + 1, total: rows.length }) : undefined}
      onClose={close}
      onPrevious={openIndex > 0 ? () => open(rows[openIndex - 1].id) : undefined}
      onNext={openIndex >= 0 && openIndex < rows.length - 1 ? () => open(rows[openIndex + 1].id) : undefined}
      onEdit={() => navigate(editAddress(location.pathname, openId))}
      onChanged={reload}
    />
  ) : null;

  return (
    <div className="nl-suppliers">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={
          <>
            <Button variant="secondary" icon="arrowDown" disabled={!ready || rows.length === 0} onClick={exportCsv}>
              {T.export}
            </Button>
            <Button icon="plus" onClick={() => navigate(addAddress)}>
              {T.addSupplier}
            </Button>
            <SupplierGroupsLink />
          </>
        }
      />
      <ListWithDetail list={list} detail={detail} />
    </div>
  );
};

export default SuppliersPage;

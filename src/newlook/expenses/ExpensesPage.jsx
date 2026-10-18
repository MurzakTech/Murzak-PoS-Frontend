import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { Chip } from '../components/Chip';
import FilterRow from '../components/FilterRow';
import Pagination from '../components/Pagination';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { ListWithDetail } from '../components/DetailPanel';
import useListParams from '../components/useListParams';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import { PageHeader, useViewportBand } from '../shell';
import { isPageLive, usePreviewRedirects } from '../redirects/live';
import { toNewAddress } from '../redirects/engine';
import fill from '../labels/fill';
import { useAppSelector } from '../../store/hooks';
import { saveTextFile } from '../../utils/saveTextFile';
import './expenses.css';
import ExpenseCards from './ExpenseCards';
import ExpensePanel from './ExpensePanel';
import ExpensesGate from './ExpensesGate';
import { useExpenseOptions, useExpensesList } from './useExpensesData';
import { ADD_PATH, csvName, dayWords, expensesCsv, filterCategories, isoDay, paidFromWords, ROW_KEY, sourceWords } from './expensesModel';
import T from './strings.expenses';

const FILTER_KEYS = ['category'];
const STATE_KEYS = ['open'];

const Receipt = ({ row }) => (row.has_receipt ? <Chip icon="receipt">{T.receiptChip}</Chip> : null);

const NoteCell = ({ row }) => (
  <span className="nl-expenses__note">
    <span>{row.note || T.noValue}</span>
    <Receipt row={row} />
  </span>
);

const CategoryCell = ({ row }) => (
  <>
    <strong>{row.category.label}</strong>
    {row.kind === 'other' ? <span className="nl-expenses__sub">{sourceWords(row)}</span> : null}
  </>
);

/**
 * The Expenses page (ticket P5-1, acceptance check AC-30): the List page pattern. A summary row of three numbers (running costs, how
 * many expenses, the biggest cost), period presets, a Category filter and a search that live in the address, the table with
 * 20 rows to a page, "Showing x of y", rows per page, Export CSV, the expense panel beside the list (a full page below 1100px) and
 * rows that become cards below 768px. The first number is the same figure Home shows as running costs for the same days; the list
 * also shows the other costs the books count (a supplier bill for power, an entry the accountant made), marked as entered another way.
 * Only an owner or a manager sees this page.
 */
const ExpensesList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const previewOn = usePreviewRedirects();
  const band = useViewportBand();
  const narrow = band === 'narrow';
  const params = useListParams({ defaultPeriod: '30d', filterKeys: FILTER_KEYS, stateKeys: STATE_KEYS });
  const { page, size, q, period, from, to, filters, state } = params;
  const category = filters.category;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listRef = useRef(null);
  const refocus = useRef('');

  const user = useAppSelector((s) => s.auth.user);
  const company = user && user.company;

  // Where things go: the redesigned page once it is live, otherwise the current screen
  const go = (path, old) => (isPageLive(path, previewOn) ? toNewAddress(path) : old);
  const billAddress = (reference) => go(`/purchases?open=${encodeURIComponent(reference || '')}`, '/purchases/invoices');

  const options = useExpenseOptions(company);
  const query = useMemo(() => ({ period, from, to, category, search: q, page, pageSize: size, company }), [period, from, to, category, q, page, size, company]);
  const { status, data, error, reload } = useExpensesList(query);
  const loading = status === 'loading' || status === 'idle';
  const ready = status === 'ready' && data;
  const rows = useMemo(() => (ready ? data.rows : []), [ready, data]);
  const total = ready ? data.total : 0;

  // A link to a page past the last one (the list got shorter) goes to the last page
  useEffect(() => {
    if (ready && rows.length === 0 && total > 0 && page > 1) params.set({ page: Math.max(1, Math.ceil(total / size)) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, rows.length, total, page, size]);

  const openKey = state.open;
  const openIndex = rows.findIndex((r) => r.key === openKey);
  const open = (key) => params.set({ open: key, page });
  const close = () => {
    refocus.current = openKey;
    params.set({ open: '', page });
  };

  // Closing the panel puts the keyboard back on the row that was open
  useEffect(() => {
    if (openKey || !refocus.current || !listRef.current) return;
    const target = Array.from(listRef.current.querySelectorAll('[data-key]')).find((el) => el.dataset.key === refocus.current);
    refocus.current = '';
    if (target && target.focus) target.focus();
  }, [openKey, rows]);

  const categoryChoices = filterCategories(options.status === 'ready' ? options.data.categories : [], rows, category);
  const dropdowns = [
    {
      key: 'category',
      label: T.filters.category,
      options: [{ value: '', label: T.filters.allCategories }, ...categoryChoices],
      value: category,
      onChange: (v) => params.set({ category: v }),
    },
  ];
  const filterCount = [q, period !== '30d', category].filter(Boolean).length;

  const exportCsv = () => {
    saveTextFile(expensesCsv(rows), csvName(period, isoDay(new Date())));
    toast.success(fill(T.exportDone, { count: rows.length }));
  };

  // ---------- Table columns ----------
  const columns = [
    { key: 'date', header: T.columns.date, nowrap: true, render: (r) => dayWords(r.date) },
    { key: 'category', header: T.columns.category, render: (r) => <CategoryCell row={r} /> },
    { key: 'note', header: T.columns.note, render: (r) => <NoteCell row={r} /> },
    { key: 'paid_from', header: T.columns.paidFrom, nowrap: true, render: (r) => paidFromWords(r) },
    { key: 'amount', header: T.columns.amount, money: true, nowrap: true },
  ];

  const emptyStates = {
    noMatch: { icon: 'search', title: T.empty.noMatchTitle, description: T.empty.noMatchText, action: { label: T.empty.clear, onClick: params.clear } },
    all: { icon: 'wallet', title: T.empty.allTitle, description: T.empty.allText, action: { label: T.addExpense, icon: 'plus', onClick: () => navigate(ADD_PATH) } },
  };

  const cards = rows.map((r) => ({
    key: r.key,
    head: r.category.label,
    aside: formatMoney(r.amount),
    lines: [dayWords(r.date), ...(r.note ? [r.note] : []), ...(r.kind === 'expense' ? [paidFromWords(r)] : [sourceWords(r)])],
    foot: r.has_receipt ? <Receipt row={r} /> : null,
  }));
  const useCards = narrow && ready && rows.length > 0;

  const top = ready ? data.summary.topCategory : null;
  const list = (
    <div className="nl-expenses__list" ref={listRef}>
      <SummaryRow
        loading={loading}
        label={T.summary.label}
        items={[
          { label: T.summary.total, value: ready ? formatMoney(data.summary.total) : '' },
          { label: T.summary.count, value: ready ? String(data.summary.count) : '' },
          { label: T.summary.top, value: top ? top.label : '', note: top ? formatMoney(top.amount) : undefined },
        ]}
      />

      {narrow ? (
        <Button variant="secondary" icon="search" className="nl-expenses__filters-toggle" aria-expanded={filtersOpen} aria-controls="nl-expenses-filters" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? T.filters.close : filterCount ? fill(T.filters.openCount, { count: filterCount }) : T.filters.open}
        </Button>
      ) : null}
      {!narrow || filtersOpen ? (
        <div id="nl-expenses-filters">
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
        <ExpenseCards items={cards} label={T.list.cardsLabel} onOpen={open} selectedKey={openKey} />
      ) : (
        <Table
          caption={T.list.caption}
          columns={columns}
          rows={rows}
          rowKey={ROW_KEY}
          loading={loading}
          error={status === 'error'}
          onRetry={reload}
          empty={params.hasFilters ? emptyStates.noMatch : emptyStates.all}
          selectedKey={openKey || undefined}
          onRowOpen={(row) => open(row.key)}
        />
      )}
      {status === 'error' && error ? <p className="nl-visually-hidden">{error}</p> : null}

      {ready && total > 0 ? <Pagination page={data.page} size={size} total={total} shown={rows.length} onPage={(next) => params.set({ page: next })} onSize={(next) => params.set({ size: next })} /> : null}
    </div>
  );

  const detail =
    openKey && openIndex >= 0 ? (
      <ExpensePanel
        key={openKey}
        row={rows[openIndex]}
        position={fill(T.panel.position, { current: openIndex + 1, total: rows.length })}
        billAddress={billAddress}
        onClose={close}
        onPrevious={openIndex > 0 ? () => open(rows[openIndex - 1].key) : undefined}
        onNext={openIndex < rows.length - 1 ? () => open(rows[openIndex + 1].key) : undefined}
      />
    ) : null;

  return (
    <div className="nl-expenses">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={
          <>
            <Button variant="secondary" icon="arrowDown" disabled={!ready || rows.length === 0} onClick={exportCsv}>
              {T.export}
            </Button>
            <Button icon="plus" onClick={() => navigate(ADD_PATH)}>
              {T.addExpense}
            </Button>
          </>
        }
      />
      <ListWithDetail list={list} detail={detail} />
    </div>
  );
};

const ExpensesPage = () => (
  <ExpensesGate>
    <ExpensesList />
  </ExpensesGate>
);

export default ExpensesPage;

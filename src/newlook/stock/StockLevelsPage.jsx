import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import FilterRow from '../components/FilterRow';
import Menu from '../components/Menu';
import Pagination from '../components/Pagination';
import Table from '../components/Table';
import useListParams from '../components/useListParams';
import { useToast } from '../components/Toast';
import { PageHeader, useViewportBand } from '../shell';
import { useAccess } from '../access/AccessProvider';
import { usePreviewRedirects, isPageLive } from '../redirects/live';
import { toNewAddress } from '../redirects/engine';
import { sellingLocations, showsWarehouseMenu } from '../till/sellingLocations';
import fill from '../labels/fill';
import { isoDay } from '../sales/salesModel';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listWarehouses, setDefaultWarehouse } from '../../store/warehouseSlice';
import { saveTextFile } from '../../utils/saveTextFile';
import './stock.css';
import CountStockFlow from './CountStockFlow';
import { EntryStatus, ExpiryLabel, LevelLabel } from './Labels';
import StockCards from './StockCards';
import StockInDialog from './StockInDialog';
import StockOutDialog from './StockOutDialog';
import BulkStockUpdateDialog from './BulkStockUpdateDialog';
import AddStoreDialog from './AddStoreDialog';
import LocationsPanel from './LocationsPanel';
import MoveStockDialog from './MoveStockDialog';
import StockTiles from './StockTiles';
import { useStockLevels } from './useStockData';
import {
  LIST_TABS,
  changeText,
  csvFor,
  csvName,
  daysLeftWords,
  entryAddress,
  formatQty,
  isMovesTab,
  movementKindWords,
  periodDates,
  qtyWithUnit,
  reorderPath,
  storeName,
  stockRoot,
  tabAddress,
  tabFromPath,
  valueText,
  visibleTabs,
  whenWords,
} from './stockModel';
import T from './strings.stock';
import { oldScreen } from '../redirects/engine';
import useBusinessFeatures from '../setup/useBusinessFeatures';
import { rowsWords } from '../components/format';

const FILTER_KEYS = ['category', 'store', 'status', 'kind', 'within'];
const STATE_KEYS = ['action', 'item'];
const WITHIN = ['30', '60', '90', '180', '365'];
const MOVE_FORM = 'move';

const Product = ({ row }) => (
  <>
    <strong>{row.item_name}</strong>
    {row.item_code && row.item_code !== row.item_name ? <span className="nl-stock-sub">{row.item_code}</span> : null}
  </>
);

/**
 * The Stock levels page (tickets P4-3 and P4-4, acceptance checks AC-25 and AC-27): the List page pattern with the tabs
 * Overview, Low stock, Movements, Count stock, and Locations, Transfers and Expiry only when the shop has them. Overview
 * shows four tiles (stock value, items, low, out of stock) counted from the very rows of the list below. Stock in and
 * Stock out or write-off are header buttons that open short forms in dialogs; Count stock is a guided count.
 */
const StockLevelsPage = () => {
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
  const root = stockRoot(location.pathname);
  const tab = tabFromPath(location.pathname);
  const listTab = LIST_TABS.includes(tab);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preset, setPreset] = useState(null);

  const user = useAppSelector((s) => s.auth.user);
  const { warehouses: allWarehouses, isLoading: warehousesLoading } = useAppSelector((s) => s.warehouse);
  const warehouses = useMemo(() => allWarehouses || [], [allWarehouses]);
  const company = user && user.company;
  const showValue = access.can('cost_of_goods');

  const reloadStores = useCallback(() => {
    if (company) dispatch(listWarehouses({ company, limit: 1000 }));
  }, [dispatch, company]);
  useEffect(() => {
    reloadStores();
  }, [reloadStores]);

  // Where things go: the redesigned page once it is live, otherwise the current screen
  const go = (path, old) => (isPageLive(path.split('?')[0], previewOn) ? toNewAddress(path) : old);

  const query = useMemo(() => {
    // Tabs that are not lists still ask the server a tiny question, to learn what the shop has (stores, expiry) and what this person may do
    if (!listTab) return { tab: 'overview', page: 1, pageSize: 1 };
    const base = { tab, search: q, store: filters.store, page, pageSize: size };
    if (tab === 'overview' || tab === 'low') return { ...base, category: filters.category, status: filters.status };
    if (tab === 'movements') return { ...base, ...periodDates(period, from, to), kind: filters.kind, status: filters.status };
    // Transfers is the Movements list with only the moves between stores
    if (tab === 'transfers') return { ...base, tab: 'movements', ...periodDates(period, from, to), kind: 'transfer', status: filters.status };
    return { ...base, status: filters.status, days: Number(filters.within) || 30 };
  }, [listTab, tab, q, filters.store, filters.category, filters.status, filters.kind, filters.within, page, size, period, from, to]);
  const { status, data, error, reload } = useStockLevels(query);
  const loading = status === 'loading';
  const ready = status === 'ready' && data;
  const rows = useMemo(() => {
    if (!ready || !listTab) return [];
    // The table needs an id for each row. An expiring line has no number of its own: a product can expire in several batches and stores.
    if (tab === 'expiry') return data.rows.map((r) => ({ ...r, id: `${r.item_code}|${r.batch_no}|${r.warehouse}` }));
    return isMovesTab(tab) ? data.rows : data.rows.map((r) => ({ ...r, id: r.item_code }));
  }, [ready, listTab, tab, data]);
  const total = ready && listTab ? data.total : 0;

  // What the shop has and what this person may do, kept while a new answer is on its way so the tabs do not blink
  const [known, setKnown] = useState({ features: null, canChange: false, role: '', categories: [] });
  useEffect(() => {
    if (ready) setKnown((k) => ({ features: data.features, canChange: data.canChange, role: data.role, categories: data.categories.length ? data.categories : k.categories }));
  }, [ready, data]);
  const features = ready ? data.features : known.features;
  const canChange = ready ? data.canChange : known.canChange;
  // Only the business owner adds a store (the server checks too)
  const canAddStore = (ready ? data.role : known.role) === 'owner';

  const storeList = useMemo(() => sellingLocations(warehouses).map((w) => ({ value: w.name, label: w.warehouse_name || w.name })), [warehouses]);
  const locationsShown = showsWarehouseMenu(warehouses) || (features ? features.locations >= 2 : false);
  // A pharmacy (it answered "What do you sell?") ADDS a reason to show Expiry; the shop's own expiry dates still show it as before
  const business = useBusinessFeatures();
  const expiryShown = Boolean(features && features.expiry) || business.features.expiry;

  const search = new URLSearchParams(location.search).toString();
  const tabs = visibleTabs({ locations: locationsShown, expiry: expiryShown, canChange, canAddStore, current: tab }).map((t) => ({ ...t, to: tabAddress(root, t.key, search) }));

  // A link to a tab this shop does not have goes to Overview
  useEffect(() => {
    // The owner's right to add a store is known only once the server has answered, so Locations waits for that answer before it sends anyone away
    const unknownLocations = ((tab === 'locations' && !canAddStore && features) || (tab === 'transfers' && (warehouses.length > 0 || features))) && !locationsShown;
    const unknownExpiry = tab === 'expiry' && features && !features.expiry && !business.features.expiry && business.status !== 'loading' && business.status !== 'stale';
    if (unknownLocations || unknownExpiry) navigate(tabAddress(root, 'overview', search), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, locationsShown, canAddStore, features, warehouses.length, business.features.expiry, business.status]);

  // A link to a page past the last one (the list got shorter) goes to the last page
  useEffect(() => {
    if (ready && listTab && rows.length === 0 && total > 0 && page > 1) params.set({ page: Math.max(1, Math.ceil(total / size)) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, listTab, rows.length, total, page, size]);

  const action = ['in', 'out', 'bulk', 'move', 'store'].includes(state.action) ? state.action : '';
  const openForm = (kind, product = null) => {
    setPreset(product);
    params.set({ action: kind, page });
  };
  const closeForm = () => {
    setPreset(null);
    params.set({ action: '', page });
  };

  const makeMain = async (store) => {
    const name = store.warehouse_name || store.name;
    try {
      await dispatch(setDefaultWarehouse({ company, warehouse: store.name })).unwrap();
      toast.success(fill(T.locations.madeMain, { store: name }));
      reloadStores();
    } catch (error) {
      toast.error(fill(T.locations.makeMainFailed, { reason: typeof error === 'string' ? error : '' }).trim());
    }
  };

  const movementsTo = (code) => `${tabAddress(root, 'movements')}?q=${encodeURIComponent(code)}`;
  const toReorder = (row) => navigate(go(reorderPath(row.item_code), '/purchases/new'));

  const exportCsv = () => {
    saveTextFile(csvFor(tab, rows, showValue), csvName(tab, isoDay(new Date())));
    toast.success(fill(T.exportDone, { rows: rowsWords(rows.length) }));
  };

  // ---------- Filters ----------
  const categoryOptions = [{ value: '', label: T.filters.allCategories }, ...(data && data.categories.length ? data.categories : known.categories).map((c) => ({ value: c, label: c }))];
  const storeOptions = [{ value: '', label: T.filters.allStores }, ...storeList];
  const dropdowns = [];
  if (tab === 'overview' || tab === 'low') {
    dropdowns.push({ key: 'category', label: T.filters.category, options: categoryOptions, value: filters.category, onChange: (v) => params.set({ category: v }) });
    if (storeList.length >= 2) dropdowns.push({ key: 'store', label: T.filters.store, options: storeOptions, value: filters.store, onChange: (v) => params.set({ store: v }) });
  } else if (tab === 'movements') {
    dropdowns.push({
      key: 'kind',
      label: T.filters.kind,
      options: [{ value: '', label: T.filters.allKinds }, ...['receipt', 'issue', 'transfer', 'entry', 'ledger'].map((k) => ({ value: k, label: T.kinds[k] }))],
      value: filters.kind,
      onChange: (v) => params.set({ kind: v }),
    });
    if (storeList.length >= 2) dropdowns.push({ key: 'store', label: T.filters.store, options: storeOptions, value: filters.store, onChange: (v) => params.set({ store: v }) });
    else dropdowns.push({ key: 'status', label: T.filters.status, options: [{ value: '', label: T.filters.allStatuses }, ...['draft', 'submitted', 'cancelled'].map((s) => ({ value: s, label: T.statuses[s] }))], value: filters.status, onChange: (v) => params.set({ status: v }) });
  } else if (tab === 'transfers') {
    dropdowns.push({ key: 'store', label: T.filters.store, options: storeOptions, value: filters.store, onChange: (v) => params.set({ store: v }) });
  } else if (tab === 'expiry') {
    dropdowns.push({ key: 'within', label: T.filters.within, options: WITHIN.map((d) => ({ value: d, label: T.windows[d] })), value: filters.within || '30', onChange: (v) => params.set({ within: v === '30' ? '' : v }) });
    dropdowns.push({ key: 'status', label: T.filters.status, options: [{ value: '', label: T.filters.allStatuses }, ...['expired', 'critical', 'soon'].map((s) => ({ value: s, label: T.expiryStates[s] }))], value: filters.status, onChange: (v) => params.set({ status: v }) });
  }
  const searchTexts = {
    movements: [T.filters.searchMovements, T.filters.searchMovementsPlaceholder],
    expiry: [T.filters.searchExpiry, T.filters.searchExpiryPlaceholder],
  }[tab] || [T.filters.search, T.filters.searchPlaceholder];
  const filterCount = [q, isMovesTab(tab) && period !== '30d', filters.category, filters.store, filters.status, filters.kind, filters.within].filter(Boolean).length;

  // ---------- Columns ----------
  const rowMenu = (row) => {
    const items = [{ label: T.rowMenu.movements, onClick: () => navigate(movementsTo(row.item_code)) }];
    if (canChange) {
      items.push(
        { label: T.rowMenu.stockIn, onClick: () => openForm('in', { item_code: row.item_code, item_name: row.item_name, unit: row.unit, qty: row.qty }) },
        { label: T.rowMenu.stockOut, onClick: () => openForm('out', { item_code: row.item_code, item_name: row.item_name, unit: row.unit, qty: row.qty }) },
        ...(locationsShown && filters.store
          ? [{ label: T.rowMenu.move, onClick: () => openForm('move', { item_code: row.item_code, item_name: row.item_name, unit: row.unit, qty: row.qty }) }]
          : []),
        { label: T.rowMenu.count, onClick: () => navigate(`${tabAddress(root, 'count')}?item=${encodeURIComponent(row.item_code)}`) },
        { label: T.rowMenu.details, onClick: () => navigate(oldScreen('/inventory/item-details')) },
        { label: T.rowMenu.discount, onClick: () => navigate(`/settings/inventory-discounts/new?item_code=${encodeURIComponent(row.item_code)}`) }
      );
    }
    return <Menu label={fill(T.rowMenu.label, { product: row.item_name })} items={items} />;
  };
  const levelCell = (r) => (
    <>
      <LevelLabel level={r.level} />
      {r.level === 'low' && r.warning_level !== null && r.warning_level !== undefined ? <span className="nl-stock-sub">{fill(T.warningAt, { level: formatQty(r.warning_level) })}</span> : null}
    </>
  );
  const overviewColumns = [
    { key: 'product', header: T.columns.product, render: (r) => <Product row={r} /> },
    { key: 'category', header: T.columns.category, render: (r) => r.category || T.noValue },
    { key: 'qty', header: T.columns.inStock, align: 'right', nowrap: true, render: (r) => qtyWithUnit(r.qty, r.unit) },
    ...(showValue ? [{ key: 'value', header: T.columns.value, money: true, nowrap: true, render: (r) => valueText(r.value) }] : []),
    { key: 'level', header: T.columns.level, render: levelCell },
    { key: 'more', header: T.columns.more, align: 'right', render: rowMenu },
  ];
  const lowColumns = [
    { key: 'product', header: T.columns.product, render: (r) => <Product row={r} /> },
    { key: 'category', header: T.columns.category, render: (r) => r.category || T.noValue },
    { key: 'qty', header: T.columns.inStock, align: 'right', nowrap: true, render: (r) => qtyWithUnit(r.qty, r.unit) },
    { key: 'level', header: T.columns.level, render: levelCell },
    ...(canChange
      ? [
          {
            key: 'reorder',
            header: T.columns.reorder,
            align: 'right',
            render: (r) => (
              <Button variant="secondary" size="small" aria-label={fill(T.reorderFor, { product: r.item_name })} onClick={() => toReorder(r)}>
                {T.reorder}
              </Button>
            ),
          },
        ]
      : []),
  ];
  const movementColumns = [
    { key: 'when', header: T.columns.when, nowrap: true, render: (r) => whenWords(r) },
    { key: 'product', header: T.columns.product, render: (r) => <Product row={r} /> },
    ...(storeList.length >= 2 ? [{ key: 'store', header: T.transfers.storeColumn, render: (r) => storeName(storeList, r.warehouse) }] : []),
    {
      key: 'type',
      header: T.columns.type,
      render: (r) => (
        <>
          {movementKindWords(r.kind)}
          {r.reason ? <span className="nl-stock-sub">{T.reasons[r.reason]}</span> : null}
        </>
      ),
    },
    { key: 'change', header: T.columns.change, align: 'right', nowrap: true, render: (r) => changeText(r.qty_change) },
    { key: 'after', header: T.columns.after, align: 'right', nowrap: true, render: (r) => (r.qty_after === null || r.qty_after === undefined ? T.noValue : formatQty(r.qty_after)) },
    { key: 'status', header: T.columns.status, render: (r) => <EntryStatus status={r.status} /> },
    {
      key: 'reference',
      header: T.columns.reference,
      render: (r) =>
        r.entry ? (
          <Link to={entryAddress(r.entry)} className="nl-stock-link" aria-label={fill(T.openEntryFor, { reference: r.entry })}>
            {r.entry}
          </Link>
        ) : (
          r.reference || T.noReference
        ),
    },
  ];
  const expiryColumns = [
    { key: 'product', header: T.columns.product, render: (r) => <Product row={r} /> },
    { key: 'batch', header: T.columns.batch, render: (r) => r.batch_no || T.expiry.noBatch },
    { key: 'qty', header: T.columns.quantity, align: 'right', nowrap: true, render: (r) => qtyWithUnit(r.qty, r.unit) },
    {
      key: 'expires',
      header: T.columns.expires,
      render: (r) => (
        <>
          {whenWords({ date: r.expiry_date, time: '' }).replace(/,\s*$/, '')}
          <span className="nl-stock-sub">{daysLeftWords(r.days_left)}</span>
        </>
      ),
    },
    { key: 'status', header: T.columns.status, render: (r) => <ExpiryLabel state={r.state} /> },
    ...(showValue ? [{ key: 'value', header: T.columns.value, money: true, nowrap: true, render: (r) => valueText(r.value) }] : []),
  ];
  const columns = { overview: overviewColumns, low: lowColumns, movements: movementColumns, transfers: movementColumns, expiry: expiryColumns }[tab];
  const captions = { overview: T.list.caption, low: T.list.captionLow, movements: T.list.captionMovements, transfers: T.transfers.tableCaption, expiry: T.list.captionExpiry };

  const emptyKey = params.hasFilters ? 'noMatch' : tab;
  const toOverview = tabAddress(root, 'overview', search);
  const emptyStates = {
    noMatch: { icon: 'search', title: T.empty.noMatchTitle, description: T.empty.noMatchText, action: { label: T.empty.clear, onClick: params.clear } },
    overview: { title: T.empty.overviewTitle, description: T.empty.overviewText, action: canChange ? { label: T.empty.overviewAction, icon: 'plus', onClick: () => openForm('in') } : undefined },
    low: { icon: 'check', title: T.empty.lowTitle, description: T.empty.lowText, action: { label: T.empty.showAll, onClick: () => navigate(toOverview) } },
    movements: { title: T.empty.movementsTitle, description: T.empty.movementsText, action: canChange ? { label: T.empty.overviewAction, icon: 'plus', onClick: () => openForm('in') } : undefined },
    transfers: { title: T.transfers.emptyTitle, description: T.transfers.emptyText, action: canChange ? { label: T.transfers.emptyAction, icon: 'arrowUp', onClick: () => openForm('move') } : undefined },
    expiry: { icon: 'check', title: T.empty.expiryTitle, description: T.empty.expiryText, action: { label: T.empty.showAll, onClick: () => navigate(toOverview) } },
  };

  // ---------- Cards (phones) ----------
  const cardsFor = () => {
    if (isMovesTab(tab)) {
      return rows.map((r) => ({
        key: r.id,
        head: r.item_name,
        aside: changeText(r.qty_change),
        lines: [...(storeList.length >= 2 ? [storeName(storeList, r.warehouse)] : []), whenWords(r), `${movementKindWords(r.kind)}${r.reason ? `: ${T.reasons[r.reason]}` : ''}`, r.entry ? <Link key="l" className="nl-stock-link" to={entryAddress(r.entry)}>{fill(T.openEntryFor, { reference: r.entry })}</Link> : r.reference || T.noReference],
        foot: <EntryStatus status={r.status} />,
      }));
    }
    if (tab === 'expiry') {
      return rows.map((r) => ({
        key: `${r.item_code}:${r.batch_no}:${r.warehouse}`,
        head: r.item_name,
        aside: qtyWithUnit(r.qty, r.unit),
        lines: [`${T.columns.batch}: ${r.batch_no || T.expiry.noBatch}`, daysLeftWords(r.days_left)],
        foot: <ExpiryLabel state={r.state} />,
      }));
    }
    return rows.map((r) => ({
      key: r.item_code,
      head: r.item_name,
      aside: qtyWithUnit(r.qty, r.unit),
      lines: [r.category || T.noValue, ...(showValue ? [valueText(r.value)] : []), ...(tab === 'low' && canChange ? [<Button key="r" variant="secondary" size="small" aria-label={fill(T.reorderFor, { product: r.item_name })} onClick={() => toReorder(r)}>{T.reorder}</Button>] : [])],
      foot: <LevelLabel level={r.level} />,
    }));
  };
  const useCards = narrow && ready && rows.length > 0;

  const tilesData = tab === 'overview' && ready ? data.tiles : null;
  const toggleLevel = (level) => params.set({ status: filters.status === level ? '' : level });

  const listBody = (
    <div className="nl-stock__list">
      {tab === 'overview' ? <StockTiles tiles={tilesData} loading={loading} showValue={showValue} active={filters.status} onPick={toggleLevel} /> : null}

      <div className="nl-stock__toolbar">
        {narrow ? (
          <Button variant="secondary" icon="search" aria-expanded={filtersOpen} aria-controls="nl-stock-filters" onClick={() => setFiltersOpen((v) => !v)}>
            {filtersOpen ? T.filters.close : filterCount ? fill(T.filters.openCount, { count: filterCount }) : T.filters.open}
          </Button>
        ) : null}
        <Button variant="secondary" icon="arrowDown" disabled={!ready || rows.length === 0} onClick={exportCsv}>
          {T.export}
        </Button>
      </div>

      {!narrow || filtersOpen ? (
        <div id="nl-stock-filters">
          <FilterRow
            {...(isMovesTab(tab) ? { period, onPeriod: (value) => params.set({ period: value }), from, to, onRange: (range) => params.set(range) } : {})}
            search={q}
            onSearch={(value) => params.set({ q: value })}
            searchLabel={searchTexts[0]}
            searchPlaceholder={searchTexts[1]}
            dropdowns={dropdowns}
            hasFilters={params.hasFilters}
            onClear={params.clear}
          />
        </div>
      ) : null}

      {useCards ? (
        <StockCards items={cardsFor()} label={{ overview: T.list.cardsLabel, low: T.list.cardsLabel, movements: T.list.cardsLabelMovements, transfers: T.transfers.cardsLabel, expiry: T.list.cardsLabelExpiry }[tab]} />
      ) : (
        <Table caption={captions[tab]} columns={columns} rows={rows} loading={loading} error={status === 'error'} onRetry={reload} empty={emptyStates[emptyKey]} />
      )}
      {status === 'error' && error ? <p className="nl-visually-hidden">{error}</p> : null}

      {tab === 'transfers' ? (
        <p className="nl-helper">
          {T.transfers.approval} <Link className="nl-stock-link" to={oldScreen('/stock-transfers')}>{T.transfers.approvalLink}</Link>
        </p>
      ) : null}

      {ready && total > 0 ? <Pagination page={data.page} size={size} total={total} shown={rows.length} onPage={(next) => params.set({ page: next })} onSize={(next) => params.set({ size: next })} /> : null}
    </div>
  );

  let body = listBody;
  if (tab === 'count') {
    body = <CountStockFlow key={state.item} stores={storeList} categories={known.categories} itemCode={state.item} rootPath={toOverview} />;
  } else if (tab === 'locations') {
    body = (
      <LocationsPanel
        stores={sellingLocations(warehouses)}
        loading={warehousesLoading && warehouses.length === 0}
        canAdd={canAddStore}
        canChange={canChange}
        narrow={narrow}
        onAdd={() => openForm('store')}
        onMakeMain={makeMain}
        onMoveFrom={(store) => {
          params.set({ store: store.name, action: MOVE_FORM });
        }}
      />
    );
  }

  return (
    <div className="nl-stock">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={
          canChange ? (
            <>
              <Button variant="secondary" icon="plus" onClick={() => openForm('in')}>
                {T.stockIn}
              </Button>
              <Button variant="secondary" icon="arrowUp" onClick={() => openForm('out')}>
                {T.stockOut}
              </Button>
              {locationsShown ? (
                <Button variant="secondary" icon="truck" onClick={() => openForm('move')}>
                  {T.moveStock}
                </Button>
              ) : null}
              <Button variant="primary" icon="upload" onClick={() => openForm('bulk')}>
                {T.bulkUpdate}
              </Button>
            </>
          ) : undefined
        }
        tabs={{ label: T.tabsLabel, tabs, value: tab }}
      />
      {body}
      {action === 'in' ? <StockInDialog open key={`in-${preset ? preset.item_code : ''}`} onClose={closeForm} stores={storeList} initialProduct={preset} showCost={showValue} onSaved={reload} /> : null}
      {action === 'out' ? <StockOutDialog open key={`out-${preset ? preset.item_code : ''}`} onClose={closeForm} stores={storeList} initialProduct={preset} onSaved={reload} /> : null}
      {action === 'move' ? (
        <MoveStockDialog open key={`move-${filters.store || ''}-${preset ? preset.item_code : ''}`} onClose={closeForm} stores={storeList} initialFrom={filters.store || ''} initialProduct={filters.store ? preset : null} onSaved={reload} />
      ) : null}
      {action === 'store' ? (
        <AddStoreDialog
          open
          onClose={closeForm}
          onSaved={() => {
            reloadStores();
            reload();
          }}
        />
      ) : null}
      {action === 'bulk' ? <BulkStockUpdateDialog open onClose={closeForm} stores={storeList} activeStore={filters.store} onSaved={reload} /> : null}
    </div>
  );
};

export default StockLevelsPage;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { StatusLabel } from '../components/Chip';
import FilterRow from '../components/FilterRow';
import Pagination from '../components/Pagination';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { ListWithDetail } from '../components/DetailPanel';
import useListParams from '../components/useListParams';
import { useToast } from '../components/Toast';
import { PageHeader, useViewportBand } from '../shell';
import { useAccess } from '../access/AccessProvider';
import { usePreviewRedirects, isPageLive } from '../redirects/live';
import { toNewAddress } from '../redirects/engine';
import fill from '../labels/fill';
import { saveTextFile } from '../../utils/saveTextFile';
import './products.css';
import CategoriesTab from './CategoriesTab';
import ProductCards from './ProductCards';
import ProductPanel from './ProductPanel';
import { useCategories, useProductByCode, useProductList } from './useProductsData';
import { categoryLabel, categoryOptions, csvFor, csvName, EDIT_FALLBACK, hasCost, isoDay, NEW_PRODUCT_PATH, productsTabs, showFromParam, showOptions, statusView, stockText, tabFromPath } from './productsModel';
import T from './strings.products';

const KEY = 'item_code';
const FILTER_KEYS = ['category', 'status'];
const STATE_KEYS = ['open'];
const count = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('en-US'));

/**
 * The Products page (tickets P4-1 and P4-2, acceptance checks AC-25, AC-26 and AC-27): the List page pattern with the tabs
 * All products and Categories, a summary row, a search and a category filter that live in the address, a table with a correct
 * "Showing x of y" and a rows-per-page box that is never blank, a product panel beside the list (a full page below 1100px),
 * Export, Import and New product in the header, and rows that become cards below 768px.
 */
const ProductsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const access = useAccess();
  const previewOn = usePreviewRedirects();
  const band = useViewportBand();
  const narrow = band === 'narrow';
  const params = useListParams({ filterKeys: FILTER_KEYS, stateKeys: STATE_KEYS });
  const { page, size, q, filters, state } = params;
  const tab = tabFromPath(location.pathname);
  const onCategories = tab === 'categories';
  const status = showFromParam(filters.status);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const listRef = useRef(null);
  const refocus = useRef('');

  const isCashier = access.tier === 'cashier';
  const canChange = !isCashier;
  const canSeeCost = access.can('cost_of_goods');

  // Where things go: the redesigned page once it is live, otherwise the current screen
  const go = (path, old) => (isPageLive(path, previewOn) ? toNewAddress(path) : old);

  const categories = useCategories();
  const query = useMemo(() => ({ search: q, category: filters.category, status, page, pageSize: size }), [q, filters.category, status, page, size]);
  const list = useProductList(query);
  const loading = list.status === 'loading';
  const ready = list.status === 'ready' && list.data;
  const rows = useMemo(() => (ready ? list.data.rows : []), [ready, list.data]);
  const total = ready ? list.data.total : 0;
  const scope = ready ? list.data.stockScope : undefined;

  // A link to a page past the last one (the list got shorter) goes to the last page
  useEffect(() => {
    if (ready && rows.length === 0 && total > 0 && page > 1) params.set({ page: Math.max(1, Math.ceil(total / size)) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, rows.length, total, page, size]);

  const openId = onCategories ? '' : state.open;
  const openIndex = rows.findIndex((r) => r.item_code === openId);
  // A shared link can open a product that is not on this page: ask for that one
  const lookup = useProductByCode(ready && openId && openIndex === -1 ? openId : '');
  const openProduct = openIndex >= 0 ? rows[openIndex] : lookup.data || null;

  const open = (code) => params.set({ open: code, page });
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

  const tabs = productsTabs();
  const filterCount = [q, filters.category, status].filter(Boolean).length;
  const hasFilters = Boolean(q || filters.category || status);

  const exportCsv = () => {
    const withCost = canSeeCost && rows.length > 0 && rows.every(hasCost);
    saveTextFile(csvFor(rows, withCost), csvName(isoDay(new Date())));
    toast.success(fill(T.exportDone, { count: rows.length }));
  };

  const dropdowns = [
    { key: 'category', label: T.filters.category, options: categoryOptions(categories.status === 'ready' ? categories.data.categories : []), value: filters.category, onChange: (v) => params.set({ category: v }) },
    { key: 'status', label: T.filters.show, options: showOptions(), value: status, onChange: (v) => params.set({ status: v }) },
  ];

  const clearFilters = () => params.set({ q: '', category: '', status: '' });

  const columns = [
    {
      key: 'product',
      header: T.columns.product,
      render: (r) => (
        <>
          <strong>{r.item_name}</strong>
          <span className="nl-products-sub">{r.item_code}</span>
        </>
      ),
    },
    { key: 'category', header: T.columns.category, render: (r) => categoryLabel(r.category) },
    { key: 'price', header: T.columns.price, money: true, nowrap: true },
    { key: 'stock', header: T.columns.stock, align: 'right', nowrap: true, render: (r) => stockText(r) },
    {
      key: 'status',
      header: T.columns.status,
      render: (r) => {
        const view = statusView(r.status);
        return <StatusLabel status={view.status}>{view.words}</StatusLabel>;
      },
    },
  ];

  const empty = hasFilters
    ? { icon: 'search', title: T.empty.noMatchTitle, description: T.empty.noMatchText, action: { label: T.empty.clear, onClick: clearFilters } }
    : { icon: 'box', title: T.empty.title, description: T.empty.text, action: { label: T.addProduct, icon: 'plus', onClick: () => navigate(NEW_PRODUCT_PATH) } };

  const useCards = narrow && ready && rows.length > 0;

  const listArea = (
    <div className="nl-products__list" ref={listRef}>
      <SummaryRow
        loading={loading && !ready}
        label={T.summary.label}
        items={[
          { label: T.summary.products, value: ready && list.data.summary ? count(list.data.summary.total) : '' },
          { label: T.summary.low, value: ready && list.data.summary ? count(list.data.summary.low_stock) : '' },
          { label: T.summary.out, value: ready && list.data.summary ? count(list.data.summary.out_of_stock) : '' },
        ]}
      />

      {narrow ? (
        <Button variant="secondary" icon="search" className="nl-products__filters-toggle" aria-expanded={filtersOpen} aria-controls="nl-products-filters" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? T.filters.close : filterCount ? fill(T.filters.openCount, { count: filterCount }) : T.filters.open}
        </Button>
      ) : null}
      {!narrow || filtersOpen ? (
        <div id="nl-products-filters">
          <FilterRow search={q} onSearch={(value) => params.set({ q: value })} searchLabel={T.filters.search} searchPlaceholder={T.filters.searchPlaceholder} dropdowns={dropdowns} hasFilters={hasFilters} onClear={clearFilters} />
        </div>
      ) : null}

      {useCards ? (
        <ProductCards rows={rows} label={T.list.cardsLabel} onOpen={open} selectedKey={openId} />
      ) : (
        <Table
          caption={T.list.caption}
          columns={columns}
          rows={rows}
          rowKey={KEY}
          loading={loading}
          error={list.status === 'error'}
          onRetry={list.reload}
          empty={empty}
          selectedKey={openId || undefined}
          onRowOpen={(row) => open(row.item_code)}
        />
      )}
      {list.status === 'error' && list.error ? <p className="nl-visually-hidden">{list.error}</p> : null}

      {ready && total > 0 ? <Pagination page={list.data.page} size={size} total={total} shown={rows.length} onPage={(next) => params.set({ page: next })} onSize={(next) => params.set({ size: next })} /> : null}
    </div>
  );

  const detail =
    openId && !onCategories && openProduct ? (
      <ProductPanel
        key={openId}
        product={openProduct}
        scope={scope}
        position={openIndex >= 0 ? fill(T.panel.position, { current: openIndex + 1, total: rows.length }) : undefined}
        canSeeCost={canSeeCost}
        canChange={canChange}
        onClose={close}
        onPrevious={openIndex > 0 ? () => open(rows[openIndex - 1].item_code) : undefined}
        onNext={openIndex >= 0 && openIndex < rows.length - 1 ? () => open(rows[openIndex + 1].item_code) : undefined}
        onAddStock={() => navigate(go(`/stock?action=in&item=${encodeURIComponent(openProduct.item_code)}`, '/inventory/material-receipt'))}
        onEdit={() => navigate(EDIT_FALLBACK)}
      />
    ) : null;

  const actions = onCategories ? (
    canChange ? (
      <Button icon="plus" onClick={() => setAddingCategory(true)}>
        {T.categories.add}
      </Button>
    ) : undefined
  ) : (
    // Export, Import and New product share one place at the right of the title (the Spec asks for Export in the header
    // and the Products row for an Import button)
    <div className="nl-products-actions">
      <Button variant="secondary" icon="arrowDown" disabled={!ready || rows.length === 0} onClick={exportCsv}>
        {T.export}
      </Button>
      {canChange ? (
        <Button variant="secondary" icon="arrowUp" onClick={() => navigate(go('/products/import', '/products/bulk-import'))}>
          {T.import}
        </Button>
      ) : null}
      {canChange ? (
        <Button icon="plus" onClick={() => navigate(NEW_PRODUCT_PATH)}>
          {T.newProduct}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="nl-products">
      <PageHeader title={T.title} subtitle={T.subtitle} actions={actions} tabs={{ label: T.tabsLabel, tabs, value: tab }} />
      {onCategories ? (
        <CategoriesTab state={categories} adding={addingCategory} onAddingChange={setAddingCategory} onChanged={categories.reload} canChange={canChange} />
      ) : (
        <ListWithDetail list={listArea} detail={detail} />
      )}
    </div>
  );
};

export default ProductsPage;

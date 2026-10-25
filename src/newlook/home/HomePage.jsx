import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { useDelayedFlag } from '../components/Skeleton';
import { PageHeader } from '../shell';
import ShopBanner from './ShopBanner';
import { useAccess } from '../access/AccessProvider';
import { isPageLive, usePreviewRedirects } from '../redirects/live';
import { toNewAddress } from '../redirects/engine';
import { HoursChart, PaymentsChart, SalesChart, TopProductsChart } from '../charts';
import S from '../strings';
import fill from '../labels/fill';
import { percentNumber } from '../components/format';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { listWarehouses } from '../../store/warehouseSlice';
import { getStaffUsers } from '../../store/staffSlice';
import './home.css';
import HeroBand from './HeroBand';
import HomeFilters from './HomeFilters';
import NeedsAttention from './NeedsAttention';
import StatTile from './StatTile';
import FirstTimePanel from './FirstTimePanel';
import SetupBanner from '../setup/SetupBanner';
import { sellingLocations } from '../till/sellingLocations';
import { MissingCostDialog, MissingCostLine } from './MissingCostList';
import useOverview from './useOverview';
import { changeInfo, dateLine, greeting, hasNoSalesYet, money, monthProgress, overviewCsv, periodFromSearch, rangeWords, todayIso } from './homeModel';

const T = S.home;

const downloadCsv = (text, name) => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** A tile's change line, or nothing when there is no earlier figure to compare (debts and stock levels are not kept day by day) */
const tileChange = (tile) => (tile && tile.previous !== null && tile.previous !== undefined ? changeInfo(tile.change_pct, T.tiles.change) : null);

/**
 * Home (Phase 2, tickets P2-3 to P2-7): the greeting and hero band, the filter row, four stat tiles, the Sales chart beside
 * Needs attention, then How customers paid, Top products and Busiest hours. Every number comes from one server call
 * (`get_overview`), which decides what each role may see; the page only draws what it is given. Each card has its own
 * loading, empty and error state, so one failing card never stops the rest.
 */
const HomePage = () => {
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const previewOn = usePreviewRedirects();
  const access = useAccess();
  const user = useAppSelector((state) => state.auth.user);
  const { warehouses } = useAppSelector((state) => state.warehouse);
  const { staffUsers } = useAppSelector((state) => state.staff);

  const { period, from, to } = periodFromSearch(search);
  const store = search.get('store') || '';
  const staff = search.get('staff') || '';
  const { status, data, reload } = useOverview({ period, from, to, store, staff });
  const [costsOpen, setCostsOpen] = useState(false);

  const company = user && user.company;
  useEffect(() => {
    if (!company) return;
    dispatch(listWarehouses({ company, limit: 1000 }));
    dispatch(getStaffUsers({ company, enabledOnly: false }));
  }, [dispatch, company]);

  // Where things go: the redesigned page once it is live, otherwise the current screen
  const go = (page, old) => (isPageLive(page, previewOn) ? toNewAddress(page) : old);
  const links = {
    sales: go('/sales', '/sales/history'),
    unpaid: go('/sales/unpaid', '/sales/history'),
    report: go('/reports', '/reports'),
    profitReport: go('/reports/profit', '/reports'),
    lowStock: go('/stock/low', '/inventory/low-stock'),
    openTill: go('/till', '/sales/pos'),
    closeTill: go('/till?action=close', '/sales/pos'),
    products: go('/products', '/products'),
    payments: go('/settings/till', '/settings/payment-methods'),
  };
  // The jobs done most often, limited to what the person may do (a cashier sells; owners and managers also add and receive)
  const shopActions = [
    { key: 'sale', label: S.home.banner.newSale, icon: 'receipt', to: links.openTill },
    ...(access.tier === 'cashier'
      ? []
      : [
          { key: 'product', label: S.home.banner.addProduct, icon: 'box', to: go('/products/new', '/products/new') },
          { key: 'receive', label: S.home.banner.receiveGoods, icon: 'truck', to: toNewAddress('/purchases/receive') },
          { key: 'expense', label: S.home.banner.addExpense, icon: 'wallet', to: toNewAddress('/expenses/new') },
        ]),
  ];
  const attentionLinks = {
    close: links.closeTill,
    reorder: (item) => go(`/purchases/new?item=${encodeURIComponent(item.item_code || '')}`, '/purchases/new'),
    pay: (item) => go(`/purchases?open=${encodeURIComponent((item && item.invoice) || '')}`, '/purchases/invoices'),
    all: links.lowStock,
  };

  const update = (changes) => {
    const next = new URLSearchParams(search);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearch(next, { replace: true });
  };

  const loading = status === 'loading';
  const showSkeletons = useDelayedFlag(loading);
  const errors = (data && data.errors) || {};
  const failed = (path, value) => value === null || Boolean(errors[path]);
  const canProfit = access.can('profit');
  const canOwed = access.can('money_owed');

  const tiles = (data && data.tiles) || {};
  const charts = (data && data.charts) || {};
  const periodInfo = (data && data.period) || {};
  const progress = periodInfo.days_of_data !== undefined && Number(periodInfo.days_of_data) < 7 ? monthProgress(periodInfo.to) : null;
  const sparkOf = (tile) => (tile && Array.isArray(tile.spark) ? tile.spark : []);

  const salesPoints = charts.sales || [];
  const metrics = canProfit && salesPoints.some((p) => p.profit !== undefined && p.profit !== null) ? ['revenue', 'profit', 'count'] : ['revenue', 'count'];

  const stores = sellingLocations(warehouses).map((w) => ({ value: w.name, label: w.warehouse_name || w.name }));
  const staffList = access.tier === 'cashier' ? [] : (staffUsers || []).map((s) => ({ value: s.name || s.email, label: s.full_name || s.name || s.email }));
  const range = rangeWords(period, from, to);
  const firstName = user && (user.first_name || (user.full_name && user.full_name.split(' ')[0]) || '');

  const exportCsv = () => data && downloadCsv(overviewCsv(data, { canProfit }), fill(T.filters.exportName, { period, date: todayIso() }));

  const cardState = (path, value) => (loading ? 'loading' : failed(path, value) ? 'error' : 'ready');

  if (status === 'error') {
    return (
      <div className="nl-home">
        <PageHeader title={greeting(firstName)} subtitle={dateLine()} />
        <EmptyState icon="alert" tone="error" title={T.states.pageErrorTitle} description={T.states.pageErrorText} action={{ label: T.states.retry, onClick: reload }} />
      </div>
    );
  }

  const firstTime = !loading && hasNoSalesYet(data);
  const tileList = [];
  if (!firstTime) {
    tileList.push(
      <StatTile
        key="revenue"
        icon="chart"
        label={T.tiles.revenue}
        loading={loading}
        failed={!loading && failed('tiles.revenue', tiles.revenue)}
        onRetry={reload}
        value={tiles.revenue ? money(tiles.revenue.value) : ''}
        detail={tiles.revenue && tiles.revenue.gross_total && Number(tiles.revenue.gross_total) > Number(tiles.revenue.value) + 0.5 ? fill(T.tiles.withoutVat, { amount: money(tiles.revenue.gross_total) }) : null}
        change={tileChange(tiles.revenue)}
        spark={sparkOf(tiles.revenue)}
        progress={progress}
        to={links.sales}
        linkLabel={T.tiles.openSales}
      />
    );
    // Drawn only for a person whose role allows it, as well as when the server sent it (the server already leaves it out for a cashier)
    if (canProfit && (loading || tiles.net_profit !== undefined)) {
      const np = tiles.net_profit;
      tileList.push(
        <StatTile
          key="profit"
          icon="wallet"
          label={T.tiles.netProfit}
          loading={loading}
          failed={!loading && failed('tiles.net_profit', np)}
          onRetry={reload}
          value={np ? money(np.value) : ''}
          detail={np ? [fill(T.tiles.margin, { pct: percentNumber(np.margin_pct) }), np.estimated ? T.tiles.estimated : null].filter(Boolean).join('. ') : null}
          change={tileChange(np)}
          spark={sparkOf(np)}
          progress={progress}
          to={links.profitReport}
          linkLabel={T.tiles.openReport}
          footer={np && canProfit ? <MissingCostLine count={np.uncosted_products} onOpen={() => setCostsOpen(true)} /> : null}
        />
      );
    }
    if (canOwed && (loading || tiles.money_owed !== undefined)) {
      const mo = tiles.money_owed;
      tileList.push(
        <StatTile
          key="owed"
          icon="users"
          label={T.tiles.moneyOwed}
          loading={loading}
          failed={!loading && failed('tiles.money_owed', mo)}
          onRetry={reload}
          value={mo ? money(mo.amount) : ''}
          detail={mo ? (mo.customers === 0 ? T.tiles.nobodyOwes : mo.customers === 1 ? T.tiles.oneCustomer : fill(T.tiles.customers, { count: mo.customers })) : null}
          change={tileChange(mo)}
          goodWhen="down"
          spark={sparkOf(mo)}
          to={links.unpaid}
          linkLabel={T.tiles.openUnpaid}
        />
      );
    }
    const ls = tiles.low_stock;
    tileList.push(
      <StatTile
        key="stock"
        icon="box"
        label={T.tiles.lowStock}
        loading={loading}
        failed={!loading && failed('tiles.low_stock', ls)}
        onRetry={reload}
        value={ls ? (ls.count === 1 ? T.tiles.oneItem : fill(T.tiles.items, { count: ls.count })) : ''}
        detail={ls ? (ls.out_of_stock > 0 ? fill(T.tiles.outOfStock, { count: ls.out_of_stock }) : T.tiles.allStocked) : null}
        change={tileChange(ls)}
        goodWhen="down"
        spark={sparkOf(ls)}
        to={links.lowStock}
        linkLabel={T.tiles.openLowStock}
      />
    );
  }

  return (
    <div className={`nl-home${loading && !showSkeletons ? ' is-waiting' : ''}`}>
      <PageHeader
        title={greeting(firstName)}
        subtitle={
          <>
            <span>{dateLine()}</span>
            {data && data.updated_at ? <span className="nl-home__updated">{fill(T.updated, { time: data.updated_at })}</span> : null}
          </>
        }
        actions={
          <Button variant="secondary" size="small" onClick={reload}>
            {T.refresh}
          </Button>
        }
      />

      <ShopBanner actions={shopActions} canBrand={access.tier === 'owner'} brandTo={toNewAddress('/settings/brand')} />

      <SetupBanner />

      <HeroBand hero={data ? data.hero : null} today={todayIso()} loading={loading} failed={!loading && failed('hero', data && data.hero)} onRetry={reload} openTo={links.openTill} closeTo={links.closeTill} />

      {firstTime ? (
        <FirstTimePanel
          steps={[
            { key: 'products', to: links.products },
            { key: 'till', to: links.openTill },
            { key: 'sale', to: links.openTill },
            { key: 'payments', to: links.payments },
          ]}
        />
      ) : (
        <>
          <HomeFilters
            period={period}
            from={from}
            to={to}
            onPeriod={(value) => update({ period: value === '30d' ? '' : value, from: '', to: '' })}
            onRange={({ from: f, to: t }) => update({ period: 'custom', from: f, to: t })}
            store={store}
            onStore={(value) => update({ store: value })}
            stores={stores}
            staff={staff}
            onStaff={(value) => update({ staff: value })}
            staffList={staffList}
            onExport={exportCsv}
            canExport={Boolean(data)}
          />

          <div className="nl-home__tiles" style={{ '--tiles': tileList.length }}>
            {tileList}
          </div>

          <div className="nl-home__row">
            <div className="nl-home__sales">
              <SalesChart
                points={salesPoints}
                daysOfData={periodInfo.days_of_data}
                rangeLabel={range}
                metrics={metrics}
                state={cardState('charts.sales', charts.sales)}
                onRetry={reload}
              />
            </div>
            <NeedsAttention
              items={data ? (data.attention || []).filter((item) => canOwed || !['customer_overdue', 'supplier_bill_due'].includes(item.type)) : []}
              links={attentionLinks}
              shop={user && user.company}
              loading={loading}
              failed={!loading && failed('attention', data && data.attention)}
              onRetry={reload}
            />
          </div>

          <div className="nl-home__charts">
            <PaymentsChart rows={charts.payments || []} rangeLabel={range} state={cardState('charts.payments', charts.payments)} onRetry={reload} />
            <TopProductsChart
              rows={charts.top_products || []}
              rangeLabel={range}
              state={cardState('charts.top_products', charts.top_products)}
              onRetry={reload}
              onSeeAll={() => navigate(links.products)}
              onSelect={(row) => navigate(`${links.products}${links.products.includes('?') ? '&' : '?'}search=${encodeURIComponent(row.name || '')}`)}
            />
            <HoursChart rows={charts.busiest_hours || []} rangeLabel={range} state={cardState('charts.busiest_hours', charts.busiest_hours)} onRetry={reload} />
          </div>
        </>
      )}

      {canProfit && canOwed ? (
        <MissingCostDialog
          open={costsOpen}
          onClose={() => setCostsOpen(false)}
          range={periodInfo.from ? { from: periodInfo.from, to: periodInfo.to } : undefined}
          productsTo={(p) => `${links.products}${links.products.includes('?') ? '&' : '?'}search=${encodeURIComponent(p.item_name || p.item_code)}`}
        />
      ) : null}
    </div>
  );
};

export default HomePage;

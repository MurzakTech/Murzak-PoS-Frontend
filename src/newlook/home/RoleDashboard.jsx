import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import { PageHeader } from '../shell';
import { useAccess } from '../access/AccessProvider';
import { isPageLive, usePreviewRedirects } from '../redirects/live';
import { toNewAddress } from '../redirects/engine';
import { SalesChart, TopProductsChart } from '../charts';
import S from '../strings';
import fill from '../labels/fill';
import { useAppSelector } from '../../store/hooks';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { usePurchasesList } from '../purchases/usePurchasesData';
import './home.css';
import HeroBand from './HeroBand';
import NeedsAttention from './NeedsAttention';
import ShopBanner from './ShopBanner';
import StatTile from './StatTile';
import useOverview from './useOverview';
import { attentionFor, dashboardFor, MODULES } from './roleDashboardModel';
import { changeInfo, dateLine, greeting, money, rangeWords, todayIso } from './homeModel';

const T = S.home;
const R = S.home.role;
const PERIOD = '30d';

const tileChange = (tile) => (tile && tile.previous !== null && tile.previous !== undefined ? changeInfo(tile.change_pct, T.tiles.change) : null);

/** A row of buttons for the jobs this role may do inside a panel */
const Actions = ({ items }) =>
  items.length ? (
    <div className="nl-role__actions">
      {items.map((a) => (
        <Button key={a.key} as={RouterLink} to={a.to} size="small" variant={a.primary ? 'primary' : 'secondary'} icon={a.icon}>
          {a.label}
        </Button>
      ))}
    </div>
  ) : null;

/** A small figure with a label, drawn in the same tinted tile as the Home figures */
const Figure = ({ icon, label, value, note }) => (
  <div className="nl-hero__figure">
    <span className="nl-chip-icon" aria-hidden="true">
      <Icon name={icon} />
    </span>
    <dt className="nl-hero__label">{label}</dt>
    <dd className="nl-hero__value">{value}</dd>
    {note ? <dd className="nl-hero__note">{note}</dd> : null}
  </div>
);

/**
 * Home for everyone who is not an owner: the same look as the owner's Home, but only the panels for the modules their roles open (selling,
 * buying, stock, money, reports) and a list of every module they can open. The panels come from dashboardFor, so a role added later, or a
 * person holding two roles, gets the right Home with no new code. One failing card never stops the rest, and when the figures cannot be
 * loaded at all the modules and the buying figures are still there.
 */
const RoleDashboard = () => {
  const navigate = useNavigate();
  const previewOn = usePreviewRedirects();
  const access = useAccess();
  const { hasAccess } = useRoleAccess();
  const user = useAppSelector((state) => state.auth.user);

  const dash = dashboardFor({ hasAccess, can: access.can });
  const has = (panel) => dash.panels.includes(panel);
  const { status, data, reload } = useOverview({ period: PERIOD, from: '', to: '', store: '', staff: '' });
  const purchases = usePurchasesList({ tab: 'all', period: PERIOD, pageSize: 1 }, has('buy'));

  const loading = status === 'loading';
  const overviewFailed = status === 'error';
  const tiles = (data && data.tiles) || {};
  const charts = (data && data.charts) || {};
  const periodInfo = (data && data.period) || {};
  const errors = (data && data.errors) || {};
  const cardState = (path, value) => (loading ? 'loading' : value === null || errors[path] ? 'error' : 'ready');
  const go = (page, old) => (isPageLive(page, previewOn) ? toNewAddress(page) : old || page);
  const firstName = user && (user.first_name || (user.full_name && user.full_name.split(' ')[0]) || '');
  const range = rangeWords(PERIOD);

  const L = (key) => R.modules[key];
  const link = (module) => {
    const m = MODULES.find((x) => x.key === module);
    return m.old ? go(m.page, m.old) : toNewAddress(m.page);
  };
  const a = dash.actions;
  // The jobs of a panel (receive goods, count stock) sit in that panel; the banner holds the two that belong to no panel
  const quick = [
    a.sale && { key: 'sale', label: T.banner.newSale, icon: 'receipt', to: go('/till', '/sales/pos') },
    a.expense && { key: 'expense', label: T.banner.addExpense, icon: 'wallet', to: toNewAddress('/expenses/new') },
  ].filter(Boolean);

  const attention = attentionFor(data ? data.attention : [], dash);
  const attentionLinks = {
    close: go('/till?action=close', '/sales/pos'),
    reorder: (item) => go(`/purchases/new?item=${encodeURIComponent(item.item_code || '')}`, '/purchases/new'),
    pay: (item) => go(`/purchases?open=${encodeURIComponent((item && item.invoice) || '')}`, '/purchases/invoices'),
    all: has('stock') ? go('/stock/low', '/inventory/low-stock') : null,
  };

  const summary = purchases.status === 'ready' ? purchases.data.summary : null;
  const stockTile = tiles.low_stock;
  const owedTile = tiles.money_owed;

  const panels = {
    sell: (
      <section key="sell" className="nl-role__panel" aria-label={R.today.title}>
        <HeroBand
          hero={data ? data.hero : null}
          today={todayIso()}
          loading={loading}
          failed={!loading && !overviewFailed && (data ? data.hero === null || Boolean(errors.hero) : false)}
          onRetry={reload}
          openTo={go('/till', '/sales/pos')}
          closeTo={go('/till?action=close', '/sales/pos')}
          showTill={a.sale}
        />
        {tiles.revenue ? (
          <div className="nl-home__tiles" style={{ '--tiles': 3 }}>
            <StatTile icon="chart" label={T.tiles.revenue} value={money(tiles.revenue.value)} change={tileChange(tiles.revenue)} to={link('sales')} linkLabel={T.tiles.openSales} />
          </div>
        ) : null}
      </section>
    ),
    buy: (
      <Card key="buy" title={R.buy.title} small actions={<RouterLink to={link('purchases')} className="nl-link">{R.buy.open}</RouterLink>}>
        {purchases.status === 'error' ? (
          <p className="nl-error" role="alert">
            <Icon name="alert" />
            <span>{R.buy.failed}</span>
          </p>
        ) : (
          <dl className="nl-hero__figures nl-role__figures">
            <Figure icon="truck" label={R.buy.ordersOpen} value={summary ? summary.orders_open : '–'} />
            {dash.canOwed ? <Figure icon="wallet" label={R.buy.billsUnpaid} value={summary ? money(summary.bills_unpaid) : '–'} /> : null}
            <Figure icon="undo" label={R.buy.returned} value={summary ? money(summary.returned) : '–'} />
          </dl>
        )}
        <Actions
          items={[
            a.receive && { key: 'r', label: R.buy.receive, icon: 'truck', to: toNewAddress('/purchases/receive'), primary: true },
            a.order && { key: 'o', label: R.buy.newOrder, icon: 'plus', to: toNewAddress('/purchases/new') },
          ].filter(Boolean)}
        />
      </Card>
    ),
    stock: (
      <Card key="stock" title={R.stock.title} small actions={<RouterLink to={link('stock')} className="nl-link">{R.stock.open}</RouterLink>}>
        <div className="nl-home__tiles" style={{ '--tiles': 3 }}>
          <StatTile
            icon="box"
            label={R.stock.lowStock}
            loading={loading}
            failed={!loading && (overviewFailed || stockTile === null || Boolean(errors['tiles.low_stock']))}
            onRetry={reload}
            value={stockTile ? (stockTile.count === 1 ? R.stock.oneItem : fill(R.stock.items, { count: stockTile.count })) : ''}
            detail={stockTile ? (stockTile.out_of_stock > 0 ? fill(T.tiles.outOfStock, { count: stockTile.out_of_stock }) : R.stock.allStocked) : null}
            to={go('/stock/low', '/inventory/low-stock')}
            linkLabel={T.tiles.openLowStock}
          />
        </div>
        <Actions
          items={[
            a.count && { key: 'c', label: R.stock.count, icon: 'layers', to: toNewAddress('/stock/count') },
            a.transfers && { key: 't', label: R.stock.transfers, icon: 'truck', to: toNewAddress('/stock/transfers') },
            a.expiry && { key: 'e', label: R.stock.expiry, icon: 'clock', to: toNewAddress('/stock/expiry') },
          ].filter(Boolean)}
        />
      </Card>
    ),
    money: (
      <Card key="money" title={R.money.title} small>
        {dash.canOwed && owedTile ? (
          <div className="nl-home__tiles" style={{ '--tiles': 3 }}>
            <StatTile
              icon="users"
              label={R.money.owed}
              value={money(owedTile.amount)}
              detail={owedTile.customers === 0 ? T.tiles.nobodyOwes : owedTile.customers === 1 ? T.tiles.oneCustomer : fill(T.tiles.customers, { count: owedTile.customers })}
              goodWhen="down"
              to={go('/sales/unpaid', '/sales/history')}
              linkLabel={T.tiles.openUnpaid}
            />
          </div>
        ) : null}
        <Actions
          items={[
            a.owing && { key: 'w', label: R.money.owing, icon: 'users', to: go('/sales/unpaid', '/sales/history') },
            a.expense && { key: 'x', label: R.money.expenses, icon: 'wallet', to: toNewAddress('/expenses/new') },
            dash.modules.includes('reports') && { key: 'm', label: R.money.reports, icon: 'chart', to: link('reports') },
          ].filter(Boolean)}
        />
      </Card>
    ),
    insight: (
      <section key="insight" className="nl-role__charts" aria-label={R.insight.title}>
        <SalesChart points={charts.sales || []} daysOfData={periodInfo.days_of_data} rangeLabel={range} metrics={['revenue', 'count']} state={cardState('charts.sales', charts.sales)} onRetry={reload} />
        <TopProductsChart
          rows={charts.top_products || []}
          rangeLabel={range}
          state={cardState('charts.top_products', charts.top_products)}
          onRetry={reload}
          onSeeAll={() => navigate(link('products'))}
          onSelect={(row) => navigate(`${link('products')}${link('products').includes('?') ? '&' : '?'}search=${encodeURIComponent(row.name || '')}`)}
        />
      </section>
    ),
  };

  const subtitle = (
    <>
      <span>{dateLine()}</span>
      <span className="nl-home__updated">{fill(R.focusLabel, { focus: R.focus[dash.focus] })}</span>
    </>
  );

  if (dash.modules.length === 0) {
    return (
      <div className="nl-home">
        <PageHeader title={greeting(firstName)} subtitle={dateLine()} />
        <EmptyState icon="info" title={R.noAccessTitle} description={fill(R.noAccessText, { role: access.label || '–' })} />
      </div>
    );
  }

  return (
    <div className="nl-home nl-role">
      <PageHeader
        title={greeting(firstName)}
        subtitle={subtitle}
        actions={
          <Button variant="secondary" size="small" onClick={reload}>
            {T.refresh}
          </Button>
        }
      />

      <ShopBanner actions={quick} />

      {overviewFailed ? (
        <p className="nl-receive-note" role="status">
          <Icon name="alert" /> {R.stale}
        </p>
      ) : null}

      {dash.panels.filter((key) => !overviewFailed || key === 'buy' || key === 'stock' || key === 'money').map((key) => panels[key])}

      {!overviewFailed && dash.attention ? (
        <NeedsAttention items={attention} links={attentionLinks} shop={user && user.company} loading={loading} failed={false} onRetry={reload} />
      ) : null}

      <Card title={R.modulesTitle} subtitle={R.modulesHelp} small>
        <nav className="nl-role__modules" aria-label={R.modulesLabel}>
          {dash.modules.map((key) => {
            const m = MODULES.find((x) => x.key === key);
            return (
              <RouterLink key={key} to={link(key)} className="nl-role__module">
                <span className="nl-chip-icon" aria-hidden="true">
                  <Icon name={m.icon} />
                </span>
                <span className="nl-role__module-text">
                  <strong>{L(key).label}</strong>
                  <span>{L(key).text}</span>
                </span>
              </RouterLink>
            );
          })}
        </nav>
      </Card>
    </div>
  );
};

export default RoleDashboard;

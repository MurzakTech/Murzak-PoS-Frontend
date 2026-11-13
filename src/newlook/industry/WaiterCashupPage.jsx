import React, { useCallback, useEffect, useState } from 'react';
import { getWaiterCashup } from '../../api/industryApi';
import { getUserCompany } from '../../utils/getUserCompany';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { PageHeader } from '../shell';
import { isoDay, modesLine } from './industryPagesModel';
import T from './strings.industry';
import './industry.css';

const W = T.cashup;

const COLUMNS = [
  { key: 'waiter', header: W.columns.waiter },
  { key: 'bills', header: W.columns.bills, align: 'right' },
  { key: 'sales', header: W.columns.sales, money: true },
  { key: 'cash_to_hand_over', header: W.columns.cash, money: true },
  { key: 'by_mode', header: W.columns.byMode, hideOnPhone: true, render: (r) => modesLine(r.by_mode, formatMoney) },
  { key: 'voids', header: W.columns.voids, align: 'right', render: (r) => (r.voids ? fill(W.voidsValue, { count: r.voids, amount: formatMoney(r.voids_amount) }) : W.noVoids) },
];

/**
 * The waiter cash-up (restaurant and bar stores): for one day, each waiter's bills and sales, the cash they must hand
 * over (cash taken less change given) and the items they had removed after the kitchen had them. Owners and managers
 * only (the server checks).
 */
const WaiterCashupPage = () => {
  const company = getUserCompany() || undefined;
  const [day, setDay] = useState(() => isoDay(new Date()));
  const [shown, setShown] = useState(day);
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const load = useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));
    getWaiterCashup({ company, date: shown })
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((e) => !cancelled && setState({ status: 'error', data: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [company, shown]);

  useEffect(() => load(), [load]);

  const waiters = state.data?.waiters || [];
  const totals = state.data?.totals || {};

  return (
    <div className="nl-industry">
      <PageHeader title={W.title} subtitle={W.subtitle} />
      <form
        className="nl-industry__filters"
        onSubmit={(e) => {
          e.preventDefault();
          if (day) setShown(day);
        }}
      >
        <Field label={W.date} kind="date" value={day} onChange={setDay} />
        <Button type="submit" disabled={!day}>
          {W.show}
        </Button>
      </form>
      {state.status === 'error' ? (
        <EmptyState icon="alert" tone="error" title={W.errorTitle} description={state.error} action={{ label: W.retry, onClick: load }} />
      ) : (
        <>
          <SummaryRow
            loading={state.status === 'loading'}
            items={[
              { label: W.columns.sales, value: formatMoney(totals.sales || 0) },
              { label: W.columns.cash, value: formatMoney(totals.cash_to_hand_over || 0) },
              { label: W.columns.voids, value: totals.voids ? fill(W.voidsValue, { count: totals.voids, amount: formatMoney(totals.voids_amount) }) : W.noVoids },
            ]}
          />
          <Table
            caption={W.tableLabel}
            columns={COLUMNS}
            rows={waiters.map((w) => ({ ...w, id: w.waiter }))}
            loading={state.status === 'loading'}
            empty={{ title: W.emptyTitle, description: W.emptyText }}
          />
          <p className="nl-industry-note">{W.howCash}</p>
        </>
      )}
    </div>
  );
};

export default WaiterCashupPage;

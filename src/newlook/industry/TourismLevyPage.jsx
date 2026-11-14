import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getTourismLevy } from '../../api/industryApi';
import { getUserCompany } from '../../utils/getUserCompany';
import EmptyState from '../components/EmptyState';
import Select from '../components/Select';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { PageHeader } from '../shell';
import { recentMonths } from './industryPagesModel';
import T from './strings.industry';
import './industry.css';

const W = T.levy;

const COLUMNS = [
  { key: 'name', header: W.columns.store },
  { key: 'sales_before_vat', header: W.columns.salesBeforeVat, money: true },
  { key: 'levy_before_vat', header: W.columns.levyBeforeVat, money: true },
  { key: 'sales_with_vat', header: W.columns.salesWithVat, money: true, hideOnPhone: true },
  { key: 'levy_with_vat', header: W.columns.levyWithVat, money: true },
];

/**
 * The tourism levy (restaurant and bar stores): for one month, each store's sales and 2% of them, before and after VAT,
 * because which base applies is for the owner to confirm with the Tourism Fund. Owners and managers only (the server checks).
 */
const TourismLevyPage = () => {
  const company = getUserCompany() || undefined;
  const months = useMemo(() => recentMonths(), []);
  const [month, setMonth] = useState(months[0].value);
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const load = useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));
    getTourismLevy({ company, month })
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((e) => !cancelled && setState({ status: 'error', data: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [company, month]);

  useEffect(() => load(), [load]);

  const stores = state.data?.stores || [];
  const totals = state.data?.totals || {};
  const others = state.data?.not_levied || [];

  return (
    <div className="nl-industry">
      <PageHeader title={W.title} subtitle={W.subtitle} />
      <div className="nl-industry__filters">
        <Select id="levy-month" label={W.month} options={months} value={month} onChange={setMonth} />
      </div>
      <p className="nl-industry-note nl-industry-note--warning">{W.basisNote}</p>
      {state.status === 'error' ? (
        <EmptyState icon="alert" tone="error" title={W.errorTitle} description={state.error} action={{ label: W.retry, onClick: load }} />
      ) : (
        <>
          <SummaryRow
            loading={state.status === 'loading'}
            items={[
              { label: W.totalBefore, value: formatMoney(totals.levy_before_vat || 0) },
              { label: W.totalWith, value: formatMoney(totals.levy_with_vat || 0) },
            ]}
          />
          <Table
            caption={W.tableLabel}
            columns={COLUMNS}
            rows={stores.map((s) => ({ ...s, id: s.warehouse || s.name }))}
            loading={state.status === 'loading'}
            empty={{ title: W.emptyTitle, description: W.emptyText }}
          />
          {others.length ? <p className="nl-industry-note">{fill(W.notLevied, { stores: others.map((o) => o.name).join(', ') })}</p> : null}
        </>
      )}
    </div>
  );
};

export default TourismLevyPage;

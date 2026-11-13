import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getPlatformSales } from '../../api/industryApi';
import { getUserCompany } from '../../utils/getUserCompany';
import EmptyState from '../components/EmptyState';
import Select from '../components/Select';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { formatMoney } from '../components/format';
import { PageHeader } from '../shell';
import { recentMonths } from './industryPagesModel';
import PayoutSection from './PayoutSection';
import { getRestaurantSettings } from '../../api/industryApi';
import T from './strings.industry';
import './industry.css';

const W = T.platformsReport;

const COLUMNS = [
  { key: 'channel', header: W.columns.channel },
  { key: 'orders', header: W.columns.orders, align: 'right' },
  { key: 'sales', header: W.columns.sales, money: true },
  { key: 'commission_percent', header: W.columns.commissionPercent, align: 'right', hideOnPhone: true, render: (r) => `${r.commission_percent}%` },
  { key: 'commission', header: W.columns.commission, money: true },
  { key: 'expected_payout', header: W.columns.payout, money: true },
];

/**
 * Delivery platforms (restaurant and bar stores): a month's orders taken through each platform, the commission it keeps
 * (from the percentages in the restaurant settings) and the payout to expect. Owners and managers only (the server checks).
 */
const PlatformSalesPage = () => {
  const company = getUserCompany() || undefined;
  const months = useMemo(() => recentMonths(), []);
  const [month, setMonth] = useState(months[0].value);
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const load = useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));
    getPlatformSales({ company, month })
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((e) => !cancelled && setState({ status: 'error', data: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [company, month]);

  useEffect(() => load(), [load]);

  // The platforms a payout can be matched for: those in the settings, and any with sales this month
  const [settingsPlatforms, setSettingsPlatforms] = useState([]);
  useEffect(() => {
    let live = true;
    getRestaurantSettings(company)
      .then((s) => live && setSettingsPlatforms(((s && s.platforms) || []).map((p) => p.name)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [company]);

  const rows = state.data?.platforms || [];
  const totals = state.data?.totals || {};

  return (
    <div className="nl-industry">
      <PageHeader title={W.title} subtitle={W.subtitle} />
      <div className="nl-industry__filters">
        <Select id="platform-month" label={W.month} options={months} value={month} onChange={setMonth} />
      </div>
      {state.status === 'error' ? (
        <EmptyState icon="alert" tone="error" title={W.errorTitle} description={state.error} action={{ label: W.retry, onClick: load }} />
      ) : (
        <>
          <SummaryRow
            loading={state.status === 'loading'}
            items={[
              { label: W.totalSales, value: formatMoney(totals.sales || 0) },
              { label: W.totalCommission, value: formatMoney(totals.commission || 0) },
              { label: W.totalPayout, value: formatMoney(totals.expected_payout || 0) },
            ]}
          />
          <Table caption={W.tableLabel} columns={COLUMNS} rows={rows.map((r) => ({ ...r, id: r.channel }))} loading={state.status === 'loading'} empty={{ title: W.emptyTitle, description: W.emptyText }} />
          <p className="nl-industry-note">{W.note}</p>
        </>
      )}
      {state.status === 'error' ? null : (
        <PayoutSection company={company} platforms={[...new Set([...settingsPlatforms, ...rows.map((r) => r.channel)])]} />
      )}
    </div>
  );
};

export default PlatformSalesPage;

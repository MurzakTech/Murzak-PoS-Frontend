import React, { useCallback, useEffect, useState } from 'react';
import { checkPayout, listPayouts, listUnsettledOrders, recordPayout } from '../../api/industryApi';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import Select from '../components/Select';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { isoDay } from './industryPagesModel';
import T from './strings.industry';

const W = T.payouts;

const HISTORY = [
  { key: 'date', header: W.columns.date, nowrap: true },
  { key: 'platform', header: W.columns.platform },
  { key: 'statement_ref', header: W.columns.reference, hideOnPhone: true },
  { key: 'orders', header: W.columns.orders, align: 'right' },
  { key: 'sales', header: W.columns.sales, money: true, hideOnPhone: true },
  { key: 'received', header: W.columns.received, money: true },
  { key: 'difference', header: W.columns.difference, money: true },
];

const differenceLine = (difference) => {
  if (difference > 0.005) return fill(W.differenceMore, { amount: formatMoney(difference) });
  if (difference < -0.005) return fill(W.differenceLess, { amount: formatMoney(-difference) });
  return W.differenceNone;
};

/**
 * Matching a delivery platform's payout against its orders: paste the statement's order numbers and the amount paid,
 * check what matches and what the platform kept against the commission agreed, then record it so no order is paid out
 * twice. Shown under the Delivery platforms report. Owners and managers only (the server checks).
 *
 *   platforms   the platform names from the restaurant settings and the month's report
 *   api         injectable for tests; defaults to the server calls
 */
const DEFAULT_API = { checkPayout, listPayouts, listUnsettledOrders, recordPayout };

const PayoutSection = ({ company, platforms = [], api = DEFAULT_API }) => {
  const [platform, setPlatform] = useState(platforms[0] || '');
  const [refs, setRefs] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(() => isoDay(new Date()));
  const [statementRef, setStatementRef] = useState('');
  const [unsettled, setUnsettled] = useState(null);
  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState({ loading: true, rows: [] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });

  useEffect(() => {
    if (!platform && platforms[0]) setPlatform(platforms[0]);
  }, [platform, platforms]);

  const loadHistory = useCallback(() => {
    api
      .listPayouts({ company })
      .then((data) => setHistory({ loading: false, rows: data?.payouts || [] }))
      .catch(() => setHistory({ loading: false, rows: [] }));
  }, [api, company]);
  useEffect(() => loadHistory(), [loadHistory]);

  useEffect(() => {
    if (!platform) return undefined;
    let live = true;
    setUnsettled(null);
    api
      .listUnsettledOrders({ platform, company })
      .then((data) => live && setUnsettled(data))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [api, company, platform]);

  const edit = (setter) => (value) => {
    setter(value);
    setPlan(null);
    setMessage({ text: '', error: false });
  };

  const run = async (work) => {
    setBusy(true);
    setMessage({ text: '', error: false });
    try {
      await work();
    } catch (e) {
      setMessage({ text: e.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const check = () =>
    run(async () => {
      setPlan(await api.checkPayout({ platform, orderRefs: refs, amount: Number(amount), company }));
    });

  const record = () =>
    run(async () => {
      const result = await api.recordPayout({ platform, orderRefs: refs, amount: Number(amount), payoutDate: day, statementRef, company });
      setMessage({ text: fill(W.recorded, { count: (result?.matched || []).length }), error: false });
      setPlan(null);
      setRefs('');
      setAmount('');
      setStatementRef('');
      loadHistory();
      const fresh = await api.listUnsettledOrders({ platform, company }).catch(() => null);
      if (fresh) setUnsettled(fresh);
    });

  const figures = plan?.summary;
  const ready = platform && refs.trim() && Number(amount) > 0;

  return (
    <section className="nl-industry__payouts" aria-label={W.title}>
      <Card title={W.title} subtitle={W.subtitle}>
        <Select id="payout-platform" label={W.platform} options={platforms.map((p) => ({ value: p, label: p }))} value={platform} onChange={edit(setPlatform)} />
        {unsettled ? (
          <p className="nl-industry-note">
            {fill(W.unsettled, { count: unsettled.orders.length, amount: formatMoney(unsettled.total || 0), missing: unsettled.without_number || 0 })}
          </p>
        ) : null}
        <div className="nl-field">
          <label className="nl-label" htmlFor="payout-refs">
            {W.refs}
          </label>
          <div className="nl-input-wrap">
            <textarea id="payout-refs" className="nl-input" rows={5} value={refs} onChange={(e) => edit(setRefs)(e.target.value)} aria-describedby="payout-refs-note" />
          </div>
          <p id="payout-refs-note" className="nl-helper">
            {W.refsHelper}
          </p>
        </div>
        <Field id="payout-amount" label={W.amount} kind="money" value={amount} onChange={edit(setAmount)} />
        <Field id="payout-day" label={W.payoutDate} kind="date" value={day} onChange={edit(setDay)} />
        <Field id="payout-statement" label={W.statementRef} value={statementRef} onChange={edit(setStatementRef)} />
        <div className="nl-settings-footer">
          <Button variant="secondary" disabled={!ready || busy} onClick={check}>
            {W.check}
          </Button>
          <Button disabled={!plan || busy || !day} loading={busy && Boolean(plan)} onClick={record}>
            {W.record}
          </Button>
        </div>
        {figures ? (
          <div role="status">
            <SummaryRow
              items={[
                { label: W.matched, value: String(figures.orders) },
                { label: W.sales, value: formatMoney(figures.sales) },
                { label: fill(W.expected, { percent: figures.commission_percent }), value: formatMoney(figures.expected_commission) },
                { label: W.actual, value: formatMoney(figures.actual_commission) },
                { label: W.difference, value: formatMoney(figures.difference) },
              ]}
            />
            <p className="nl-industry-note">{differenceLine(figures.difference)}</p>
            {plan.not_found?.length ? <p className="nl-industry-note">{fill(W.notFound, { refs: plan.not_found.join(', ') })}</p> : null}
            {plan.already_settled?.length ? <p className="nl-industry-note">{fill(W.alreadySettled, { refs: plan.already_settled.map((o) => o.ref).join(', ') })}</p> : null}
          </div>
        ) : null}
        {message.text ? (
          <p className={message.error ? 'nl-settings-error' : 'nl-settings-status is-saved'} role={message.error ? 'alert' : 'status'}>
            {message.text}
          </p>
        ) : null}
        <p className="nl-industry-note">{W.bookkeeping}</p>
      </Card>
      <h2 className="nl-industry__subtitle">{W.historyTitle}</h2>
      <Table caption={W.historyLabel} columns={HISTORY} rows={history.rows.map((r) => ({ ...r, id: r.name }))} loading={history.loading} empty={{ title: W.historyEmpty, description: W.historyEmptyText }} />
    </section>
  );
};

export default PayoutSection;

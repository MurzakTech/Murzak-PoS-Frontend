import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getClaims, listReceiveModes, markClaimed, recordInsurerPayment, setClaimRejected } from '../../api/industryApi';
import { getUserCompany } from '../../utils/getUserCompany';
import Button from '../components/Button';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import Select from '../components/Select';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { PageHeader } from '../shell';
import T from './strings.industry';
import './industry.css';

const W = T.claims;
const STATUSES = ['To claim', 'Claimed', 'Part paid', 'Paid', 'Rejected'];

/**
 * Insurance claims (pharmacies): every bill split between a medical insurer and the patient. Choose claims to mark them
 * as sent (with the claim or batch number), as rejected, or to record the insurer's payment against them. Owners and
 * managers only (the server checks), because the list names patients.
 *
 *   api   injectable for tests; defaults to the server calls
 */
const DEFAULT_API = { getClaims, listReceiveModes, markClaimed, recordInsurerPayment, setClaimRejected };

const ClaimsPage = ({ api = DEFAULT_API }) => {
  const company = getUserCompany() || undefined;
  const [insurer, setInsurer] = useState('');
  const [status, setStatus] = useState('');
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [chosen, setChosen] = useState([]);
  const [claimRef, setClaimRef] = useState('');
  const [reason, setReason] = useState('');
  const [pay, setPay] = useState({ amount: '', mode: '', reference: '' });
  const [modes, setModes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', error: false });

  const load = useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));
    api
      .getClaims({ company, insurer, status })
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((e) => !cancelled && setState({ status: 'error', data: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [api, company, insurer, status]);

  useEffect(() => load(), [load]);
  useEffect(() => {
    let live = true;
    api
      .listReceiveModes(company)
      .then((list) => {
        if (!live) return;
        setModes(list);
        setPay((prev) => ({ ...prev, mode: prev.mode || list[0] || '' }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [api, company]);

  const claims = useMemo(() => state.data?.claims || [], [state.data]);
  const byStatus = state.data?.by_status || {};
  const owedChosen = claims.filter((c) => chosen.includes(c.invoice)).reduce((sum, c) => sum + (c.status === 'Paid' ? 0 : c.insurer_share), 0);
  const toggle = (invoice, on) => setChosen((prev) => (on ? [...prev, invoice] : prev.filter((x) => x !== invoice)));

  const columns = [
    { key: 'pick', header: '', render: (r) => <Checkbox label={<span className="nl-visually-hidden">{fill(W.choose, { invoice: r.invoice })}</span>} checked={chosen.includes(r.invoice)} onChange={(on) => toggle(r.invoice, on)} /> },
    { key: 'date', header: W.columns.date, nowrap: true },
    { key: 'invoice', header: W.columns.invoice, nowrap: true, hideOnPhone: true },
    { key: 'insurer', header: W.columns.insurer },
    { key: 'patient', header: W.columns.patient, hideOnPhone: true },
    { key: 'member_no', header: W.columns.member, hideOnTablet: true },
    { key: 'copay', header: W.columns.copay, money: true, hideOnPhone: true },
    { key: 'insurer_share', header: W.columns.share, money: true },
    { key: 'status', header: W.columns.status, render: (r) => W.statuses[r.status] || r.status },
  ];

  const act = async (work, done) => {
    if (chosen.length === 0) {
      setMessage({ text: W.chooseFirst, error: true });
      return;
    }
    setBusy(true);
    setMessage({ text: '', error: false });
    try {
      const result = await work();
      setMessage({ text: done(result), error: false });
      setChosen([]);
      load();
    } catch (e) {
      setMessage({ text: e.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const insurerOptions = [{ value: '', label: W.allInsurers }, ...(state.data?.insurers || []).map((name) => ({ value: name, label: name }))];
  const statusOptions = [{ value: '', label: W.allStatuses }, ...STATUSES.map((s) => ({ value: s, label: W.statuses[s] }))];

  return (
    <div className="nl-industry">
      <PageHeader title={W.title} subtitle={W.subtitle} />
      <div className="nl-industry__filters">
        <Select id="claims-insurer" label={W.insurer} options={insurerOptions} value={insurer} onChange={setInsurer} />
        <Select id="claims-status" label={W.status} options={statusOptions} value={status} onChange={setStatus} />
      </div>
      {state.status === 'error' ? (
        <EmptyState icon="alert" tone="error" title={W.errorTitle} description={state.error} action={{ label: W.retry, onClick: load }} />
      ) : (
        <>
          <SummaryRow loading={state.status === 'loading'} items={Object.keys(W.totals).map((key) => ({ label: W.totals[key], value: formatMoney(byStatus[key] || 0) }))} />
          <Table caption={W.tableLabel} columns={columns} rows={claims.map((c) => ({ ...c, id: c.invoice }))} loading={state.status === 'loading'} empty={{ title: W.emptyTitle, description: W.emptyText }} />
          <p className="nl-industry-note" role="status">
            {fill(W.chosen, { count: chosen.length, amount: formatMoney(owedChosen) })}
          </p>
          <Card title={W.markClaimed}>
            <Field id="claims-ref" label={W.claimRef} value={claimRef} onChange={setClaimRef} />
            <Button disabled={busy} onClick={() => act(() => api.markClaimed({ invoices: chosen, claimRef, company }), (r) => fill(W.markedClaimed, { count: (r?.claimed || []).length }))}>
              {W.markClaimed}
            </Button>
          </Card>
          <Card title={W.payTitle} subtitle={W.payHelper}>
            <Field id="claims-pay-amount" label={W.payAmount} kind="money" value={pay.amount} onChange={(v) => setPay((p) => ({ ...p, amount: v }))} />
            <Select id="claims-pay-mode" label={W.payMode} options={modes.map((m) => ({ value: m, label: m }))} value={pay.mode} onChange={(v) => setPay((p) => ({ ...p, mode: v }))} />
            <Field id="claims-pay-ref" label={W.payReference} value={pay.reference} onChange={(v) => setPay((p) => ({ ...p, reference: v }))} />
            <Button
              disabled={busy || !(Number(pay.amount) > 0) || !pay.mode}
              onClick={() =>
                act(
                  () => api.recordInsurerPayment({ invoices: chosen, amount: Number(pay.amount), mode: pay.mode, reference: pay.reference, company }),
                  (r) => {
                    setPay((p) => ({ ...p, amount: '', reference: '' }));
                    return fill(W.paid, { count: (r?.payments || []).length });
                  }
                )
              }
            >
              {W.payButton}
            </Button>
          </Card>
          <Card title={W.markRejected}>
            <Field id="claims-reason" label={W.rejectReason} value={reason} onChange={setReason} />
            <Button
              variant="secondary"
              disabled={busy || chosen.length !== 1}
              onClick={() =>
                act(
                  () => api.setClaimRejected({ invoice: chosen[0], reason, company }),
                  () => {
                    setReason('');
                    return W.markedRejected;
                  }
                )
              }
            >
              {W.markRejected}
            </Button>
          </Card>
          {message.text ? (
            <p className={message.error ? 'nl-settings-error' : 'nl-settings-status is-saved'} role={message.error ? 'alert' : 'status'}>
              {message.text}
            </p>
          ) : null}
          <p className="nl-industry-note">{W.privacy}</p>
        </>
      )}
    </div>
  );
};

export default ClaimsPage;

import React, { useCallback, useEffect, useState } from 'react';
import { getControlledRegister } from '../../api/industryApi';
import { getUserCompany } from '../../utils/getUserCompany';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import { Skeleton } from '../components/Skeleton';
import Table from '../components/Table';
import { formatDate } from '../components/dates';
import fill from '../labels/fill';
import { PageHeader } from '../shell';
import { controlledCsv, defaultPeriod } from './industryPagesModel';
import T from './strings.industry';
import './industry.css';

const W = T.controlled;

const COLUMNS = [
  { key: 'date', header: W.columns.date, nowrap: true, render: (l) => `${formatDate(l.date)} ${l.time || ''}`.trim() },
  { key: 'kind', header: W.columns.kind },
  { key: 'reference', header: W.columns.reference, nowrap: true, hideOnPhone: true },
  { key: 'qty_in', header: W.columns.qtyIn, align: 'right', render: (l) => (l.qty_in ? l.qty_in : '') },
  { key: 'qty_out', header: W.columns.qtyOut, align: 'right', render: (l) => (l.qty_out ? l.qty_out : '') },
  { key: 'balance', header: W.columns.balance, align: 'right' },
  { key: 'patient', header: W.columns.patient },
  { key: 'prescriber', header: W.columns.prescriber, hideOnPhone: true },
  { key: 'dispensed_by', header: W.columns.dispensedBy, hideOnTablet: true },
];

const download = (text, name) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * The controlled medicines register (pharmacy stores): for each medicine marked Controlled, the balance at the start of
 * the period, every movement with the balance after it, and the balance at the end, like the paper register an
 * inspector asks for. Owners and managers only (the server checks).
 */
const ControlledRegisterPage = () => {
  const company = getUserCompany() || undefined;
  const [period, setPeriod] = useState(defaultPeriod);
  const [shown, setShown] = useState(defaultPeriod);
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const load = useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));
    getControlledRegister({ company, fromDate: shown.from, toDate: shown.to })
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((e) => !cancelled && setState({ status: 'error', data: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [company, shown]);

  useEffect(() => load(), [load]);

  const medicines = state.data?.medicines || [];

  let body;
  if (state.status === 'error') {
    body = <EmptyState icon="alert" tone="error" title={W.errorTitle} description={state.error} action={{ label: W.retry, onClick: load }} />;
  } else if (state.status === 'loading') {
    body = <Skeleton width="100%" height="240px" />;
  } else if (medicines.length === 0) {
    body = <EmptyState title={W.emptyTitle} description={W.emptyText} />;
  } else {
    body = medicines.map((m) => (
      <div className="nl-settings-card" key={m.item_code}>
        <Card title={m.item_name} subtitle={fill(W.opening, { qty: m.opening })}>
          {m.lines.length ? (
            <Table caption={m.item_name} columns={COLUMNS} rows={m.lines.map((l, i) => ({ ...l, id: `${l.reference}:${i}` }))} />
          ) : (
            <p className="nl-industry-note">{W.noMovement}</p>
          )}
          <p className="nl-industry-note">{fill(W.closing, { qty: m.closing, received: m.received, issued: m.issued })}</p>
        </Card>
      </div>
    ));
  }

  return (
    <div className="nl-industry">
      <PageHeader
        title={W.title}
        subtitle={W.subtitle}
        actions={
          <Button variant="secondary" disabled={!medicines.length} onClick={() => download(controlledCsv(medicines), fill(W.fileName, { from: shown.from, to: shown.to }))}>
            {W.download}
          </Button>
        }
      />
      <form
        className="nl-industry__filters"
        onSubmit={(e) => {
          e.preventDefault();
          if (period.from && period.to) setShown(period);
        }}
      >
        <Field label={W.from} kind="date" value={period.from} onChange={(from) => setPeriod((p) => ({ ...p, from }))} />
        <Field label={W.to} kind="date" value={period.to} onChange={(to) => setPeriod((p) => ({ ...p, to }))} />
        <Button type="submit" disabled={!period.from || !period.to}>
          {W.show}
        </Button>
      </form>
      <p className="nl-industry-note">{W.privacy}</p>
      {body}
    </div>
  );
};

export default ControlledRegisterPage;

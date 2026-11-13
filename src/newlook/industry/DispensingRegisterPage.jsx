import React, { useCallback, useEffect, useState } from 'react';
import { getDispensingRegister } from '../../api/industryApi';
import { getUserCompany } from '../../utils/getUserCompany';
import Button from '../components/Button';
import { Chip } from '../components/Chip';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import SummaryRow from '../components/SummaryRow';
import Table from '../components/Table';
import { formatDate } from '../components/dates';
import fill from '../labels/fill';
import { PageHeader } from '../shell';
import { defaultPeriod, registerCsv, registerFileName, registerRowKey } from './industryPagesModel';
import T from './strings.industry';
import './industry.css';

const W = T.register;

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

const COLUMNS = [
  { key: 'date', header: W.columns.date, nowrap: true, render: (r) => `${formatDate(r.date)} ${r.time ? r.time.slice(0, 5) : ''}`.trim() },
  {
    key: 'item_name',
    header: W.columns.medicine,
    render: (r) => (
      <>
        {r.item_name}
        {r.is_return ? <Chip className="nl-industry-tag">{W.returned}</Chip> : null}
      </>
    ),
  },
  { key: 'qty', header: W.columns.qty, align: 'right', render: (r) => `${r.qty} ${r.uom || ''}`.trim() },
  { key: 'batch_no', header: W.columns.batch, hideOnPhone: true },
  { key: 'patient', header: W.columns.patient, render: (r) => (r.status === 'Missing' ? <span className="nl-industry-note--warning">{W.statusMissing}</span> : r.patient) },
  { key: 'prescriber', header: W.columns.prescriber },
  { key: 'reference', header: W.columns.reference, hideOnPhone: true },
  { key: 'dispensed_by', header: W.columns.dispensedBy, hideOnTablet: true },
  { key: 'invoice', header: W.columns.sale, nowrap: true, hideOnTablet: true },
];

/**
 * The dispensing register (pharmacy stores): every prescription-only medicine sold in the period, with the patient, the
 * prescriber and who dispensed it, ready for an inspector. Owners and managers only (the server checks); it can be
 * downloaded as a CSV file. Sales made before the register existed carry their record in the sale's remarks only.
 */
const DispensingRegisterPage = () => {
  const company = getUserCompany() || undefined;
  const [period, setPeriod] = useState(defaultPeriod);
  const [shown, setShown] = useState(defaultPeriod);
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  const load = useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));
    getDispensingRegister({ company, fromDate: shown.from, toDate: shown.to })
      .then((data) => !cancelled && setState({ status: 'ready', data, error: '' }))
      .catch((e) => !cancelled && setState({ status: 'error', data: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [company, shown]);

  useEffect(() => load(), [load]);

  const rows = state.data?.rows || [];
  const summary = state.data?.summary || { sales: 0, lines: 0, missing: 0 };
  const canShow = Boolean(period.from && period.to);

  return (
    <div className="nl-industry">
      <PageHeader
        title={W.title}
        subtitle={W.subtitle}
        actions={
          <Button variant="secondary" disabled={rows.length === 0} onClick={() => download(registerCsv(rows), registerFileName(shown.from, shown.to))}>
            {W.download}
          </Button>
        }
      />
      <form
        className="nl-industry__filters"
                onSubmit={(e) => {
          e.preventDefault();
          if (canShow) setShown(period);
        }}
      >
        <Field label={W.from} kind="date" value={period.from} onChange={(from) => setPeriod((p) => ({ ...p, from }))} />
        <Field label={W.to} kind="date" value={period.to} onChange={(to) => setPeriod((p) => ({ ...p, to }))} />
        <Button type="submit" disabled={!canShow}>
          {W.show}
        </Button>
      </form>
      <p className="nl-industry-note">{W.privacy}</p>
      {state.status === 'ready' && summary.missing > 0 ? <p className="nl-industry-note nl-industry-note--warning">{fill(W.missing, { count: summary.missing })}</p> : null}
      {state.status === 'ready' && state.data?.truncated ? <p className="nl-industry-note nl-industry-note--warning">{W.truncated}</p> : null}
      {state.status === 'error' ? (
        <EmptyState icon="alert" tone="error" title={W.errorTitle} description={state.error} action={{ label: W.retry, onClick: load }} />
      ) : (
        <>
          <SummaryRow loading={state.status === 'loading'} items={[{ label: W.title, value: fill(W.summary, { sales: summary.sales, lines: summary.lines }) }]} />
          <Table
            caption={W.tableLabel}
            columns={COLUMNS}
            rows={rows.map((r) => ({ ...r, id: registerRowKey(r) }))}
            loading={state.status === 'loading'}
            empty={{ title: W.emptyTitle, description: W.emptyText }}
          />
        </>
      )}
    </div>
  );
};

export default DispensingRegisterPage;

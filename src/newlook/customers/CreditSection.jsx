import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import { DetailFacts } from '../components/DetailPanel';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import { formatMoney } from '../components/format';
import Icon from '../components/Icon';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import S from '../strings';
import { setCreditLimit } from '../../api/customersListApi';
import { dayNumbers, shortNumber } from './customersModel';
import { useCreditHistory } from './useCustomersData';
import T from './strings.customers';

/** The credit history rows are Sales Invoices, Credit Notes (also Sales Invoices) and Payment Entries */
const numberOf = (row) => shortNumber(row.voucher_no, row.voucher_type === 'Payment Entry' ? 'P' : 'S');

const columns = () => [
  { key: 'date', header: T.credit.historyColumns.date, nowrap: true, render: (r) => dayNumbers(r.posting_date) },
  { key: 'type', header: T.credit.historyColumns.type, render: (r) => `${T.credit.historyKinds[r.voucher_type] || r.voucher_type} ${numberOf(r)}` },
  { key: 'amount', header: T.credit.historyColumns.amount, money: true, nowrap: true },
  { key: 'owed', header: T.credit.historyColumns.owed, money: true, nowrap: true, render: (r) => formatMoney(r.outstanding_amount) },
  { key: 'status', header: T.credit.historyColumns.status, render: (r) => r.status },
];

/**
 * The Credit section of the customer panel (ticket P4-7, open question 15): the credit limit, what the customer owes and what is
 * left, a field to set the limit or take it away, and the credit history with From and To dates. It uses the credit calls the
 * current Customers screen uses. Only for an owner or manager.
 *
 * The question before a limit is removed is asked by the panel, outside the detail card: a dialog drawn inside the card would
 * pass its Escape key to the card, which would close the whole panel.
 *
 *   customer   the panel's customer
 *   company    the business
 *   credit     the credit limit as loaded by the panel ({ status, data, reload })
 *   onRemove() asks whether to take the limit away
 */
const CreditSection = ({ customer, company, credit, onRemove }) => {
  const toast = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const history = useCreditHistory(customer.id, company, from, to);
  const [limit, setLimit] = useState('');
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);

  const info = credit.status === 'ready' ? credit.data : null;
  const own = Boolean(info && info.source === 'Customer' && info.limit > 0);
  useEffect(() => {
    setLimit(own ? String(Math.round(info.limit)) : '');
  }, [own, info]);

  const save = async () => {
    if (limit === '') {
      setProblem(T.credit.needAmount);
      return;
    }
    setProblem('');
    setSaving(true);
    try {
      await setCreditLimit({ customer: customer.id, company, limit });
      toast.success(T.credit.saved);
      credit.reload();
      history.reload();
    } catch (e) {
      toast.error(T.credit.failed);
    } finally {
      setSaving(false);
    }
  };

  const rows = history.status === 'ready' ? history.data.rows.map((r, i) => ({ ...r, id: `${r.voucher_no}-${i}` })) : [];

  return (
    <section className="nl-customer-panel__section" aria-label={T.credit.title}>
      <h3 className="nl-label">{T.credit.title}</h3>
      {credit.status === 'error' ? (
        <EmptyState icon="alert" tone="error" level={4} title={T.credit.errorText} action={{ label: T.credit.retry, onClick: credit.reload }} />
      ) : info ? (
        <>
          <DetailFacts
            facts={[
              { label: T.credit.limit, value: info.effective > 0 ? formatMoney(info.effective) : T.credit.noLimit },
              { label: T.credit.owes, value: formatMoney(info.owed) },
              ...(info.effective > 0 ? [{ label: T.credit.available, value: formatMoney(info.available) }] : []),
            ]}
          />
          {info.over ? (
            <p className="nl-customer-panel__flag">
              <Icon name="alert" />
              <span>{T.credit.over}</span>
            </p>
          ) : null}
          <Field kind="money" id={`nl-credit-limit-${customer.id}`} label={T.credit.fieldLabel} helper={T.credit.fieldHelp} error={problem} value={limit} onChange={setLimit} />
          <div className="nl-customer-panel__buttons">
            <Button variant="secondary" loading={saving} onClick={save}>
              {T.credit.save}
            </Button>
            {own ? (
              <Button variant="ghost" disabled={saving} onClick={onRemove}>
                {T.credit.remove}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      <h4 className="nl-label">{T.credit.historyTitle}</h4>
      <div className="nl-customer-panel__dates">
        <Field kind="date" label={T.credit.historyFrom} value={from} onChange={setFrom} />
        <Field kind="date" label={T.credit.historyTo} value={to} error={from && to && to < from ? S.components.filterRow.rangeError : undefined} onChange={setTo} />
      </div>
      <Table
        caption={fill(T.credit.historyCaption, { name: customer.name })}
        columns={columns()}
        rows={rows}
        loading={history.status === 'loading'}
        error={history.status === 'error'}
        onRetry={history.reload}
        skeletonRows={3}
        empty={{ icon: 'inbox', title: T.credit.historyEmpty }}
      />

    </section>
  );
};

export default CreditSection;

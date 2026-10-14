import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../components/Button';
import { DetailFacts } from '../components/DetailPanel';
import EmptyState from '../components/EmptyState';
import Field from '../components/Field';
import { formatMoney } from '../components/format';
import Segmented from '../components/Segmented';
import Table from '../components/Table';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { saveTextFile } from '../../utils/saveTextFile';
import { dayNumbers, dayWords, fileSafe, isoDay, statementCsv, statementRange, statementText, whatsappLink } from './customersModel';
import { useStatement } from './useCustomersData';
import T from './strings.customers';

const PRINT_CLASS = 'nl-printing-statement';
const PRESETS = Object.keys(T.statement.presets);

const money = (value) => (Number(value) ? formatMoney(value) : T.noValue);

/** Sale, return or payment with its short receipt number: 'Sale #S0004' */
const documentWords = (line) => `${T.statement.kinds[line.kind] || line.kind} ${line.receipt}`;

/** The columns of the statement, on screen and on paper */
const columns = () => [
  { key: 'date', header: T.statement.columns.date, nowrap: true, render: (l) => dayNumbers(l.date) },
  { key: 'document', header: T.statement.columns.document, nowrap: true, render: (l) => documentWords(l) },
  { key: 'debit', header: T.statement.columns.debit, align: 'right', nowrap: true, render: (l) => money(l.debit) },
  { key: 'credit', header: T.statement.columns.credit, align: 'right', nowrap: true, render: (l) => money(l.credit) },
  { key: 'balance', header: T.statement.columns.balance, align: 'right', nowrap: true, render: (l) => formatMoney(l.balance) },
];

/** What the printer gets: the statement only. It exists only while printing. */
const PrintBlock = ({ statement, customer, shop }) =>
  createPortal(
    <div className="nl-statement-print">
      <h1>{fill(T.statement.printTitle, { name: customer.name })}</h1>
      {shop ? <p>{fill(T.statement.printShop, { shop })}</p> : null}
      <p>{fill(T.statement.printPeriod, { from: dayWords(statement.from), to: dayWords(statement.to) })}</p>
      <table>
        <caption className="nl-visually-hidden">{fill(T.statement.caption, { name: customer.name, from: dayWords(statement.from), to: dayWords(statement.to) })}</caption>
        <thead>
          <tr>
            {columns().map((c) => (
              <th key={c.key} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{dayNumbers(statement.from)}</td>
            <td>{T.statement.opening}</td>
            <td />
            <td />
            <td>{formatMoney(statement.opening_balance)}</td>
          </tr>
          {statement.lines.map((line) => (
            <tr key={`${line.kind}-${line.id}`}>
              {columns().map((c) => (
                <td key={c.key}>{c.render(line)}</td>
              ))}
            </tr>
          ))}
          <tr>
            <td>{dayNumbers(statement.to)}</td>
            <td>{T.statement.closing}</td>
            <td />
            <td />
            <td>{formatMoney(statement.closing_balance)}</td>
          </tr>
        </tbody>
      </table>
    </div>,
    document.body
  );

/**
 * The Statement section of the customer panel (ticket P4-7): the customer's sales, returns and payments for a chosen period
 * with a running balance, ending at the balance owed in the list. It can be sent as a short WhatsApp message (the owner presses
 * send), printed, or saved as a spreadsheet file. Only for an owner or manager.
 *
 *   customer   the panel's customer (id, name, mobile)
 *   company    the business
 *   shop       the business name used in the message and on paper
 */
const StatementSection = ({ customer, company, shop }) => {
  const toast = useToast();
  const [preset, setPreset] = useState('90d');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [printing, setPrinting] = useState(false);

  const range = useMemo(() => (preset === 'custom' ? custom : statementRange(preset)), [preset, custom]);
  const usable = Boolean(range.from && range.to && range.from <= range.to);
  const { status, data: statement, reload } = useStatement(customer.id, company, range.from, range.to, usable);

  // Printing: the print block is drawn first, then the browser's print window opens, then the block goes away
  useEffect(() => {
    if (!printing) return undefined;
    document.body.classList.add(PRINT_CLASS);
    try {
      window.print();
    } finally {
      document.body.classList.remove(PRINT_CLASS);
      setPrinting(false);
    }
    return () => document.body.classList.remove(PRINT_CLASS);
  }, [printing]);

  const ready = status === 'ready' && statement;
  const link = ready ? whatsappLink(customer.mobile, statementText({ name: customer.name, shop, balance: statement.current_balance, lines: statement.lines })) : '';
  const noMobile = Boolean(ready && !link);

  const exportCsv = () => {
    saveTextFile(statementCsv(statement), fill(T.statement.exportName, { name: fileSafe(customer.name), date: isoDay(new Date()) }));
    toast.success(T.statement.exportDone);
  };

  const options = PRESETS.map((value) => ({ value, label: T.statement.presets[value] }));

  return (
    <section className="nl-customer-panel__section" aria-label={T.statement.title}>
      <h3 className="nl-label">{T.statement.title}</h3>
      <Segmented label={T.statement.presetsLabel} options={options} value={preset} onChange={setPreset} size="small" />
      {preset === 'custom' ? (
        <div className="nl-customer-panel__dates">
          <Field kind="date" label={T.statement.from} value={custom.from} onChange={(value) => setCustom((c) => ({ ...c, from: value }))} />
          <Field kind="date" label={T.statement.to} value={custom.to} onChange={(value) => setCustom((c) => ({ ...c, to: value }))} />
        </div>
      ) : null}

      {status === 'error' ? (
        <EmptyState icon="alert" tone="error" level={4} title={T.statement.errorTitle} description={T.statement.errorText} action={{ label: T.statement.retry, onClick: reload }} />
      ) : (
        <>
          {ready && statement.truncated ? <p className="nl-customer-panel__note">{fill(T.statement.cut, { from: dayWords(statement.from) })}</p> : null}
          <Table
            caption={fill(T.statement.caption, { name: customer.name, from: range.from ? dayWords(range.from) : T.noValue, to: range.to ? dayWords(range.to) : T.noValue })}
            columns={columns()}
            rows={ready ? statement.lines : []}
            loading={usable && status !== 'ready'}
            skeletonRows={3}
            empty={{ icon: 'receipt', title: T.statement.empty, description: T.statement.emptyText }}
          />
          {ready ? (
            <DetailFacts
              facts={[
                { label: T.statement.opening, value: formatMoney(statement.opening_balance) },
                { label: T.statement.closing, value: <strong>{formatMoney(statement.closing_balance)}</strong> },
                ...(statement.closing_balance !== statement.current_balance ? [{ label: T.statement.owedNow, value: formatMoney(statement.current_balance) }] : []),
              ]}
            />
          ) : null}
          {ready ? (
            <div className="nl-customer-panel__buttons">
              {link ? (
                <Button as="a" variant="secondary" href={link} target="_blank" rel="noopener noreferrer">
                  {T.statement.sendWhatsApp}
                </Button>
              ) : null}
              <Button variant="secondary" icon="receipt" onClick={() => setPrinting(true)}>
                {T.statement.print}
              </Button>
              <Button variant="secondary" icon="arrowDown" onClick={exportCsv}>
                {T.statement.export}
              </Button>
            </div>
          ) : null}
          {noMobile ? <p className="nl-customer-panel__note">{T.whatsapp.noMobile}</p> : null}
        </>
      )}
      {printing && ready ? <PrintBlock statement={statement} customer={customer} shop={shop} /> : null}
    </section>
  );
};

export default StatementSection;

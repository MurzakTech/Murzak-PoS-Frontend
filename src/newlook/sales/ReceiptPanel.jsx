import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import DetailPanel, { DetailFacts } from '../components/DetailPanel';
import EmptyState from '../components/EmptyState';
import { PaymentChip, StatusLabel } from '../components/Chip';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import PaymentDialog from './PaymentDialog';
import { useSale } from './useSalesData';
import { customerName, detailsFor, statusView, whatsappLink, whenLabel } from './salesModel';
import T from './strings.sales';

const PRINT_CLASS = 'nl-printing-receipt';

/** The lines, totals, payments and returns of one receipt; used on screen and in the print block */
const ReceiptBody = ({ sale, printing = false }) => {
  const totals = sale.totals || {};
  const lines = sale.lines || [];
  const payments = sale.payments || [];
  const returns = sale.returns || [];
  const totalRows = [
    { key: 'subtotal', label: T.panel.subtotal, value: totals.subtotal, show: Number(totals.discount) > 0 || Number(totals.tax) > 0 },
    { key: 'discount', label: T.panel.discount, value: totals.discount, show: Number(totals.discount) > 0 },
    { key: 'tax', label: T.panel.tax, value: totals.tax, show: Number(totals.tax) > 0 },
    { key: 'total', label: T.panel.total, value: totals.total, show: true, strong: true },
    { key: 'paid', label: T.panel.paid, value: totals.paid, show: true },
    { key: 'change', label: T.panel.change, value: totals.change, show: Number(totals.change) > 0 },
    { key: 'outstanding', label: T.panel.outstanding, value: totals.outstanding, show: Number(totals.outstanding) > 0, strong: true },
  ].filter((r) => r.show);

  return (
    <>
      {sale.is_return ? <p className="nl-receipt__note">{T.panel.isReturn}</p> : null}
      {lines.length ? (
        <table className="nl-receipt__lines">
          <caption className="nl-visually-hidden">{T.panel.itemsLabel}</caption>
          <thead>
            <tr>
              <th scope="col">{T.panel.item}</th>
              <th scope="col" className="is-right">
                {T.panel.qty}
              </th>
              <th scope="col" className="is-right">
                {T.panel.amount}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={`${line.item_code}-${i}`}>
                <td>{line.item_name || line.item_code}</td>
                <td className="is-right">{line.qty}</td>
                <td className="is-right">{formatMoney(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <dl className="nl-receipt__totals" aria-label={T.panel.totalsLabel}>
        {totalRows.map((row) => (
          <div key={row.key} className={['nl-receipt__total', row.strong && 'is-strong'].filter(Boolean).join(' ')}>
            <dt>{row.label}</dt>
            <dd>{formatMoney(row.value)}</dd>
          </div>
        ))}
      </dl>

      {payments.length ? (
        <section className="nl-receipt__section" aria-label={T.panel.paymentsTitle}>
          <h3 className="nl-label">{T.panel.paymentsTitle}</h3>
          <ul className="nl-receipt__list">
            {payments.map((p, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={`${p.mode}-${i}`}>
                {printing ? <span>{p.label || p.mode}</span> : <PaymentChip method={p.label || p.mode} />}
                <span className="nl-receipt__amount">{formatMoney(p.amount)}</span>
                {p.reference ? <span className="nl-receipt__ref">{fill(T.panel.paymentReference, { reference: p.reference })}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!printing && returns.length ? (
        <section className="nl-receipt__section" aria-label={T.panel.returnsTitle}>
          <h3 className="nl-label">{T.panel.returnsTitle}</h3>
          <ul className="nl-receipt__list">
            {returns.map((r) => (
              <li key={r.id}>
                <span>{r.receipt}</span>
                <span className="nl-receipt__amount">{formatMoney(r.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
};

/** What the printer gets: the receipt only, with no system reference. It exists only while printing. */
const PrintBlock = ({ sale }) =>
  createPortal(
    <div className="nl-receipt-print">
      <h1>{fill(T.panel.receiptTitle, { receipt: sale.receipt })}</h1>
      <p>{whenLabel(sale.date, sale.time)}</p>
      <p>
        {T.panel.cashier}: {sale.cashier || T.noValue}
      </p>
      <p>
        {T.panel.customer}: {customerName({ customer: sale.customer && sale.customer.name })}
      </p>
      <ReceiptBody sale={sale} printing />
    </div>,
    document.body
  );

/**
 * The receipt panel of the Sales page (ticket P3-8). It asks the server for the receipt itself, so the list and the
 * panel load, fail and retry independently. Buttons: Take payment (only when the server says it can be taken),
 * Print, Send on WhatsApp and Return items. The system reference (ACC-...) is shown only under Details.
 *
 *   id, doctype   which receipt; summary is the list row, used for the title while the receipt loads
 *   returnAddress(sale)   where Return items goes (the current returns screen with the invoice filled in)
 *   onChanged()   called after a payment is saved, so the list can refresh
 */
const ReceiptPanel = ({ id, doctype, summary, position, onClose, onPrevious, onNext, returnAddress, onChanged }) => {
  const { status, data: sale, reload } = useSale(id, doctype);
  const navigate = useNavigate();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [printing, setPrinting] = useState(false);

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

  const loading = status === 'loading' && !sale;
  const failed = status === 'error';
  const shown = sale || null;
  const receipt = (shown && shown.receipt) || (summary && summary.receipt);
  const state = shown ? shown.status : summary && summary.status;
  const view = state ? statusView(state) : null;

  const can = (shown && shown.can) || {};
  const link = shown ? whatsappLink(shown) : '';
  const noMobile = Boolean(shown && can.whatsapp && !link);

  const actions = [];
  if (shown && can.take_payment) actions.push({ key: 'pay', label: T.panel.takePayment, icon: 'wallet', onClick: () => setPaying(true) });
  if (shown && can.print !== false) actions.push({ key: 'print', label: T.panel.print, icon: 'receipt', onClick: () => setPrinting(true) });
  if (shown && can.whatsapp && link) actions.push({ key: 'whatsapp', label: T.panel.whatsapp, onClick: () => window.open(link, '_blank', 'noopener,noreferrer') });
  if (shown && can.return_items) actions.push({ key: 'return', label: T.panel.returnItems, icon: 'undo', onClick: () => navigate(returnAddress(shown)) });
  const [primary, ...secondary] = actions;

  return (
    <>
      <DetailPanel
        title={receipt ? fill(T.panel.receiptTitle, { receipt }) : T.panel.loadingTitle}
        status={view ? <StatusLabel status={view.status}>{view.words}</StatusLabel> : null}
        position={position}
        onClose={onClose}
        onPrevious={onPrevious}
        onNext={onNext}
        loading={loading}
        primary={primary}
        secondary={secondary.slice(0, 3)}
        details={shown ? detailsFor(shown) : []}
      >
        {failed ? (
          <EmptyState icon="alert" tone="error" level={3} title={T.panel.errorTitle} description={T.panel.errorText} action={{ label: T.panel.retry, onClick: reload }} />
        ) : shown ? (
          <>
            <DetailFacts
              facts={[
                { label: T.panel.customer, value: shown.customer && shown.customer.name ? shown.customer.name : T.walkIn },
                { label: T.panel.mobile, value: shown.customer && shown.customer.mobile },
                { label: T.panel.when, value: whenLabel(shown.date, shown.time) },
                { label: T.panel.cashier, value: shown.cashier },
              ]}
            />
            <ReceiptBody sale={shown} />
            {noMobile ? <p className="nl-receipt__note">{T.panel.noMobile}</p> : null}
          </>
        ) : null}
      </DetailPanel>

      {paying && shown && can.take_payment ? (
        <PaymentDialog
          sale={shown}
          onClose={() => setPaying(false)}
          onSaved={(amount) => {
            setPaying(false);
            toast.success(fill(T.payment.saved, { amount: formatMoney(amount), receipt: shown.receipt }));
            reload();
            if (onChanged) onChanged();
          }}
        />
      ) : null}
      {printing && shown ? <PrintBlock sale={shown} /> : null}
    </>
  );
};

export default ReceiptPanel;

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { ConfirmDialog } from '../components/Dialog';
import DetailPanel, { DetailFacts } from '../components/DetailPanel';
import EmptyState from '../components/EmptyState';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { cancelBill, cancelOrder, sendOrder } from '../../api/purchasesListApi';
import NoteDialog from './NoteDialog';
import MakeBillDialog from './MakeBillDialog';
import PayBillDialog from './PayBillDialog';
import PurchaseStatus from './PurchaseStatus';
import { usePurchase } from './usePurchasesData';
import { billLine, cancelCopy, dateCell, detailsFor, dueInfo, openAddress, qtyText, receiveAddress } from './purchasesModel';
import T from './strings.purchases';
import { oldScreen } from '../redirects/engine';

const PRINT_CLASS = 'nl-printing-purchase';
const MAX_ACTIONS = 4;

/** The items, totals and bills of one purchase; used on screen and in the print block */
const PurchaseBody = ({ purchase, printing = false }) => {
  const totals = purchase.totals || {};
  const lines = purchase.lines || [];
  const isOrder = purchase.doctype === 'Purchase Order';
  const totalRows = [
    { key: 'subtotal', label: T.panel.subtotal, value: totals.subtotal, show: Number(totals.tax) > 0 },
    { key: 'tax', label: T.panel.tax, value: totals.tax, show: Number(totals.tax) > 0 },
    { key: 'total', label: T.panel.total, value: totals.total, show: true, strong: true },
    { key: 'outstanding', label: T.panel.outstanding, value: totals.outstanding, show: Number(totals.outstanding) > 0, strong: true },
  ].filter((r) => r.show);

  return (
    <>
      {lines.length ? (
        <div className="nl-purchase__lines-wrap" role="region" aria-label={T.panel.itemsLabel} tabIndex={0}>
        <table className="nl-purchase__lines">
          <caption className="nl-visually-hidden">{T.panel.itemsLabel}</caption>
          <thead>
            <tr>
              <th scope="col">{T.panel.item}</th>
              {isOrder ? (
                <>
                  <th scope="col" className="is-right">
                    {T.panel.ordered}
                  </th>
                  <th scope="col" className="is-right">
                    {T.panel.received}
                  </th>
                  <th scope="col" className="is-right">
                    {T.panel.toArrive}
                  </th>
                </>
              ) : (
                <th scope="col" className="is-right">
                  {T.panel.quantity}
                </th>
              )}
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
                {isOrder ? (
                  <>
                    <td className="is-right">{qtyText(line.ordered)}</td>
                    <td className="is-right">{qtyText(line.received)}</td>
                    <td className="is-right">{qtyText(line.to_arrive)}</td>
                  </>
                ) : (
                  <td className="is-right">{qtyText(line.ordered)}</td>
                )}
                <td className="is-right">{formatMoney(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : null}

      <dl className="nl-purchase__totals" aria-label={T.panel.totalsLabel}>
        {totalRows.map((row) => (
          <div key={row.key} className={['nl-purchase__total', row.strong && 'is-strong'].filter(Boolean).join(' ')}>
            <dt>{row.label}</dt>
            <dd>{formatMoney(row.value)}</dd>
          </div>
        ))}
      </dl>

      {!printing ? (
        <>
          {(purchase.receipts || []).length ? (
            <section className="nl-purchase__section" aria-label={T.panel.receiptsTitle}>
              <h3 className="nl-label">{T.panel.receiptsTitle}</h3>
              <ul className="nl-purchase__list">
                {purchase.receipts.map((r) => (
                  <li key={r.id}>
                    {r.id === purchase.id ? (
                      <span>{fill(T.panel.billLine, { number: r.number, amount: formatMoney(r.total) })}</span>
                    ) : (
                      <Link to={openAddress(r.id)}>{fill(T.panel.billLine, { number: r.number, amount: formatMoney(r.total) })}</Link>
                    )}
                    <span className="nl-purchase__sub">{dateCell(r.date)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {(purchase.orders || []).length ? (
            <section className="nl-purchase__section" aria-label={T.panel.ordersTitle}>
              <h3 className="nl-label">{T.panel.ordersTitle}</h3>
              <ul className="nl-purchase__list">
                {purchase.orders.map((o) => (
                  <li key={o.id}>
                    <Link to={openAddress(o.id)}>{o.number}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {isOrder && (purchase.bills || []).length ? (
            <section className="nl-purchase__section" aria-label={T.panel.billsTitle}>
              <h3 className="nl-label">{T.panel.billsTitle}</h3>
              <ul className="nl-purchase__list">
                {purchase.bills.map((b) => (
                  <li key={b.id}>
                    <Link to={openAddress(b.id)}>{billLine(b)}</Link>
                    {b.due_date ? <span className="nl-purchase__sub">{fill(T.dueOn, { date: dateCell(b.due_date) })}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {(purchase.returns || []).length ? (
            <section className="nl-purchase__section" aria-label={T.panel.returnsTitle}>
              <h3 className="nl-label">{T.panel.returnsTitle}</h3>
              <ul className="nl-purchase__list">
                {purchase.returns.map((r) => (
                  <li key={r.id}>
                    <Link to={openAddress(r.id)}>{fill(T.panel.billLine, { number: r.number, amount: formatMoney(r.total) })}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
};

/** What the printer gets: the purchase only, with no system reference. It exists only while printing. */
const PrintBlock = ({ purchase }) =>
  createPortal(
    <div className="nl-purchase-print">
      <h1>{fill(T.panel.title, { number: purchase.number })}</h1>
      <p>
        {T.panel.supplier}: {purchase.supplier.name}
      </p>
      <p>
        {T.panel.date}: {dateCell(purchase.date)}
      </p>
      {purchase.bill_no ? (
        <p>
          {T.panel.billNumber}: {purchase.bill_no}
        </p>
      ) : null}
      {purchase.due_date ? (
        <p>
          {T.panel.dueDate}: {dateCell(purchase.due_date)}
        </p>
      ) : null}
      <PurchaseBody purchase={purchase} printing />
    </div>,
    document.body
  );

/**
 * The purchase panel of the Purchases page (ticket P4-5). It asks the server for the purchase itself, so the list and the
 * panel load, fail and retry independently. The buttons shown depend on what the server says is allowed: Receive goods (an
 * order with items still to arrive), Pay bill (a bill with an amount outstanding), Send order to supplier and Edit draft (a
 * draft), Print, Create return (a link to the current returns screen) and Cancel (asks first and names what is lost).
 *
 *   id, doctype   which purchase; summary is the list row, used for the title while the purchase loads
 *   onChanged()   called after something is saved, so the list can refresh
 */
const PurchasePanel = ({ id, doctype, summary, position, onClose, onPrevious, onNext, onChanged }) => {
  const { status, data: purchase, errorType, reload } = usePurchase(id, doctype);
  const navigate = useNavigate();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [noting, setNoting] = useState(false);
  const [billing, setBilling] = useState(false);
  const [asking, setAsking] = useState('');
  const [busy, setBusy] = useState(false);
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

  const loading = status === 'loading' && !purchase;
  const failed = status === 'error';
  const notFound = failed && errorType === 'not_found';
  const shown = purchase || null;
  const number = (shown && shown.number) || (summary && summary.number);
  const state = shown ? shown.status : summary && summary.status;
  const can = (shown && shown.can) || {};
  const isOrder = Boolean(shown && shown.doctype === 'Purchase Order');
  const due = shown && shown.due_date ? dueInfo({ status: shown.status, due_date: shown.due_date }) : null;

  const changed = () => {
    reload();
    if (onChanged) onChanged();
  };

  const send = async () => {
    setBusy(true);
    try {
      const result = await sendOrder(shown.id);
      toast.success(fill(result.waitingForApproval ? T.sendOrder.approval : T.sendOrder.done, { number: shown.number }));
      setAsking('');
      changed();
    } catch (error) {
      toast.error(fill(T.sendOrder.failed, { reason: error.message }));
      setAsking('');
    }
    setBusy(false);
  };

  const cancelIt = async () => {
    setBusy(true);
    try {
      if (isOrder) await cancelOrder(shown.id);
      else await cancelBill(shown.id);
      toast.success(fill(T.cancel.done, { number: shown.number }));
      setAsking('');
      changed();
    } catch (error) {
      toast.error(fill(T.cancel.failed, { reason: error.message }));
      setAsking('');
    }
    setBusy(false);
  };

  // The buttons, most useful first; the panel shows one main action and up to three more
  const actions = [];
  if (shown && can.receive_goods) actions.push({ key: 'receive', label: T.panel.receiveGoods, icon: 'truck', onClick: () => navigate(receiveAddress(shown.id)) });
  if (shown && can.pay_bill && shown.pay) actions.push({ key: 'pay', label: T.panel.payBill, icon: 'wallet', onClick: () => setPaying(true) });
  if (shown && can.make_bill) actions.push({ key: 'bill', label: T.panel.makeBill, icon: 'receipt', onClick: () => setBilling(true) });
  if (shown && isOrder && can.edit_draft) actions.push({ key: 'send', label: T.panel.sendOrder, icon: 'arrowUp', onClick: () => setAsking('send') });
  if (shown && can.print !== false) actions.push({ key: 'print', label: T.panel.print, icon: 'receipt', onClick: () => setPrinting(true) });
  if (shown && can.return && shown.return_target)
    actions.push({ key: 'return', label: T.panel.createReturn, icon: 'undo', onClick: () => navigate(oldScreen(`${T.links.returns}?purchase=${encodeURIComponent(shown.return_target)}`)) });
  if (shown && can.edit_draft) actions.push({ key: 'edit', label: T.panel.editDraft, onClick: () => navigate(oldScreen(`${T.links.earlierNew}?draft=${encodeURIComponent(shown.id)}`)) });
  if (shown && can.cancel) actions.push({ key: 'cancel', label: T.panel.cancel, variant: 'danger', onClick: () => setAsking('cancel') });
  const shownActions = actions.slice(0, MAX_ACTIONS);
  const [primary, ...secondary] = shownActions;

  const copy = shown && asking === 'cancel' ? cancelCopy(shown) : null;

  return (
    <>
      <DetailPanel
        title={number ? fill(T.panel.title, { number }) : T.panel.loadingTitle}
        status={state ? <PurchaseStatus status={state} /> : null}
        position={position}
        onClose={onClose}
        onPrevious={onPrevious}
        onNext={onNext}
        loading={loading}
        primary={primary}
        secondary={secondary}
        details={shown ? detailsFor(shown) : []}
      >
        {failed ? (
          notFound ? (
            <EmptyState icon="search" level={3} title={T.panel.notFoundTitle} description={T.panel.notFoundText} />
          ) : (
            <EmptyState icon="alert" tone="error" level={3} title={T.panel.errorTitle} description={T.panel.errorText} action={{ label: T.panel.retry, onClick: reload }} />
          )
        ) : shown ? (
          <>
            <DetailFacts
              facts={[
                { label: T.panel.supplier, value: shown.supplier && shown.supplier.name },
                { label: T.panel.date, value: dateCell(shown.date) },
                ...(shown.bill_no ? [{ label: T.panel.billNumber, value: shown.bill_no }] : []),
                ...(shown.bill_date ? [{ label: T.panel.billDate, value: dateCell(shown.bill_date) }] : []),
                ...(shown.due_date ? [{ label: T.panel.dueDate, value: due ? due.text : dateCell(shown.due_date) }] : []),
                ...(shown.totals && Number(shown.totals.outstanding) > 0 ? [{ label: T.panel.owed, value: formatMoney(shown.totals.outstanding) }] : []),
              ]}
            />
            {shown.part_received ? <p className="nl-purchase__note">{T.panel.partNote}</p> : null}
            <PurchaseBody purchase={shown} />
            <section className="nl-purchase__section" aria-label={T.panel.notesTitle}>
              <h3 className="nl-label">{T.panel.notesTitle}</h3>
              {(shown.notes || []).length ? (
                <ul className="nl-purchase__list">
                  {shown.notes.map((n, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={i}>
                      <span>{n.text}</span>
                      <span className="nl-purchase__sub">{dateCell(n.date)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="nl-purchase__note">{T.panel.noNotes}</p>
              )}
              <Button variant="ghost" size="small" icon="plus" onClick={() => setNoting(true)}>
                {T.panel.addNote}
              </Button>
            </section>
          </>
        ) : null}
      </DetailPanel>

      {paying && shown && shown.pay ? (
        <PayBillDialog
          purchase={shown}
          onClose={() => setPaying(false)}
          onPaid={(amount) => {
            setPaying(false);
            toast.success(fill(T.pay.done, { amount: formatMoney(amount), supplier: shown.supplier.name }));
            changed();
          }}
        />
      ) : null}
      {billing && shown ? (
        <MakeBillDialog
          purchase={shown}
          onClose={() => setBilling(false)}
          onDone={() => {
            setBilling(false);
            toast.success(T.makeBill.done);
            changed();
          }}
        />
      ) : null}
      {noting && shown ? (
        <NoteDialog
          purchase={shown}
          onClose={() => setNoting(false)}
          onSaved={() => {
            setNoting(false);
            toast.success(T.note.saved);
            reload();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={asking === 'send' && Boolean(shown)}
        title={T.sendOrder.title}
        message={T.sendOrder.message}
        confirmLabel={T.sendOrder.confirm}
        cancelLabel={T.sendOrder.cancel}
        loading={busy}
        onConfirm={send}
        onCancel={() => setAsking('')}
      />
      <ConfirmDialog
        open={Boolean(copy)}
        title={copy ? copy.title : ''}
        message={copy ? copy.message : ''}
        confirmLabel={T.cancel.confirm}
        cancelLabel={T.cancel.keep}
        destructive
        loading={busy}
        onConfirm={cancelIt}
        onCancel={() => setAsking('')}
      />
      {printing && shown ? <PrintBlock purchase={shown} /> : null}
    </>
  );
};

export default PurchasePanel;

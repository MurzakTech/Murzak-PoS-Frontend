import React from 'react';
import { Link } from 'react-router-dom';
import DetailPanel, { DetailFacts } from '../components/DetailPanel';
import Button from '../components/Button';
import { Chip } from '../components/Chip';
import { formatMoney } from '../components/format';
import { SkeletonText } from '../components/Skeleton';
import fill from '../labels/fill';
import { dayWords, isRefund, paidFromWords, sourceWords } from './expensesModel';
import { useReceipt } from './useExpensesData';
import T from './strings.expenses';

const P = T.panel;

/** The receipt photo of an expense added on the Expenses page: loads on its own, so a slow photo never holds up the facts */
const ReceiptPhoto = ({ row }) => {
  const { status, data, reload } = useReceipt(row.id);
  if (status === 'error') {
    return (
      <p className="nl-expense-panel__note" role="alert">
        {P.receiptFailed}{' '}
        <Button variant="ghost" size="small" onClick={() => reload()}>
          {P.receiptRetry}
        </Button>
      </p>
    );
  }
  if (status !== 'ready' || !data) {
    return (
      <div role="status" aria-label={P.receiptLoading}>
        <SkeletonText lines={4} />
      </div>
    );
  }
  return <img className="nl-expense-panel__photo" src={data.dataUrl} alt={fill(P.receiptAlt, { category: row.category.label })} />;
};

/**
 * The expense panel of the Expenses page (ticket P5-1). It shows the facts of the row that was opened (everything is already in the
 * list), the receipt photo when there is one (asked for only now, since a photo is large), and under Details the record number. An
 * expense added on the Expenses page says so; any other cost the books count (a supplier bill for power, an entry the accountant made)
 * says where it came from, and a supplier bill links to its purchase.
 *
 *   row          the list row
 *   billAddress  (reference) => the address that opens a supplier bill
 */
const ExpensePanel = ({ row, position, onClose, onPrevious, onNext, billAddress }) => {
  const mine = row.kind === 'expense';
  const isBill = row.reference_type === 'Purchase Invoice';
  const facts = [
    { label: P.amount, value: <strong>{formatMoney(row.amount)}</strong> },
    { label: P.date, value: dayWords(row.date) },
    ...(mine ? [{ label: P.paidFrom, value: paidFromWords(row) }] : []),
    { label: P.note, value: row.note || P.noNote },
    ...(mine && row.added_by ? [{ label: P.addedBy, value: row.added_by }] : []),
    { label: P.source, value: sourceWords(row) },
  ];

  return (
    <DetailPanel
      title={row.category.label}
      status={mine ? <Chip icon="check">{T.addedHere}</Chip> : <Chip>{T.enteredElsewhere}</Chip>}
      position={position}
      onClose={onClose}
      onPrevious={onPrevious}
      onNext={onNext}
      details={[{ label: P.detailsReference, value: row.reference }]}
    >
      <div className="nl-expense-panel">
        {isRefund(row) ? <p className="nl-expense-panel__note">{P.refund}</p> : null}
        <DetailFacts facts={facts} />
        <section className="nl-expense-panel__section" aria-label={P.receipt}>
          <h3 className="nl-label">{P.receipt}</h3>
          {mine && row.has_receipt ? <ReceiptPhoto row={row} /> : <p className="nl-expense-panel__note">{mine ? P.receiptNone : P.receiptOther}</p>}
        </section>
        {isBill && billAddress ? (
          <Link to={billAddress(row.reference)} className="nl-expense-panel__link">
            {P.openBill}
          </Link>
        ) : null}
      </div>
    </DetailPanel>
  );
};

export default ExpensePanel;

import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Segmented from '../components/Segmented';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import Icon from '../components/Icon';
import { takePayment } from '../../api/salesListApi';
import { PAYMENT_MODES, paymentAmount, paymentProblems } from './salesModel';
import T from './strings.sales';

/**
 * Take payment on an unpaid invoice: the amount (filled with what is still to pay), how it was paid and, for
 * M-Pesa, the code from the message. The server records it; the page then reloads the receipt and the list.
 */
const PaymentDialog = ({ sale, onClose, onSaved }) => {
  const outstanding = Number((sale && sale.totals && sale.totals.outstanding) || 0);
  const [amount, setAmount] = useState(String(outstanding || ''));
  const [mode, setMode] = useState('cash');
  const [reference, setReference] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const problems = tried ? paymentProblems({ amount, mode, reference, outstanding }) : {};
  const save = async () => {
    setTried(true);
    if (Object.keys(paymentProblems({ amount, mode, reference, outstanding })).length) return;
    setBusy(true);
    setFailure('');
    try {
      await takePayment({ id: sale.id, doctype: sale.doctype, amount: paymentAmount(amount), mode, reference: mode === 'mpesa' ? reference.trim() : undefined });
      onSaved(paymentAmount(amount));
    } catch (error) {
      setFailure(fill(T.payment.failed, { reason: error.message }));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={T.payment.title}
      description={fill(T.payment.description, { receipt: sale.receipt, outstanding: formatMoney(outstanding) })}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {T.payment.cancel}
          </Button>
          <Button loading={busy} onClick={save}>
            {T.payment.save}
          </Button>
        </>
      }
    >
      <div className="nl-sales-form">
        <Field label={T.payment.amount} value={amount} onChange={setAmount} error={problems.amount} inputMode="decimal" data-autofocus="" />
        <div className="nl-sales-form__method">
          <span className="nl-label" aria-hidden="true">
            {T.payment.method}
          </span>
          <Segmented label={T.payment.method} options={PAYMENT_MODES.map((value) => ({ value, label: T.payment.methods[value] }))} value={mode} onChange={setMode} />
        </div>
        {mode === 'mpesa' ? <Field label={T.payment.code} helper={T.payment.codeHelper} value={reference} onChange={setReference} error={problems.reference} autoComplete="off" /> : null}
        {failure ? (
          <p role="alert" className="nl-error">
            <Icon name="alert" />
            <span>{failure}</span>
          </p>
        ) : null}
      </div>
    </Dialog>
  );
};

export default PaymentDialog;

import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Segmented from '../components/Segmented';
import Select from '../components/Select';
import { formatMoney } from '../components/format';
import fill from '../labels/fill';
import { payBill } from '../../api/purchasesListApi';
import { amountOf, decimalOnly, defaultMode, isMpesa, payProblems } from './purchasesModel';
import T from './strings.purchases';

const MAX_SEGMENTS = 4;

/**
 * Pay a supplier bill: the amount (filled with what is still owed), how it was paid and, for M-Pesa, the code from the
 * message. The current Pay Invoice call records it; the page then reloads the purchase and the list.
 *
 *   purchase   the purchase from get_purchase; its `pay` says which bill is paid, what is owed and the ways of paying
 */
const PayBillDialog = ({ purchase, onClose, onPaid }) => {
  const { pay } = purchase;
  const modes = pay.modes || [];
  const owed = Number(pay.outstanding) || 0;
  const [amount, setAmount] = useState(String(owed));
  const [mode, setMode] = useState(defaultMode(modes));
  const [reference, setReference] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const problems = tried ? payProblems({ amount, mode, modes, reference, outstanding: owed }) : {};
  const choices = modes.map((m) => ({ value: m.name, label: m.name }));

  const save = async () => {
    setTried(true);
    if (Object.keys(payProblems({ amount, mode, modes, reference, outstanding: owed })).length) return;
    setBusy(true);
    setFailure('');
    try {
      await payBill({ invoice: pay.invoice, amount: amountOf(amount), mode: mode || undefined, reference: isMpesa(modes, mode) ? reference.trim() : undefined });
      onPaid(amountOf(amount));
    } catch (error) {
      setFailure(fill(T.pay.failed, { reason: error.message }));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={T.pay.title}
      description={fill(T.pay.description, { supplier: purchase.supplier.name, number: pay.number, owed: formatMoney(owed) })}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {T.pay.cancel}
          </Button>
          <Button loading={busy} onClick={save}>
            {T.pay.save}
          </Button>
        </>
      }
    >
      <div className="nl-purchases-form">
        <Field label={T.pay.amount} value={amount} onChange={(v) => setAmount(decimalOnly(v))} error={problems.amount} inputMode="decimal" data-autofocus="" />
        {modes.length > 0 ? (
          <div className="nl-purchases-form__method">
            {modes.length <= MAX_SEGMENTS ? (
              <>
                <span className="nl-label" aria-hidden="true">
                  {T.pay.method}
                </span>
                <Segmented label={T.pay.method} options={choices} value={mode} onChange={setMode} />
                {problems.mode ? (
                  <p className="nl-error">
                    <Icon name="alert" />
                    <span>{problems.mode}</span>
                  </p>
                ) : null}
              </>
            ) : (
              <Select label={T.pay.method} options={choices} value={mode} onChange={setMode} error={problems.mode} />
            )}
          </div>
        ) : null}
        {isMpesa(modes, mode) ? <Field label={T.pay.code} helper={T.pay.codeHelper} value={reference} onChange={setReference} error={problems.reference} autoComplete="off" /> : null}
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

export default PayBillDialog;

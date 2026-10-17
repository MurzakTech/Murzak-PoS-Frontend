import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import fill from '../labels/fill';
import { makeBillFromNote } from '../../api/purchasesListApi';
import { isoDay } from './purchasesModel';
import T from './strings.purchases';

/** Make the supplier bill for goods received earlier and not billed yet (the bill number and date are optional). */
const MakeBillDialog = ({ purchase, onClose, onDone }) => {
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(isoDay(new Date()));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const save = async () => {
    setBusy(true);
    setFailure('');
    try {
      const result = await makeBillFromNote({ receipt: purchase.id, billNo: billNo.trim() || undefined, billDate: billDate || undefined });
      onDone(result);
    } catch (error) {
      setFailure(fill(T.makeBill.failed, { reason: error.message }));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={T.makeBill.title}
      description={fill(T.makeBill.description, { number: purchase.number, supplier: purchase.supplier.name })}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {T.makeBill.cancel}
          </Button>
          <Button loading={busy} onClick={save}>
            {T.makeBill.save}
          </Button>
        </>
      }
    >
      <div className="nl-purchases-form">
        <Field label={T.makeBill.billNo} helper={T.makeBill.billNoHelper} value={billNo} onChange={(v) => setBillNo(v.slice(0, 60))} autoComplete="off" data-autofocus="" />
        <Field kind="date" label={T.makeBill.billDate} value={billDate} onChange={setBillDate} />
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

export default MakeBillDialog;

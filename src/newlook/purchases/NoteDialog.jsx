import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import fill from '../labels/fill';
import { addPurchaseNote } from '../../api/purchasesListApi';
import T from './strings.purchases';

const MAX_NOTE = 500;

/** Write a note on a purchase; it is kept with the purchase for everyone who opens it. */
const NoteDialog = ({ purchase, onClose, onSaved }) => {
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const missing = tried && !text.trim();

  const save = async () => {
    setTried(true);
    if (!text.trim()) return;
    setBusy(true);
    setFailure('');
    try {
      await addPurchaseNote({ id: purchase.id, doctype: purchase.doctype, note: text.trim() });
      onSaved();
    } catch (error) {
      setFailure(fill(T.note.failed, { reason: error.message }));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={T.note.title}
      description={fill(T.note.description, { number: purchase.number })}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {T.note.cancel}
          </Button>
          <Button loading={busy} onClick={save}>
            {T.note.save}
          </Button>
        </>
      }
    >
      <div className="nl-purchases-form">
        <Field
          label={T.note.label}
          helper={T.note.helper}
          value={text}
          onChange={(v) => setText(v.slice(0, MAX_NOTE))}
          error={missing ? T.note.required : undefined}
          autoComplete="off"
          data-autofocus=""
        />
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

export default NoteDialog;

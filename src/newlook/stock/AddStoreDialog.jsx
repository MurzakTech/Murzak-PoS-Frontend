import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { addStore } from '../../api/stockLevelsApi';
import T from './strings.stock';

const D = T.addStoreDialog;

/**
 * Add a store: one box for its name. Only the business owner may (the server checks too). A name the shop already uses
 * is refused by the server in plain words and shown here, so nothing is added twice.
 *
 *   onSaved(result) called after a save with { name, warehouse_name }, so the list of stores can reload
 */
const AddStoreDialog = ({ open, onClose, onSaved }) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');

  const missing = name.trim().length < 2;

  const save = async () => {
    setTried(true);
    if (missing || saving) return;
    setSaving(true);
    setFailure('');
    try {
      const result = await addStore({ name: name.trim() });
      toast.success(fill(D.saved, { store: result.warehouse_name || name.trim() }));
      if (onSaved) onSaved(result);
      onClose();
    } catch (error) {
      setFailure(fill(D.failed, { reason: error.message }));
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={D.title}
      description={D.description}
      busy={saving}
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            {D.cancel}
          </Button>
          <Button loading={saving} onClick={save}>
            {D.save}
          </Button>
        </>
      }
    >
      <div className="nl-stock-form">
        <Field label={D.name} value={name} onChange={setName} placeholder={D.namePlaceholder} maxLength={60} autoComplete="off" error={tried && missing ? D.nameRequired : undefined} data-autofocus="" />
        {failure ? (
          <p className="nl-error" role="alert">
            <Icon name="alert" />
            <span>{failure}</span>
          </p>
        ) : null}
      </div>
    </Dialog>
  );
};

export default AddStoreDialog;

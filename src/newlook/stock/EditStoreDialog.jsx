import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { editStore } from '../../api/storesApi';
import T from './strings.stock';

const D = T.editStoreDialog;

/**
 * Edit store: the store's name, town and address. The server refuses a name another store already uses and says so in
 * plain words, which are shown here. Save is not sent when the name is empty.
 *
 *   store          the store { name, warehouse_name, city, address_line_1 }
 *   onSaved(result) called after a save, so the list of stores can reload
 */
const EditStoreDialog = ({ open, onClose, store, onSaved }) => {
  const toast = useToast();
  const [name, setName] = useState(store.warehouse_name || store.name || '');
  const [city, setCity] = useState(store.city || '');
  const [address, setAddress] = useState(store.address_line_1 || '');
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
      const result = await editStore({ store: store.name, name: name.trim(), city: city.trim(), address: address.trim() });
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
        <Field label={D.name} value={name} onChange={setName} maxLength={60} autoComplete="off" error={tried && missing ? D.nameRequired : undefined} data-autofocus="" />
        <Field label={D.town} value={city} onChange={setCity} maxLength={140} autoComplete="off" />
        <Field label={D.address} value={address} onChange={setAddress} maxLength={140} autoComplete="off" />
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

export default EditStoreDialog;

import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { stockOut } from '../../api/stockLevelsApi';
import ProductPicker from './ProductPicker';
import { formatQty, parseQty, qtyWithUnit, reasonOptions, stockOutProblems } from './stockModel';
import T from './strings.stock';

const D = T.stockOutDialog;

/**
 * Stock out or write-off (tickets P4-4 and AC-27): a short form for stock that leaves the shop without a sale. A reason is
 * always needed: the Save button stays off, and the reason box shows what is missing beside it, until one is chosen. The
 * reason Other also needs a note. The server refuses a missing reason too.
 *
 *   stores         [{ value, label }] the selling locations; the store is asked for only when there are two or more
 *   initialProduct a product to start with (from a row's menu)
 *   onSaved(result) called after a save, so the list can reload
 */
const StockOutDialog = ({ open, onClose, stores = [], initialProduct = null, onSaved }) => {
  const toast = useToast();
  const [product, setProduct] = useState(initialProduct);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [store, setStore] = useState('');
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [touched, setTouched] = useState({});

  const needsStore = stores.length >= 2;
  const problems = stockOutProblems({ product, qty, reason, note });
  if (needsStore && !store) problems.store = T.chooseStore;
  const blocked = Object.keys(problems).length > 0;
  // The reason's error is always there until a reason is given; the others show once the person has touched the field or tried to save
  const show = (key) => (key === 'reason' || touched[key] || touched.all ? problems[key] : undefined);
  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const save = async () => {
    touch('all');
    if (blocked || saving) return;
    setSaving(true);
    setFailure('');
    try {
      const result = await stockOut({ itemCode: product.item_code, qty: parseQty(qty), reason, store: needsStore ? store : undefined, note: note.trim() });
      toast.success(fill(D.saved, { qty: formatQty(parseQty(qty)), product: product.item_name, after: qtyWithUnit(result.in_stock, product.unit) }));
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
          <Button loading={saving} disabled={blocked} onClick={save}>
            {D.save}
          </Button>
        </>
      }
    >
      <div className="nl-stock-form">
        <ProductPicker value={product} onChange={setProduct} store={needsStore ? store : undefined} error={show('product')} autoFocus={!initialProduct} />
        <Field label={D.quantity} value={qty} onChange={(v) => { setQty(v); touch('qty'); }} inputMode="decimal" autoComplete="off" error={show('qty')} data-autofocus={initialProduct ? '' : undefined} />
        <Select label={D.reason} options={reasonOptions()} value={reason} onChange={setReason} placeholder={D.reasonPlaceholder} error={show('reason')} />
        <Field label={reason === 'other' ? D.note : D.noteOptional} value={note} onChange={(v) => { setNote(v); touch('note'); }} maxLength={140} error={show('note')} />
        {needsStore ? <Select label={D.store} options={stores} value={store} onChange={setStore} placeholder={T.count.storePlaceholder} error={show('store')} /> : null}
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

export default StockOutDialog;

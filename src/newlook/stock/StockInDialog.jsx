import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { stockIn } from '../../api/stockLevelsApi';
import ProductPicker from './ProductPicker';
import { formatQty, parseQty, qtyWithUnit, stockInProblems } from './stockModel';
import T from './strings.stock';

const D = T.stockInDialog;

/**
 * Stock in (ticket P4-4): a short form for stock that did not come from a supplier bill. It saves a material receipt
 * through the server and tells the person what is in stock now. The cost per unit is offered only to people who may see
 * cost, and the store only when the shop has two or more.
 *
 *   stores         [{ value, label }] the selling locations; the store is asked for only when there are two or more
 *   initialProduct a product to start with (from a row's menu)
 *   showCost       whether to offer Cost per unit
 *   onSaved(result) called after a save, so the list can reload
 */
const StockInDialog = ({ open, onClose, stores = [], initialProduct = null, showCost = false, onSaved }) => {
  const toast = useToast();
  const [product, setProduct] = useState(initialProduct);
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [store, setStore] = useState('');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');

  const needsStore = stores.length >= 2;
  const problems = stockInProblems({ product, qty });
  if (needsStore && !store) problems.store = T.chooseStore;
  const show = (key) => (tried ? problems[key] : undefined);

  const save = async () => {
    setTried(true);
    if (Object.keys(problems).length > 0 || saving) return;
    setSaving(true);
    setFailure('');
    try {
      const result = await stockIn({ itemCode: product.item_code, qty: parseQty(qty), store: needsStore ? store : undefined, note: note.trim(), unitCost: showCost && cost ? Number(cost) : undefined });
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
          <Button loading={saving} onClick={save}>
            {D.save}
          </Button>
        </>
      }
    >
      <div className="nl-stock-form">
        <ProductPicker value={product} onChange={setProduct} store={needsStore ? store : undefined} error={show('product')} autoFocus={!initialProduct} />
        <Field label={D.quantity} value={qty} onChange={setQty} inputMode="decimal" autoComplete="off" error={show('qty')} data-autofocus={initialProduct ? '' : undefined} />
        {needsStore ? <Select label={D.store} options={stores} value={store} onChange={setStore} placeholder={T.count.storePlaceholder} error={show('store')} /> : null}
        {showCost ? <Field label={D.cost} kind="money" value={cost} onChange={setCost} helper={D.costHelper} /> : null}
        <Field label={D.note} value={note} onChange={setNote} placeholder={D.notePlaceholder} maxLength={140} />
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

export default StockInDialog;

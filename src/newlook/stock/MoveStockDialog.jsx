import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Select from '../components/Select';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { formatCount } from '../components/format';
import { moveStock } from '../../api/stockLevelsApi';
import ProductPicker from './ProductPicker';
import { formatQty, moveProblems, parseQty, storeName } from './stockModel';
import T from './strings.stock';

const D = T.moveDialog;
let lineCounter = 0;
// Each line gets its own id, so adding or removing a line never makes another line lose what was typed in it
const emptyLine = () => {
  lineCounter += 1;
  return { id: lineCounter, product: null, qty: '' };
};

/**
 * Move stock between stores: one short form, one step. Choose where it comes from and where it goes, then list the
 * products and how many of each. The stock leaves the first store and arrives in the second at once; there is nothing to
 * approve or receive afterwards. Each quantity is checked against what the first store holds, and the server checks it
 * again and moves nothing at all if any product falls short.
 *
 *   stores          [{ value, label }] the selling locations (two or more, or there is nothing to move between)
 *   initialFrom     a store to start from (the store filter that is on, if any)
 *   initialProduct  a product to start with (from a row's menu)
 *   onSaved(result) called after a save, so the list can reload
 */
const MoveStockDialog = ({ open, onClose, stores = [], initialFrom = '', initialProduct = null, onSaved }) => {
  const toast = useToast();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState('');
  const [lines, setLines] = useState(() => [initialProduct && initialFrom ? { ...emptyLine(), product: initialProduct } : emptyLine()]);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');

  const check = moveProblems({ from, to, lines });
  const showTop = (key) => (tried ? check.problems[key] : undefined);
  const showLine = (index, key) => (tried ? check.lineProblems[index][key] : undefined);

  // The stock a product shows is the stock of the store it is read from, so changing the first store starts the list again
  const changeFrom = (value) => {
    setFrom(value);
    setLines([emptyLine()]);
    setFailure('');
  };
  const setLine = (index, change) => setLines((all) => all.map((line, i) => (i === index ? { ...line, ...change } : line)));
  const removeLine = (index) => setLines((all) => (all.length === 1 ? [emptyLine()] : all.filter((_, i) => i !== index)));
  const toOptions = stores.filter((s) => s.value !== from);

  const save = async () => {
    setTried(true);
    if (!check.ok || saving) return;
    setSaving(true);
    setFailure('');
    try {
      const result = await moveStock({ lines: check.used.map((l) => ({ item_code: l.product.item_code, qty: parseQty(l.qty) })), from, to, note: note.trim() });
      toast.success(fill(D.saved, { count: formatCount(result.products || check.used.length, D.productNoun), from: storeName(stores, from), to: storeName(stores, to) }));
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
        <Select label={D.from} options={stores} value={from} onChange={changeFrom} placeholder={T.count.storePlaceholder} error={showTop('from')} />
        <Select label={D.to} options={toOptions} value={to} onChange={setTo} placeholder={D.toPlaceholder} error={showTop('to')} />

        {from ? (
          <>
            {lines.map((line, index) => (
              <div className="nl-stock-moveline" key={line.id} role="group" aria-label={fill(D.product, { n: index + 1 })}>
                <ProductPicker value={line.product} onChange={(product) => setLine(index, { product })} store={from} error={showLine(index, 'product')} autoFocus={index === 0 && !initialProduct} />
                <Field label={D.quantity} value={line.qty} onChange={(value) => setLine(index, { qty: value })} inputMode="decimal" autoComplete="off" error={showLine(index, 'qty')} />
                {lines.length > 1 || line.product ? (
                  <Button variant="ghost" size="small" aria-label={fill(D.remove, { n: index + 1 })} onClick={() => removeLine(index)}>
                    <Icon name="x" />
                  </Button>
                ) : null}
              </div>
            ))}
            {tried && check.problems.lines ? (
              <p className="nl-error" role="alert">
                <Icon name="alert" />
                <span>{check.problems.lines}</span>
              </p>
            ) : null}
            <Button variant="secondary" icon="plus" onClick={() => setLines((all) => [...all, emptyLine()])}>
              {D.addAnother}
            </Button>
          </>
        ) : (
          <p className="nl-helper">{D.chooseFromFirst}</p>
        )}

        <Field label={D.note} value={note} onChange={setNote} maxLength={140} />
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

export default MoveStockDialog;

import React, { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Segmented from '../components/Segmented';
import Select from '../components/Select';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { bulkUpdateStock, currentStock } from '../../api/stockLevelsApi';
import { readProductFile } from '../../utils/readProductFile';
import { checkStockSheet } from '../../utils/stockImport';
import { saveTextFile } from '../../utils/saveTextFile';
import ProductPicker from './ProductPicker';
import { formatQty, parseQty } from './stockModel';
import T from './strings.stock';

const D = T.bulkUpdateDialog || {
  title: 'Bulk stock update',
  description: 'Update or adjust stock quantities for multiple products at once.',
  methods: { file: 'Upload spreadsheet', manual: 'Quick entry' },
  modes: { set: 'Set stock level', adjust: 'Add or take away' },
  modeHelp: {
    set: 'The number you enter becomes the stock in the store. Products that are not on your list are left as they are.',
    adjust: 'The number you enter is added to the stock in the store. Put a minus sign in front to take stock away.',
  },
  downloadTemplate: 'Download CSV template',
  uploadPrompt: 'Choose or drop a CSV or Excel spreadsheet',
  uploadHelp: 'File must include columns: item_code and qty',
  chooseStore: 'Target store',
  addProducts: 'Search and add product',
  clearAll: 'Clear table',
  note: 'Reason / note (optional)',
  notePlaceholder: 'e.g. Stock audit, New shipment, Batch recount',
  save: 'Update stock',
  saving: 'Updating stock...',
  cancel: 'Cancel',
  saved: 'Updated stock for {count} products in {store}.',
  failed: 'Bulk stock update failed. {reason}',
  noItems: 'No items in update list. Upload a file or add products to proceed.',
};

const TEMPLATE_CSV = `item_code,qty,item_name
ITEM-001,50,Sample Product A
ITEM-002,100,Sample Product B
`;

const DiffBadge = ({ diff, unknown = false }) => {
  if (diff === null || diff === undefined) {
    return <span className="nl-diff-badge nl-diff-badge--zero">{unknown ? 'Not known' : 'Checking...'}</span>;
  }
  const n = Number(diff) || 0;
  if (Math.abs(n) < 0.0001) {
    return <span className="nl-diff-badge nl-diff-badge--zero">No change</span>;
  }
  if (n > 0) {
    return <span className="nl-diff-badge nl-diff-badge--plus">+{formatQty(n)}</span>;
  }
  return <span className="nl-diff-badge nl-diff-badge--minus">{formatQty(n)}</span>;
};

/**
 * BulkStockUpdateDialog: Update or reconcile stock levels for multiple items at once.
 * Supports CSV/Excel spreadsheet upload and in-table quick entry.
 */
const BulkStockUpdateDialog = ({ open, onClose, stores = [], activeStore = '', onSaved }) => {
  const toast = useToast();
  const [store, setStore] = useState(activeStore || (stores[0]?.value ?? ''));
  const [method, setMethod] = useState('file'); // 'file' | 'manual'
  const [mode, setMode] = useState('set'); // 'set' | 'adjust'
  const [note, setNote] = useState('');
  const [items, setItems] = useState([]);
  // What the chosen store holds now, by product code: asked of the server, so a sheet shows the real figure beside the new one
  const [stockNow, setStockNow] = useState({});
  const [lookupFailed, setLookupFailed] = useState(false);
  const [pickerProduct, setPickerProduct] = useState(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const needsStore = stores.length >= 2;

  const downloadTemplate = () => {
    saveTextFile(TEMPLATE_CSV, 'bulk-stock-update-template.csv');
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setReading(true);

    try {
      const { rows, error: readError } = await readProductFile(file);
      if (readError) {
        setError(readError);
        setReading(false);
        return;
      }

      const checked = checkStockSheet(rows);
      if (checked.fileProblems?.length) {
        setError(checked.fileProblems.join(' '));
        setReading(false);
        return;
      }

      if (!checked.valid || checked.valid.length === 0) {
        setError('No valid product rows found in the sheet. Make sure item_code and qty are present.');
        setReading(false);
        return;
      }

      // Convert valid rows
      const parsed = checked.valid.map((v) => {
        const rawQty = parseQty(v.stock.qty);
        return {
          item_code: v.stock.item_code,
          item_name: v.itemName || v.stock.item_code,
          target_qty: rawQty,
          current_qty: null,
          unit: 'Nos',
        };
      });

      setItems(parsed);
    } catch (err) {
      setError(err.message || 'Failed to read file');
    } finally {
      setReading(false);
    }
  };

  const handleAddManual = (prod) => {
    if (!prod) return;
    setPickerProduct(null);
    if (items.some((i) => i.item_code === prod.item_code)) {
      return;
    }
    const cur = Number(prod.qty) || 0;
    setItems((prev) => [
      ...prev,
      {
        item_code: prod.item_code,
        item_name: prod.item_name,
        current_qty: cur,
        target_qty: cur,
        unit: prod.unit || 'Nos',
      },
    ]);
  };

  const handleTargetChange = (index, value) => {
    const val = parseQty(value);
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], target_qty: val };
      return next;
    });
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setItems([]);
    setError('');
  };

  // Each row with what the store holds now and the difference the update will make (null while the figure is still being looked up)
  const rows = useMemo(
    () =>
      items.map((it) => {
        const cur = stockNow[it.item_code] !== undefined ? stockNow[it.item_code] : it.current_qty;
        const target = Number(it.target_qty) || 0;
        let diff = null;
        if (mode === 'adjust') diff = target;
        else if (cur !== null && cur !== undefined) diff = target - cur;
        return { ...it, current_qty: cur, diff };
      }),
    [items, stockNow, mode]
  );

  const totals = useMemo(() => {
    let plus = 0;
    let minus = 0;
    let zero = 0;
    rows.forEach((it) => {
      if (it.diff === null) return;
      if (it.diff > 0.0001) plus++;
      else if (it.diff < -0.0001) minus++;
      else zero++;
    });
    return { count: rows.length, plus, minus, zero };
  }, [rows]);

  // Ask what the store holds of the listed products, again when the store or the list changes
  const codesKey = useMemo(() => items.map((it) => it.item_code).sort().join('|'), [items]);
  useEffect(() => {
    if (!codesKey) return undefined;
    let cancelled = false;
    currentStock({ codes: codesKey.split('|'), store: store || undefined })
      .then((stock) => {
        if (cancelled) return;
        setStockNow(stock);
        setLookupFailed(false);
      })
      .catch(() => {
        // The figure stays unknown; the server still checks the update itself when it is saved
        if (cancelled) return;
        setStockNow({});
        setLookupFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [codesKey, store]);

  const canSave = items.length > 0 && !saving && !reading;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');

    try {
      const payloadItems = items.map((it) => ({
        item_code: it.item_code,
        qty: it.target_qty,
      }));

      const res = await bulkUpdateStock({
        items: payloadItems,
        store: store || undefined,
        mode,
        note: note.trim() || undefined,
      });

      const storeLabel = stores.find((s) => s.value === store)?.label || store || 'store';
      toast.success(fill(D.saved, { count: res.updatedCount || items.length, store: storeLabel }));

      if (onSaved) onSaved(res);
      onClose();
    } catch (err) {
      setError(fill(D.failed, { reason: err.message }));
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={D.title}
      description={D.description}
      busy={saving || reading}
      footer={
        <>
          <Button variant="secondary" disabled={saving || reading} onClick={onClose}>
            {D.cancel}
          </Button>
          <Button variant="primary" loading={saving} disabled={!canSave} onClick={handleSave}>
            {saving ? D.saving : `${D.save} (${items.length})`}
          </Button>
        </>
      }
    >
      <div className="nl-bulk-stock">
        {/* Controls row: Store, Method, Mode */}
        <div className="nl-bulk-stock__meta">
          {needsStore ? (
            <Select
              label={D.chooseStore}
              options={stores}
              value={store}
              onChange={setStore}
            />
          ) : null}

          <Segmented
            label="Entry method"
            value={method}
            onChange={setMethod}
            options={[
              { value: 'file', label: D.methods.file },
              { value: 'manual', label: D.methods.manual },
            ]}
          />

          <Segmented
            label="Update type"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'set', label: D.modes.set },
              { value: 'adjust', label: D.modes.adjust },
            ]}
          />
        </div>

        <p className="nl-stock-sub">{D.modeHelp[mode]}</p>

        {/* File method */}
        {method === 'file' ? (
          <div className="nl-bulk-stock__upload-box">
            <Icon name="upload" />
            <div>
              <strong>{D.uploadPrompt}</strong>
              <p className="nl-stock-sub">{D.uploadHelp}</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <label className="nl-btn nl-btn--secondary" style={{ cursor: 'pointer' }}>
                <Icon name="search" />
                <span>Browse file</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv"
                  onChange={handleFile}
                  style={{ display: 'none' }}
                />
              </label>
              <Button variant="secondary" icon="arrowDown" onClick={downloadTemplate}>
                {D.downloadTemplate}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <ProductPicker
              store={store || undefined}
              value={pickerProduct}
              onChange={handleAddManual}
              placeholder={D.addProducts}
            />
          </div>
        )}

        {/* Items table preview */}
        {items.length > 0 ? (
          <div className="nl-bulk-stock__preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Items to update ({items.length})</strong>
              <Button variant="secondary" size="small" onClick={clearAll}>
                {D.clearAll}
              </Button>
            </div>

            <table className="nl-table" style={{ width: '100%', fontSize: 'var(--body-size)' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Product</th>
                  <th style={{ textAlign: 'right' }}>Current</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>
                    {mode === 'adjust' ? '+ / - Qty' : 'New Qty'}
                  </th>
                  <th style={{ textAlign: 'right' }}>Difference</th>
                  <th style={{ width: '40px' }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.item_code}>
                    <td>
                      <strong>{row.item_name}</strong>
                      <span className="nl-stock-sub">{row.item_code}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{row.current_qty === null || row.current_qty === undefined ? '-' : formatQty(row.current_qty)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Field
                        value={row.target_qty}
                        onChange={(v) => handleTargetChange(idx, v)}
                        inputMode="decimal"
                        autoComplete="off"
                        style={{ margin: 0 }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <DiffBadge diff={row.diff} unknown={lookupFailed} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Button
                        variant="ghost"
                        size="small"
                        icon="x"
                        aria-label={`Remove ${row.item_name}`}
                        onClick={() => handleRemoveItem(idx)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary bar */}
            <div className="nl-bulk-stock__summary">
              <span>Total items: <strong>{totals.count}</strong></span>
              <span>Going up: <strong style={{ color: 'var(--good)' }}>+{totals.plus}</strong></span>
              <span>Going down: <strong style={{ color: 'var(--bad)' }}>-{totals.minus}</strong></span>
              <span>No change: <strong>{totals.zero}</strong></span>
            </div>
          </div>
        ) : null}

        {/* Optional note */}
        <Field
          label={D.note}
          value={note}
          onChange={setNote}
          placeholder={D.notePlaceholder}
          maxLength={140}
        />

        {error ? (
          <p className="nl-error" role="alert">
            <Icon name="alert" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </Dialog>
  );
};

export default BulkStockUpdateDialog;

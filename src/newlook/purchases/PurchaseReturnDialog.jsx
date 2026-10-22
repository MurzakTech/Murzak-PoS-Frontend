import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { formatMoney } from '../components/format';
import { createPurchaseReturn, getPurchase } from '../../api/purchasesListApi';

/**
 * Dialog to record a return of purchased goods back to a supplier (debit note).
 * Can be opened against a specific purchase from PurchasePanel, or standalone from PurchasesPage.
 */
const PurchaseReturnDialog = ({ purchase = null, company, onClose, onDone }) => {
  const [currentPurchase, setCurrentPurchase] = useState(purchase);
  const [purchaseLookup, setPurchaseLookup] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const initLines = (p) =>
    (p?.lines || []).map((l) => {
      const available = Number(l.received ?? l.qty) || 0;
      return {
        item_code: l.item_code,
        item_name: l.item_name || l.item_code,
        maxQty: available,
        returnQty: available,
        rate: Number(l.rate) || 0,
        selected: available > 0,
      };
    });

  const [lines, setLines] = useState(() => initLines(purchase));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const handleLookup = async () => {
    const q = purchaseLookup.trim();
    if (!q) return;
    setLookupBusy(true);
    setLookupError('');
    try {
      const found = await getPurchase(q, undefined, company);
      if (found) {
        setCurrentPurchase(found);
        setLines(initLines(found));
      } else {
        setLookupError('Purchase not found. Check the number and try again.');
      }
    } catch (err) {
      setLookupError(err.message || 'Purchase not found. Check the number and try again.');
    } finally {
      setLookupBusy(false);
    }
  };

  const handleToggleLine = (idx) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, selected: !l.selected } : l))
    );
  };

  const handleQtyChange = (idx, value) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const num = parseFloat(value);
        return {
          ...l,
          returnQty: Number.isNaN(num) ? '' : Math.min(Math.max(0, num), l.maxQty),
        };
      })
    );
  };

  const selectedLines = lines.filter(
    (l) => l.selected && Number(l.returnQty) > 0 && Number(l.returnQty) <= l.maxQty
  );

  const totalValue = selectedLines.reduce(
    (sum, l) => sum + Number(l.returnQty) * l.rate,
    0
  );

  const canSubmit = selectedLines.length > 0 && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setFailure('');

    const targetDoc = currentPurchase?.return_target || currentPurchase?.id;
    if (!targetDoc) {
      setFailure('No purchase invoice or document found to return against.');
      setBusy(false);
      return;
    }

    const items = selectedLines.map((l) => ({
      item_code: l.item_code,
      item_name: l.item_name,
      qty: Number(l.returnQty),
      rate: l.rate,
    }));

    try {
      const result = await createPurchaseReturn({
        returnAgainst: targetDoc,
        items,
        remarks: reason.trim() || undefined,
        company,
      });

      onDone(result);
    } catch (err) {
      setFailure(err.message || 'Failed to record return.');
      setBusy(false);
    }
  };

  const supplierName =
    currentPurchase?.supplier?.name ||
    (typeof currentPurchase?.supplier === 'string' ? currentPurchase.supplier : '') ||
    'Supplier';

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title="Record purchase return"
      description={
        currentPurchase
          ? `Return items for purchase ${currentPurchase.number || currentPurchase.id} (${supplierName})`
          : 'Enter the purchase order or bill number to find items to return.'
      }
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Record return
          </Button>
        </>
      }
    >
      <div className="nl-purchases-form">
        {!currentPurchase ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            <Field
              label="Purchase or Bill number"
              placeholder="e.g. 0001, PINV-2026-00001, PUR-ORD-2026-00001"
              value={purchaseLookup}
              onChange={setPurchaseLookup}
              data-autofocus=""
            />
            <Button
              variant="secondary"
              loading={lookupBusy}
              disabled={!purchaseLookup.trim() || lookupBusy}
              onClick={handleLookup}
            >
              Find purchase
            </Button>
            {lookupError ? (
              <p role="alert" className="nl-error">
                <Icon name="alert" />
                <span>{lookupError}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {currentPurchase && lines.length > 0 ? (
          <div>
            <h4 className="nl-label" style={{ marginBottom: '8px' }}>Items to return</h4>
            <table className="nl-purchase__lines" style={{ width: '100%', marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th style={{ width: '32px' }}></th>
                  <th>Item</th>
                  <th className="is-right">Received</th>
                  <th className="is-right" style={{ width: '90px' }}>Return qty</th>
                  <th className="is-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.item_code} style={{ opacity: l.selected ? 1 : 0.5 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={l.selected}
                        onChange={() => handleToggleLine(idx)}
                        aria-label={`Select ${l.item_name}`}
                      />
                    </td>
                    <td>
                      <div>{l.item_name}</div>
                      <small style={{ color: 'var(--muted)' }}>{l.item_code}</small>
                    </td>
                    <td className="is-right">{l.maxQty}</td>
                    <td className="is-right">
                      <input
                        type="number"
                        min="0"
                        max={l.maxQty}
                        step="any"
                        value={l.returnQty}
                        disabled={!l.selected}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        style={{
                          width: '70px',
                          padding: '4px 6px',
                          textAlign: 'right',
                          borderRadius: '4px',
                          border: '1px solid var(--line)',
                        }}
                        aria-label={`Return quantity of ${l.item_name}`}
                      />
                    </td>
                    <td className="is-right">
                      {formatMoney(Number(l.returnQty || 0) * l.rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderTop: '1px solid var(--line)',
                fontWeight: 'bold',
              }}
            >
              <span>Total return value:</span>
              <span>{formatMoney(totalValue)}</span>
            </div>
          </div>
        ) : null}

        {currentPurchase ? (
          <Field
            label="Reason for return"
            placeholder="e.g. Damaged goods, expired stock, wrong order"
            value={reason}
            onChange={(v) => setReason(v.slice(0, 140))}
          />
        ) : null}

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

export default PurchaseReturnDialog;

import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { formatMoney } from '../components/format';
import { useAppDispatch } from '../../store/hooks';
import { createSalesReturn } from '../../store/salesSlice';
import { getSale } from '../../api/salesListApi';

/**
 * Dialog to record a return of sold items.
 * Can be opened against a specific sale from ReceiptPanel, or standalone from SalesPage.
 */
const SalesReturnDialog = ({ sale = null, onClose, onDone }) => {
  const dispatch = useAppDispatch();
  const [currentSale, setCurrentSale] = useState(sale);
  const [invoiceLookup, setInvoiceLookup] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const initLines = (s) =>
    (s?.lines || []).map((l) => ({
      item_code: l.item_code,
      item_name: l.item_name || l.item_code,
      maxQty: Number(l.qty) || 0,
      returnQty: Number(l.qty) || 0,
      rate: Number(l.rate) || 0,
      selected: true,
    }));

  const [lines, setLines] = useState(() => initLines(sale));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const handleLookup = async () => {
    const q = invoiceLookup.trim();
    if (!q) return;
    setLookupBusy(true);
    setLookupError('');
    try {
      const found = await getSale(q);
      if (found) {
        setCurrentSale(found);
        setLines(initLines(found));
      } else {
        setLookupError('Invoice not found. Check the number and try again.');
      }
    } catch (err) {
      setLookupError(err.message || 'Invoice not found. Check the number and try again.');
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

  const totalRefund = selectedLines.reduce(
    (sum, l) => sum + Number(l.returnQty) * l.rate,
    0
  );

  const canSubmit = selectedLines.length > 0 && !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setFailure('');

    const items = selectedLines.map((l) => ({
      item_code: l.item_code,
      item_name: l.item_name,
      qty: Number(l.returnQty),
      rate: l.rate,
    }));

    const customer =
      currentSale?.customer?.name ||
      (typeof currentSale?.customer === 'string' ? currentSale.customer : '') ||
      'Walk-in Customer';

    try {
      const result = await dispatch(
        createSalesReturn({
          customer,
          return_against: currentSale?.id || undefined,
          reason: reason.trim() || undefined,
          items,
        })
      );

      if (result.type === 'sales/createSalesReturn/fulfilled') {
        onDone(result.payload);
      } else {
        setFailure(result.payload || 'Failed to record return. Please try again.');
        setBusy(false);
      }
    } catch (err) {
      setFailure(err.message || 'Failed to record return.');
      setBusy(false);
    }
  };

  const customerName =
    currentSale?.customer?.name ||
    (typeof currentSale?.customer === 'string' ? currentSale.customer : '') ||
    'Walk-in Customer';

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title="Record return"
      description={
        currentSale
          ? `Return items for receipt ${currentSale.receipt || currentSale.id} (${customerName})`
          : 'Enter the invoice or receipt number to find items to return.'
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
      <div className="nl-sales-form">
        {!currentSale ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            <Field
              label="Invoice or Receipt number"
              placeholder="e.g. #0001, POS-INV-2026-00001"
              value={invoiceLookup}
              onChange={setInvoiceLookup}
              data-autofocus=""
            />
            <Button
              variant="secondary"
              loading={lookupBusy}
              disabled={!invoiceLookup.trim() || lookupBusy}
              onClick={handleLookup}
            >
              Find invoice
            </Button>
            {lookupError ? (
              <p role="alert" className="nl-error">
                <Icon name="alert" />
                <span>{lookupError}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {currentSale && lines.length > 0 ? (
          <div>
            <h4 className="nl-label" style={{ marginBottom: '8px' }}>Items to return</h4>
            <table className="nl-receipt__lines" style={{ width: '100%', marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th style={{ width: '32px' }}></th>
                  <th>Item</th>
                  <th className="is-right">Sold</th>
                  <th className="is-right" style={{ width: '90px' }}>Return qty</th>
                  <th className="is-right">Refund</th>
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
              <span>Total refund amount:</span>
              <span>{formatMoney(totalRefund)}</span>
            </div>
          </div>
        ) : null}

        {currentSale ? (
          <Field
            label="Reason for return"
            placeholder="e.g. Defective, wrong size, customer changed mind"
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

export default SalesReturnDialog;

import React, { useState } from 'react';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Field from '../components/Field';
import Icon from '../components/Icon';
import Segmented from '../components/Segmented';
import { formatMoney } from '../components/format';
import { useAppDispatch } from '../../store/hooks';
import { createSalesReturn } from '../../store/salesSlice';
import { getSale } from '../../api/salesListApi';
import CT from '../till/strings.cash';
import fill from '../labels/fill';
import T from './strings.sales';

const RF = CT.refund;
const D = T.returnDialog;

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
  const [refundMode, setRefundMode] = useState('Cash'); // how the customer is paid back: 'Cash' from the drawer, or 'credit' (kept as credit, paid later)
  const [recorded, setRecorded] = useState(null); // the answer once the return is saved but its refund was not paid

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
        setLookupError(D.notFound);
      }
    } catch (err) {
      setLookupError(err.message || D.notFound);
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
          refund_mode: refundMode === 'credit' ? undefined : refundMode,
          items,
        })
      );

      if (result.type === 'sales/createSalesReturn/fulfilled') {
        const refund = result.payload && result.payload.refund;
        if (refund && refund.success === false) {
          // The return is saved (and must not be saved again); say why the money was not paid and let them close
          setRecorded(result.payload);
          setFailure(fill(RF.notPaid, { reason: refund.message || '' }).trim());
          setBusy(false);
        } else {
          onDone(result.payload);
        }
      } else {
        setFailure(result.payload || D.failed);
        setBusy(false);
      }
    } catch (err) {
      setFailure(err.message || D.failedShort);
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
      title={D.title}
      description={
        currentSale
          ? fill(D.describeSale, { receipt: currentSale.receipt || currentSale.id, customer: customerName })
          : D.describeFind
      }
      footer={
        recorded ? (
          <Button onClick={() => onDone(recorded)}>{RF.close}</Button>
        ) : (
          <>
            <Button variant="secondary" disabled={busy} onClick={onClose}>
              {D.cancel}
            </Button>
            <Button
              loading={busy}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {D.record}
            </Button>
          </>
        )
      }
    >
      <div className="nl-sales-form">
        {!currentSale ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            <Field
              label={D.lookupLabel}
              placeholder={D.lookupPlaceholder}
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
              {D.find}
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
            <h4 className="nl-label" style={{ marginBottom: '8px' }}>{D.itemsToReturn}</h4>
            <table className="nl-receipt__lines" style={{ width: '100%', marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th style={{ width: '32px' }}></th>
                  <th>{D.columns.item}</th>
                  <th className="is-right">{D.columns.sold}</th>
                  <th className="is-right" style={{ width: '90px' }}>{D.columns.returnQty}</th>
                  <th className="is-right">{D.columns.refund}</th>
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
                        aria-label={fill(D.select, { name: l.item_name })}
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
                        aria-label={fill(D.returnQtyOf, { name: l.item_name })}
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
              <span>{D.totalRefund}</span>
              <span>{formatMoney(totalRefund)}</span>
            </div>
          </div>
        ) : null}

        {currentSale && !recorded ? (
          <>
            <Segmented
              label={RF.group}
              value={refundMode}
              onChange={setRefundMode}
              options={[
                { value: 'Cash', label: RF.cash },
                { value: 'credit', label: RF.credit },
              ]}
            />
            <p style={{ color: "var(--muted)", margin: 0 }}>{RF.help}</p>
          </>
        ) : null}

        {currentSale && !recorded ? (
          <Field
            label={D.reasonLabel}
            placeholder={D.reasonPlaceholder}
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

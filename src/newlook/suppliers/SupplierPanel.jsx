import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DetailPanel, { DetailFacts } from '../components/DetailPanel';
import { Chip } from '../components/Chip';
import { ConfirmDialog } from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import { formatMoney } from '../components/format';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import { updateSupplier } from '../../api/suppliersListApi';
import DueStatus from './DueStatus';
import { dayWords, nextBillText, owes, purchasesAddress } from './suppliersModel';
import { useSupplierOverview } from './useSuppliersData';
import T from './strings.suppliers';

/**
 * The supplier panel of the Suppliers page (ticket P4-6, acceptance check AC-28). It asks the server for the supplier itself, so the
 * list and the panel load, fail and retry independently.
 *
 * Shows the facts (type, tax ID, group, country, currency), what the shop owes, the next bill due (amount and date, with a word and
 * an icon when it is late or due within 3 days) and the unpaid bills as a short list. Each bill links to the Purchases page with that
 * bill open. Money, the bills and Pay bill are drawn only for an owner or manager (the server also leaves them out for a cashier).
 * Buttons: Pay bill (opens the next bill in Purchases), Edit, Disable or Enable.
 *
 * The disable question is drawn here, beside the detail card and not inside it: the card closes itself on Escape, and a dialog
 * inside it would lose its own Escape to the card.
 *
 *   id, company    which supplier, which business
 *   summary        the list row, used for the title while the panel loads
 *   canSeeMoney    whether this person may see what is owed
 *   onEdit()       opens the edit form
 *   onChanged()    called after the supplier is disabled or enabled, so the list can refresh
 */
const SupplierPanel = ({ id, company, summary, canSeeMoney, position, onClose, onPrevious, onNext, onEdit, onChanged }) => {
  const { status, data: supplier, reload } = useSupplierOverview(id, company);
  const navigate = useNavigate();
  const toast = useToast();
  const [dialog, setDialog] = useState('');
  const [busy, setBusy] = useState(false);

  const loading = status === 'loading' && !supplier;
  const failed = status === 'error';
  const shown = supplier || null;
  const name = (shown && shown.name) || (summary && summary.name);
  const disabled = shown ? shown.disabled : summary && summary.disabled;
  const showsMoney = canSeeMoney && Boolean(shown) && shown.owed !== undefined && shown.owed !== null;
  const owing = showsMoney && owes(shown);
  const bills = (showsMoney && shown.bills) || [];
  const nextInvoice = showsMoney && ((shown.next_due && shown.next_due.invoice) || (bills[0] && bills[0].invoice));

  const change = async (nextDisabled) => {
    setBusy(true);
    try {
      await updateSupplier({ id, disabled: nextDisabled });
      toast.success(fill(nextDisabled ? T.disable.done : T.disable.undone, { name }));
      setDialog('');
      reload();
      if (onChanged) onChanged();
    } catch (e) {
      toast.error(T.disable.failed);
    } finally {
      setBusy(false);
    }
  };

  const actions = [];
  if (owing && nextInvoice) actions.push({ key: 'pay', label: T.panel.payBill, onClick: () => navigate(purchasesAddress(id, nextInvoice)) });
  if (shown) actions.push({ key: 'edit', label: T.panel.edit, onClick: onEdit });
  if (shown) actions.push(disabled ? { key: 'enable', label: T.panel.enable, onClick: () => change(false) } : { key: 'disable', label: T.panel.disable, onClick: () => setDialog('disable') });
  const [primary, ...secondary] = actions;

  return (
    <>
      <DetailPanel
        title={name || T.panel.loadingTitle}
        status={shown || summary ? disabled ? <Chip icon="x">{T.status.disabled}</Chip> : <Chip icon="check">{T.status.active}</Chip> : null}
        position={position}
        onClose={onClose}
        onPrevious={onPrevious}
        onNext={onNext}
        loading={loading}
        primary={primary}
        secondary={secondary.slice(0, 3)}
        details={shown ? [{ label: T.panel.detailsNumber, value: shown.id }] : []}
      >
        {failed ? (
          <EmptyState icon="alert" tone="error" level={3} title={T.panel.errorTitle} description={T.panel.errorText} action={{ label: T.panel.retry, onClick: reload }} />
        ) : shown ? (
          <div className="nl-supplier-panel">
            {disabled ? <p className="nl-supplier-panel__note">{T.panel.disabledNote}</p> : null}

            {showsMoney ? (
              <DetailFacts
                facts={[
                  { label: T.panel.owed, value: <strong className="nl-supplier-panel__owed">{owing ? formatMoney(shown.owed) : T.panel.owesNothing}</strong> },
                  {
                    label: T.panel.nextBill,
                    value: shown.next_due ? (
                      <span className="nl-supplier-panel__next">
                        <span>{nextBillText(shown.next_due)}</span>
                        <DueStatus due={shown.next_due} />
                      </span>
                    ) : (
                      T.panel.noNextBill
                    ),
                  },
                ]}
              />
            ) : null}

            <DetailFacts
              facts={[
                { label: T.panel.type, value: T.types[shown.type] || shown.type },
                { label: T.panel.taxId, value: shown.tax_id },
                { label: T.panel.group, value: shown.group },
                { label: T.panel.country, value: shown.country },
                { label: T.panel.currency, value: shown.currency },
                ...(shown.internal ? [{ label: T.panel.internal, value: T.panel.yes }] : []),
              ]}
            />

            {showsMoney ? (
              <section className="nl-supplier-panel__section" aria-label={T.panel.bills}>
                <h3 className="nl-label">{T.panel.bills}</h3>
                {bills.length ? (
                  <>
                    <ul className="nl-supplier-panel__bills">
                      {bills.map((bill) => (
                        <li key={bill.invoice} className="nl-supplier-panel__bill">
                          <span className="nl-supplier-panel__bill-main">
                            <Link to={purchasesAddress(id, bill.invoice)} className="nl-supplier-panel__link">
                              {fill(T.panel.billLine, { number: bill.bill_no || bill.invoice })}
                            </Link>
                            <span className="nl-supplier-panel__note">{bill.due_date ? fill(T.panel.billDue, { date: dayWords(bill.due_date) }) : ''}</span>
                            <DueStatus due={{ state: bill.state, days: bill.days }} />
                          </span>
                          <span className="nl-supplier-panel__bill-amount">{formatMoney(bill.outstanding)}</span>
                        </li>
                      ))}
                    </ul>
                    {shown.bill_count > bills.length ? <p className="nl-supplier-panel__note">{fill(T.panel.billsNote, { shown: bills.length, total: shown.bill_count })}</p> : null}
                  </>
                ) : (
                  <p className="nl-supplier-panel__note">{T.panel.noBills}</p>
                )}
                <Link to={purchasesAddress(id)} className="nl-supplier-panel__link">
                  {T.panel.seeAllBills}
                </Link>
              </section>
            ) : null}
          </div>
        ) : null}
      </DetailPanel>

      <ConfirmDialog
        open={dialog === 'disable'}
        title={fill(T.disable.title, { name })}
        message={T.disable.message}
        confirmLabel={T.disable.confirm}
        cancelLabel={T.disable.cancel}
        destructive
        loading={busy}
        onConfirm={() => change(true)}
        onCancel={() => setDialog('')}
      />
    </>
  );
};

export default SupplierPanel;
